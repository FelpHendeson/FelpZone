// Regras do jogo (qualquer era): economia, combate, IA dos rivais, polícia/diretoria, objetivos e fim do dia.
// Funções puras sobre `state`; a interface é avisada pelos `hooks`. Dados e números vêm da era ativa (era.js).
import {
  ERA, TYPES, RIVALS, MAP, ADJ, POLICE_NODE, POLICE_NODES, UPKEEP, ACTIONS_PER_DAY, TRUCE_DAYS, POLICE_RADIUS,
  HEAT_PER_POINT, HEAT_DRIFT, BRIBE_DAYS, P, T,
} from './era.js';
import { rnd, pick, money, clamp } from './util.js';
import { state, hooks, save, log } from './state.js';
import {
  attackMult, crewDefMult, crewIncomeMult, crewHeatAdj, heatTargetMult, recruitBonus, negotiateDiscount, salaries,
  onPlayerWin, onPlayerLoss, onDefended, onNodeLost, dailyCrew,
} from './crew.js';
import { weaponMult, weaponHeat, ammoCost, buffSum, buffOn, tickBuilds, tickBuffs, reportIntel, arsenal, stock, storage } from './business.js';
import { extortIncome, extortHeat, tickDiplomacy, aggressiveCaptains, peaceful, isAlly, ambushMult } from './ops.js';
import { bocaMult, bocaHeatMult, rivalBocaMult, marketCost, attraction, tickMarket } from './market.js';
import { tickOrg, checkAffiliation } from './estado.js';

const MAX_MOTOS = 4;

// ===================== CONSULTAS =====================
export const lvlMult = (n) => 1 + 0.5 * (n.level - 1);
// Renda do ponto: tipo × nível × bônus do bonde; bocas seguem o mercado; inferninhos, a atração da semana.
function marketFactor(n) {
  if (n.type === 'boca') return n.owner === 'P' ? bocaMult() : n.owner && n.owner !== 'X' ? rivalBocaMult() : 1;
  if (n.type === 'inferninho' && n.owner === 'P') return attraction().income;
  return 1;
}
export const nodeIncome = (n) => Math.round(TYPES[n.type].income * lvlMult(n) * (n.owner === 'P' ? crewIncomeMult(n) : 1) * marketFactor(n));
export const defMult = (n) => TYPES[n.type].def * (1 + 0.25 * (n.level - 1));
export const rivalArms = (o) => (state.rivals && state.rivals[o] && state.rivals[o].wm) || 1;
export const estDef = (n) => n.guards * defMult(n) * (n.owner === 'P' ? crewDefMult(n) * weaponMult() : rivalArms(n.owner)) * (n.build ? 0.6 : 1);
export const ownerColor = (o) => o === 'P' ? state.player.color : o === 'X' ? '#3b82f6' : o ? RIVALS[o].color : '#64748b';
export const ownerName = (o) => o === 'P' ? state.player.gang : o === 'X' ? 'Zona neutra' : o ? RIVALS[o].name : 'Neutro';
export const nearPolice = (n) => POLICE_NODES.some((p) => Math.hypot(n.x - MAP[p][2], n.y - MAP[p][3]) < POLICE_RADIUS);
// Ponto vizinho de uma zona neutra do tipo `type` (hospital, igreja, escola...).
export const nextToZone = (n, type) => ADJ[n.id].some((m) => state.nodes[m].type === type);
// Motos só esticam o alcance na era em que existem à venda (escola).
export const motoReach = () => ERA.cfg.motoCost > 0 && (state.motos || 0) > 0;
// Vizinhos "de passagem": zonas neutras públicas (hospital, igreja, escola, comércio) dá pra atravessar. Delegacia não.
export const linked = (id) => {
  const out = new Set(ADJ[id]);
  for (const m of ADJ[id]) if (state.nodes[m].owner === 'X' && state.nodes[m].type !== 'policia') ADJ[m].forEach((k) => { if (k !== id) out.add(k); });
  return [...out];
};
export function reachable(n, owner = 'P') {
  if (n.owner === owner || n.owner === 'X') return false;
  if (n.type === 'lote' && n.owner === null) return false;     // lote vazio não se toma na força: se compra
  if (linked(n.id).some((m) => state.nodes[m].owner === owner)) return true;
  return owner === 'P' && motoReach() && ADJ[n.id].some((m) => state.nodes[m].owner !== 'X' && ADJ[m].some((k) => state.nodes[k].owner === 'P'));
}
// Mais território, mais braços: +1 ação por dia a cada 10 pontos (até +2).
export const actionsPerDay = () => ACTIONS_PER_DAY + Math.min(2, Math.floor(state.nodes.filter((n) => n.owner === 'P').length / 10));
export const totalSoldiers = () => state.free + state.nodes.filter((n) => n.owner === 'P').reduce((s, n) => s + n.guards, 0);
export const recruitCap = () => 3 + Math.floor(state.respect / 15) + recruitBonus() + buffSum('recruit');
export const bribeCost = () => P(150 + forecast().target * 8);
export const upgradeCost = (n) => P(400 * n.level);
export const negotiateCost = (n) => Math.max(P(150), P(250 + n.guards * 150 + (n.level - 1) * 150 - state.respect * 3 - negotiateDiscount()));
export const motoCost = () => Math.round(ERA.cfg.motoCost * (1 + 0.5 * (state.motos || 0)));
export const canBuyMoto = () => ERA.cfg.motoCost > 0 && (state.motos || 0) < MAX_MOTOS
  && state.nodes.some((n) => n.owner === 'P' && n.type === 'oficina');
