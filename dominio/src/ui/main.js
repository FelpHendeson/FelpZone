// Interface: mapa com câmera (arrastar / zoom), HUD flutuante, relatório do dia e rádio.
// As regras ficam em src/core. Ver docs/layout.md.
import {
  ERA, TYPES, RIVALS, MAP, EDGES, DISTRICTS, POLICE_NODE, UPKEEP, ACTIONS_PER_DAY, TRUCE_DAYS, POLICE_RADIUS, BRIBE_DAYS, T, nextEra, useEra,
} from '../core/era.js';
import { PLAYER_COLORS } from '../data/rivals.js';
import { money, clamp } from '../core/util.js';
import { state, hooks, replaceState, freshNodes, newGame, load, save, advanceEra } from '../core/state.js';
import { clearSave } from '../core/save.js';
import { captainAt, memberTitle } from '../core/crew.js';
import { avatarSVG, flagSVG, flagInner } from './art.js';
import { queueScene, tryPlay, setBusyCheck, onSceneEnd, sceneActive, showTip, closeTip, dialogNext, dialogChoose, dialogSkip, prefs, setPref, registerChoice } from './dialog.js';
import { showCreate, showIdentityEditor, cr } from './create.js';
import { showCrew, showCaptainPicker, crewUI, initCrewUI, crewOpen } from './crewui.js';
import {
  forecast, totalSoldiers, reachable, estDef, ownerColor, ownerName, nodeIncome, nodeHeat,
  recruitCap, bribeCost, upgradeCost, negotiateCost,
  endDay, playerAttack, playerNegotiate, moveGuards, toggleLowkey, recruit, upgrade, bribe,
  playerAttackMult, canBuyMoto, motoCost, buyMoto, currentObjective, objectives, skipTutorial, afterAction, actionsPerDay,
} from '../core/rules.js';
import { brawlStart, brawlMove, brawlToggleCmd, brawlClose, initBrawlUI, brawlOpen, resumeBrawl } from './brawlui.js';
import { showArsenal, arsenalUI, initArsenalUI } from './arsenalui.js';
import { showMarket, marketUI, initMarketUI } from './marketui.js';
import { hasMarket } from '../core/market.js';
import { showEstado, hideEstado, estadoUI, initEstadoUI, estadoOpen } from './estadoui.js';
import { openEstado, finishCity, affiliate, inEstado, allMine, org } from '../core/estado.js';
import { sfx, unlockAudio, setTrack, applyAudioPrefs } from './sound.js';
import { syncFx, attackOn, defendOn, floatText, sirenFx, shake, flash } from './fx.js';
import { onEvent, checkState, setUnlockHandler, ACHIEVEMENTS, unlocked } from '../core/achievements.js';
import { LORE } from '../data/lore.js';
import { canBuyLot, buyLot, lotCost, buildOptions, canBuild, startBuild, eventsFor, canHoldEvent, holdEvent, threats, weaponMult } from '../core/business.js';
import { EVENTS } from '../data/arsenal.js';
import { has, P, MAP_W, MAP_H } from '../core/era.js';
import {
  heistOdds, canHeist, doHeist, canExtort, toggleExtort, canTruce, proposeTruce, truceCost, truceOdds, canAlly, proposeAlliance,
  allianceCost, canHit, orderHit, hitman, hitOdds, canAmbush, setAmbush, isAlly, inTruce, POLICIES, policyOf, cyclePolicy,
} from '../core/ops.js';

const $ = (sel) => document.querySelector(sel);

const ui = { selected: null, send: 3, recruitN: 1, radio: false, report: null, unread: false, portraitOk: false, tIdx: -1 };

// O mundo tem uma margem de quadras em volta dos pontos, pra arrastar ter cara de "andar pela cidade".
// Mundo e área de foco seguem o tamanho do mapa da era (a cidade gerada é maior).
const WORLD = { x: -420, y: -280, w: 1840, h: 1240 };
const FOCUS = { w: 1080, h: 770 };   // área que precisa caber no zoom mínimo (todos os pontos)
function fitWorld() {
  WORLD.w = MAP_W + 840; WORLD.h = MAP_H + 560;
  FOCUS.w = MAP_W + 80; FOCUS.h = MAP_H + 90;
}
const NODE_R = 30;
const MIN_W = 320;                   // zoom máximo (largura visível em unidades do mundo)
const cam = { cx: 350, cy: 260, w: 1000 };
const svg = $('#map');

// ===================== CÂMERA =====================
function viewSize() { return [svg.clientWidth || innerWidth, svg.clientHeight || innerHeight]; }
function maxCamW() {
  const [vw, vh] = viewSize();
  return Math.min(Math.max(FOCUS.w, FOCUS.h * vw / vh) * 1.05, WORLD.w, WORLD.h * vw / vh);
}
function applyCam() {
  const [vw, vh] = viewSize();
  cam.w = clamp(cam.w, MIN_W, maxCamW());
  const h = cam.w * vh / vw;
  cam.cx = clamp(cam.cx, WORLD.x + cam.w / 2, WORLD.x + WORLD.w - cam.w / 2);
  cam.cy = clamp(cam.cy, WORLD.y + h / 2, WORLD.y + WORLD.h - h / 2);
  const vb = `${cam.cx - cam.w / 2} ${cam.cy - h / 2} ${cam.w} ${h}`;
  svg.setAttribute('viewBox', vb);
  syncFx(vb);
  const scale = vw / cam.w;   // px de tela por unidade do mundo
  svg.classList.toggle('far', scale < 0.5);
  // nomes com ~10.5px na tela, sem ficar menores que o tamanho base do mundo
  svg.style.setProperty('--lf', `${Math.max(14, 10.5 / scale).toFixed(1)}px`);
}
function screenToWorld(px, py) {
  const [vw, vh] = viewSize();
  const r = svg.getBoundingClientRect();
  const s = cam.w / vw;
  return [cam.cx + (px - r.left - vw / 2) * s, cam.cy + (py - r.top - vh / 2) * s];
}
function zoomAt(px, py, factor) {
  const [wx, wy] = screenToWorld(px, py);
  const nw = clamp(cam.w * factor, MIN_W, maxCamW());
  const k = nw / cam.w;
  cam.cx = wx + (cam.cx - wx) * k;
  cam.cy = wy + (cam.cy - wy) * k;
  cam.w = nw;
  applyCam();
}
function zoomCenter(factor) { const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor); }
function panBy(dx, dy) { const s = cam.w / viewSize()[0]; cam.cx -= dx * s; cam.cy -= dy * s; applyCam(); }
// Faixa livre da tela (em px) entre a barra do topo e o painel de baixo.
function freeBand() {
  const [, vh] = viewSize();
  const top = $('#top').getBoundingClientRect().bottom;
  const bottom = Math.min($('#sel').getBoundingClientRect().top, $('#endBtn').getBoundingClientRect().top);
  return bottom - top > 80 ? [top, bottom] : [0, vh];
}
// Centraliza (x, y) do mundo no meio da faixa livre, não no meio da tela.
function focusOn(x, y, w) {
  if (w) cam.w = clamp(w, MIN_W, maxCamW());
  const [vw, vh] = viewSize();
  const [t, b] = freeBand();
  cam.cx = x; cam.cy = y + (vh / 2 - (t + b) / 2) * cam.w / vw;
  applyCam();
}
// Se o ponto ficou escondido atrás da interface, desliza a câmera até ele.
function ensureVisible(n) {
  const r = svg.getBoundingClientRect();
  const [vw] = viewSize();
  const s = vw / cam.w;
  const py = r.top + r.height / 2 + (n.y - cam.cy) * s, px = r.left + vw / 2 + (n.x - cam.cx) * s;
  const [t, b] = freeBand();
  const m = (NODE_R + 26) * s;
  // desliza só o necessário pra trazer o ponto pra faixa livre
  let dy = 0, dx = 0;
  if (py - m < t) dy = t + m - py; else if (py + m > b) dy = b - m - py;
  if (px - m < 0) dx = m - px; else if (px + m > vw - 60) dx = vw - 60 - m - px;
  if (dx || dy) panBy(dx, dy);
}
function goHQ() { const q = state.nodes[0]; focusOn(q.x + 110, q.y + 70, Math.min(cam.w, 1100)); }
// Começa enquadrando a vizinhança do QG (x 40..600, y 75..435) na faixa livre.
function initialCam() {
  const [vw] = viewSize();
  const [t, b] = freeBand();
  const fit = Math.max(560, 360 * vw / Math.max(b - t, 1));
  fitWorld();
  const q = state.nodes && state.nodes[0];
  const big = MAP_W > 1200;
  cam.w = vw >= 1100 && !big ? maxCamW() : Math.max(fit, Math.min(maxCamW(), vw * (big ? 1.1 : 0.9)));  // PC: cidade inteira (se couber)
  if (big && q) focusOn(q.x + 260, q.y + 160); else focusOn(320, 255);
}

