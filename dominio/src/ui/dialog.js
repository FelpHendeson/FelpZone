// Motor de cenas de diálogo e de dicas do tutorial. Tudo pulável.
import { SCENES, TIPS } from '../data/scenes.js';
import { ORIGINS } from '../data/crew.js';
import { state, save } from '../core/state.js';
import { member } from '../core/crew.js';
import { ERA, T } from '../core/era.js';
import { LEVELS } from '../data/world.js';
import { clamp } from '../core/util.js';
import { avatarSVG } from './art.js';

const $ = (sel) => document.querySelector(sel);
const PREFS_KEY = 'dominio-prefs';

// Preferências globais (valem pra todas as partidas).
export const prefs = (() => {
  const base = { tips: true, scenes: true };
  try { return { ...base, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch (e) { return base; }
})();
export function setPref(k, v) {
  prefs[k] = v;
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* sem espaço */ }
}

// ---------- cenas ----------
const queue = [];
let current = null;           // { lines, i, ctx, onDone }
let isBusy = () => false;     // a interface diz quando não dá pra abrir cena (modal, relatório...)
export function setBusyCheck(fn) { isBusy = fn; }
export const sceneActive = () => !!current;

export function queueScene(id, ctx = {}, onDone) {
  if (!SCENES[id]) return;
  queue.push({ id, ctx, onDone });
  tryPlay();
}
export function tryPlay() {
  if (current || !queue.length || isBusy()) return;
  const next = queue.shift();
  if (!prefs.scenes) { next.onDone && next.onDone(); tryPlay(); return; }
  current = { lines: SCENES[next.id], i: 0, ctx: next.ctx, onDone: next.onDone, auto: false };
  drawLine();
}

function speaker(who, ctx) {
  if (who === 'narr') return { narr: true };
  if (who === 'chief' && state.org) return { name: state.org.chief.vulgo, sub: `Chefe do ${state.org.gang}`, look: state.org.chief.look };
  if (who === 'cmd') return { name: state.cmd.vulgo, sub: 'Você', look: state.cmd.look };
  const m = who === 'vice' ? state.members.find((x) => x.role === 'vice') : member(ctx[who]);
  if (!m) return { name: '???', sub: '', look: state.cmd.look };
  return { name: m.vulgo, sub: `${m.role === 'vice' ? 'Vice' : 'Capitão'} · ${m.name}`, look: m.look, status: m.status };
}
function fill(text, ctx) {
  const m = ctx.m ? member(ctx.m) : null;
  const caps = state.members.filter((x) => x.role === 'cap' && x.status === 'ok').map((x) => `${x.name} “${x.vulgo}”`);
  const vars = {
    chefe: state.org ? state.org.chief.vulgo : '', org: state.org ? state.org.gang : '', cidade: state.cityId && state.org ? (LEVELS[state.org.level || 'estado'].nodes[state.cityId] || {}).name || '' : '',
    vulgo: state.cmd.vulgo, gang: state.player.gang, originLine: ORIGINS[state.cmd.origin].line,
    capitaes: caps.length ? caps.join(' e ') : 'Os moleques',
    falaEntrada: m ? m.line : '', vulgoM: m ? m.vulgo : '', ...ctx,
  };
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return esc(text).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? esc(vars[k]) : `{${k}}`));
}

