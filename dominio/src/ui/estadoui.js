// Tela do mapa do estado: cidades, rotas, patrões, caixa da organização e a escolha do braço.
import { CITIES, ROUTES } from '../data/estado.js';
import { TRAITS } from '../data/crew.js';
import { state } from '../core/state.js';
import { org, isMine, available, tributePerDay, orgMembers, allMine, sendMember, findLocal, canSend } from '../core/estado.js';
import { money } from '../core/util.js';
import { avatarSVG, flagSVG, flagInner } from './art.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let sel = null;
let deps = { create() {}, scene() {} };
export function initEstadoUI(d) { deps = { ...deps, ...d }; }
export const estadoOpen = () => !$('#estado').classList.contains('hidden');

function mapSVG() {
  const o = org();
  const p = [];
  ROUTES.forEach(([a, b]) => {
    const A = CITIES[a], B = CITIES[b];
    p.push(`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#3a3a55" stroke-width="10" stroke-linecap="round"/>`);
    p.push(`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#6b6b90" stroke-width="2" stroke-dasharray="10 12"/>`);
  });
  for (const [id, c] of Object.entries(CITIES)) {
    const mine = isMine(id), av = available(id);
    const col = mine ? o.flag.bg : av ? '#f59e0b' : '#475569';
    p.push(`<g class="city${sel === id ? ' sel' : ''}${av ? ' av' : ''}" onclick="estadoUI.select('${id}')">`);
    if (av) p.push(`<circle class="target" cx="${c.x}" cy="${c.y}" r="62"/>`);
    p.push(`<circle cx="${c.x}" cy="${c.y}" r="${c.final ? 54 : 46}" fill="#11111a" stroke="${col}" stroke-width="${sel === id ? 7 : 5}"/>`);
    if (mine && o.cities[id].patron) p.push(avatarSVG(o.cities[id].patron.look, o.jacket, o.flag).replace('<svg class="avatar"', `<svg x="${c.x - 38}" y="${c.y - 38}" width="76" height="76"`));
    else p.push(`<text x="${c.x}" y="${c.y + 2}" class="cicon">${c.final ? '🏛️' : av ? '❔' : '🔒'}</text>`);
    if (mine) p.push(`<svg x="${c.x + 22}" y="${c.y - 64}" width="36" height="24" viewBox="0 0 150 100">${flagInner(o.flag)}</svg>`);
    p.push(`<text x="${c.x}" y="${c.y + (c.final ? 82 : 74)}" class="cname">${c.name}</text>`);
    p.push(`</g>`);
  }
  return `<svg class="estmap" viewBox="0 0 1000 680">${p.join('')}</svg>`;
}

function panel() {
  const o = org();
  if (allMine()) return `<div class="ep"><h3>👑 O estado é seu</h3><p>Todas as cidades respondem ao ${esc(o.gang)}. País e Mundo vêm na próxima fase do jogo.</p></div>`;
  if (!sel) return `<div class="ep"><p class="hint">Toque numa cidade. As com ❔ e círculo pontilhado estão na rota: dá pra mandar um braço pra lá.</p></div>`;
  const c = CITIES[sel];
  if (isMine(sel)) {
    const pt = o.cities[sel].patron;
    return `<div class="ep"><h3>${c.name}</h3><p>${c.desc}</p><p>👤 Patrão: <b>${esc(pt.vulgo)}</b>${pt.chief ? ' (você)' : ''} · 💵 ${money(Math.round(c.tribute * (o.cities[sel].tributeMult || 1)))}/dia de tributo</p></div>`;
  }
  if (!available(sel)) return `<div class="ep"><h3>${c.name}</h3><p>${c.desc}</p><p class="hint">🔒 Fora da rota. Domine uma cidade vizinha primeiro.</p></div>`;
  const mem = orgMembers();
  const why = canSend(sel);
  return `<div class="ep"><h3>${c.name} <small>dificuldade ${Math.round((c.diff - 1) * 100) ? `+${Math.round((c.diff - 1) * 100)}%` : 'normal'}</small></h3><p>${c.desc}</p>
    <p class="hint">Gangues: ${Object.values(c.gangs).map((g) => esc(g.name)).join(', ')}.${o.cities[sel] && o.cities[sel].status === 'lost' ? ' <b>Seu último braço caiu aqui.</b>' : ''}</p>
    <div class="choice">
      <div class="opt2"><b>📨 Mandar alguém</b><small>Um membro do bonde, leal, com até ${money(3000)} do caixa, 8 soldados e 5 pistolas. Mas é forasteiro: começa sem respeito e com as gangues de olho.</small>
        <div class="who">${mem.length ? mem.map((m) => `<button onclick="estadoUI.send(${m.id})" ${why ? 'disabled' : ''}>${avatarSVG(m.look, o.jacket, o.flag)}<span><b>${esc(m.vulgo)}</b><small>nv${m.level} · ${m.traits.map((t) => TRAITS[t].icon).join('')}</small></span></button>`).join('') : `<span class="hint">${why}</span>`}</div></div>
      <div class="opt2"><b>🔎 Achar alguém</b><small>Um personagem novo, de lá: você cria. Começa do zero, mas com respeito local. Quando fizer nome (⭐50), ${esc(o.chief.vulgo)} chama ele pra se filiar e manda apoio.</small>
        <button class="primary" onclick="estadoUI.find()">Criar personagem local ▶</button></div>
    </div></div>`;
}

export function showEstado() {
  const o = org();
  if (!o) return;
  $('#estado').innerHTML = `<div class="ebox">
    <div class="eh">${flagSVG(o.flag)}<div><h2>${esc(o.gang)} · Estado</h2><small>Chefe: ${esc(o.chief.vulgo)} · Caixa da organização: <b>${money(o.treasury)}</b> · Tributo: ${money(tributePerDay())}/dia (entra enquanto um braço joga)</small></div>
      <button class="ic" onclick="showMenu()" title="Menu">☰</button></div>
    <div class="em">${mapSVG()}${panel()}</div></div>`;
  $('#estado').classList.remove('hidden');
}
export function hideEstado() { $('#estado').classList.add('hidden'); }

export const estadoUI = {
  select(id) { sel = id; showEstado(); },
  send(mid) { const id = sel; sel = null; hideEstado(); sendMember(id, mid); },
  find() {
    const id = sel; hideEstado();
    const local = { gang: `Bonde ${CITIES[id].name.startsWith('Praia') || CITIES[id].name.startsWith('Serra') || CITIES[id].name.startsWith('Capital') ? 'da' : 'do'} ${CITIES[id].name}`, leader: '', flag: { bg: '#06b6d4', fg: '#111827', pattern: 'faixa', symbol: 'estrela', sym: '#f5f5f4' } };
    deps.create((opts) => { if (opts) { sel = null; findLocal(id, opts); } else showEstado(); }, local);
  },
};