// ===================== ENTRADA (mouse, toque, teclado) =====================
const ptrs = new Map();
let gesture = null;

svg.addEventListener('pointerdown', (e) => {
  try { svg.setPointerCapture(e.pointerId); } catch (err) { /* ponteiro sintético */ }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) gesture = { sx: e.clientX, sy: e.clientY, drag: false, multi: false };
  else if (gesture) gesture.multi = true;
});
svg.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId);
  if (!p || !gesture) return;
  if (ptrs.size === 1) {
    if (!gesture.drag && Math.hypot(e.clientX - gesture.sx, e.clientY - gesture.sy) > 8) {
      gesture.drag = true; svg.classList.add('dragging');
    }
    if (gesture.drag) panBy(e.clientX - p.x, e.clientY - p.y);
    p.x = e.clientX; p.y = e.clientY;
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const d0 = Math.hypot(a.x - b.x, a.y - b.y), m0 = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    p.x = e.clientX; p.y = e.clientY;
    const [a2, b2] = [...ptrs.values()];
    const d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y), m1 = [(a2.x + b2.x) / 2, (a2.y + b2.y) / 2];
    if (d0 > 0 && d1 > 0) zoomAt(m1[0], m1[1], d0 / d1);
    panBy(m1[0] - m0[0], m1[1] - m0[1]);
    gesture.drag = true;
  }
});
function endPointer(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (ptrs.size === 0) {
    if (gesture && !gesture.drag && !gesture.multi && e.type === 'pointerup') tapAt(e.clientX, e.clientY);
    gesture = null;
    svg.classList.remove('dragging');
  }
}
svg.addEventListener('pointerup', endPointer);
svg.addEventListener('pointercancel', endPointer);
svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * 0.0015)); }, { passive: false });

function tapAt(px, py) {
  const [wx, wy] = screenToWorld(px, py);
  const reach = Math.max(NODE_R + 22, 26 * cam.w / viewSize()[0]);
  let best = null, bd = Infinity;
  for (const n of state.nodes) {
    const d = Math.hypot(n.x - wx, n.y - wy);
    if (d < reach && d < bd) { best = n; bd = d; }
  }
  if (best) selectNode(best.id); else deselect();
}

