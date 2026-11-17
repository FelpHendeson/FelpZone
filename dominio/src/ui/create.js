// Criação do personagem em 4 passos: você → atributos → bonde (bandeira e jaqueta) → pronto.
// Também serve pra editar só a bandeira e a jaqueta durante a partida.
import { ATTRS, ATTR_KEYS, ATTR_BASE, ATTR_POINTS, ATTR_MAX_START, ORIGINS } from '../data/crew.js';
import { HAIRS, BROWS, MOUTHS, SCARS, ACCESSORIES, SKINS, HAIR_COLORS, DEFAULT_LOOK, LOOK_OPTIONS } from '../data/look.js';
import { FLAG_COLORS, JACKET_COLORS, PATTERNS, SYMBOLS, DEFAULT_FLAG, DEFAULT_JACKET } from '../data/flags.js';
import { randomLook, rng } from '../core/crew.js';
import { avatarSVG, flagSVG } from './art.js';
import { prefs, setPref } from './dialog.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let d = null;        // rascunho do personagem
let step = 0;
let onFinish = null;
let editOnly = false;
const STEPS = ['Você', 'Atributos', 'O bonde', 'Pronto'];

export function showCreate(done) {
  editOnly = false;
  onFinish = done;
  step = 0;
  d = {
    name: '', leader: 'Felp', origin: 'morro', look: { ...DEFAULT_LOOK },
    attrs: Object.fromEntries(ATTR_KEYS.map((k) => [k, ATTR_BASE])),
    gang: 'Bonde do Farol', flag: { ...DEFAULT_FLAG }, jacket: { ...DEFAULT_JACKET }, leve: false,
  };
  draw();
}
export function showIdentityEditor(current, done) {
  editOnly = true;
  onFinish = done;
  step = 2;
  d = { ...current, flag: { ...current.flag }, jacket: { ...current.jacket }, look: { ...current.look } };
  draw();
}

const spent = () => ATTR_KEYS.reduce((s, k) => s + d.attrs[k] - ATTR_BASE, 0);
const finalAttr = (k) => d.attrs[k] + ((ORIGINS[d.origin].bonus || {})[k] || 0);

function cycle(obj, key, list, dir) {
  const i = list.indexOf(obj[key]);
  obj[key] = list[(i + dir + list.length) % list.length];
}
function optRow(label, key, labels) {
  const list = Object.keys(labels);
  return `<div class="opt"><span>${label}</span><button onclick="cr.look('${key}',-1)">‹</button><b>${labels[d.look[key]]}</b><button onclick="cr.look('${key}',1)">›</button></div>`;
}
function swatches(list, current, fn) {
  return `<div class="sw">${list.map((c) => `<button style="background:${c}" class="${c === current ? 'sel' : ''}" onclick="${fn}('${c}')" aria-label="${c}"></button>`).join('')}</div>`;
}