// Ataque do jogador: atributos do Comandante + motos (+5% cada).
export const playerAttackMult = () => attackMult() * weaponMult() * (1 + 0.05 * Math.min(state.motos || 0, MAX_MOTOS));

export function nodeHeat(n) {
  if (n.lowkey) return 0;
  let h = TYPES[n.type].heat;
  if (n.owner === 'P' && n.type === 'boca') h = Math.round(h * bocaHeatMult());
  if (n.owner === 'P' && n.type === 'inferninho') h += attraction().heat;
  return Math.max(0, h + (nearPolice(n) ? 1 : 0) + (n.owner === 'P' ? crewHeatAdj(n) : 0));
}

export function forecast() {
  let inc = 0, heat = 0;
  state.nodes.filter((n) => n.owner === 'P').forEach((n) => {
    if (!n.lowkey) inc += nodeIncome(n);
    heat += nodeHeat(n);
  });
  heat += weaponHeat() + extortHeat();
  inc += extortIncome();
  // alvo de visada/barulho: pra onde a pressão tende com o seu território atual
  let target = clamp(heat * HEAT_PER_POINT * heatTargetMult(), 0, 100);
  if (state.bribeDays > 0) target /= 2;
  if (buffOn('calm')) target *= 0.7;
  const next = clamp(state.heat + (target - state.heat) * HEAT_DRIFT, 0, 100);
  return { inc, heat, target: Math.round(target), next, upkeep: totalSoldiers() * UPKEEP + salaries() + ammoCost() + marketCost(), ammo: ammoCost(), supply: marketCost() };
}

// ===================== COMBATE =====================
export function fight(sent, resp, node, mult = 1, defBoost = 1) {
  const def = estDef(node) * defBoost * rnd(0.75, 1.25) + (node.owner ? 0.5 : 0);
  const att = sent * (1 + resp / 200) * mult * rnd(0.75, 1.25);
  if (att > def) {
    const losses = Math.min(sent - 1, Math.round(sent * Math.min(0.8, (def / att) * 0.6)));
    return { win: true, survivors: sent - losses, losses, defLosses: node.guards };
  }
  const losses = Math.round(sent * rnd(0.5, 0.8));
  const defLosses = Math.min(node.guards, Math.round(node.guards * (att / Math.max(def, 0.1)) * 0.4));
  return { win: false, survivors: sent - losses, losses, defLosses };
}

