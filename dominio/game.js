'use strict';

// ===================== DADOS =====================
const SAVE_KEY = 'dominio-save-v1';
const UPKEEP = 12;          // custo diário por soldado
const ACTIONS_PER_DAY = 3;
const TRUCE_DAYS = 4;       // rivais não atacam você antes deste dia
const POLICE_RADIUS = 210;

const TYPES = {
  hq:        { label: 'QG',          icon: '🏚️', income: 150, heat: 0, resp: 0, def: 2.0, recruit: 100,
               desc: 'O coração do bonde. Se cair, acabou.' },
  boca:      { label: 'Boca',        icon: '💊', income: 220, heat: 4, resp: 0, def: 1.0,
               desc: 'Dinheiro rápido, mas chama muita atenção da polícia.' },
  inferninho:{ label: 'Inferninho',  icon: '💃', income: 170, heat: 2, resp: 2, def: 1.0,
               desc: 'Casa noturna de fachada. Dá grana e fama na rua.' },
  desmanche: { label: 'Desmanche',   icon: '🔧', income: 150, heat: 2, resp: 0, def: 1.1,
               desc: 'Carro roubado entra inteiro, sai em peças.' },
  bar:       { label: 'Bar',         icon: '🍺', income: 60,  heat: 0, resp: 1, def: 1.0, recruit: 80,
               desc: 'Onde a molecada do bairro se junta. Bom pra recrutar.' },
  fliperama: { label: 'Fliperama',   icon: '🕹️', income: 80,  heat: 0, resp: 1, def: 1.0, recruit: 90,
               desc: 'Ponto de encontro das gangues de moto. Dá pra recrutar.' },
  mercado:   { label: 'Mercadão',    icon: '🏪', income: 180, heat: 1, resp: 1, def: 1.1,
               desc: 'Os comerciantes pagam “proteção” toda semana.' },
  porto:     { label: 'Porto',       icon: '🚢', income: 280, heat: 3, resp: 0, def: 1.3,
               desc: 'Contrabando pelo cais. O ponto mais lucrativo da cidade.' },
  policia:   { label: 'Delegacia',   icon: '🚓', income: 0,   heat: 0, resp: 0, def: 0,
               desc: 'Intocável. Seus pontos aqui perto geram +1 de calor por dia.' },
};

const RIVALS = {
  A: { name: 'Os Corvos', leader: 'Navalha', color: '#a855f7', aggr: 0.55,
       quotes: ['Tu tá pisando em terreno de corvo, moleque.', 'A Zona Industrial tem dono.', 'Vou te ensinar a voar... pra baixo.'] },
  B: { name: 'As Serpentes', leader: 'Dona Víbora', color: '#22c55e', aggr: 0.45,
       quotes: ['Quem morde a cobra morre de veneno.', 'A Vila é minha desde antes de tu nascer.', 'Paciência, querido. Serpente sabe esperar.'] },
  C: { name: 'Dragões do Cais', leader: 'Ryu', color: '#f97316', aggr: 0.35,
       quotes: ['O mar leva tudo, até gente teimosa.', 'No Cais, quem manda é o Dragão.', 'Honra se ganha na rua, não na conversa.'] },
};

// [nome, tipo, x, y, dono, guardas]   dono: 'P' você, A/B/C rivais, null neutro, 'X' polícia
const MAP = [
  ['QG do Farol',          'hq',         150, 120, 'P', 4],  // 0
  ['Boca da Escadaria',    'boca',       290,  90, null, 2], // 1
  ['Bar do Tonhão',        'bar',        110, 270, null, 2], // 2
  ['Inferninho Lua Rubra', 'inferninho', 330, 235, null, 3], // 3
  ['Fliperama Neon',       'fliperama',  480, 130, null, 2], // 4
  ['Boca da Praça',        'boca',       520, 300, null, 3], // 5
  ['Mercadão',             'mercado',    660, 210, null, 4], // 6
  ['QG dos Corvos',        'hq',         850, 100, 'A', 6],  // 7
  ['Desmanche da Linha',   'desmanche',  700,  80, 'A', 3],  // 8
  ['Boca do Viaduto',      'boca',       890, 260, 'A', 3],  // 9
  ['Inferninho Paraíso',   'inferninho', 420, 420, null, 3], // 10
  ['13ª Delegacia',        'policia',    570, 470, 'X', 0],  // 11
  ['QG das Serpentes',     'hq',         140, 560, 'B', 6],  // 12
  ['Boca do Campinho',     'boca',       270, 460, 'B', 3],  // 13
  ['Bar da Esquina',       'bar',        300, 610, 'B', 3],  // 14
  ['Cais 7',               'porto',      730, 470, null, 5], // 15
  ['QG dos Dragões',       'hq',         890, 590, 'C', 6],  // 16
  ['Boate Maré Alta',      'inferninho', 660, 610, 'C', 3],  // 17
  ['Boca do Cais',         'boca',       880, 420, 'C', 3],  // 18
  ['Ferro Velho',          'desmanche',  480, 590, null, 3], // 19
];

