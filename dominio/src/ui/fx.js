// Animações por cima do mapa (camada SVG própria, que não é apagada quando o mapa redesenha)
// e efeitos de tela: dinheiro subindo, sirene, tremida, clarão.
import { state } from '../core/state.js';
import { ADJ } from '../core/era.js';

const $ = (sel) => document.querySelector(sel);
const NS = 'http://www.w3.org/2000/svg';
const layer = () => $('#fx');
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// a camada de efeitos acompanha a câmera do mapa
export function syncFx(viewBox) { const l = layer(); if (l) l.setAttribute('viewBox', viewBox); }

function el(tag, attrs, parent = layer()) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent.appendChild(e);
  return e;
}
// ponto seu mais perto do alvo (de onde o esquadrão sai)
function sourceFor(id) {
  const t = state.nodes[id];
  const near = ADJ[id].map((k) => state.nodes[k]).filter((n) => n.owner === 'P');
  const pool = near.length ? near : state.nodes.filter((n) => n.owner === 'P');
  return pool.sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0] || t;
}

// Esquadrão correndo pela rua até o alvo + clarão do resultado.
export function attackFx(fromNode, toNode, win, color) {
  if (!layer()) return;
  const a = fromNode, b = toNode;
  if (reduced()) { burst(b.x, b.y, win); return; }
  const g = el('g', {});
  const dots = Array.from({ length: 6 }, (_, i) => el('circle', { r: 7, fill: color, stroke: '#0b0b12', 'stroke-width': 2, opacity: 0.95, 'data-o': i }, g));
  const t0 = performance.now(), dur = 650;
  const frame = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    dots.forEach((d, i) => {
      const kk = Math.max(0, Math.min(1, k * 1.25 - i * 0.05));
      const ease = kk * kk * (3 - 2 * kk);
      const wob = Math.sin((kk * 8 + i) * Math.PI) * 6;
      d.setAttribute('cx', a.x + (b.x - a.x) * ease + wob * 0.3);
      d.setAttribute('cy', a.y + (b.y - a.y) * ease + ((i % 3) - 1) * 9 + wob * 0.3);
    });
    if (k < 1) requestAnimationFrame(frame); else { g.remove(); burst(b.x, b.y, win); }
  };
  requestAnimationFrame(frame);
}
export function attackOn(id, win) { const t = state.nodes[id]; attackFx(sourceFor(id), t, win, state.flag ? state.flag.bg : '#ef4444'); }
export function defendOn(id, win, rivalColor) {
  const t = state.nodes[id];
  const from = ADJ[id].map((k) => state.nodes[k]).find((n) => n.owner && n.owner !== 'P' && n.owner !== 'X') || t;
  attackFx(from, t, win, rivalColor || '#a855f7');
}

// Clarão no alvo: verde se deu certo, vermelho se não.
export function burst(x, y, good) {
  if (!layer()) return;
  const c = el('circle', { cx: x, cy: y, r: 30, fill: 'none', stroke: good ? '#86efac' : '#f87171', 'stroke-width': 6, opacity: 1 });
  const txt = el('text', { x, y: y - 44, class: 'fxt', fill: good ? '#86efac' : '#f87171' }); txt.textContent = good ? '✊' : '✖';
  const t0 = performance.now();
  const frame = (now) => {
    const k = Math.min(1, (now - t0) / 700);
    c.setAttribute('r', 30 + 50 * k); c.setAttribute('opacity', 1 - k);
    txt.setAttribute('y', y - 44 - 30 * k); txt.setAttribute('opacity', 1 - k * k);
    if (k < 1) requestAnimationFrame(frame); else { c.remove(); txt.remove(); }
  };
  requestAnimationFrame(frame);
}

// Texto flutuando na tela (dinheiro, nível, conquista...).
export function floatText(text, cls = 'good', anchor = '#top .res .pill') {
  const a = $(anchor);
  const r = a ? a.getBoundingClientRect() : { left: innerWidth / 2, bottom: 60, width: 0 };
  const d = document.createElement('div');
  d.className = `float ${cls}`;
  d.textContent = text;
  d.style.left = `${r.left + r.width / 2}px`; d.style.top = `${r.bottom + 6}px`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1600);
}
// Sirene: bordas da tela piscando vermelho e azul.
export function sirenFx() {
  if (reduced()) return;
  const d = document.createElement('div');
  d.className = 'siren';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1500);
}
export function shake(selector) {
  const e = $(selector);
  if (!e || reduced()) return;
  e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake');
}
export function flash(color = '#fff') {
  if (reduced()) return;
  const d = document.createElement('div');
  d.className = 'flash'; d.style.background = color;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 600);
}