// Aplica um resultado de combate (vindo de fight() ou da briga de bonde) ao ponto.
export function applyResult(att, node, r) {
  const prev = node.owner;
  if (r.win) {
    if (prev === 'P') onNodeLost(node);
    node.owner = att;
    node.guards = r.survivors;
    node.lowkey = false;
    delete node.build;
    if (node.type === 'hq' && prev && prev !== 'P') eliminate(prev, att);
  } else {
    node.guards = Math.max(0, node.guards - r.defLosses);
    if (att === 'P') state.free += r.survivors; else state.rivals[att].reserve += r.survivors;
  }
  return prev;
}

export function doAttack(att, sent, node, defBoost = 1) {
  const resp = att === 'P' ? state.respect : 15 + state.day * 1.5;
  const r = fight(sent, resp, node, att === 'P' ? playerAttackMult() : rivalArms(att), defBoost);
  const prev = applyResult(att, node, r);
  return { r, prev };
}

export function eliminate(rid, by) {
  const rv = state.rivals[rid];
  rv.alive = false;
  state.nodes.forEach((n) => { if (n.owner === rid) { n.owner = null; n.guards = 1; } });
  if (by === 'P') {
    const loot = Math.min(rv.money, P(6000));        // o caixa grande some na fuga; sobra uma parte
    state.money += loot; state.respect = clamp(state.respect + 20, 0, 100);
    log(T(ERA.text.eliminatedByPlayer, { rival: RIVALS[rid].name, lider: RIVALS[rid].leader, grana: money(loot) }), 'big');
  } else {
    log(T(ERA.text.eliminatedByOther, { rival: RIVALS[rid].name, por: ownerName(by) }), 'big');
  }
  rv.money = 0; rv.reserve = 0;
}

// Consequências do resultado de um ataque do jogador (instantâneo ou briga de bonde).
export function afterPlayerAttack(n, r, prev) {
  if (r.win) {
    state.respect = clamp(state.respect + (prev ? 6 : 3), 0, 100);
    state.stats.captured++;
    onPlayerWin(n, prev);
    log(`✊ ${n.name} agora é do ${state.player.gang}! Perdemos ${r.losses}, ${r.survivors} ficaram de guarda.`, 'good');
    if (prev && state.rivals[prev] && state.rivals[prev].alive) log(`${RIVALS[prev].leader}: “${pick(RIVALS[prev].quotes)}”`, 'rival');
  } else {
    state.respect = clamp(state.respect - 3, 0, 100);
    onPlayerLoss();
    log(`🩸 Ataque a ${n.name} falhou. ${r.losses} dos nossos caíram, derrubamos ${r.defLosses} deles.`, 'bad');
  }
}

// ===================== AÇÕES DO JOGADOR =====================
export const canAttack = (n, send) => state.actions > 0 && send > 0 && state.free > 0 && reachable(n);

// Paga o custo de um ataque (ação, soldados, barulho). Usado também pela briga de bonde.
export function commitAttack(n, sendWanted) {
  const send = clamp(sendWanted, 1, state.free);
  if (!canAttack(n, send)) return 0;
  state.actions--; state.free -= send;
  state.heat = clamp(state.heat + (n.owner ? 6 : 3), 0, 100);
  if (nextToZone(n, 'escola')) {
    state.heat = clamp(state.heat + 8, 0, 100);
    state.respect = clamp(state.respect - 2, 0, 100);
    log(`🏫 Briga do lado da escola: a cidade inteira viu. Visada +8, respeito −2.`, 'warn');
  }
  return send;
}

export function playerAttack(id, sendWanted) {
  const n = state.nodes[id];
  const send = commitAttack(n, sendWanted);
  if (!send) return;
  const { r, prev } = doAttack('P', send, n);
  afterPlayerAttack(n, r, prev);
  afterAction();
}

