// Regras do Modo Cidade: economia, combate, IA dos rivais, polícia e fim do dia.
// Funções puras sobre `state`; a interface é avisada pelos `hooks`.
import { UPKEEP, ACTIONS_PER_DAY, TRUCE_DAYS, POLICE_RADIUS, HEAT_PER_POINT, HEAT_DRIFT, BRIBE_DAYS } from './config.js';
import { TYPES } from '../data/types.js';
import { RIVALS } from '../data/rivals.js';
import { MAP, ADJ, POLICE_NODE } from '../data/maps/porto-neon.js';
import { rnd, pick, money, clamp } from './util.js';
import { state, hooks, save, log } from './state.js';
import {
  attackMult, crewDefMult, crewIncomeMult, crewHeatAdj, heatTargetMult, recruitBonus, negotiateDiscount, salaries,
  onPlayerWin, onPlayerLoss, onDefended, onNodeLost, dailyCrew,
} from './crew.js';

// ===================== REGRAS =====================
export const lvlMult = (n) => 1 + 0.5 * (n.level - 1);
export const nodeIncome = (n) => Math.round(TYPES[n.type].income * lvlMult(n) * (n.owner === 'P' ? crewIncomeMult(n) : 1));
export const defMult = (n) => TYPES[n.type].def * (1 + 0.25 * (n.level - 1));
export const estDef = (n) => n.guards * defMult(n) * (n.owner === 'P' ? crewDefMult(n) : 1);
export const ownerColor = (o) => o === 'P' ? state.player.color : o === 'X' ? '#3b82f6' : o ? RIVALS[o].color : '#64748b';
export const ownerName = (o) => o === 'P' ? state.player.gang : o === 'X' ? 'Polícia' : o ? RIVALS[o].name : 'Neutro';
export const nearPolice = (n) => Math.hypot(n.x - MAP[POLICE_NODE][2], n.y - MAP[POLICE_NODE][3]) < POLICE_RADIUS;
export const reachable = (n, owner = 'P') => n.owner !== owner && n.owner !== 'X' && ADJ[n.id].some((m) => state.nodes[m].owner === owner);
export const totalSoldiers = () => state.free + state.nodes.filter((n) => n.owner === 'P').reduce((s, n) => s + n.guards, 0);
export const recruitCap = () => 3 + Math.floor(state.respect / 15) + recruitBonus();
export const bribeCost = () => 150 + Math.round(forecast().target * 8);
export const upgradeCost = (n) => 400 * n.level;
export const negotiateCost = (n) => Math.max(150, 250 + n.guards * 150 + (n.level - 1) * 150 - state.respect * 3 - negotiateDiscount());

export const nodeHeat = (n) => n.lowkey ? 0 : Math.max(0, TYPES[n.type].heat + (nearPolice(n) ? 1 : 0) + (n.owner === 'P' ? crewHeatAdj(n) : 0));

export function forecast() {
  let inc = 0, heat = 0;
  state.nodes.filter((n) => n.owner === 'P').forEach((n) => {
    if (!n.lowkey) inc += nodeIncome(n);
    heat += nodeHeat(n);
  });
  // alvo de visada: pra onde a pressão da polícia tende com o seu território atual
  let target = clamp(heat * HEAT_PER_POINT * heatTargetMult(), 0, 100);
  if (state.bribeDays > 0) target /= 2;
  const next = clamp(state.heat + (target - state.heat) * HEAT_DRIFT, 0, 100);
  return { inc, heat, target: Math.round(target), next, upkeep: totalSoldiers() * UPKEEP + salaries() };
}

export function fight(sent, resp, node, mult = 1) {
  const def = estDef(node) * rnd(0.75, 1.25) + (node.owner ? 0.5 : 0);
  const att = sent * (1 + resp / 200) * mult * rnd(0.75, 1.25);
  if (att > def) {
    const losses = Math.min(sent - 1, Math.round(sent * Math.min(0.8, (def / att) * 0.6)));
    return { win: true, survivors: sent - losses, losses, defLosses: node.guards };
  }
  const losses = Math.round(sent * rnd(0.5, 0.8));
  const defLosses = Math.min(node.guards, Math.round(node.guards * (att / Math.max(def, 0.1)) * 0.4));
  return { win: false, survivors: sent - losses, losses, defLosses };
}