document.addEventListener('keydown', (e) => {
  if (!$('#modal').classList.contains('hidden') || e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  const pan = { arrowleft: [80, 0], a: [80, 0], arrowright: [-80, 0], d: [-80, 0], arrowup: [0, 80], w: [0, 80], arrowdown: [0, -80], s: [0, -80] }[k];
  if (pan) { panBy(...pan); e.preventDefault(); }
  else if (k === '+' || k === '=') zoomCenter(0.8);
  else if (k === '-') zoomCenter(1.25);
  else if (k === 'escape') { if (ui.report != null) closeReport(); else if (ui.radio) toggleRadio(); else deselect(); }
});

window.addEventListener('resize', () => { applyCam(); renderRotate(); });

// ===================== SELEÇÃO =====================
function selectNode(id) {
  ui.selected = id;
  ui.send = clamp(ui.send, 1, Math.max(1, state.free));
  ui.recruitN = 1;
  renderMap(); renderBottom();
  ensureVisible(state.nodes[id]);
  const n = state.nodes[id];
  if (n.owner === 'P') showTip('own'); else if (reachable(n)) showTip('attack');
}
function deselect() {
  if (ui.selected === null) return;
  ui.selected = null; renderMap(); renderBottom();
}
function nextTarget() {
  const targets = state.nodes.filter((n) => reachable(n)).sort((a, b) => estDef(a) - estDef(b));
  if (!targets.length) return;
  ui.tIdx = (ui.tIdx + 1) % targets.length;
  const n = targets[ui.tIdx];
  ui.selected = n.id; renderBottom();
  focusOn(n.x, n.y);
  selectNode(n.id);
}
function setSend(v) { ui.send = clamp(v, 1, Math.max(1, state.free)); renderBottom(); }
function setRecruit(v) { ui.recruitN = clamp(v, 1, Math.max(1, recruitCap() - state.recruited)); renderBottom(); }

// ===================== RENDER =====================
function render() {
  if (!state || !state.nodes) return;
  document.documentElement.style.setProperty('--accent', state.player.color);
  renderTop(); renderMap(); renderBottom(); renderRadio(); renderReport(); renderRotate();
  setTrack(inEstado() ? 'estado' : ERA.id);
  checkState();
  if (inEstado()) { showEstado(); tryPlay(); return; }
  if (!state.cmd) return;
  if (threats().length) showTip('intel');
  else if (state.heat >= 30) showTip('visada');
  else if (state.actions < ACTIONS_PER_DAY) showTip('endDay');
  tryPlay();
}

const canFullscreen = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const inFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

function renderTop() {
  const f = forecast();
  const W = ERA.words;
  const bal = f.inc - f.upkeep;
  $('#top').innerHTML = `
    <div class="pill gang">${state.flag ? flagSVG(state.flag, 'flag') : '<i class="flag"></i>'}<div><b>${esc(state.player.gang)}</b><small>Dia ${state.day}</small></div></div>
    <div class="res">
      <div class="pill" title="Caixa e saldo por dia (renda menos salários)">💵 <b>${money(state.money)}</b><small class="${bal >= 0 ? 'pos' : 'neg'}">${bal >= 0 ? '+' : ''}${money(bal)}</small></div>
      <div class="pill" title="Soldados livres / total">👥 <b>${state.free}</b><small>/${totalSoldiers()}</small></div>
      <div class="pill" title="Respeito">⭐ <b>${state.respect}</b></div>
      <div class="pill" title="Ações do dia">${'⚡'.repeat(state.actions)}<span class="spent">${'⚡'.repeat(Math.max(0, actionsPerDay() - state.actions))}</span></div>
      <div class="pill visada" title="${W.heat}: o quanto a ${W.police} está de olho. Anda até o alvo (traço branco). Acima de 50 ${ERA.cfg.raid === 'advertencia' ? 'pode vir advertência (3 = suspensão)' : 'tem batida'}.">${W.heatIcon} <b>${Math.round(state.heat)}</b><div class="heatbar"><i style="width:${state.heat}%"></i><u style="left:${f.target}%"></u></div>${state.bribeDays ? `<small>${W.bribeIcon}${state.bribeDays}d</small>` : ''}${ERA.cfg.raid === 'advertencia' ? `<small class="warns" title="Advertências">${'⚠️'.repeat(state.warnings || 0)}${'·'.repeat(3 - (state.warnings || 0))}</small>` : ''}</div>
      ${state.ransom ? `<div class="pill" title="Resgate a caminho">🏛️ <b>${money(state.ransom.value)}</b><small>${state.ransom.days}d</small></div>` : ''}
      ${state.suspToday ? '<div class="pill susp" title="Três advertências: o bonde não pode agir hoje">🚫 Suspenso</div>' : ''}
    </div>
    <div class="tr">
      ${state.cmd ? `<button class="ic av${state.cmd.points ? ' dot' : ''}" onclick="showCrew()" title="Bonde: você, vice e capitães">${avatarSVG(state.cmd.look, state.jacket, state.flag)}</button>` : ''}
      ${hasMarket() ? `<button class="ic" onclick="showMarket()" title="Mercado: produto, fornecedor e preço das bocas">📈</button>` : ''}
      ${has('weapons') ? `<button class="ic" onclick="showArsenal()" title="Arsenal: armas e fornecedores (+${Math.round((weaponMult() - 1) * 100)}% de força)">🔫</button>` : ''}
      <button class="ic${ui.unread ? ' dot' : ''}" onclick="toggleRadio()" title="Rádio da quebrada">📻</button>
      ${canFullscreen() ? `<button class="ic" onclick="toggleFullscreen()" title="Tela cheia">${inFullscreen() ? '🗗' : '⛶'}</button>` : ''}
      <button class="ic" onclick="showMenu()" title="Menu">☰</button>
    </div>`;
  renderObjective();
}
function renderObjective() {
  const o = state.cmd && !state.over ? currentObjective() : null;
  const el = $('#obj');
  if (!o) { el.classList.add('hidden'); return; }
  const final = (state.objIdx || 0) >= objectives().length - 1;
  el.innerHTML = `<span class="ot">🎯 ${o.text}${o.progress ? ` <small>${o.progress(state)}</small>` : ''}</span>${final ? '' : '<button class="mini" onclick="skipTutorial()" title="Pular o tutorial guiado desta era">Pular</button>'}`;
  el.classList.remove('hidden');
}

function renderMap() {
  const s = [];
  s.push(`<defs>
    <pattern id="blocks" width="70" height="70" patternUnits="userSpaceOnUse">
      <rect width="70" height="70" fill="#0c0c15"/><rect x="7" y="7" width="56" height="56" rx="5" fill="#13131f"/>
      <rect x="14" y="14" width="18" height="16" rx="2" fill="#181828"/><rect x="38" y="36" width="18" height="18" rx="2" fill="#181828"/>
    </pattern>
    <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c3a57"/><stop offset="1" stop-color="#071b2b"/></linearGradient>
  </defs>`);
  s.push(`<rect x="${WORLD.x}" y="${WORLD.y}" width="${WORLD.w}" height="${WORLD.h}" fill="url(#blocks)"/>`);
  if (state.map && state.map.generated) {
    const y0 = MAP_H + 50;
    s.push(`<path class="sea" d="M-420,${y0 + 30} C${MAP_W * 0.3},${y0 - 10} ${MAP_W * 0.7},${y0 + 40} ${MAP_W + 420},${y0} L${MAP_W + 420},${MAP_H + 400} L-420,${MAP_H + 400} Z" fill="url(#sea)"/>`);
  } else if (ERA.decor === 'mar') s.push(`<path class="sea" d="M1420,140 C1240,220 1090,380 1080,560 C1070,700 960,770 760,800 C520,840 200,850 -420,860 L-420,960 L1420,960 Z" fill="url(#sea)"/>`);
  if (ERA.decor === 'mar' && !(state.map && state.map.generated)) s.push(`<path d="M1420,140 C1240,220 1090,380 1080,560 C1070,700 960,770 760,800 C520,840 200,850 -420,860" fill="none" stroke="#1d5a7d" stroke-width="4" opacity=".7"/>`);
  DISTRICTS.forEach(([name, x, y, r, c]) => {
    s.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`);
    s.push(`<text class="district" x="${x}" y="${y + r - 30}">${name}</text>`);
  });
  (state.map && state.map.POLICE_NODES ? state.map.POLICE_NODES : [POLICE_NODE]).forEach((p) => s.push(`<circle cx="${MAP[p][2]}" cy="${MAP[p][3]}" r="${POLICE_RADIUS}" fill="#3b82f608" stroke="#3b82f633" stroke-dasharray="4 8"/>`));
  EDGES.forEach(([a, b]) => {
    const A = state.nodes[a], B = state.nodes[b];
    s.push(`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#262640" stroke-width="16" stroke-linecap="round"/>`);
    s.push(`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#44446a" stroke-width="2" stroke-dasharray="8 10"/>`);
  });
  const threatened = new Set(state.cmd ? threats().map((x) => x.node) : []);
  state.nodes.forEach((n) => {
    const t = TYPES[n.type];
    const col = t.special ? (n.extorted ? state.flag.bg : '#f59e0b') : n.owner === 'X' && n.type !== 'policia' ? '#94a3b8' : ownerColor(n.owner);
    const sel = ui.selected === n.id;
    const canHit = reachable(n) && !state.over;
    s.push(`<g class="node${sel ? ' selected' : ''}" data-id="${n.id}">`);
    if (sel) s.push(`<circle class="selring" cx="${n.x}" cy="${n.y}" r="${NODE_R + 14}" stroke="${col}"/>`);
    if (canHit) s.push(`<circle class="target" cx="${n.x}" cy="${n.y}" r="${NODE_R + 9}"/>`);
    s.push(`<circle class="ring" cx="${n.x}" cy="${n.y}" r="${NODE_R}" stroke="${col}"${n.lowkey ? ' stroke-dasharray="5 5" opacity=".6"' : ''}/>`);
    if (n.build) s.push(`<text class="emoji" x="${n.x + NODE_R - 2}" y="${n.y + NODE_R - 4}" style="font-size:16px">🏗️</text>`);
    if (threatened.has(n.id)) s.push(`<g class="threat"><circle cx="${n.x}" cy="${n.y}" r="${NODE_R + 18}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="4 5"/><text class="emoji" x="${n.x - NODE_R - 6}" y="${n.y - NODE_R + 2}" style="font-size:18px">⚠️</text></g>`);
    if (n.lowkey) s.push(`<text class="emoji" x="${n.x - NODE_R + 4}" y="${n.y + NODE_R - 6}" style="font-size:15px">🤫</text>`);
    s.push(`<text class="emoji" x="${n.x}" y="${n.y + 1}">${t.icon}</text>`);
    s.push(`<text class="label" x="${n.x}" y="${n.y + NODE_R + 18}">${esc(n.name)}${n.level > 1 ? ' ' + '★'.repeat(n.level - 1) : ''}</text>`);
    if (n.owner === 'P' && state.flag) {
      // bandeira hasteada
      s.push(`<line x1="${n.x - 26}" y1="${n.y - 22}" x2="${n.x - 26}" y2="${n.y - 56}" stroke="#d6d3d1" stroke-width="2"/>`);
      s.push(`<svg x="${n.x - 25}" y="${n.y - 56}" width="27" height="18" viewBox="0 0 150 100" preserveAspectRatio="none">${flagInner(state.flag)}</svg>`);
    }
    const cap = n.owner === 'P' && state.members ? captainAt(n) : null;
    if (cap) s.push(avatarSVG(cap.look, state.jacket, state.flag, { ring: state.flag.bg }).replace('<svg class="avatar"', `<svg x="${n.x - 40}" y="${n.y + 2}" width="26" height="26"`));
    if (n.type !== 'policia' && !t.zone) {
      const o = NODE_R * 0.8;
      s.push(`<g class="badge"><circle cx="${n.x + o}" cy="${n.y - o}" r="13" fill="${col}" stroke="#0b0b12" stroke-width="2"/><text x="${n.x + o}" y="${n.y - o + 1}">${n.guards}</text></g>`);
    }
    s.push(`</g>`);
  });
  svg.innerHTML = s.join('');
}

function odds(n) {
  const ratio = (ui.send * (1 + state.respect / 200) * playerAttackMult()) / Math.max(estDef(n) + (n.owner ? 0.5 : 0), 0.1);
  return ratio >= 1.5 ? ['Vitória quase certa', 'g'] : ratio >= 1.15 ? ['Boa chance', 'g2'] : ratio >= 0.85 ? ['Cara ou coroa', 'y'] : ['Suicídio', 'r'];
}

function renderBottom() {
  $('#endBtn').disabled = !!state.over;
  $('#sel').classList.toggle('idle', !state.over && ui.selected === null);
  $('#sel').innerHTML = state.over ? overPanel() : ui.selected === null ? idlePanel() : nodePanel(state.nodes[ui.selected]);
}

function overPanel() {
  return `<div class="head"><b>${state.over === 'win' ? ERA.text.winTitle : ERA.text.loseTitle}</b></div>
    <div class="acts"><button class="tile go" onclick="showEnd()">${state.campaign && (nextEra(state.era) || state.era === 'cidade') && (state.over === 'win' || state.cityId) ? 'Continuar a história ▶' : 'Ver resultado'}</button><button class="tile" onclick="confirmNew()">↺ Novo jogo</button></div>`;
}

function idlePanel() {
  const targets = state.nodes.filter((n) => reachable(n)).length;
  const bribeOff = state.bribeDays > 0 || state.money < bribeCost() || state.heat <= 0;
  return `<div class="head"><span class="hint">Arraste o mapa e toque num ponto pra agir.</span></div>
    <div class="acts">
      <button class="tile" onclick="nextTarget()" ${targets ? '' : 'disabled'}>🎯 Próximo alvo <small>${targets}</small></button>
      <button class="tile" onclick="bribe()" ${bribeOff ? 'disabled' : ''} title="${T(ERA.words.bribeTip, { dias: BRIBE_DAYS })}">${ERA.words.bribeIcon} ${state.bribeDays > 0 ? `Vista grossa ${state.bribeDays}d` : `${ERA.words.bribe} ${money(bribeCost())}`}</button>
      <button class="tile" onclick="goHQ()">🏠 QG</button>
    </div>`;
}

function nodePanel(n) {
  const t = TYPES[n.type];
  const col = ownerColor(n.owner);
  const h = [];
  h.push(`<div class="head">
    <span class="nm">${t.icon} <b>${esc(n.name)}</b></span>
    <span class="sub">${t.label}${n.level > 1 ? ` nv${n.level}` : ''} · <b style="color:${col}">${esc(ownerName(n.owner))}</b></span>
    ${n.type !== 'policia' && !t.zone ? `<span class="stats">
      <span title="Renda por dia">💵 ${n.lowkey ? 'parado' : money(nodeIncome(n))}</span>
      <span title="${ERA.words.heat} que gera">${ERA.words.heatIcon} ${n.lowkey ? '0' : '+' + nodeHeat(n)}</span>
      <span title="Respeito por dia">⭐ +${t.resp}</span>
      <span title="${n.owner ? 'Guardas' : 'Resistência local'}">🛡️ ${n.guards}</span></span>` : ''}
    <button class="x" onclick="deselect()" aria-label="Fechar">✕</button>
  </div>`);
  if (n.owner && RIVALS[n.owner]) {
    const rv = state.rivals[n.owner] || {};
    const tags = [isAlly(n.owner) ? `🤝 aliados até o dia ${rv.allyUntil}` : '', inTruce(n.owner) ? `🕊️ trégua até o dia ${rv.truceUntil}` : '', rv.angryUntil > state.day ? '😡 furiosos com você' : '', rv.wm > 1 ? `🔫 +${Math.round((rv.wm - 1) * 100)}%` : ''].filter(Boolean);
    h.push(`<div class="quote">${RIVALS[n.owner].leader}: “${RIVALS[n.owner].quotes[n.id % 3]}”${tags.length ? ` <span class="rtags">${tags.join(' · ')}</span>` : ''}</div>`);
  }

  const a = [];
  if (n.owner === 'P') {
    if (state.members) {
      const c = captainAt(n);
      if (c && ERA.generate) a.push(`<button class="tile" onclick="policyAt(${c.id})" title="${POLICIES[policyOf(c)].desc} (toque pra trocar)">${POLICIES[policyOf(c)].icon} ${POLICIES[policyOf(c)].label}</button>`);
      a.push(c ? `<button class="tile cap" onclick="showCaptainPicker(${n.id})" title="Trocar o capitão">${avatarSVG(c.look, state.jacket, state.flag)}<span>${esc(c.vulgo)}<small>🤝 ${c.loyalty}</small></span></button>`
        : `<button class="tile" onclick="showCaptainPicker(${n.id})">👤 Designar capitão</button>`);
    }
    a.push(`<div class="w"><span class="wl">🛡️</span>
      <button onclick="moveGuards(${n.id},-1)" ${n.guards <= 0 ? 'disabled' : ''}>−</button><b>${n.guards}</b>
      <button onclick="moveGuards(${n.id},1)" ${state.free <= 0 ? 'disabled' : ''}>+</button>
      <button class="sm" onclick="moveGuards(${n.id},'all')" ${state.free <= 0 ? 'disabled' : ''} title="Colocar todos os soldados livres aqui">Todos +${state.free}</button></div>`);
    if (t.recruit) {
      const left = recruitCap() - state.recruited;
      ui.recruitN = clamp(ui.recruitN, 1, Math.max(1, left));
      const cost = t.recruit * ui.recruitN;
      a.push(`<div class="w" title="Ainda dá pra recrutar ${Math.max(0, left)} hoje"><span class="wl">🧢</span>
        <button onclick="setRecruit(ui.recruitN-1)" ${ui.recruitN <= 1 ? 'disabled' : ''}>−</button><b>${ui.recruitN}</b>
        <button onclick="setRecruit(ui.recruitN+1)" ${ui.recruitN >= left ? 'disabled' : ''}>+</button>
        <button class="go" onclick="recruit(${n.id}, ui.recruitN)" ${left <= 0 || state.money < cost ? 'disabled' : ''}>${left <= 0 ? 'Sem gente hoje' : `Recrutar ${money(cost)}`}</button></div>`);
    }
    if (n.type === 'lote') {
      if (n.build) a.push(`<span class="hint">🏗️ Obra: ${TYPES[n.build.type].icon} ${TYPES[n.build.type].label}, falta(m) ${n.build.days} dia(s). Enquanto isso o ponto fica frágil (−40% de defesa).</span>`);
      else buildOptions().forEach((o) => a.push(`<button class="tile" onclick="buildAt(${n.id}, '${o.type}')" ${canBuild(n, o.type) ? 'disabled' : ''} title="${o.t.desc}">🏗️ ${o.t.icon} ${o.t.label} <small>${money(o.cost)} · ${o.days}d</small></button>`));
    }
    if (ERA.generate && canAmbush(n) !== 'Sem boato de ataque aqui' && canAmbush(n) !== 'Indisponível') {
      const why = canAmbush(n);
      a.push(`<button class="tile go" onclick="ambushAt(${n.id})" ${why ? 'disabled' : ''} title="O boato diz que vão atacar aqui. Com a emboscada, a defesa vale 2,4×.">🪤 ${why || 'Emboscada 1⚡'}</button>`);
    }
    eventsFor(n).forEach(([k, e]) => { const why = canHoldEvent(n, k); a.push(`<button class="tile" onclick="eventAt(${n.id}, '${k}')" ${why ? 'disabled' : ''} title="${e.desc}${why ? ' · ' + why : ''}">${e.icon} ${e.label} <small>${money(P(e.cost))}${e.action ? ' · 1⚡' : ''}</small></button>`); });
    if (n.type === 'oficina' && canBuyMoto()) a.push(`<button class="tile" onclick="buyMoto()" ${state.money < motoCost() ? 'disabled' : ''} title="Atacar pontos a duas ruas de distância e +5% na briga">🏍️ Moto <small>${money(motoCost())} · tem ${state.motos || 0}</small></button>`);
    if (n.type !== 'hq' && n.type !== 'lote' && n.level < 3) a.push(`<button class="tile" onclick="upgrade(${n.id})" ${state.money < upgradeCost(n) ? 'disabled' : ''} title="+50% de renda e +25% de defesa">⬆️ Nível ${n.level + 1} <small>${money(upgradeCost(n))}</small></button>`);
    if (n.type !== 'hq' && n.type !== 'lote') a.push(`<button class="tile" onclick="toggleLowkey(${n.id})" title="Parado: sem renda, sem visada e sem batida">${n.lowkey ? '🔊 Reativar' : '🤫 Baixar a poeira'}</button>`);
  } else if (n.type === 'lote' && n.owner === null) {
    const why = canBuyLot(n);
    a.push(`<button class="tile go" onclick="buyLotAt(${n.id})" ${why ? 'disabled' : ''} title="Lote vazio não se toma na força: se compra. Depois você escolhe o que construir.">🚧 Comprar lote <small>${why || money(lotCost())}</small></button>`);
  } else if (n.type === 'policia') {
    a.push(`<span class="hint">${t.desc} Use ${ERA.words.bribeIcon} ${ERA.words.bribe} pra esfriar.</span>`);
  } else if (t.special) {
    const sp = t.special;
    const free = state.free;
    ui.send = clamp(ui.send, 1, Math.max(1, free));
    const why = canHeist(n, ui.send);
    const { chance } = heistOdds(n, ui.send);
    const verb = sp.kind === 'sequestro' ? '🏛️ Sequestrar' : '💰 Assaltar';
    const prize = sp.kind === 'sequestro' ? `resgate ~${money(P(sp.ransom))} em 2d` : `~${money(P(sp.loot))}`;
    a.push(`<div class="w atk"><span class="wl">🎭</span>
      <button onclick="setSend(ui.send-1)" ${ui.send <= 1 ? 'disabled' : ''}>−</button><b>${ui.send}</b>
      <button onclick="setSend(ui.send+1)" ${ui.send >= free ? 'disabled' : ''}>+</button>
      <span class="odds ${chance >= 0.7 ? 'g' : chance >= 0.45 ? 'y' : 'r'}">${Math.round(chance * 100)}% · ${prize} · 👁️+${sp.heat}</span>
      <button class="go" onclick="heistAt(${n.id})" ${why ? `disabled title="${why}"` : ''}>${why || `${verb} 1⚡`}</button></div>`);
    if (sp.extort) { const w2 = canExtort(n); a.push(`<button class="tile" onclick="extortAt(${n.id})" ${w2 ? 'disabled' : ''} title="Renda diária enquanto um ponto seu for vizinho. +1 de visada.">🧾 ${n.extorted ? 'Parar de cobrar' : `Cobrar proteção ${money(P(sp.extort))}/dia`}${w2 ? ` <small>${w2}</small>` : ''}</button>`); }
  } else if (t.zone) {
    a.push(`<span class="hint">${t.desc} Dá pra atravessar: os pontos do outro lado contam como vizinhos.</span>`);
  } else if (!reachable(n)) {
    a.push(`<span class="hint">🚫 Fora do alcance. Domine um ponto ligado a este pela rua (os de círculo pontilhado)${ERA.cfg.motoCost ? ', ou compre uma moto na oficina' : ''}.</span>`);
  } else {
    const free = state.free;
    if (free > 0) {
      ui.send = clamp(ui.send, 1, free);
      const [label, cls] = odds(n);
      a.push(`<div class="w atk"><span class="wl">⚔️</span>
        <button onclick="setSend(ui.send-1)" ${ui.send <= 1 ? 'disabled' : ''}>−</button><b>${ui.send}</b>
        <button onclick="setSend(ui.send+1)" ${ui.send >= free ? 'disabled' : ''}>+</button>
        <button class="sm" onclick="setSend(${free})">Máx ${free}</button>
        <span class="odds ${cls}">${label}</span>
        ${n.type === 'hq'
          ? `<button class="go" onclick="openBrawl(${n.id})" ${state.actions <= 0 ? 'disabled' : ''} title="Confronto de 3 rodadas">${state.actions <= 0 ? 'Sem ⚡' : '👊 Briga de bonde 1⚡'}</button>`
          : `<button class="go" onclick="playerAttack(${n.id}, ui.send)" ${state.actions <= 0 ? 'disabled' : ''}>${state.actions <= 0 ? 'Sem ⚡' : `${n.owner ? 'Atacar' : 'Tomar'} 1⚡`}</button>`}</div>`);
    } else {
      a.push(`<span class="hint">Sem ${ERA.words.soldiers} livres. Tire guardas de um ponto seu ou recrute.</span>`);
    }
    if (n.owner === null) {
      const c = negotiateCost(n);
      const why = state.respect < 20 ? 'precisa ⭐20' : state.money < c ? 'sem grana' : '';
      a.push(`<button class="tile" onclick="playerNegotiate(${n.id})" ${state.actions <= 0 || why ? 'disabled' : ''} title="Sem sangue e sem visada, mas chega sem guardas">🤝 Comprar ${money(c)}${why ? ` <small>${why}</small>` : ''}</button>`);
    }
  }
  if (n.owner && RIVALS[n.owner] && ERA.generate && state.rivals[n.owner] && state.rivals[n.owner].alive) {
    const rid = n.owner;
    const w1 = canTruce(rid), w2 = canAlly(rid), w3 = canHit(rid), hm = hitman();
    a.push(`<button class="tile" onclick="truceWith('${rid}')" ${w1 ? 'disabled' : ''} title="${Math.round(truceOdds() * 100)}% de aceitarem. Recusa: perde metade e eles ficam com raiva.">🕊️ Trégua 6d <small>${w1 || `${money(truceCost())} · 1⚡`}</small></button>`);
    a.push(`<button class="tile" onclick="allyWith('${rid}')" ${w2 ? 'disabled' : ''} title="10 dias: eles param de te atacar e vão pra cima do maior rival. No fim, 30% de chance de traírem.">🤝 Aliança <small>${w2 || `${money(allianceCost())} · 1⚡`}</small></button>`);
    a.push(`<button class="tile" onclick="hitOn('${rid}')" ${w3 ? 'disabled' : ''} title="Seu melhor capitão tenta apagar o braço direito do líder: o rival perde 40% da reserva. Ele pode ser preso ou morrer.">🗡️ Assassinato <small>${w3 || `${Math.round(hitOdds(hm) * 100)}% · ${esc(hm.vulgo)} · 1⚡`}</small></button>`);
  }
  h.push(`<div class="acts">${a.join('')}</div>`);
  return h.join('');
}

// ===================== RELATÓRIO, RÁDIO, TELA CHEIA =====================
function onDayEnd(day) {
  ui.unread = true;
  if (!state.over) { ui.report = day; renderReport(); renderTop(); }
}
function closeReport() {
  ui.report = null; ui.unread = false; renderReport(); renderTop();
  tryPlay();
  if (!sceneActive()) showTip('crew');
}
function renderReport() {
  const el = $('#report');
  if (ui.report == null) { el.classList.add('hidden'); return; }
  const items = state.log.filter((l) => l.d === ui.report).reverse();
  el.innerHTML = `<div class="box" onclick="event.stopPropagation()">
    <h2>📰 Relatório do dia ${ui.report}</h2>
    <ul class="loglist">${items.map((l) => `<li class="${l.kind}">${esc(l.msg)}</li>`).join('')}</ul>
    <button class="primary" onclick="closeReport()">Continuar ▶</button></div>`;
  el.classList.remove('hidden');
}
function toggleRadio() { ui.radio = !ui.radio; if (ui.radio) ui.unread = false; renderRadio(); renderTop(); }
function renderRadio() {
  const el = $('#radio');
  el.classList.toggle('open', ui.radio);
  if (!ui.radio) return;
  el.innerHTML = `<div class="rh"><b>📻 Rádio da quebrada</b><button class="x" onclick="toggleRadio()" aria-label="Fechar">✕</button></div>
    <ul class="loglist">${state.log.map((l) => `<li class="${l.kind}"><span class="d">D${l.d}</span>${esc(l.msg)}</li>`).join('')}</ul>`;
}

async function toggleFullscreen() {
  const el = document.documentElement;
  try {
    if (inFullscreen()) { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
    else {
      await (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
    }
  } catch (e) { /* navegador recusou */ }
  setTimeout(() => { applyCam(); renderTop(); renderRotate(); }, 250);
}
document.addEventListener('fullscreenchange', () => { renderTop(); applyCam(); });

const PORTRAIT_TOUCH = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
function renderRotate() {
  const el = $('#rotate');
  const show = PORTRAIT_TOUCH.matches && !ui.portraitOk && $('#modal').classList.contains('hidden');
  el.classList.toggle('hidden', !show);
  if (!show) return;
  el.innerHTML = `<div class="box">
    <div class="phone">📱</div>
    <h2>Gire o celular</h2>
    <p>Domínio foi feito pra jogar deitado, com o mapa na tela toda.</p>
    ${canFullscreen() ? `<button class="primary" onclick="toggleFullscreen()">⛶ Tela cheia</button>` : `<p class="note">No iPhone: toque em Compartilhar → <b>Adicionar à Tela de Início</b> pra abrir em tela cheia.</p>`}
    <button onclick="ui.portraitOk=true;renderRotate()">Jogar assim mesmo</button></div>`;
}

// ===================== MODAIS =====================
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function showModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); renderRotate(); }
function closeModal() { $('#modal').classList.add('hidden'); renderRotate(); }

function showMenu() {
  showModal(`<h1>Menu</h1>
    <div class="menu">
      <button onclick="showHelp()">❔ Como jogar</button>
      ${state.cmd ? `<button onclick="closeModal();showCrew()">👥 Bonde</button>` : ''}
      ${state.map && state.map.seed !== undefined ? `<p class="hint">🗺️ Semente desta cidade: <b>${state.map.seed}</b></p>` : ''}
      <button onclick="showAchievements()">🏆 Conquistas (${Object.keys(unlocked()).length}/${Object.keys(ACHIEVEMENTS).length})</button>
      <button onclick="showLore()">📖 Livro da quebrada</button>
      <label class="check"><input type="checkbox" ${prefs.sfx ? 'checked' : ''} onchange="setPref('sfx', this.checked)"> Efeitos sonoros</label>
      <label class="check"><input type="checkbox" ${prefs.music ? 'checked' : ''} onchange="setPref('music', this.checked);applyAudioPrefs()"> Música</label>
      <label class="check"><input type="checkbox" ${prefs.tips ? 'checked' : ''} onchange="setPref('tips', this.checked)"> Dicas do tutorial</label>
      <label class="check"><input type="checkbox" ${prefs.scenes ? 'checked' : ''} onchange="setPref('scenes', this.checked)"> Cenas de diálogo</label>
      ${state.seenTips ? `<button onclick="state.seenTips={};setPref('tips', true);closeModal()">↻ Rever as dicas</button>` : ''}
      ${canFullscreen() ? `<button onclick="closeModal();toggleFullscreen()">⛶ Tela cheia</button>` : ''}
      <button onclick="confirmNew()">↺ Novo jogo</button>
      <button class="primary" onclick="closeModal()">Voltar ao jogo</button>
    </div>`);
}

function showStart() {
  showModal(`
    <h1>DOMÍNIO</h1>
    <p>Um RP de bonde em Porto Neon. Crie o seu personagem, junte o seu pessoal e domine território.</p>
    <div class="modes">
      <button class="mode primary" id="startBtn" onclick="startCreate('escola')"><b>🏫 Campanha</b><small>Comece no colégio, com briga de bonde e tutorial guiado. Depois de unificar os colégios: anos depois, a cidade.</small></button>
      <button class="mode" onclick="startCreate('cidade')"><b>🌃 Modo Livre: Cidade</b><small>Vá direto pra guerra de gangues numa Porto Neon gerada, com 4 gangues rivais.</small></button>
      <label class="seed">Semente da cidade (opcional, pra repetir ou dividir um mapa com amigos): <input type="text" id="seedIn" inputmode="numeric" maxlength="9" placeholder="aleatória"></label>
    </div>
    <div class="row"><button onclick="showHelp(true)">Como jogar</button></div>`);
}
function startCreate(era) {
  const seedTxt = ($('#seedIn') && $('#seedIn').value || '').replace(/\D/g, '');
  const mapSeed = seedTxt ? Number(seedTxt) : undefined;
  closeModal();
  showCreate((opts) => { if (opts) newGame({ ...opts, era, mapSeed }); else showStart(); });
}
function openBrawl(id) { brawlStart(id, ui.send); }
function buyLotAt(id) { if (buyLot(state.nodes[id])) { afterAction(); showTip('lote'); } }
function buildAt(id, type) { if (startBuild(state.nodes[id], type)) afterAction(); }
function eventAt(id, key) { if (holdEvent(state.nodes[id], key)) afterAction(); }
function heistAt(id) { if (doHeist(id, ui.send) !== null) afterAction(); }
function extortAt(id) { if (toggleExtort(id)) afterAction(); }
function ambushAt(id) { if (setAmbush(id)) afterAction(); }
function truceWith(rid) { if (proposeTruce(rid) !== null) afterAction(); }
function allyWith(rid) { if (proposeAlliance(rid) !== null) afterAction(); }
function hitOn(rid) { if (orderHit(rid) !== null) afterAction(); }
function policyAt(mid) { cyclePolicy(mid); save(); renderBottom(); }
function editIdentity() {
  showIdentityEditor({ ...state.cmd, leader: state.cmd.vulgo, gang: state.player.gang, flag: state.flag, jacket: state.jacket }, (res) => {
    if (res) { state.flag = res.flag; state.jacket = res.jacket; state.player.color = res.flag.bg; save(); }
    render();
  });
}

function showHelp(fromStart) {
  showModal(`
    <h1>Como jogar</h1>
    <ul>
      <li><b>Controles:</b> arraste o mapa (mouse ou dedo), dê zoom com a roda ou com dois dedos. Toque num ponto pra ver as ações; toque no vazio pra fechar. No PC: setas/WASD movem, + e − dão zoom, Esc fecha.</li>
      <li><b>O bonde 👥:</b> você é o Comandante. Atributos (Força, Tática, Lábia, Sangue-frio) dão bônus; vencer dá XP e nível. O vice e os capitães comandam pontos e dão defesa e bônus pelos traços. Cuide da <b>lealdade</b>: abaixo de 25, alguém pode trair. Membro com nome que morre não volta.</li>
      <li><b>Objetivo:</b> tomar os QGs dos rivais (${Object.values(RIVALS).map((r) => r.name).join(', ')}). Se a sua base cair, você perde. Atacar um QG é uma <b>briga de bonde</b>: 3 rodadas de Avançar, Segurar ou Cercar (Avançar vence Cercar, Cercar vence Segurar, Segurar vence Avançar).</li>
      <li><b>Pontos:</b> cada ponto dá renda todo dia. Bocas e o porto dão mais grana, mas deixam o bonde mais <b>visado</b>.</li>
      <li><b>Ações (⚡):</b> você tem ${ACTIONS_PER_DAY} por dia pra atacar ou comprar pontos. Mover guardas, recrutar e melhorar não gastam ação.</li>
      <li><b>Alcance:</b> só dá pra atacar pontos ligados pela rua a um ponto seu (círculo pontilhado). 🎯 Próximo alvo mostra um por um.</li>
      <li><b>${ERA.words.soldiers[0].toUpperCase() + ERA.words.soldiers.slice(1)}:</b> cada um custa ${money(UPKEEP)} por dia. Se faltar dinheiro, uns largam o bonde.</li>
      <li><b>Respeito:</b> deixa seus ataques mais fortes, libera recrutamento e compra de pontos.</li>
      <li><b>${ERA.words.heat} ${ERA.words.heatIcon}:</b> o quanto a ${ERA.words.police} está de olho. Seus pontos definem um alvo (traço branco na barra) e o valor anda até ele aos poucos. ${ERA.cfg.raid === 'advertencia' ? 'Acima de 50 pode vir advertência; na terceira, o bonde é suspenso por 2 dias.' : 'Acima de 50 tem batida; acima de 90 a polícia fecha o ponto.'}</li>
      <li><b>Sair da mira:</b> ${ERA.words.bribeIcon} ${ERA.words.bribe} tira 20 na hora e corta o alvo pela metade por ${BRIBE_DAYS} dias. 🤫 Baixar a poeira para um ponto: sem renda e sem ${ERA.words.heat.toLowerCase()}.</li>
      ${has('build') ? '<li><b>Lotes 🚧:</b> lote vazio não se toma na força: compre (precisa de um ponto seu vizinho) e escolha o que construir. Em obra, o ponto fica frágil.</li>' : ''}
      ${has('weapons') ? '<li><b>Arsenal 🔫:</b> armas compradas de fornecedores deixam o bonde mais forte no ataque e na defesa, mas gastam munição todo dia e aumentam a visada. Os rivais também se armam.</li>' : ''}
      ${hasMarket() ? '<li><b>Mercado 📈:</b> escolha o produto das bocas (erva, pó, sintético), o fornecedor (preço, qualidade, risco de apreensão), o preço (barato rouba freguês e irrita os rivais; caro dá margem) e a atração dos inferninhos.</li>' : ''}
      ${has('events') ? '<li><b>Eventos:</b> bailão, racha, churrasco e ação social dão bônus no ponto certo (um por dia).</li><li><b>Inferninho 👂:</b> traz boatos: os pontos seus que os rivais vão atacar amanhã aparecem com ⚠️.</li>' : ''}
      ${ERA.cfg.motoCost ? '<li><b>Motos 🏍️:</b> compradas na oficina. Deixam atacar pontos a duas ruas de distância e dão +5% na briga.</li>' : ''}
      ${ERA.generate ? `<li><b>Cidade grande:</b> 4 gangues num mapa gerado. Zonas neutras (hospital, igreja, escola) dá pra atravessar; pontos especiais (banco, joalheria, lotérica, mercado, caixa, mansão) não se dominam: assalte, sequestre ou cobre proteção. Contra gangues: 🕊️ trégua, 🤝 aliança (pode trair), 🗡️ assassinato do braço direito, 🪤 emboscada (com boato). Capitães têm política: segura, lucro, equilibrada ou agressiva (ataca sozinho). A cada 10 pontos seus, +1 ⚡ por dia.</li>` : ''}
      <li><b>Rivais:</b> crescem, recrutam e brigam entre si. Depois do dia ${TRUCE_DAYS} começam a vir pra cima de você.</li>
      <li>O jogo salva sozinho no navegador.</li>
    </ul>
    <button class="primary" onclick="${fromStart ? 'showStart()' : 'closeModal()'}">${fromStart ? 'Voltar' : 'Bora'}</button>`);
}

function showAchievements() {
  const u = unlocked();
  showModal(`<h1>🏆 Conquistas</h1><p class="hint">${Object.keys(u).length} de ${Object.keys(ACHIEVEMENTS).length}. Valem pra todas as partidas.</p>
    <div class="achs">${Object.entries(ACHIEVEMENTS).map(([k, a]) => `<div class="ach ${u[k] ? 'on' : ''}"><span>${u[k] ? a.icon : '🔒'}</span><div><b>${a.title}</b><small>${a.desc}</small></div></div>`).join('')}</div>
    <div class="row"><button class="primary" onclick="showMenu()">Voltar</button></div>`);
}
function showLore() {
  showModal(`<h1>📖 Livro da quebrada</h1>${LORE.map((l) => `<h3 class="lt2">${l.title}</h3><p>${l.text}</p>`).join('')}
    <div class="row"><button class="primary" onclick="showMenu()">Voltar</button></div>`);
}

function confirmNew() {
  showModal(`<h1>Novo jogo?</h1><p>O jogo atual vai ser perdido.</p>
    <div class="row"><button class="danger" onclick="resetSave()">Começar do zero</button><button onclick="closeModal()">Cancelar</button></div>`);
}

function showEnd() {
  const X = ERA.text, vars = { dia: state.day, gang: esc(state.player.gang), leader: esc(state.player.leader) };
  // campanha na cidade: a sede (Porto Neon) abre o mapa do estado; uma cidade do estado volta pra ele
  if (state.campaign && state.era === 'cidade' && (state.cityId || state.over === 'win')) {
    const city = !!state.cityId;
    showModal(`<h1>${state.over === 'win' ? (city ? '🏙️ CIDADE TOMADA' : X.winTitle) : '☠️ O BRAÇO CAIU'}</h1>
      <p>${state.over === 'win' ? (city ? `${esc(state.cmd.vulgo)} agora é patrão da cidade. Ela vai mandar tributo pra organização.` : T(X.win, vars)) : `${esc(state.cmd.vulgo)} perdeu a cidade. A organização vai ter que tentar de novo, com outra pessoa.`}</p>
      <div class="row"><button class="primary" onclick="goEstado()">${city ? 'Voltar ao mapa do estado ▶' : 'Continuar a história ▶'}</button><button onclick="closeModal()">Ver o mapa</button></div>`);
    return;
  }
  if (state.over === 'win' && state.campaign && nextEra(state.era)) {
    showModal(`<h1>${X.winTitle}</h1><p>${T(X.win, vars)}</p>
      <p>Respeito: <b>${state.respect}</b> · Dias: <b>${state.day}</b> · Nível de ${esc(state.cmd.vulgo)}: <b>${state.cmd.level}</b></p>
      <div class="row"><button class="primary" onclick="goNextEra()">Continuar a história ▶</button><button onclick="closeModal()">Ver o mapa</button></div>`);
    return;
  }
  if (state.over === 'win') {
    showModal(`<h1>${X.winTitle}</h1><p>${T(X.win, vars)}</p>
      <p>Caixa final: <b>${money(state.money)}</b> · Respeito: <b>${state.respect}</b> · Pontos: <b>${state.nodes.filter((n) => n.owner === 'P').length}</b></p>
      <div class="row"><button class="primary" onclick="resetSave()">Jogar de novo</button><button onclick="closeModal()">Ver o mapa</button></div>`);
  } else {
    showModal(`<h1>${X.loseTitle}</h1><p>${T(X.lose, vars)}</p>
      <div class="row"><button class="primary" onclick="resetSave()">Tentar de novo</button><button onclick="closeModal()">Ver o mapa</button></div>`);
  }
}

function resetSave() { clearSave(); hideEstado(); showStart(); }

// Vai pro mapa do estado: na primeira vez cria a organização; depois de uma cidade, fecha ela.
function goEstado() {
  closeModal();
  if (state.cityId) finishCity(); else openEstado();
  if (allMine()) queueScene(`win_${org().level}`, {});
  render();
}

// Salto no tempo: cena, quem continua, repaginar a marca e começar a próxima era.
function goNextEra() {
  closeModal();
  const next = nextEra(state.era);
  queueScene(`timeskip_${state.era}`, {}, () => {
    showIdentityEditor({ ...state.cmd, leader: state.cmd.vulgo, gang: state.player.gang, flag: state.flag, jacket: state.jacket, renameGang: true }, (res) => {
      advanceEra(next, res ? { gang: res.gang, flag: res.flag, jacket: res.jacket } : {});
    });
  });
}

function onNewGame() {
  ui.selected = null; ui.report = null; ui.radio = false; ui.unread = false; ui.tIdx = -1;
  render();
  initialCam();
  playIntro();
}
function playIntro() {
  if (!state.introPending) return;
  queueScene(state.introScene || ERA.introScene || 'intro', {}, () => { state.introPending = false; delete state.introScene; save(); });
}
onSceneEnd(() => { render(); if (!state.introPending) showTip('map'); });
setBusyCheck(() => !$('#modal').classList.contains('hidden') || ui.report != null || !$('#create').classList.contains('hidden') || crewOpen() || brawlOpen());
// (o mapa do estado não bloqueia cenas: a abertura e o final tocam por cima dele)
initBrawlUI(() => { tryPlay(); });
initArsenalUI(render);
initMarketUI(render);
initEstadoUI({ create: (cb, defaults) => showCreate(cb, defaults), newGame: () => { hideEstado(); clearSave(); showStart(); } });
registerChoice('affiliate', (e) => { affiliate(e.kind); save(); render(); });
initCrewUI({ changed: render, focusNode: (id) => { const n = state.nodes[id]; focusOn(n.x, n.y); selectNode(id); }, editIdentity });

// ===================== INÍCIO =====================
hooks.changed = render;
hooks.newGame = onNewGame;
hooks.dayEnded = onDayEnd;
hooks.gameOver = () => setTimeout(showEnd, 50);
hooks.scene = (id, ctx) => queueScene(id, ctx);
hooks.fx = (type, data) => { onEvent(type, data); playFx(type, data); };
// Som e animação de cada acontecimento.
function playFx(type, d = {}) {
  switch (type) {
    case 'attack': attackOn(d.to, d.win); sfx('attack'); setTimeout(() => sfx(d.win ? 'money' : 'hit'), 650); break;
    case 'defend': defendOn(d.to, d.win, RIVALS[d.by] && RIVALS[d.by].color); break;
    case 'police': sirenFx(); sfx('siren'); break;
    case 'day': if (d.inc) floatText(`+${money(d.inc)}`, 'good'); sfx('day'); break;
    case 'eliminate': flash('#ffffff'); sfx('win'); break;
    case 'win': sfx('win'); break;
    case 'lose': sfx('lose'); break;
    case 'levelup': floatText('🆙 Nível novo!', 'gold', '#top .tr'); sfx('level'); break;
    case 'heist': floatText(`💰 +${money(d.loot)}`, 'gold'); sfx('money'); break;
    case 'kidnap': sfx('siren'); break;
    case 'betrayal': case 'allyBetrayal': flash('#7f1d1d'); sfx('betrayal'); break;
    case 'annex': case 'orgLevel': sfx('level'); break;
    default: break;
  }
}
// Conquista: aviso no topo e som.
setUnlockHandler((id, a) => {
  const el = $('#ach');
  el.innerHTML = `<span class="ai">${a.icon}</span><div><small>🏆 Conquista desbloqueada</small><b>${a.title}</b><small>${a.desc}</small></div>`;
  el.classList.remove('hidden', 'show'); void el.offsetWidth; el.classList.add('show');
  sfx('achievement');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 3800);
});
// Áudio só liga depois de um toque; cliques em botões fazem um "tic".
document.addEventListener('pointerdown', unlockAudio);
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) sfx('click'); });
hooks.objective = (done) => { if (done.say) queueScene('objective', { texto: done.say }); };