export function playerNegotiate(id) {
  const n = state.nodes[id];
  const cost = negotiateCost(n);
  if (state.actions <= 0 || n.owner !== null || state.respect < 20 || state.money < cost || !reachable(n)) return;
  state.actions--; state.money -= cost;
  n.owner = 'P'; n.guards = 0;
  state.stats.captured++;
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
  log(n.lowkey ? `🤫 ${n.name} baixou a poeira: sem movimento, sem renda e fora da mira da ${ERA.words.police}.` : `🔊 ${n.name} voltou a funcionar.`, 'warn');
  afterAction();
}

export function recruit(id, qtyWanted) {
  const n = state.nodes[id];
  const t = TYPES[n.type];
  const qty = clamp(qtyWanted, 1, recruitCap() - state.recruited);
  if (n.owner !== 'P' || !t.recruit || qty <= 0 || state.money < t.recruit * qty) return;
  state.money -= t.recruit * qty; state.free += qty; state.recruited += qty;
  state.stats.recruited += qty;
  // academia: os lutadores já chegam com faca/taco (se couber no arsenal)
  if (n.type === 'academia') { const fit = Math.max(0, Math.min(qty, storage() - stock())); arsenal().faca = (arsenal().faca || 0) + fit; }
  log(`🧢 ${qty} ${ERA.words.soldiers === 'alunos' ? 'aluno(s)' : 'soldado(s)'} entraram pro bonde no ${n.name}.`, 'good');
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
  log(T(ERA.text.bribe, { custo: money(cost), dias: BRIBE_DAYS }), 'warn');
  afterAction();
}

export function buyMoto() {
  const cost = motoCost();
  if (!canBuyMoto() || state.money < cost) return;
  state.money -= cost; state.motos = (state.motos || 0) + 1;
  log(`🏍️ O bonde comprou a ${state.motos}ª moto (${money(cost)}). Alcance de duas ruas e +5% na briga.`, 'good');
  afterAction();
}

export function afterAction() { checkObjectives(); checkAffiliation(); checkEnd(); save(); hooks.changed(); }

// ===================== OBJETIVOS (tutorial guiado) =====================
export const objectives = () => ERA.objectives || [];
export const currentObjective = () => objectives()[state.objIdx || 0] || null;
export function checkObjectives() {
  let o = currentObjective();
  while (o && o.check(state)) {
    state.objIdx = (state.objIdx || 0) + 1;
    if (o.reward) {
      if (o.reward.respect) state.respect = clamp(state.respect + o.reward.respect, 0, 100);
      if (o.reward.money) state.money += o.reward.money;
    }
    const next = currentObjective();
    if (o.say || next) log(`🎯 Objetivo cumprido: ${o.text}.`, 'good');
    hooks.objective(o, next);
    o = next;
  }
}
export function skipTutorial() {
  // Pula até o objetivo final da era (a meta de vitória continua valendo).
  state.objIdx = Math.max(state.objIdx || 0, objectives().length - 1);
  save(); hooks.changed();
}