export function doAttack(att, sent, node) {
  const resp = att === 'P' ? state.respect : 15 + state.day * 1.5;
  const prev = node.owner;
  const r = fight(sent, resp, node, att === 'P' ? attackMult() : 1);
  if (r.win) {
    if (prev === 'P') onNodeLost(node);
    node.owner = att;
    node.guards = r.survivors;
    node.lowkey = false;
    if (node.type === 'hq' && prev && prev !== 'P') eliminate(prev, att);
  } else {
    node.guards = Math.max(0, node.guards - r.defLosses);
    if (att === 'P') state.free += r.survivors; else state.rivals[att].reserve += r.survivors;
  }
  return { r, prev };
}

export function eliminate(rid, by) {
  const rv = state.rivals[rid];
  rv.alive = false;
  state.nodes.forEach((n) => { if (n.owner === rid) { n.owner = null; n.guards = 1; } });
  if (by === 'P') {
    state.money += rv.money; state.respect = clamp(state.respect + 20, 0, 100);
    log(`💀 ${RIVALS[rid].name} CAÍRAM! ${RIVALS[rid].leader} fugiu da cidade. Você pegou o caixa deles (${money(rv.money)}). Os pontos deles ficaram sem dono.`, 'big');
  } else {
    log(`💀 ${RIVALS[rid].name} foram destruídos por ${ownerName(by)}! Os pontos deles ficaram sem dono.`, 'big');
  }
  rv.money = 0; rv.reserve = 0;
}

// ===================== AÇÕES DO JOGADOR =====================
export function playerAttack(id, sendWanted) {
  const n = state.nodes[id];
  const send = clamp(sendWanted, 1, state.free);
  if (state.actions <= 0 || send <= 0 || !reachable(n)) return;
  state.actions--; state.free -= send;
  state.heat = clamp(state.heat + (n.owner ? 6 : 3), 0, 100);
  const { r, prev } = doAttack('P', send, n);
  if (r.win) {
    state.respect = clamp(state.respect + (prev ? 6 : 3), 0, 100);
    onPlayerWin(n, prev);
    log(`✊ ${n.name} agora é do ${state.player.gang}! Perdemos ${r.losses}, ${r.survivors} ficaram de guarda.`, 'good');
    if (prev && state.rivals[prev] && state.rivals[prev].alive) log(`${RIVALS[prev].leader}: “${pick(RIVALS[prev].quotes)}”`, 'rival');
  } else {
    state.respect = clamp(state.respect - 3, 0, 100);
    onPlayerLoss();
    log(`🩸 Ataque a ${n.name} falhou. ${r.losses} dos nossos caíram, derrubamos ${r.defLosses} deles.`, 'bad');
  }
  afterAction();
}

export function playerNegotiate(id) {
  const n = state.nodes[id];
  const cost = negotiateCost(n);
  if (state.actions <= 0 || n.owner !== null || state.respect < 20 || state.money < cost || !reachable(n)) return;
  state.actions--; state.money -= cost;
  n.owner = 'P'; n.guards = 0;
  log(`🤝 Fechou acordo com o pessoal do ${n.name} por ${money(cost)}. O ponto é nosso, mas está sem guarda.`, 'good');
  afterAction();
}

export function moveGuards(id, delta) {
  const n = state.nodes[id];
  if (n.owner !== 'P') return;
  if (delta === 'all') { n.guards += state.free; state.free = 0; }
  else if (delta === 'none') { state.free += n.guards; n.guards = 0; }
  else if (delta > 0 && state.free > 0) { n.guards++; state.free--; }
  else if (delta < 0 && n.guards > 0) { n.guards--; state.free++; }
  afterAction();
}

export function toggleLowkey(id) {
  const n = state.nodes[id];
  if (n.owner !== 'P' || n.type === 'hq') return;
  n.lowkey = !n.lowkey;
  log(n.lowkey ? `🤫 ${n.name} baixou a poeira: sem movimento, sem renda e fora da mira da polícia.` : `🔊 ${n.name} voltou a funcionar.`, 'warn');
  afterAction();
}

export function recruit(id, qtyWanted) {
  const n = state.nodes[id];
  const t = TYPES[n.type];
  const qty = clamp(qtyWanted, 1, recruitCap() - state.recruited);
  if (n.owner !== 'P' || !t.recruit || qty <= 0 || state.money < t.recruit * qty) return;
  state.money -= t.recruit * qty; state.free += qty; state.recruited += qty;
  log(`🧢 ${qty} novo(s) soldado(s) entraram pro bonde no ${n.name}.`, 'good');
  afterAction();
}