function stepYou() {
  return `
    <label>Seu nome</label><input type="text" id="crName" value="${esc(d.name)}" maxlength="20" placeholder="Ex.: Felipe" oninput="cr.set('name', this.value)">
    <label>Seu vulgo (como a rua te chama)</label><input type="text" id="crVulgo" value="${esc(d.leader)}" maxlength="18" oninput="cr.set('leader', this.value)">
    <label>Origem</label>
    <div class="cards">${Object.entries(ORIGINS).map(([k, o]) => `<button class="card ${d.origin === k ? 'sel' : ''}" onclick="cr.origin('${k}')">
      <b>${o.icon} ${o.label}</b><small>${Object.entries(o.bonus).map(([a, v]) => `+${v} ${ATTRS[a].label}`).join(', ')} · ${o.perk}</small></button>`).join('')}</div>
    <label>Aparência <button class="mini" onclick="cr.random()">🎲 Aleatório</button></label>
    <div class="opts">
      <div class="opt"><span>Pele</span>${swatches(SKINS, SKINS[d.look.skin], 'cr.skin')}</div>
      ${optRow('Cabelo', 'hair', HAIRS)}
      <div class="opt"><span>Cor</span>${swatches(HAIR_COLORS, HAIR_COLORS[d.look.hairColor], 'cr.hairColor')}</div>
      ${optRow('Sobrancelha', 'brows', BROWS)}
      ${optRow('Boca', 'mouth', MOUTHS)}
      ${optRow('Cicatriz', 'scar', SCARS)}
      ${optRow('Acessório', 'acc', ACCESSORIES)}
    </div>`;
}
function stepAttrs() {
  const left = ATTR_POINTS - spent();
  return `<p class="hint">Distribua <b>${left}</b> ponto(s). A origem soma bônus. Cada nível novo dá +1 ponto.</p>
    ${ATTR_KEYS.map((k) => `<div class="attr">
      <span class="ai">${ATTRS[k].icon}</span>
      <div class="ad"><b>${ATTRS[k].label}</b><small>${ATTRS[k].desc}</small></div>
      <button onclick="cr.attr('${k}',-1)" ${d.attrs[k] <= ATTR_BASE ? 'disabled' : ''}>−</button>
      <b class="av">${finalAttr(k)}</b>
      <button onclick="cr.attr('${k}',1)" ${left <= 0 || d.attrs[k] >= ATTR_MAX_START ? 'disabled' : ''}>+</button>
    </div>`).join('')}`;
}
function stepGang() {
  return `
    ${editOnly ? '' : `<label>Nome do bonde</label><input type="text" value="${esc(d.gang)}" maxlength="24" oninput="cr.set('gang', this.value)">`}
    <label>Bandeira: fundo</label>${swatches(FLAG_COLORS, d.flag.bg, 'cr.flag.bg')}
    <label>Padrão</label><div class="chips">${Object.entries(PATTERNS).map(([k, v]) => `<button class="${d.flag.pattern === k ? 'sel' : ''}" onclick="cr.flag.pattern('${k}')">${v}</button>`).join('')}</div>
    <label>Cor do padrão</label>${swatches(FLAG_COLORS, d.flag.fg, 'cr.flag.fg')}
    <label>Símbolo</label><div class="chips">${Object.entries(SYMBOLS).map(([k, v]) => `<button class="${d.flag.symbol === k ? 'sel' : ''}" onclick="cr.flag.symbol('${k}')">${v.label}</button>`).join('')}</div>
    <label>Cor do símbolo</label>${swatches(FLAG_COLORS, d.flag.sym, 'cr.flag.sym')}
    <label>Jaqueta</label>${swatches(JACKET_COLORS, d.jacket.color, 'cr.jacket.color')}
    <label>Detalhes da jaqueta (bordado, bandana, boné)</label>${swatches(FLAG_COLORS, d.jacket.accent, 'cr.jacket.accent')}`;
}
function stepReady() {
  return `
    <p>Pronto pra botar o <b>${esc(d.gang)}</b> na rua, <b>${esc(d.leader)}</b>?</p>
    <label class="check"><input type="checkbox" ${d.leve ? 'checked' : ''} onchange="cr.set('leve', this.checked)"> <span><b>Modo leve</b>: membros com nome vão pro hospital em vez de morrer.</span></label>
    <label class="check"><input type="checkbox" ${prefs.tips ? 'checked' : ''} onchange="cr.pref('tips', this.checked)"> <span><b>Dicas</b> do tutorial na primeira vez que algo aparece.</span></label>
    <label class="check"><input type="checkbox" ${prefs.scenes ? 'checked' : ''} onchange="cr.pref('scenes', this.checked)"> <span><b>Cenas de diálogo</b> (sempre dá pra pular).</span></label>`;
}

function preview() {
  return `<div class="pv">
    <div class="pva">${avatarSVG(d.look, d.jacket, d.flag, { cls: 'avatar big' })}</div>
    <div class="pvf">${flagSVG(d.flag)}</div>
    <b>${esc(d.leader || '...')}</b><small>${esc(d.gang || '')}</small>
  </div>`;
}