// ===================== FIM DO DIA =====================
export function endDay() {
  if (state.over) return;
  const f = forecast();
  state.money += f.inc;
  state.nodes.filter((n) => n.owner === 'P' && !n.lowkey).forEach((n) => { state.respect += TYPES[n.type].resp + (n.type === 'inferninho' && ERA.cfg.market ? attraction().resp : 0); });
  state.respect = clamp(state.respect, 0, 100);
  state.heat = f.next;

  // folha de pagamento
  const paidAll = state.money >= f.upkeep;
  if (paidAll) {
    state.money -= f.upkeep;
  } else {
    let desert = Math.ceil((f.upkeep - state.money) / Math.max(UPKEEP, 1));
    state.money = 0;
    state.respect = clamp(state.respect - 5, 0, 100);
    let gone = 0;
    while (desert > 0 && state.free > 0) { state.free--; desert--; gone++; }
    const mine = state.nodes.filter((n) => n.owner === 'P').sort((a, b) => b.guards - a.guards);
    for (const n of mine) { while (desert > 0 && n.guards > 1) { n.guards--; desert--; gone++; } }
    log(`💸 Não deu pra pagar todo mundo. ${gone} ${ERA.words.soldiers} largaram o bonde.`, 'bad');
  }
  log(`☀️ Fim do dia: +${money(f.inc)} de renda, -${money(f.upkeep)} de ${ERA.cfg.upkeep > 5 ? 'salários' : 'lanche do bonde'}.`);

  dailyCrew(paidAll);
  tickBuilds();
  aggressiveCaptains();
  if (ERA.cfg.raid === 'advertencia') schoolDiscipline(); else policeRaid();
  for (const id of Object.keys(state.rivals)) { rivalTurn(id); if (state.over) break; }
  if (!state.over) randomEvent();
  tickBuffs();
  tickDiplomacy();
  tickMarket();
  tickOrg();
  reportIntel();

  const endedDay = state.day;
  state.day++;
  state.recruited = 0;
  state.suspToday = false;
  if (state.suspended > 0) {
    state.suspended--;
    state.actions = 0;
    state.suspToday = true;
    log(`🚫 Suspenso: hoje o bonde não pode agir (${state.suspended + 1} dia(s) de suspensão).`, 'bad');
  } else state.actions = actionsPerDay();
  if (state.bribeDays > 0) { state.bribeDays--; if (!state.bribeDays) log(ERA.text.bribeEnd, 'warn'); }
  checkObjectives(); checkEnd(); save(); hooks.changed();
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

// Escola: barulho alto vira advertência. Três advertências = suspensão (2 dias sem ações).
export function schoolDiscipline() {
  if (state.heat < 50) return;
  if (Math.random() > (state.heat - 40) / 100) return;
  state.warnings = (state.warnings || 0) + 1;
  state.heat = clamp(state.heat - 15, 0, 100);
  if (state.warnings >= 3) {
    state.warnings = 0;
    state.suspended = 2;
    state.respect = clamp(state.respect - 5, 0, 100);
    log('🚫 TERCEIRA ADVERTÊNCIA! O bonde foi SUSPENSO: 2 dias sem poder agir.', 'bad');
  } else {
    log(`⚠️ Advertência da diretoria (${state.warnings}/3). Na terceira, suspensão.`, 'warn');
  }
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
  if (rv.money < 0) { rv.reserve = Math.max(0, rv.reserve - Math.ceil(-rv.money / Math.max(UPKEEP, 1))); rv.money = 0; }

  // recrutam guardando uma reserva de caixa, com teto pelo tamanho do território
  const unit = P(100);
  const c = ERA.cfg;
  const boost = state.rivalBoost || 1;                      // lugares mais difíceis da expansão (país, mundo)
  const armyCap = Math.round(((c.rivalCapBase ?? 10) + mine.length * (c.rivalCapPerNode ?? 5)) * boost);
  // rival rico recruta mais por dia (não fica sentado no dinheiro)
  const rich = ERA.generate && rv.money > P(3000) ? 3 : 0;
  const rec = Math.min(3 + rich + Math.floor(state.day / 8) + Math.round((boost - 1) * 3), armyCap + rich * 2 - army, Math.floor((rv.money - 2 * unit) / unit));
  if (rec > 0) { rv.money -= rec * unit; rv.reserve += rec; }

  // corrida armamentista: rival com caixa sobrando se arma (+10% de força por compra, até +80%)
  if (ERA.cfg.weapons && rv.money > P(1600) && (rv.wm || 1) < 1.8) {
    rv.money -= P(1000);
    rv.wm = Math.round(((rv.wm || 1) + 0.1) * 10) / 10;
    if (Math.round(rv.wm * 10) % 2 === 0) log(`🔫 ${def.name} compraram armamento novo. Estão ${Math.round((rv.wm - 1) * 100)}% mais fortes.`, 'rival');
  }

  if (rv.money > P(900)) {
    const n = pick(mine.filter((m) => m.level < 3 && m.type !== 'hq'));
    if (n) { rv.money -= upgradeCost(n); n.level++; }
  }

  // Alvos possíveis hoje. O rival segue o plano de ontem se ainda der (é o que os boatos do inferninho revelam).
  const calm = peaceful(id);                                  // trégua ou aliança: não mexe com você
  const ally = isAlly(id) ? state.rivals[id].allyTarget : null;
  const angry = state.rivals[id].angryUntil > state.day;
  const candidates = (minDay) => state.nodes
    .filter((n) => reachable(n, id) && !(n.owner === 'P' && (minDay < TRUCE_DAYS || calm)))
    .map((n) => ({ n, d: estDef(n) }))
    .filter((o) => rv.reserve * 0.85 > o.d * 1.2 + 0.5);
  const score = (o) => nodeIncome(o.n) / P(100) / (o.d + 1) + (o.n.type === 'hq' ? 6 : 0) + (o.n.owner === 'P' ? (id === 'A' ? 1.5 : 0.8) + (angry ? 3 : 0) : 0)
    + (ally && o.n.owner === ally ? 4 : 0) + Math.random();
  if (Math.random() < def.aggr + state.day * 0.01 + (angry ? 0.3 : 0) + ((state.rivalBoost || 1) - 1) * 0.25 && rv.reserve >= 3) {
    const cands = candidates(state.day);
    if (cands.length) {
      cands.sort((a, b) => score(b) - score(a));
      const planned = cands.find((o) => o.n.id === rv.plan);
      const { n, d } = planned || cands[0];
      const send = Math.min(rv.reserve, Math.ceil(d * 1.6) + 1);
      rv.reserve -= send;
      const { r, prev } = doAttack(id, send, n, n.owner === 'P' ? ambushMult(n) : 1);
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

  // plano pra amanhã (pode mudar se o alvo ficar forte demais)
  const next = candidates(state.day + 1).sort((a, b) => score(b) - score(a))[0];
  rv.plan = next ? next.n.id : null;

  const frontier = state.nodes
    .filter((n) => n.owner === id && ADJ[n.id].some((m) => { const o = state.nodes[m].owner; return o !== id && o !== 'X'; }))
    .sort((a, b) => a.guards - b.guards);
  const cap = Math.round(((ERA.cfg.guardBase ?? 4) + Math.floor(state.day / (ERA.cfg.guardEvery ?? 6))) * (state.rivalBoost || 1));
  for (const n of frontier) {
    if (rv.reserve <= 2) break;
    if (n.guards < cap) { n.guards++; rv.reserve--; }
  }
}

export function randomEvent() {
  if (Math.random() > 0.3) return;
  const E = ERA.events;
  const ownParty = state.nodes.some((n) => n.owner === 'P' && n.type === E.partyType);
  const events = [
    () => { const g = P(200); state.money += g; log(T(E.money, { grana: money(g) }), 'good'); },
    () => { if (state.respect < 15) return; state.free += 2; log(E.recruits, 'good'); },
    () => { state.heat = clamp(state.heat + 8, 0, 100); log(E.news, 'warn'); },
    () => { if (!ownParty) return; state.respect = clamp(state.respect + 5, 0, 100); log(E.party, 'good'); },
    () => { if (state.free <= 0) return; state.free--; log(E.caught, 'bad'); },
    () => { const r = pick(Object.keys(state.rivals).filter((k) => state.rivals[k].alive)); if (!r) return; state.rivals[r].reserve = Math.max(0, state.rivals[r].reserve - 2); log(T(E.rivalSplit, { rival: RIVALS[r].name }), 'rival'); },
  ];
  pick(events)();
}

export function checkEnd() {
  if (state.over) return;
  if (state.nodes[0].owner !== 'P') state.over = 'lose';
  else if (Object.values(state.rivals).every((r) => !r.alive)) state.over = 'win';
  if (state.over) hooks.gameOver(state.over);
}
