// Teste do save versionado: um save legado (v0.1–v0.4) precisa abrir na versão atual.
// Uso: node sim/save.test.mjs
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
const { loadGame, saveGame, clearSave, SAVE_VERSION } = await import('../src/core/save.js');
const { freshNodes, load, state } = await import('../src/core/state.js');

const legacy = {
  day: 12, money: 3400, free: 2, respect: 30, heat: 40, actions: 3, bribed: true, recruited: 0,
  player: { gang: 'Bonde do Farol', leader: 'Felp', color: '#ef4444' },
  nodes: freshNodes().map(({ lowkey, ...n }) => n),
  rivals: { A: { money: 1, reserve: 1, alive: true } }, log: [], over: null,
};
mem.set('dominio-save-v1', JSON.stringify(legacy));

const s = loadGame();
assert.equal(s.needsCrew, true, 'v2→v3 marca o save pra ganhar o bonde');
assert.equal(s.day, 12);
assert.equal(s.bribeDays, 0, 'bribeDays criado');
assert.equal('bribed' in s, false, 'campo antigo retirado');
assert.equal(s.nodes.every((n) => n.lowkey === false), true, 'lowkey padronizado');

saveGame(s);
const wrapped = JSON.parse(mem.get('dominio-save'));
assert.equal(wrapped.version, SAVE_VERSION);
assert.equal(loadGame().money, 3400, 'formato novo tem prioridade e abre');

// Carregando pelo state.js, o save antigo ganha Comandante, vice e capitães, sem mexer no caixa.
mem.set('dominio-save-v1', JSON.stringify(legacy)); mem.delete('dominio-save');
assert.equal(load(), true);
assert.equal(state.cmd.vulgo, 'Felp');
assert.equal(state.members.filter((m) => m.role === 'vice').length, 1);
assert.equal(state.members.filter((m) => m.role === 'cap').length, 2);
assert.equal(state.money, 3400, 'caixa preservado');
assert.equal(state.introPending, true);
assert.equal(JSON.parse(mem.get('dominio-save')).version, SAVE_VERSION, 'regravado no formato atual');

clearSave();
assert.equal(loadGame(), null, 'novo jogo limpa os dois formatos');
console.log(`save: ok (legado → v${SAVE_VERSION})`);