const EDGES = [
  [0,1],[0,2],[1,3],[1,4],[2,3],[2,13],[3,5],[3,10],[4,5],[4,6],[5,6],[5,10],
  [6,8],[6,9],[8,7],[7,9],[9,18],[6,15],[5,15],[10,13],[10,19],[12,13],[12,14],
  [13,14],[14,19],[19,17],[19,15],[15,17],[15,18],[17,16],[18,16],
];

const DISTRICTS = [
  ['MORRO DO FAROL', 210, 175, 190, '#ef444410'],
  ['ZONA INDUSTRIAL', 810, 170, 180, '#a855f712'],
  ['CENTRO', 540, 250, 160, '#facc1508'],
  ['VILA ESPERANÇA', 230, 545, 180, '#22c55e10'],
  ['CAIS', 790, 530, 180, '#f9731610'],
];

const PLAYER_COLORS = ['#ef4444', '#facc15', '#06b6d4', '#ec4899'];

// ===================== ESTADO =====================
let state = null;
const ui = { selected: 0, send: 3, recruitN: 1 };

const ADJ = MAP.map(() => []);
EDGES.forEach(([a, b]) => { ADJ[a].push(b); ADJ[b].push(a); });

const $ = (s) => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const money = (v) => '$' + Math.round(v).toLocaleString('pt-BR');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function newGame(opts) {
  state = {
    day: 1, money: 800, free: 6, respect: 10, heat: 0,
    actions: ACTIONS_PER_DAY, bribed: false, recruited: 0,
    player: { gang: opts.gang, leader: opts.leader, color: opts.color },
    nodes: MAP.map(([name, type, x, y, owner, guards], id) => ({ id, name, type, x, y, owner, guards, level: 1 })),
    rivals: {},
    log: [], over: null,
  };
  for (const id in RIVALS) state.rivals[id] = { money: 500, reserve: 5, alive: true };
  ui.selected = 0;
  log(`${opts.leader} reúne o ${opts.gang} no alto do Morro do Farol. A cidade vai conhecer esse nome.`, 'big');
  log(`As gangues ainda estão te medindo. Você tem ${TRUCE_DAYS - 1} dias antes de começarem a vir pra cima.`, 'warn');
  save();
  render();
}

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* sem espaço */ } }
function load() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.nodes) { state = s; return true; } } catch (e) {}
  return false;
}

function log(msg, kind = '') {
  state.log.unshift({ d: state.day, msg, kind });
  if (state.log.length > 80) state.log.pop();
}

// ===================== REGRAS =====================
const lvlMult = (n) => 1 + 0.5 * (n.level - 1);
const nodeIncome = (n) => Math.round(TYPES[n.type].income * lvlMult(n));
const defMult = (n) => TYPES[n.type].def * (1 + 0.25 * (n.level - 1));
const estDef = (n) => n.guards * defMult(n);
const ownerColor = (o) => o === 'P' ? state.player.color : o === 'X' ? '#3b82f6' : o ? RIVALS[o].color : '#64748b';
const ownerName = (o) => o === 'P' ? state.player.gang : o === 'X' ? 'Polícia' : o ? RIVALS[o].name : 'Neutro';
const nearPolice = (n) => Math.hypot(n.x - MAP[11][2], n.y - MAP[11][3]) < POLICE_RADIUS;
const reachable = (n, owner = 'P') => n.owner !== owner && n.owner !== 'X' && ADJ[n.id].some((m) => state.nodes[m].owner === owner);
const totalSoldiers = () => state.free + state.nodes.filter((n) => n.owner === 'P').reduce((s, n) => s + n.guards, 0);
const recruitCap = () => 3 + Math.floor(state.respect / 15);
const bribeCost = () => 150 + Math.round(state.heat * 6);
const upgradeCost = (n) => 400 * n.level;
const negotiateCost = (n) => Math.max(150, 250 + n.guards * 150 + (n.level - 1) * 150 - state.respect * 3);

