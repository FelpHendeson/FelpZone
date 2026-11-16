'use strict';
// Regras, dados e estado do jogo. A interface (mapa, câmera, HUD) fica em ui.js.

// ===================== DADOS =====================
const SAVE_KEY = 'dominio-save-v1';
const UPKEEP = 12;          // custo diário por soldado
const ACTIONS_PER_DAY = 3;
const TRUCE_DAYS = 4;       // rivais não atacam você antes deste dia
const POLICE_RADIUS = 210;
const HEAT_PER_POINT = 2.6;  // multiplica a soma da visada dos seus pontos para formar o alvo de visada
const HEAT_DRIFT = 0.35;     // quanto a visada anda em direção ao alvo por dia
const BRIBE_DAYS = 3;        // dias de vista grossa depois do suborno

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
               desc: 'Intocável. Seus pontos aqui perto ficam mais visados (+1).' },
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
    actions: ACTIONS_PER_DAY, bribeDays: 0, recruited: 0,
    player: { gang: opts.gang, leader: opts.leader, color: opts.color },
    nodes: MAP.map(([name, type, x, y, owner, guards], id) => ({ id, name, type, x, y, owner, guards, level: 1 })),
    rivals: {},
    log: [], over: null,
  };
  for (const id in RIVALS) state.rivals[id] = { money: 500, reserve: 5, alive: true };
  log(`${opts.leader} reúne o ${opts.gang} no alto do Morro do Farol. A cidade vai conhecer esse nome.`, 'big');
  log(`As gangues ainda estão te medindo. Você tem ${TRUCE_DAYS - 1} dias antes de começarem a vir pra cima.`, 'warn');
  save();
  onNewGame();
}

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* sem espaço */ } }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.nodes) { if (s.bribeDays === undefined) s.bribeDays = 0; delete s.bribed; state = s; return true; }
  } catch (e) {}
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
const bribeCost = () => 150 + Math.round(forecast().target * 8);
const upgradeCost = (n) => 400 * n.level;
const negotiateCost = (n) => Math.max(150, 250 + n.guards * 150 + (n.level - 1) * 150 - state.respect * 3);

const nodeHeat = (n) => n.lowkey ? 0 : TYPES[n.type].heat + (nearPolice(n) ? 1 : 0);

function forecast() {
  let inc = 0, heat = 0;
  state.nodes.filter((n) => n.owner === 'P').forEach((n) => {
    if (!n.lowkey) inc += nodeIncome(n);
    heat += nodeHeat(n);
  });
  // alvo de visada: pra onde a pressão da polícia tende com o seu território atual
  let target = clamp(heat * HEAT_PER_POINT, 0, 100);
  if (state.bribeDays > 0) target /= 2;
  const next = clamp(state.heat + (target - state.heat) * HEAT_DRIFT, 0, 100);
  return { inc, heat, target: Math.round(target), next, upkeep: totalSoldiers() * UPKEEP };
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
    node.lowkey = false;
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
function playerAttack(id, sendWanted) {
  const n = state.nodes[id];
  const send = clamp(sendWanted, 1, state.free);
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

function toggleLowkey(id) {
  const n = state.nodes[id];
  if (n.owner !== 'P' || n.type === 'hq') return;
  n.lowkey = !n.lowkey;
  log(n.lowkey ? `🤫 ${n.name} baixou a poeira: sem movimento, sem renda e fora da mira da polícia.` : `🔊 ${n.name} voltou a funcionar.`, 'warn');
  afterAction();
}

function recruit(id, qtyWanted) {
  const n = state.nodes[id];
  const t = TYPES[n.type];
  const qty = clamp(qtyWanted, 1, recruitCap() - state.recruited);
  if (n.owner !== 'P' || !t.recruit || qty <= 0 || state.money < t.recruit * qty) return;
  state.money -= t.recruit * qty; state.free += qty; state.recruited += qty;
  log(`🧢 ${qty} novo(s) soldado(s) entraram pro bonde no ${n.name}.`, 'good');
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
  if (state.bribeDays > 0 || state.money < cost || state.heat <= 0) return;
  state.money -= cost; state.bribeDays = BRIBE_DAYS;
  state.heat = clamp(state.heat - 20, 0, 100);
  log(`💼 Molhou a mão do delegado com ${money(cost)}. Vista grossa por ${BRIBE_DAYS} dias: a pressão cai pela metade.`, 'warn');
  afterAction();
}

function afterAction() { checkEnd(); save(); render(); }

// ===================== FIM DO DIA =====================
function endDay() {
  if (state.over) return;
  const f = forecast();
  state.money += f.inc;
  state.nodes.filter((n) => n.owner === 'P' && !n.lowkey).forEach((n) => { state.respect += TYPES[n.type].resp; });
  state.respect = clamp(state.respect, 0, 100);
  state.heat = f.next;

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

  const endedDay = state.day;
  state.day++;
  state.actions = ACTIONS_PER_DAY; state.recruited = 0;
  if (state.bribeDays > 0) { state.bribeDays--; if (!state.bribeDays) log('👮 Acabou a vista grossa. A polícia voltou a olhar pra você.', 'warn'); }
  checkEnd(); save(); render();
  onDayEnd(endedDay);
}

function policeRaid() {
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
    state.free += n.guards; n.owner = null; n.guards = 1; n.lowkey = false;
    log(`🚨 MEGAOPERAÇÃO no ${n.name}! A polícia fechou o ponto: ${lostG} presos, ${money(lostM)} apreendidos e perdemos o local.`, 'bad');
  } else {
    log(`🚨 Batida policial no ${n.name}: ${lostG} presos e ${money(lostM)} apreendidos.`, 'bad');
  }
  state.heat = clamp(state.heat - 15, 0, 100);
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
    () => { state.heat = clamp(state.heat + 8, 0, 100); log('📰 Saiu matéria no jornal sobre a guerra de gangues. Visada +8', 'warn'); },
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