export function upgrade(id) {
  const n = state.nodes[id];
  const cost = upgradeCost(n);
  if (n.owner !== 'P' || n.level >= 3 || state.money < cost) return;
  state.money -= cost; n.level++;
  log(`⬆️ ${n.name} foi melhorado para o nível ${n.level}. Mais grana e mais difícil de tomar.`, 'good');
  afterAction();
}

export function bribe() {
  const cost = bribeCost();
  if (state.bribeDays > 0 || state.money < cost || state.heat <= 0) return;
  state.money -= cost; state.bribeDays = BRIBE_DAYS;
  state.heat = clamp(state.heat - 20, 0, 100);
  log(`💼 Molhou a mão do delegado com ${money(cost)}. Vista grossa por ${BRIBE_DAYS} dias: a pressão cai pela metade.`, 'warn');
  afterAction();
}

export function afterAction() { checkEnd(); save(); hooks.changed(); }

// ===================== FIM DO DIA =====================
export function endDay() {
  if (state.over) return;
  const f = forecast();
  state.money += f.inc;
  state.nodes.filter((n) => n.owner === 'P' && !n.lowkey).forEach((n) => { state.respect += TYPES[n.type].resp; });
  state.respect = clamp(state.respect, 0, 100);
  state.heat = f.next;

  // folha de pagamento
  const paidAll = state.money >= f.upkeep;
  if (paidAll) {
    state.money -= f.upkeep;
  } else {
    let desert = Math.ceil((f.upkeep - state.money) / UPKEEP);
    state.money = 0;
    state.respect = clamp(state.respect - 5, 0, 100);
    let gone = 0;
    while (desert > 0 && state.free > 0) { state.free--; desert--; gone++; }
    const mine = state.nodes.filter((n) => n.owner === 'P').sort((a, b) => b.guards - a.guards);
    for (const n of mine) { while (desert > 0 && n.guards > 1) { n.guards--; desert--; gone++; } }
    log(`💸 Não deu pra pagar todo mundo. ${gone} soldado(s) largaram o bonde.`, 'bad');
  }
  log(`☀️ Fim do dia: +${money(f.inc)} de renda, -${money(f.upkeep)} de salários.`);

  dailyCrew(paidAll);
  policeRaid();
  for (const id of ['A', 'B', 'C']) { rivalTurn(id); if (state.over) break; }
  if (!state.over) randomEvent();

  const endedDay = state.day;
  state.day++;
  state.actions = ACTIONS_PER_DAY; state.recruited = 0;
  if (state.bribeDays > 0) { state.bribeDays--; if (!state.bribeDays) log('👮 Acabou a vista grossa. A polícia voltou a olhar pra você.', 'warn'); }
  checkEnd(); save(); hooks.changed();
  hooks.dayEnded(endedDay);
}

export function policeRaid() {
  if (state.heat < 50) return;
  if (Math.random() > (state.heat - 40) / 100) return;
  const mine = state.nodes.filter((n) => n.owner === 'P' && n.type !== 'hq' && !n.lowkey);
  if (!mine.length) return;
  const weighted = mine.flatMap((n) => Array(TYPES[n.type].heat + 1).fill(n));
  const n = pick(weighted);
  const lostG = Math.ceil(n.guards / 2);
  const lostM = Math.round(state.money * rnd(0.1, 0.2));
  n.guards -= lostG; state.money -= lostM;
  state.respect = clamp(state.respect - 3, 0, 100);
  if (state.heat >= 90) {
    onNodeLost(n, 'police');
    state.free += n.guards; n.owner = null; n.guards = 1; n.lowkey = false;
    log(`🚨 MEGAOPERAÇÃO no ${n.name}! A polícia fechou o ponto: ${lostG} presos, ${money(lostM)} apreendidos e perdemos o local.`, 'bad');
  } else {
    log(`🚨 Batida policial no ${n.name}: ${lostG} presos e ${money(lostM)} apreendidos.`, 'bad');
  }
  state.heat = clamp(state.heat - 15, 0, 100);
}