function drawLine() {
  const el = $('#dialog');
  const line = current.lines[current.i];
  const sp = speaker(line.who, current.ctx);
  const choices = line.choices && !current.reply;
  const text = current.reply ? fill(current.reply, current.ctx) : fill(line.text, current.ctx);
  const first = current.i === 0 && !current.reply && el.classList.contains('hidden');
  if (sp.narr) {
    el.innerHTML = `<div class="dlg narr ${first ? 'first' : ''}" onclick="dialogNext()"><div class="body"><div class="tx">${fill(line.text, current.ctx)}</div>
      <div class="ft"><span>Toque pra continuar ▸</span><button onclick="event.stopPropagation();dialogSkip()">Pular cena ⏭</button></div></div></div>`;
    el.classList.remove('hidden');
    return;
  }
  el.innerHTML = `<div class="dlg ${line.who === 'cmd' ? 'me' : ''} ${first ? 'first' : ''}" onclick="dialogNext()">
    <div class="who">${avatarSVG(sp.look, state.jacket, state.flag, { status: sp.status })}</div>
    <div class="body">
      <div class="nm"><b>${fill(sp.name, {})}</b><small>${fill(sp.sub, {})}</small></div>
      <div class="tx">${text}</div>
      ${choices ? `<div class="ch">${line.choices.map((c, k) => `<button onclick="event.stopPropagation();dialogChoose(${k})">${fill(c.text, current.ctx)}</button>`).join('')}</div>`
        : `<div class="ft"><span>Toque pra continuar ▸</span><button onclick="event.stopPropagation();dialogSkip()">Pular cena ⏭</button></div>`}
    </div></div>`;
  el.classList.remove('hidden');
}
export function dialogNext() {
  if (!current) return;
  const line = current.lines[current.i];
  if (line.choices && !current.reply) return;   // precisa escolher
  current.reply = null;
  current.i++;
  if (current.i >= current.lines.length) return finish();
  drawLine();
}
export function dialogChoose(k) {
  const c = current.lines[current.i].choices[k];
  if (c.effect && c.effect.action && choiceHandlers[c.effect.action]) choiceHandlers[c.effect.action](c.effect);
  if (c.effect) {
    if (c.effect.loyalty) state.members.forEach((m) => { if (m.status === 'ok') m.loyalty = clamp(m.loyalty + c.effect.loyalty, 0, 100); });
    if (c.effect.respect) state.respect = clamp(state.respect + c.effect.respect, 0, 100);
    save();
  }
  if (c.reply) { current.reply = c.reply; drawLine(); } else dialogNext();
}
export function dialogSkip() {
  // pular uma cena com escolha obrigatória aplica a primeira opção
  if (current) for (let i = current.i; i < current.lines.length; i++) {
    const ln = current.lines[i];
    if (ln.choices && ln.choices[0].effect && ln.choices[0].effect.action && choiceHandlers[ln.choices[0].effect.action]) { choiceHandlers[ln.choices[0].effect.action](ln.choices[0].effect); break; }
  }
  finish();
}
// Escolhas que disparam ações do jogo (ex.: filiar o braço local).
const choiceHandlers = {};
export function registerChoice(name, fn) { choiceHandlers[name] = fn; }
function finish() {
  const done = current && current.onDone;
  current = null;
  $('#dialog').classList.add('hidden');
  if (done) done();
  afterScene();
  tryPlay();
}
let afterScene = () => {};
export function onSceneEnd(fn) { afterScene = fn; }

// ---------- dicas ----------
let tipShowing = null;
export function showTip(id) {
  if (!prefs.tips || !TIPS[id] || !state.seenTips || state.seenTips[id] || tipShowing || current) return;
  state.seenTips[id] = 1;
  save();
  tipShowing = id;
  const W = ERA.words;
  const vars = { heat: W.heat, heatIcon: W.heatIcon, police: W.police, bribe: W.bribe, bribeIcon: W.bribeIcon,
    consequencia: ERA.cfg.raid === 'advertencia' ? 'pode vir advertência, e na terceira o bonde é suspenso' : 'tem batida' };
  const t = { title: T(TIPS[id].title, vars), text: T(TIPS[id].text, vars) };
  const el = $('#tip');
  el.innerHTML = `<div class="tipbox"><b>❔ ${t.title}</b><p>${t.text}</p>
    <div class="row"><button class="primary" onclick="closeTip()">Entendi</button><button onclick="closeTip(true)">Desativar dicas</button></div></div>`;
  el.classList.remove('hidden');
}
export function closeTip(disable) {
  if (disable) setPref('tips', false);
  tipShowing = null;
  $('#tip').classList.add('hidden');
}