function draw() {
  const body = [stepYou, stepAttrs, stepGang, stepReady][step]();
  const last = editOnly ? step === 2 : step === 3;
  const valid = step !== 0 || (d.leader || '').trim().length > 0;
  $('#create').innerHTML = `<div class="cbox">
    <div class="chead">${editOnly ? '<h2>Bandeira e jaqueta</h2>' : `<h2>Criar personagem</h2><div class="steps">${STEPS.map((s, i) => `<span class="${i === step ? 'on' : i < step ? 'done' : ''}">${i + 1}. ${s}</span>`).join('')}</div>`}</div>
    <div class="cmain">${preview()}<div class="cform">${body}</div></div>
    <div class="cfoot">
      ${editOnly ? '<button onclick="cr.cancel()">Cancelar</button>' : step > 0 ? '<button onclick="cr.go(-1)">‹ Voltar</button>' : '<button onclick="cr.cancel()">Voltar</button>'}
      <button class="primary" onclick="${last ? 'cr.finish()' : 'cr.go(1)'}" ${valid ? '' : 'disabled'}>${last ? (editOnly ? 'Salvar' : 'Começar ▶') : 'Próximo ›'}</button>
    </div></div>`;
  $('#create').classList.remove('hidden');
}
function redrawKeepFocus() {
  const id = document.activeElement && document.activeElement.id;
  const pos = id && document.activeElement.selectionStart;
  // só a prévia e o rodapé mudam ao digitar; redesenhar tudo tiraria o foco do campo
  if (id === 'crName' || id === 'crVulgo') {
    document.querySelector('#create .pv').outerHTML = preview();
    const btn = document.querySelector('#create .cfoot .primary');
    btn.disabled = step === 0 && !(d.leader || '').trim();
    return;
  }
  draw();
  if (id && $('#' + id)) { $('#' + id).focus(); try { $('#' + id).setSelectionRange(pos, pos); } catch (e) { /* ok */ } }
}

// Ações dos botões (ponte para os onclick).
export const cr = {
  set(k, v) { d[k] = v; redrawKeepFocus(); },
  pref(k, v) { setPref(k, v); },
  origin(k) { d.origin = k; draw(); },
  look(k, dir) { cycle(d.look, k, LOOK_OPTIONS[k], dir); draw(); },
  skin(c) { d.look.skin = SKINS.indexOf(c); draw(); },
  hairColor(c) { d.look.hairColor = HAIR_COLORS.indexOf(c); draw(); },
  random() { d.look = randomLook(rng(Math.floor(Math.random() * 1e9))); draw(); },
  attr(k, dir) {
    const v = d.attrs[k] + dir;
    if (v < ATTR_BASE || v > ATTR_MAX_START || (dir > 0 && spent() >= ATTR_POINTS)) return;
    d.attrs[k] = v; draw();
  },
  flag: {
    bg(c) { d.flag.bg = c; draw(); }, fg(c) { d.flag.fg = c; draw(); }, sym(c) { d.flag.sym = c; draw(); },
    pattern(k) { d.flag.pattern = k; draw(); }, symbol(k) { d.flag.symbol = k; draw(); },
  },
  jacket: { color(c) { d.jacket.color = c; draw(); }, accent(c) { d.jacket.accent = c; draw(); } },
  go(dir) { step = Math.max(0, Math.min(3, step + dir)); draw(); $('#create .cform').scrollTop = 0; },
  cancel() { $('#create').classList.add('hidden'); if (onFinish) onFinish(null); },
  finish() {
    $('#create').classList.add('hidden');
    const attrs = Object.fromEntries(ATTR_KEYS.map((k) => [k, finalAttr(k)]));
    onFinish({
      name: (d.name || '').trim() || (d.leader || '').trim(), leader: (d.leader || '').trim() || 'Chefe', origin: d.origin,
      look: d.look, attrs: editOnly ? d.attrs : attrs, gang: (d.gang || '').trim() || 'Bonde do Farol',
      flag: d.flag, jacket: d.jacket, color: d.flag.bg, leve: d.leve,
    });
  },
};
