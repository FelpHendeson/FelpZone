// Estado da partida e ganchos para a interface. Nada aqui toca no DOM.
import { ERA, RIVALS, MAP, ACTIONS_PER_DAY, TRUCE_DAYS, useEra, mapRivals, P, T } from './era.js';
import { generateCity } from './mapgen.js';
import { saveGame, loadGame } from './save.js';
import { initCrew, defaultCrewOpts, makeMember } from './crew.js';

// O objeto é sempre o mesmo (os módulos importam a referência); trocar de partida substitui o conteúdo.
export const state = {};
export function replaceState(next) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, next);
}

// A interface pluga aqui o que fazer quando algo muda. A simulação deixa vazio.
export const hooks = {
  changed() {},        // estado mudou: redesenhar
  newGame() {},        // partida nova começou
  dayEnded(day) {},    // um dia terminou
  gameOver(result) {}, // 'win' ou 'lose'
  scene(id, ctx) {},    // cena de diálogo pedida pelas regras (traição, morte, nível...)
  objective(done, next) {}, // objetivo do tutorial cumprido
};

export function freshNodes() {
  return MAP.map(([name, type, x, y, owner, guards], id) => ({ id, name, type, x, y, owner, guards, level: 1, lowkey: false }));
}

// Campos de uma era nova (mapa, rivais, recursos iniciais).
export function eraFields(gang, leader, color) {
  const c = ERA.cfg;
  const rivals = {};
  for (const id of mapRivals()) rivals[id] = { money: c.rivalStartMoney, reserve: c.rivalStartReserve, alive: true };
  return {
    era: ERA.id, day: 1, money: c.startMoney, free: c.startFree, respect: c.startRespect, heat: 0,
    actions: ACTIONS_PER_DAY, bribeDays: 0, recruited: 0, motos: 0, warnings: 0, suspended: 0,
    stats: { recruited: 0, captured: 0, lots: 0, builds: 0, events: 0 }, objIdx: 0, arsenal: {}, buffs: [],
    player: { gang, leader, color }, nodes: freshNodes(), rivals, log: [], over: null,
  };
}
export function startLogs() {
  for (const [msg, kind] of ERA.text.start) log(T(msg, { leader: state.player.leader, gang: state.player.gang, 'trégua': TRUCE_DAYS - 1 }), kind);
}

// Ativa a era; se ela gera mapa, cria a cidade pela semente e devolve os dados pra guardar no save.
export function enterEra(id, seed, mapOpts = {}) {
  useEra(id);
  if (!ERA.generate) return null;
  const map = generateCity(seed ?? Math.floor(Math.random() * 1e9), undefined, mapOpts);
  useEra(id, map);
  return map;
}

// opts.era: 'escola' (campanha) ou 'cidade' (Modo Livre). Padrão: cidade. opts.mapSeed: semente da cidade.
export function newGame(opts) {
  const map = enterEra(opts.era || 'cidade', opts.mapSeed);
  replaceState(eraFields(opts.gang, opts.leader, opts.color));
  state.map = map;
  state.campaign = opts.era === 'escola';
  initCrew(opts.origin ? opts : { ...defaultCrewOpts(opts), ...opts });
  state.introPending = !opts.skipIntro;
  startLogs();
  save();
  hooks.newGame();
}

// Salto no tempo: o bonde da era atual segue para a próxima. Quem tem lealdade baixa segue outro caminho.
// opts: { gang, flag, jacket } opcionais para repaginar a marca.
export function advanceEra(nextId, opts = {}) {
  const keep = {
    cmd: state.cmd, members: state.members, flag: opts.flag || state.flag, jacket: opts.jacket || state.jacket,
    settings: state.settings, seenTips: state.seenTips, nextMemberId: state.nextMemberId, campaign: state.campaign,
    history: [...(state.history || []), { era: state.era, days: state.day, respect: state.respect }],
    motos: state.motos, arsenal: state.arsenal || {},
  };
  const timeskip = state.era === 'escola';      // escola → bairro: anos depois. bairro → cidade: expansão
  const carry = timeskip ? 0 : Math.round(state.money * 0.5);
  const gang = opts.gang || state.player.gang;
  const color = (opts.flag || state.flag).bg;
  const map = enterEra(nextId);
  replaceState({ ...eraFields(gang, state.player.leader, color), ...keep, map });
  // anos depois: quem era fiel continua (mais experiente); os outros seguiram a vida
  const stayed = [], left = [];
  for (const m of state.members) {
    if (m.status !== 'ok' && m.status !== 'hospital' && m.status !== 'preso') continue;
    if (!timeskip || m.loyalty >= 40) { m.status = 'ok'; m.node = null; m.timer = 0; m.level++; m.loyalty = Math.max(40, m.loyalty - 10); stayed.push(m); }
    else { m.status = 'saiu'; m.node = null; left.push(m); }
  }
  if (!stayed.some((m) => m.role === 'vice')) {
    const best = stayed.filter((m) => m.role === 'cap').sort((a, b) => b.loyalty - a.loyalty)[0];
    if (best) best.role = 'vice'; else { const v = makeMember('vice', Math.floor(Math.random() * 1e9)); state.members.push(v); stayed.push(v); }
  }
  while (state.members.filter((m) => m.status === 'ok' && m.role === 'cap').length < 2) {
    state.members.push(makeMember('cap', Math.floor(Math.random() * 1e9)));
  }
  state.money += Math.round((state.history.at(-1).respect || 0) * 8) + carry;   // respeito vira capital; na expansão, metade do caixa vem junto
  state.introPending = true;
  startLogs();
  for (const m of left) log(`🚶 ${m.name} “${m.vulgo}” seguiu outro caminho nesses anos.`, 'warn');
  save();
  hooks.newGame();
  return { stayed, left };
}

export function save() { saveGame(state); }
export function load() {
  const s = loadGame();
  if (!s) return false;
  replaceState(s);
  useEra(state.era || 'cidade', state.map || undefined);
  // mapa ganhou pontos novos (ex.: lotes da F3): completa o save antigo
  if (state.nodes.length < MAP.length) state.nodes.push(...freshNodes().slice(state.nodes.length));
  if (state.needsCrew) {
    delete state.needsCrew;
    const money0 = state.money;
    initCrew(defaultCrewOpts({ leader: state.player.leader, color: state.player.color }));
    state.money = money0;
    state.seenTips = { map: 1, attack: 1, endDay: 1, visada: 1 };   // quem já jogava não precisa do básico
    state.introPending = true;
    save();
  }
  return true;
}

export function log(msg, kind = '') {
  state.log.unshift({ d: state.day, msg, kind });
  if (state.log.length > 80) state.log.pop();
}