// Ponte para os onclick escritos nos templates HTML (módulos não ficam no escopo global).
Object.assign(window, {
  ui, state, cam,
  zoomCenter, goHQ, deselect, selectNode, nextTarget, setSend, setRecruit, initialCam,
  toggleRadio, toggleFullscreen, closeReport, renderRotate, showMenu, showHelp, showStart, showEnd, confirmNew, closeModal, resetSave,
  newGame, endDay, playerAttack, playerNegotiate, moveGuards, toggleLowkey, recruit, upgrade, bribe,
  startCreate, editIdentity, cr, showCrew, showCaptainPicker, crewUI, dialogNext, dialogChoose, dialogSkip, closeTip, setPref,
  openBrawl, brawlMove, brawlToggleCmd, brawlClose, buyMoto, skipTutorial, goNextEra,
  showArsenal, arsenalUI, buyLotAt, buildAt, eventAt,
  heistAt, extortAt, ambushAt, truceWith, allyWith, hitOn, policyAt,
  showMarket, marketUI, estadoUI, goEstado, showAchievements, showLore, applyAudioPrefs,
});

$('#endBtn').onclick = () => { ui.selected = null; endDay(); };
if (load()) { render(); initialCam(); if (inEstado()) showEstado(); else if (state.over) showEnd(); else if (state.brawl) resumeBrawl(); else playIntro(); }
else {
  // Estado vazio só pra desenhar o mapa atrás da tela de início.
  replaceState({ day: 1, money: 0, free: 0, respect: 0, heat: 0, actions: 0, recruited: 0, bribeDays: 0,
    player: { gang: '', leader: '', color: PLAYER_COLORS[0] }, nodes: freshNodes(), rivals: {}, log: [], over: null });
  render(); initialCam();
  showStart();
}
