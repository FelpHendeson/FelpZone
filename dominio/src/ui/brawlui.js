// Tela da briga de bonde: duas forças, leitura do inimigo, Avançar/Segurar/Cercar e o Comandante entrando na briga.
import { RIVALS } from '../core/era.js';
import { state } from '../core/state.js';
import { MOVES, startBrawl, brawlRound, closeBrawl } from '../core/brawl.js';
import { randomLook, rng, attr } from '../core/crew.js';
import { avatarSVG, flagSVG } from './art.js';
import { sfx } from './sound.js';
import { shake } from './fx.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let onClose = () => {};
let cmdIn = false;
export function initBrawlUI(fn) { onClose = fn; }
export const brawlOpen = () => !$('#brawl').classList.contains('hidden');

// Rosto fixo pra cada líder rival (sempre o mesmo, a partir do nome).
function leaderLook(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return randomLook(rng(h));
}

export function brawlStart(nodeId, send) {
  cmdIn = false;
  if (!startBrawl(nodeId, send)) return;
  draw();
}
export function brawlMove(move) {
  const b = brawlRound(move, cmdIn);
  cmdIn = false;
  draw();
  if (!b) return;
  const last = b.history[b.history.length - 1];
  sfx('hit'); shake('#brawl .bx');
  if (b.done) setTimeout(() => sfx(b.win ? 'win' : 'lose'), 250);
  else if (last && last.outcome === 'ganhou') setTimeout(() => sfx('money'), 150);
}
export function brawlToggleCmd(v) { cmdIn = v; }
export function brawlClose() { $('#brawl').classList.add('hidden'); closeBrawl(); onClose(); }

function bar(v, col) { return `<div class="hp"><i style="width:${v}%;background:${col}"></i><span>${Math.round(v)}</span></div>`; }

function draw() {
  const b = state.brawl;
  if (!b) { $('#brawl').classList.add('hidden'); return; }
  const node = state.nodes[b.nodeId];
  const rv = b.owner && RIVALS[b.owner];
  const themName = rv ? rv.leader : `Resistência de ${node.name}`;
  const themColor = rv ? rv.color : '#64748b';
  const themJacket = { color: '#111827', accent: themColor };
  const last = b.history[b.history.length - 1];
  const verdict = (h) => (h.outcome === 'ganhou' ? '<b class="g">vocês levaram</b>' : h.outcome === 'perdeu' ? '<b class="r">eles levaram</b>' : '<b class="y">empate</b>');
  $('#brawl').innerHTML = `<div class="bx">
    <div class="bh"><b>👊 Briga de bonde: ${esc(node.name)}</b><small>${b.done ? 'Fim da briga' : `Rodada ${b.round}/${b.maxRounds}`} · ${b.send} dos seus contra ${b.guards} deles</small></div>
    <div class="sides">
      <div class="side">${avatarSVG(state.cmd.look, state.jacket, state.flag, { cls: 'avatar', ring: state.flag.bg })}
        <div class="sn">${flagSVG(state.flag)}<b>${esc(state.player.gang)}</b></div>${bar(b.myHP, state.flag.bg)}</div>
      <div class="vs">VS</div>
      <div class="side">${avatarSVG(leaderLook(themName), themJacket, null, { cls: 'avatar', ring: themColor, bg: '#2a1020' })}
        <div class="sn"><b>${esc(rv ? rv.name : 'Neutros')}</b><small>${esc(themName)}</small></div>${bar(b.theirHP, themColor)}</div>
    </div>
    ${last ? `<div class="hist">Rodada ${last.round}: você <b>${MOVES[last.move].icon} ${MOVES[last.move].label}</b>${last.cmd ? ' + 👊 entrou na briga' : ''}, eles <b>${MOVES[last.them].icon} ${MOVES[last.them].label}</b>. ${verdict(last)} (vocês −${last.theirs}, eles −${last.mine}).</div>` : ''}
    ${b.done ? `<div class="bres ${b.win ? 'g' : 'r'}">${b.win ? `VITÓRIA! ${esc(node.name)} é do ${esc(state.player.gang)}.` : 'Vocês recuaram. Não foi dessa vez.'}
        <small>${b.result.survivors} dos seus ${b.win ? 'ficaram de guarda' : 'voltaram'}; ${b.result.losses} caíram.</small></div>
      <button class="primary big" onclick="brawlClose()">Continuar ▶</button>`
    : `<div class="tell">👀 ${b.tell}</div>
      <div class="moves">${Object.entries(MOVES).map(([k, m]) => `<button onclick="brawlMove('${k}')"><span class="mi">${m.icon}</span><b>${m.label}</b><small>${m.desc}</small></button>`).join('')}</div>
      <label class="check"><input type="checkbox" ${b.cmdUsed ? 'disabled' : ''} onchange="brawlToggleCmd(this.checked)"> <span>👊 <b>${esc(state.cmd.vulgo)} entra na briga</b> ${b.cmdUsed ? '(já usado)' : `nesta rodada: mais dano pela Força (${attr('forca')}). Só uma vez.`}</span></label>`}
  </div>`;
  $('#brawl').classList.remove('hidden');
}
// Reabre uma briga que estava em andamento (ex.: recarregou a página no meio).
export function resumeBrawl() { if (state.brawl) draw(); }
