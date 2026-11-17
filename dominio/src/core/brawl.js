// Briga de bonde: confronto em até 3 rodadas, usado quando o jogador ataca um QG.
// Cada rodada: Avançar, Segurar ou Cercar. Avançar vence Cercar, Cercar vence Segurar, Segurar vence Avançar.
// O Comandante pode "entrar na briga" uma vez (dano extra pela Força).
import { RIVALS } from './era.js';
import { state, save, hooks } from './state.js';
import { clamp, rnd } from './util.js';
import { commitAttack, estDef, playerAttackMult, applyResult, afterPlayerAttack, afterAction } from './rules.js';
import { attr } from './crew.js';

export const MOVES = {
  avancar: { label: 'Avançar', icon: '⚔️', beats: 'cercar', desc: 'Partir pra cima. Vence quem tenta cercar.' },
  segurar: { label: 'Segurar', icon: '🛡️', beats: 'avancar', desc: 'Aguentar o tranco. Vence quem avança.' },
  cercar:  { label: 'Cercar',  icon: '🌀', beats: 'segurar', desc: 'Fechar pelos lados. Vence quem só segura.' },
};
const MOVE_KEYS = Object.keys(MOVES);

// Estilo de cada rival: pesos pra Avançar/Segurar/Cercar. A leitura do inimigo dá uma pista (que pode enganar).
const STYLE = { A: [0.5, 0.2, 0.3], B: [0.25, 0.3, 0.45], C: [0.3, 0.45, 0.25], null: [0.33, 0.34, 0.33] };
const TELLS = {
  avancar: ['Eles estão se amontoando na frente, prontos pra correr.', 'O líder deles tá gritando pra partir pra cima.'],
  segurar: ['Eles fecharam a porta e estão firmes, esperando.', 'Ninguém se mexe do lado deles. Parece uma muralha.'],
  cercar:  ['Uns estão sumindo pelos lados...', 'Dá pra ver gente deles dando a volta pela outra rua.'],
};

function rivalPick(owner) {
  const w = STYLE[owner] || STYLE.null;
  const r = Math.random();
  return r < w[0] ? 'avancar' : r < w[0] + w[1] ? 'segurar' : 'cercar';
}
function prepareRound(b) {
  b.next = rivalPick(b.owner);
  // a leitura acerta 70% das vezes
  const shown = Math.random() < 0.7 ? b.next : MOVE_KEYS.filter((k) => k !== b.next)[Math.floor(Math.random() * 2)];
  b.tell = TELLS[shown][Math.floor(Math.random() * 2)];
}

export function startBrawl(nodeId, sendWanted) {
  const node = state.nodes[nodeId];
  const send = commitAttack(node, sendWanted);
  if (!send) return null;
  const my = send * (1 + state.respect / 200) * playerAttackMult();
  const their = estDef(node) + (node.owner ? 0.5 : 0);
  const b = {
    nodeId, owner: node.owner, send, guards: node.guards, my, their,
    myHP: 100, theirHP: 100, round: 1, maxRounds: 3, cmdUsed: false, history: [], done: false,
  };
  prepareRound(b);
  state.brawl = b;
  save();
  return b;
}

export function brawlRound(move, cmdIn = false) {
  const b = state.brawl;
  if (!b || b.done || !MOVES[move]) return null;
  const them = b.next;
  const ratio = b.my / Math.max(b.their, 0.1);
  let mine = 34 * Math.sqrt(ratio) * rnd(0.85, 1.15);
  let theirs = 34 / Math.sqrt(ratio) * rnd(0.85, 1.15);
  let outcome = 'empate';
  if (MOVES[move].beats === them) { mine *= 1.6; theirs *= 0.5; outcome = 'ganhou'; }
  else if (MOVES[them].beats === move) { mine *= 0.5; theirs *= 1.6; outcome = 'perdeu'; }
  const usedCmd = cmdIn && !b.cmdUsed;
  if (usedCmd) { mine *= 1.3 + 0.08 * attr('forca'); b.cmdUsed = true; }
  b.theirHP = clamp(b.theirHP - mine, 0, 100);
  b.myHP = clamp(b.myHP - theirs, 0, 100);
  b.history.push({ round: b.round, move, them, outcome, mine: Math.round(mine), theirs: Math.round(theirs), cmd: usedCmd });
  if (b.round >= b.maxRounds || b.myHP <= 0 || b.theirHP <= 0) finishBrawl(b);
  else { b.round++; prepareRound(b); }
  save();
  return b;
}

function finishBrawl(b) {
  b.done = true;
  b.win = b.theirHP < b.myHP;
  const node = state.nodes[b.nodeId];
  // sobreviventes proporcionais à força que sobrou
  const r = b.win
    ? { win: true, survivors: Math.max(1, Math.round(b.send * Math.max(0.3, b.myHP / 100))), defLosses: b.guards }
    : { win: false, survivors: Math.round(b.send * (b.myHP / 100) * 0.6), defLosses: Math.round(b.guards * (1 - b.theirHP / 100) * 0.6) };
  r.losses = b.send - r.survivors;
  const prev = applyResult('P', node, r);
  afterPlayerAttack(node, r, prev);
  b.result = r;
  b.rivalName = prev && RIVALS[prev] ? RIVALS[prev].name : node.name;
  hooks.fx('brawl', { win: b.win });
}

// Fecha a briga terminada e devolve o jogo ao normal.
export function closeBrawl() {
  if (!state.brawl) return;
  delete state.brawl;
  afterAction();
  hooks.changed();
}
