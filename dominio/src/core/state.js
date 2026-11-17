// Estado da partida e ganchos para a interface. Nada aqui toca no DOM.
import { ACTIONS_PER_DAY, TRUCE_DAYS } from './config.js';
import { RIVALS } from '../data/rivals.js';
import { MAP } from '../data/maps/porto-neon.js';
import { saveGame, loadGame } from './save.js';

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
};

export function freshNodes() {
  return MAP.map(([name, type, x, y, owner, guards], id) => ({ id, name, type, x, y, owner, guards, level: 1, lowkey: false }));
}

export function newGame(opts) {
  replaceState({
    day: 1, money: 800, free: 6, respect: 10, heat: 0,
    actions: ACTIONS_PER_DAY, bribeDays: 0, recruited: 0,
    player: { gang: opts.gang, leader: opts.leader, color: opts.color },
    nodes: freshNodes(),
    rivals: {},
    log: [], over: null,
  });
  for (const id in RIVALS) state.rivals[id] = { money: 500, reserve: 5, alive: true };
  log(`${opts.leader} reúne o ${opts.gang} no alto do Morro do Farol. A cidade vai conhecer esse nome.`, 'big');
  log(`As gangues ainda estão te medindo. Você tem ${TRUCE_DAYS - 1} dias antes de começarem a vir pra cima.`, 'warn');
  save();
  hooks.newGame();
}

export function save() { saveGame(state); }
export function load() {
  const s = loadGame();
  if (!s) return false;
  replaceState(s);
  return true;
}

export function log(msg, kind = '') {
  state.log.unshift({ d: state.day, msg, kind });
  if (state.log.length > 80) state.log.pop();
}