function forecast() {
  let inc = 0, heat = 0;
  state.nodes.filter((n) => n.owner === 'P').forEach((n) => {
    inc += nodeIncome(n); heat += TYPES[n.type].heat + (nearPolice(n) ? 1 : 0);
  });
  return { inc, heat, upkeep: totalSoldiers() * UPKEEP };
}

function fight(sent, resp, node) {
  const def = estDef(node) * rnd(0.75, 1.25) + (node.owner ? 0.5 : 0);
  const att = sent * (1 + resp / 200) * rnd(0.75, 1.25);
  if (att > def) {
    const losses = Math.min(sent - 1, Math.round(sent * Math.min(0.8, (def / att) * 0.6)));
    return { win: true, survivors: sent - losses, losses, defLosses: node.guards };
  }
  const losses = Math.round(sent * rnd(0.5, 0.8));
  const defLosses = Math.min(node.guards, Math.round(node.guards * (att / Math.max(def, 0.1)) * 0.4));
  return { win: false, survivors: sent - losses, losses, defLosses };
}

function doAttack(att, sent, node) {
  const resp = att === 'P' ? state.respect : 15 + state.day * 1.5;
  const prev = node.owner;
  const r = fight(sent, resp, node);
  if (r.win) {
    node.owner = att;
    node.guards = r.survivors;
    if (node.type === 'hq' && prev && prev !== 'P') eliminate(prev, att);
  } else {
    node.guards = Math.max(0, node.guards - r.defLosses);
    if (att === 'P') state.free += r.survivors; else state.rivals[att].reserve += r.survivors;
  }
  return { r, prev };
}