export function rivalTurn(id) {
  const rv = state.rivals[id];
  if (!rv.alive) return;
  const def = RIVALS[id];
  const mine = state.nodes.filter((n) => n.owner === id);
  rv.money += mine.reduce((s, n) => s + nodeIncome(n), 0);

  // rivais também pagam salário; se faltar grana, perdem gente
  const army = rv.reserve + mine.reduce((s, n) => s + n.guards, 0);
  rv.money -= army * UPKEEP;
  if (rv.money < 0) { rv.reserve = Math.max(0, rv.reserve - Math.ceil(-rv.money / UPKEEP)); rv.money = 0; }

  // recrutam guardando uma reserva de caixa, com teto pelo tamanho do território
  const armyCap = 10 + mine.length * 5;
  const rec = Math.min(3 + Math.floor(state.day / 8), armyCap - army, Math.floor((rv.money - 200) / 100));
  if (rec > 0) { rv.money -= rec * 100; rv.reserve += rec; }

  if (rv.money > 900) {
    const n = pick(mine.filter((m) => m.level < 3 && m.type !== 'hq'));
    if (n) { rv.money -= upgradeCost(n); n.level++; }
  }

  if (Math.random() < def.aggr + state.day * 0.01 && rv.reserve >= 3) {
    const cands = state.nodes
      .filter((n) => reachable(n, id) && !(n.owner === 'P' && state.day < TRUCE_DAYS))
      .map((n) => ({ n, d: estDef(n) }))
      .filter((o) => rv.reserve * 0.85 > o.d * 1.2 + 0.5);
    if (cands.length) {
      const score = (o) => nodeIncome(o.n) / 100 / (o.d + 1) + (o.n.type === 'hq' ? 6 : 0) + (o.n.owner === 'P' ? (id === 'A' ? 1.5 : 0.8) : 0) + Math.random();
      cands.sort((a, b) => score(b) - score(a));
      const { n, d } = cands[0];
      const send = Math.min(rv.reserve, Math.ceil(d * 1.6) + 1);
      rv.reserve -= send;
      const { r, prev } = doAttack(id, send, n);
      if (prev === 'P') {
        if (r.win) {
          log(`⚠️ ${def.name} tomaram ${n.name}! ${def.leader}: “${pick(def.quotes)}”`, 'bad');
          if (n.type === 'hq') { state.over = 'lose'; return; }
        } else {
          state.respect = clamp(state.respect + 2, 0, 100);
          onDefended(n);
          log(`🛡️ ${def.name} atacaram ${n.name}, mas seus caras seguraram! Caíram ${r.losses} deles.`, 'good');
        }
      } else if (r.win) {
        log(`${def.name} dominaram ${n.name}${prev ? ` de ${RIVALS[prev].name}` : ''}.`, 'rival');
      }
    }
  }

  const frontier = state.nodes
    .filter((n) => n.owner === id && ADJ[n.id].some((m) => { const o = state.nodes[m].owner; return o !== id && o !== 'X'; }))
    .sort((a, b) => a.guards - b.guards);
  const cap = 4 + Math.floor(state.day / 6);
  for (const n of frontier) {
    if (rv.reserve <= 2) break;
    if (n.guards < cap) { n.guards++; rv.reserve--; }
  }
}

export function randomEvent() {
  if (Math.random() > 0.3) return;
  const ownInf = state.nodes.some((n) => n.owner === 'P' && n.type === 'inferninho');
  const events = [
    () => { state.money += 200; log('🎒 Um olheiro achou uma mochila esquecida num dos pontos. +$200', 'good'); },
    () => { if (state.respect < 15) return; state.free += 2; log('🏍️ Dois moleques de moto pediram pra entrar pro bonde. +2 soldados', 'good'); },
    () => { state.heat = clamp(state.heat + 8, 0, 100); log('📰 Saiu matéria no jornal sobre a guerra de gangues. Visada +8', 'warn'); },
    () => { if (!ownInf) return; state.respect = clamp(state.respect + 5, 0, 100); log('🎉 A festa de sábado no inferninho bombou. Todo mundo comentando. +5 respeito', 'good'); },
    () => { if (state.free <= 0) return; state.free--; log('🚔 Um dos seus foi pego numa blitz. -1 soldado', 'bad'); },
    () => { const r = pick(['A', 'B', 'C'].filter((k) => state.rivals[k].alive)); if (!r) return; state.rivals[r].reserve = Math.max(0, state.rivals[r].reserve - 2); log(`🗞️ Racha interno: ${RIVALS[r].name} perderam 2 soldados numa briga entre eles.`, 'rival'); },
  ];
  pick(events)();
}

export function checkEnd() {
  if (state.over) return;
  if (state.nodes[0].owner !== 'P') state.over = 'lose';
  else if (Object.values(state.rivals).every((r) => !r.alive)) state.over = 'win';
  if (state.over) hooks.gameOver(state.over);
}