function eliminate(rid, by) {
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
function playerAttack(id) {
  const n = state.nodes[id];
  const send = clamp(ui.send, 1, state.free);
  if (state.actions <= 0 || send <= 0 || !reachable(n)) return;
  state.actions--; state.free -= send;
  state.heat = clamp(state.heat + (n.owner ? 6 : 3), 0, 100);
  const { r, prev } = doAttack('P', send, n);
  if (r.win) {
    state.respect = clamp(state.respect + (prev ? 6 : 3), 0, 100);
    log(`✊ ${n.name} agora é do ${state.player.gang}! Perdemos ${r.losses}, ${r.survivors} ficaram de guarda.`, 'good');
    if (prev && state.rivals[prev] && state.rivals[prev].alive) log(`${RIVALS[prev].leader}: “${pick(RIVALS[prev].quotes)}”`, 'rival');
  } else {
    state.respect = clamp(state.respect - 3, 0, 100);
    log(`🩸 Ataque a ${n.name} falhou. ${r.losses} dos nossos caíram, derrubamos ${r.defLosses} deles.`, 'bad');
  }
  ui.send = Math.min(ui.send, Math.max(1, state.free));
  afterAction();
}

function playerNegotiate(id) {
  const n = state.nodes[id];
  const cost = negotiateCost(n);
  if (state.actions <= 0 || n.owner !== null || state.respect < 20 || state.money < cost || !reachable(n)) return;
  state.actions--; state.money -= cost;
  n.owner = 'P'; n.guards = 0;
  log(`🤝 Fechou acordo com o pessoal do ${n.name} por ${money(cost)}. O ponto é nosso, mas está sem guarda.`, 'good');
  afterAction();
}

function moveGuards(id, delta) {
  const n = state.nodes[id];
  if (n.owner !== 'P') return;
  if (delta === 'all') { n.guards += state.free; state.free = 0; }
  else if (delta === 'none') { state.free += n.guards; n.guards = 0; }
  else if (delta > 0 && state.free > 0) { n.guards++; state.free--; }
  else if (delta < 0 && n.guards > 0) { n.guards--; state.free++; }
  afterAction();
}

function recruit(id) {
  const n = state.nodes[id];
  const t = TYPES[n.type];
  const qty = clamp(ui.recruitN, 1, recruitCap() - state.recruited);
  if (n.owner !== 'P' || !t.recruit || qty <= 0 || state.money < t.recruit * qty) return;
  state.money -= t.recruit * qty; state.free += qty; state.recruited += qty;
  log(`🧢 ${qty} novo(s) soldado(s) entraram pro bonde no ${n.name}.`, 'good');
  ui.recruitN = 1;
  afterAction();
}

function upgrade(id) {
  const n = state.nodes[id];
  const cost = upgradeCost(n);
  if (n.owner !== 'P' || n.level >= 3 || state.money < cost) return;
  state.money -= cost; n.level++;
  log(`⬆️ ${n.name} foi melhorado para o nível ${n.level}. Mais grana e mais difícil de tomar.`, 'good');
  afterAction();
}

function bribe() {
  const cost = bribeCost();
  if (state.bribed || state.money < cost || state.heat <= 0) return;
  state.money -= cost; state.bribed = true;
  state.heat = clamp(state.heat - 25, 0, 100);
  log(`💼 Molhou a mão do delegado com ${money(cost)}. A polícia vai fazer vista grossa por um tempo.`, 'warn');
  afterAction();
}

function afterAction() { checkEnd(); save(); render(); }

// ===================== FIM DO DIA =====================
function endDay() {
  if (state.over) return;
  const f = forecast();
  state.money += f.inc;
  state.nodes.filter((n) => n.owner === 'P').forEach((n) => { state.respect += TYPES[n.type].resp; });
  state.respect = clamp(state.respect, 0, 100);
  state.heat = clamp(state.heat + f.heat - 3, 0, 100);

  // folha de pagamento
  if (state.money >= f.upkeep) {
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

  policeRaid();
  for (const id of ['A', 'B', 'C']) { rivalTurn(id); if (state.over) break; }
  if (!state.over) randomEvent();

  state.day++;
  state.actions = ACTIONS_PER_DAY; state.bribed = false; state.recruited = 0;
  checkEnd(); save(); render();
}

function policeRaid() {
  if (state.heat < 50) return;
  if (Math.random() > (state.heat - 40) / 100) return;
  const mine = state.nodes.filter((n) => n.owner === 'P' && n.type !== 'hq');
  if (!mine.length) return;
  const weighted = mine.flatMap((n) => Array(TYPES[n.type].heat + 1).fill(n));
  const n = pick(weighted);
  const lostG = Math.ceil(n.guards / 2);
  const lostM = Math.round(state.money * rnd(0.1, 0.2));
  n.guards -= lostG; state.money -= lostM;
  state.respect = clamp(state.respect - 3, 0, 100);
  if (state.heat >= 90) {
    state.free += n.guards; n.owner = null; n.guards = 1;
    log(`🚨 MEGAOPERAÇÃO no ${n.name}! A polícia fechou o ponto: ${lostG} presos, ${money(lostM)} apreendidos e perdemos o local.`, 'bad');
  } else {
    log(`🚨 Batida policial no ${n.name}: ${lostG} presos e ${money(lostM)} apreendidos.`, 'bad');
  }
  state.heat = clamp(state.heat - 25, 0, 100);
}

function rivalTurn(id) {
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

function randomEvent() {
  if (Math.random() > 0.3) return;
  const ownInf = state.nodes.some((n) => n.owner === 'P' && n.type === 'inferninho');
  const events = [
    () => { state.money += 200; log('🎒 Um olheiro achou uma mochila esquecida num dos pontos. +$200', 'good'); },
    () => { if (state.respect < 15) return; state.free += 2; log('🏍️ Dois moleques de moto pediram pra entrar pro bonde. +2 soldados', 'good'); },
    () => { state.heat = clamp(state.heat + 8, 0, 100); log('📰 Saiu matéria no jornal sobre a guerra de gangues. Calor +8', 'warn'); },
    () => { if (!ownInf) return; state.respect = clamp(state.respect + 5, 0, 100); log('🎉 A festa de sábado no inferninho bombou. Todo mundo comentando. +5 respeito', 'good'); },
    () => { if (state.free <= 0) return; state.free--; log('🚔 Um dos seus foi pego numa blitz. -1 soldado', 'bad'); },
    () => { const r = pick(['A', 'B', 'C'].filter((k) => state.rivals[k].alive)); if (!r) return; state.rivals[r].reserve = Math.max(0, state.rivals[r].reserve - 2); log(`🗞️ Racha interno: ${RIVALS[r].name} perderam 2 soldados numa briga entre eles.`, 'rival'); },
  ];
  pick(events)();
}

function checkEnd() {
  if (state.over) return;
  if (state.nodes[0].owner !== 'P') state.over = 'lose';
  else if (Object.values(state.rivals).every((r) => !r.alive)) state.over = 'win';
  if (state.over) setTimeout(showEnd, 50);
}

// ===================== RENDER =====================
function render() {
  renderHUD(); renderMap(); renderPanel(); renderLog();
  document.documentElement.style.setProperty('--accent', state.player.color);
}

function renderHUD() {
  const f = forecast();
  const balance = f.inc - f.upkeep;
  $('#hud').innerHTML = `
    <div class="brand">DOMÍNIO<small>${esc(state.player.gang)} · chefe ${esc(state.player.leader)}</small></div>
    <div class="stat"><span>Dia</span><b>${state.day}</b></div>
    <div class="stat"><span>Caixa</span><b>${money(state.money)}</b></div>
    <div class="stat" title="Renda dos pontos menos o salário dos soldados"><span>Saldo/dia</span><b style="color:${balance >= 0 ? '#86efac' : '#fca5a5'}">${balance >= 0 ? '+' : ''}${money(balance)}</b></div>
    <div class="stat" title="Soldados livres / total"><span>Soldados</span><b>${state.free} / ${totalSoldiers()}</b></div>
    <div class="stat"><span>Respeito</span><b>⭐ ${state.respect}</b></div>
    <div class="stat" title="Acima de 50 a polícia pode fazer batidas"><span>Calor ${Math.round(state.heat)} (${f.heat - 3 >= 0 ? '+' : ''}${f.heat - 3}/dia)</span><div class="heatbar"><i style="width:${state.heat}%"></i></div></div>
    <div class="stat"><span>Ações</span><b>${'⚡'.repeat(state.actions)}${'·'.repeat(ACTIONS_PER_DAY - state.actions)}</b></div>
    <div class="spacer"></div>
    <div class="btns">
      <button onclick="bribe()" ${state.bribed || state.money < bribeCost() || state.heat <= 0 ? 'disabled' : ''} title="Diminui o calor em 25 (1x por dia)">💼 Subornar (${money(bribeCost())})</button>
      <button class="primary" onclick="endDay()" ${state.over ? 'disabled' : ''}>Encerrar dia ▶</button>
      <button onclick="showHelp()">❔</button>
      <button onclick="confirmNew()">↺</button>
    </div>`;
}

function renderMap() {
  const s = [];
  s.push(`<defs><radialGradient id="sea" cx="100%" cy="100%" r="70%"><stop offset="0" stop-color="#0c4a6e" stop-opacity=".55"/><stop offset="1" stop-color="#0c4a6e" stop-opacity="0"/></radialGradient></defs>`);
  s.push(`<path d="M1000,330 C900,380 820,330 760,400 C700,470 620,520 600,680 L1000,680 Z" fill="url(#sea)"/>`);
  DISTRICTS.forEach(([name, x, y, r, c]) => {
    s.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`);
    s.push(`<text class="district" x="${x}" y="${y + r - 30}">${name}</text>`);
  });
  s.push(`<circle cx="${MAP[11][2]}" cy="${MAP[11][3]}" r="${POLICE_RADIUS}" fill="#3b82f608" stroke="#3b82f633" stroke-dasharray="4 8"/>`);
  EDGES.forEach(([a, b]) => {
    const A = state.nodes[a], B = state.nodes[b];
    s.push(`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#23233a" stroke-width="12" stroke-linecap="round"/>`);
    s.push(`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#3a3a55" stroke-width="2" stroke-dasharray="8 10"/>`);
  });
  state.nodes.forEach((n) => {
    const t = TYPES[n.type];
    const col = ownerColor(n.owner);
    const sel = ui.selected === n.id;
    const canHit = reachable(n) && !state.over;
    s.push(`<g class="node${sel ? ' selected' : ''}" data-id="${n.id}" onclick="selectNode(${n.id})">`);
    if (canHit) s.push(`<circle class="target" cx="${n.x}" cy="${n.y}" r="38"/>`);
    s.push(`<circle class="ring" cx="${n.x}" cy="${n.y}" r="28" stroke="${col}"/>`);
    s.push(`<text class="emoji" x="${n.x}" y="${n.y + 1}">${t.icon}</text>`);
    s.push(`<text class="label" x="${n.x}" y="${n.y + 46}">${esc(n.name)}${n.level > 1 ? ' ' + '★'.repeat(n.level - 1) : ''}</text>`);
    if (n.type !== 'policia') {
      s.push(`<g class="badge"><circle cx="${n.x + 22}" cy="${n.y - 22}" r="12" fill="${col}" stroke="#0b0b12" stroke-width="2"/><text x="${n.x + 22}" y="${n.y - 21}">${n.guards}</text></g>`);
    }
    s.push(`</g>`);
  });
  $('#map').innerHTML = s.join('');
}

function renderPanel() {
  const n = state.nodes[ui.selected];
  const t = TYPES[n.type];
  const col = ownerColor(n.owner);
  const h = [];
  h.push(`<h2>${t.icon} ${esc(n.name)}</h2>`);
  h.push(`<div class="sub">${t.label}${n.level > 1 ? ` nível ${n.level}` : ''} · <b style="color:${col}">${esc(ownerName(n.owner))}</b></div>`);
  h.push(`<div class="desc">${t.desc}</div>`);

  if (n.type !== 'policia') {
    h.push(`<div class="grid">
      <div>💵 Renda/dia <b>${money(nodeIncome(n))}</b></div>
      <div>🔥 Calor/dia <b>+${t.heat + (nearPolice(n) ? 1 : 0)}</b></div>
      <div>⭐ Respeito/dia <b>+${t.resp}</b></div>
      <div>🛡️ ${n.owner ? 'Guardas' : 'Resistência'} <b>${n.guards}</b></div>
    </div>`);
  }

  if (state.over) { $('#panel').innerHTML = h.join(''); return; }

  if (n.owner === 'P') {
    h.push(`<div class="act"><h4>🛡️ Guardas no ponto: ${n.guards}</h4><div class="row">
      <button onclick="moveGuards(${n.id},-1)" ${n.guards <= 0 ? 'disabled' : ''}>− 1</button>
      <button onclick="moveGuards(${n.id},1)" ${state.free <= 0 ? 'disabled' : ''}>+ 1</button>
      <button onclick="moveGuards(${n.id},'all')" ${state.free <= 0 ? 'disabled' : ''}>Pôr todos os livres (${state.free})</button>
      <button onclick="moveGuards(${n.id},'none')" ${n.guards <= 0 ? 'disabled' : ''}>Tirar todos</button>
    </div><div class="note">Mover soldados não gasta ação. Ponto sem guarda é presa fácil.</div></div>`);

    if (t.recruit) {
      const left = recruitCap() - state.recruited;
      ui.recruitN = clamp(ui.recruitN, 1, Math.max(1, left));
      const cost = t.recruit * ui.recruitN;
      h.push(`<div class="act"><h4>🧢 Recrutar (${money(t.recruit)} cada)</h4><div class="row">
        <button onclick="ui.recruitN--;renderPanel()" ${ui.recruitN <= 1 ? 'disabled' : ''}>−</button>
        <b>${ui.recruitN}</b>
        <button onclick="ui.recruitN++;renderPanel()" ${ui.recruitN >= left ? 'disabled' : ''}>+</button>
        <button class="primary" onclick="recruit(${n.id})" ${left <= 0 || state.money < cost ? 'disabled' : ''}>Recrutar por ${money(cost)}</button>
      </div><div class="note">Ainda dá pra recrutar ${Math.max(0, left)} hoje. Mais respeito = mais gente querendo entrar.</div></div>`);
    }

    if (n.level < 3 && n.type !== 'hq') {
      h.push(`<div class="act"><h4>⬆️ Melhorar para nível ${n.level + 1}</h4><div class="row">
        <button onclick="upgrade(${n.id})" ${state.money < upgradeCost(n) ? 'disabled' : ''}>Investir ${money(upgradeCost(n))}</button>
      </div><div class="note">+50% de renda e +25% de defesa.</div></div>`);
    }
  } else if (n.type === 'policia') {
    h.push(`<div class="note">Use o botão 💼 Subornar lá em cima pra esfriar o calor.</div>`);
  } else if (!reachable(n)) {
    h.push(`<div class="act"><h4>🚫 Fora do alcance</h4><div class="note">Domine um ponto ligado a este pela rua primeiro. Os pontos com círculo pontilhado são os que você pode atacar.</div></div>`);
  } else {
    const maxSend = state.free;
    ui.send = clamp(ui.send, 1, Math.max(1, maxSend));
    const myPow = ui.send * (1 + state.respect / 200);
    const theirPow = estDef(n) + (n.owner ? 0.5 : 0);
    const ratio = myPow / Math.max(theirPow, 0.1);
    const odds = ratio >= 1.5 ? ['Vitória quase certa', '#86efac'] : ratio >= 1.15 ? ['Boa chance', '#bef264'] : ratio >= 0.85 ? ['Cara ou coroa', '#fcd34d'] : ['Suicídio', '#fca5a5'];
    if (n.owner && RIVALS[n.owner]) h.push(`<div class="quote">${RIVALS[n.owner].leader}: “${RIVALS[n.owner].quotes[n.id % 3]}”</div>`);
    h.push(`<div class="act"><h4>⚔️ ${n.owner ? 'Atacar' : 'Dominar na força'}</h4>
      ${maxSend > 0 ? `<input type="range" min="1" max="${maxSend}" value="${ui.send}" oninput="ui.send=+this.value;renderPanel()">
      <div class="row" style="justify-content:space-between"><span>Mandar <b>${ui.send}</b> de ${maxSend} livres</span><b style="color:${odds[1]}">${odds[0]}</b></div>` : `<div class="note">Você não tem soldados livres. Tire guardas de algum ponto ou recrute.</div>`}
      <div class="row" style="margin-top:8px"><button class="primary" onclick="playerAttack(${n.id})" ${state.actions <= 0 || maxSend <= 0 ? 'disabled' : ''}>${n.owner ? 'Partir pra cima' : 'Tomar o ponto'} (1 ⚡)</button></div>
      <div class="note">Os sobreviventes ficam de guarda no ponto conquistado. Atacar aumenta o calor.</div></div>`);
    if (n.owner === null) {
      const c = negotiateCost(n);
      h.push(`<div class="act"><h4>🤝 Negociar</h4><div class="row">
        <button onclick="playerNegotiate(${n.id})" ${state.actions <= 0 || state.respect < 20 || state.money < c ? 'disabled' : ''}>Comprar o ponto por ${money(c)} (1 ⚡)</button>
      </div><div class="note">${state.respect < 20 ? 'Precisa de 20 de respeito pra te levarem a sério.' : 'Sem sangue e sem calor, mas o ponto chega sem guardas.'}</div></div>`);
    }
  }
  $('#panel').innerHTML = h.join('');
}

function renderLog() {
  $('#log').innerHTML = state.log.map((l) => `<li class="${l.kind}"><span class="d">D${l.d}</span>${esc(l.msg)}</li>`).join('');
}

function selectNode(id) { ui.selected = id; renderMap(); renderPanel(); }

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ===================== MODAIS =====================
function showModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }

function showStart() {
  let color = PLAYER_COLORS[0];
  showModal(`
    <h1>DOMÍNIO</h1>
    <p>Porto Neon está dividida entre três gangues. Você só tem um barraco no alto do morro, seis moleques de confiança e muita vontade. Recrute, domine os pontos, tome os QGs rivais e vire o dono da cidade.</p>
    <label>Nome do seu bonde</label><input type="text" id="gName" value="Bonde do Farol" maxlength="24">
    <label>Seu vulgo</label><input type="text" id="lName" value="Felp" maxlength="18">
    <label>Cor do bonde</label>
    <div class="colors">${PLAYER_COLORS.map((c, i) => `<button style="background:${c}" class="${i ? '' : 'sel'}" data-c="${c}"></button>`).join('')}</div>
    <div class="row" style="margin-top:18px;display:flex;gap:8px"><button class="primary" id="startBtn">Começar ▶</button><button onclick="showHelp(true)">Como jogar</button></div>`);
  document.querySelectorAll('.colors button').forEach((b) => b.onclick = () => {
    document.querySelectorAll('.colors button').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel'); color = b.dataset.c;
  });
  $('#startBtn').onclick = () => {
    newGame({ gang: $('#gName').value.trim() || 'Bonde do Farol', leader: $('#lName').value.trim() || 'Chefe', color });
    closeModal();
  };
}

function showHelp(fromStart) {
  showModal(`
    <h1>Como jogar</h1>
    <ul>
      <li><b>Objetivo:</b> tomar os QGs dos Corvos, das Serpentes e dos Dragões. Se o seu QG cair, você perde.</li>
      <li><b>Pontos:</b> cada ponto dá renda todo dia. Bocas e o porto dão mais grana, mas geram mais <b>calor</b>.</li>
      <li><b>Ações (⚡):</b> você tem ${ACTIONS_PER_DAY} por dia pra atacar ou negociar. Mover guardas, recrutar e melhorar não gastam ação.</li>
      <li><b>Alcance:</b> só dá pra atacar pontos ligados pela rua a um ponto seu (círculo pontilhado).</li>
      <li><b>Soldados:</b> cada um custa ${money(UPKEEP)} por dia. Se faltar dinheiro, uns largam o bonde.</li>
      <li><b>Respeito:</b> deixa seus ataques mais fortes, libera recrutamento e negociação.</li>
      <li><b>Calor:</b> acima de 50 a polícia faz batidas. Acima de 90 ela fecha o ponto. Suborne pra esfriar.</li>
      <li><b>Rivais:</b> crescem, recrutam e brigam entre si. Depois do dia ${TRUCE_DAYS} começam a vir pra cima de você.</li>
      <li>O jogo salva sozinho no navegador.</li>
    </ul>
    <button class="primary" onclick="${fromStart ? 'showStart()' : 'closeModal()'}">${fromStart ? 'Voltar' : 'Bora'}</button>`);
}

function confirmNew() {
  showModal(`<h1>Novo jogo?</h1><p>O jogo atual vai ser perdido.</p>
    <div style="display:flex;gap:8px"><button class="danger" onclick="localStorage.removeItem(SAVE_KEY);showStart()">Começar do zero</button><button onclick="closeModal()">Cancelar</button></div>`);
}

function showEnd() {
  if (state.over === 'win') {
    showModal(`<h1>👑 DONO DA CIDADE</h1><p>No dia ${state.day}, o ${esc(state.player.gang)} derrubou o último QG rival. Porto Neon agora responde a ${esc(state.player.leader)}.</p>
      <p>Caixa final: <b>${money(state.money)}</b> · Respeito: <b>${state.respect}</b> · Pontos: <b>${state.nodes.filter((n) => n.owner === 'P').length}</b></p>
      <div style="display:flex;gap:8px"><button class="primary" onclick="localStorage.removeItem(SAVE_KEY);showStart()">Jogar de novo</button><button onclick="closeModal()">Ver o mapa</button></div>`);
  } else {
    showModal(`<h1>☠️ FIM DA LINHA</h1><p>O QG do Farol caiu no dia ${state.day}. O ${esc(state.player.gang)} virou história de bar.</p>
      <div style="display:flex;gap:8px"><button class="primary" onclick="localStorage.removeItem(SAVE_KEY);showStart()">Tentar de novo</button><button onclick="closeModal()">Ver o mapa</button></div>`);
  }
}

// ===================== INÍCIO =====================
if (load()) { render(); if (state.over) showEnd(); }
else {
  state = { day: 1, money: 0, free: 0, respect: 0, heat: 0, actions: 0, recruited: 0, player: { gang: '', leader: '', color: PLAYER_COLORS[0] },
    nodes: MAP.map(([name, type, x, y, owner, guards], id) => ({ id, name, type, x, y, owner, guards, level: 1 })), rivals: {}, log: [], over: null };
  render();
  showStart();
}
