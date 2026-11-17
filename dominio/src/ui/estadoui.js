// Mapa da expansão (Estado → País → Mundo): nós, rotas, patrões, caixa, escolha do braço, anexação,
// subir de nível, largar a vida e o epílogo.
import { LEVELS } from '../data/world.js';
import { TRAITS } from '../data/crew.js';
import {
  org, isMine, available, tributePerDay, orgMembers, allMine, sendMember, findLocal, canSend, L, level, nodeDef,
  canAnnex, annex, annexPrice, canLevelUp, levelUp, finishStory, epilogue,
} from '../core/estado.js';
import { money } from '../core/util.js';
import { avatarSVG, flagSVG, flagInner } from './art.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let sel = null;
let confirmRetire = false;
let deps = { create() {}, newGame() {} };
export function initEstadoUI(d) { deps = { ...deps, ...d }; }
export const estadoOpen = () => !$('#estado').classList.contains('hidden');

function mapSVG() {
  const o = org();
  const lv = L();
  const p = [];
  lv.routes.forEach(([a, b]) => {
    const A = lv.nodes[a], B = lv.nodes[b];
    p.push(`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#3a3a55" stroke-width="10" stroke-linecap="round"/>`);
    p.push(`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#6b6b90" stroke-width="2" stroke-dasharray="10 12"/>`);
  });
  for (const [id, c] of Object.entries(lv.nodes)) {
    const mine = isMine(id), av = available(id);
    const col = mine ? o.flag.bg : av ? '#f59e0b' : '#475569';
    const st = o.nodes[level()][id];
    p.push(`<g class="city${sel === id ? ' sel' : ''}${av ? ' av' : ''}" onclick="estadoUI.select('${id}')">`);
    if (av) p.push(`<circle class="target" cx="${c.x}" cy="${c.y}" r="62"/>`);
    p.push(`<circle cx="${c.x}" cy="${c.y}" r="${c.final ? 54 : 46}" fill="#11111a" stroke="${col}" stroke-width="${sel === id ? 7 : 5}"/>`);
    if (mine && st.patron) p.push(avatarSVG(st.patron.look, o.jacket, o.flag).replace('<svg class="avatar"', `<svg x="${c.x - 38}" y="${c.y - 38}" width="76" height="76"`));
    else p.push(`<text x="${c.x}" y="${c.y + 2}" class="cicon">${c.final ? '🏛️' : av ? '❔' : '🔒'}</text>`);
    if (mine) p.push(`<svg x="${c.x + 22}" y="${c.y - 64}" width="36" height="24" viewBox="0 0 150 100">${flagInner(o.flag)}</svg>`);
    p.push(`<text x="${c.x}" y="${c.y + (c.final ? 82 : 74)}" class="cname">${c.name}</text>`);
    p.push(`</g>`);
  }
  return `<svg class="estmap" viewBox="0 0 1000 680">${p.join('')}</svg>`;
}

function retireBox() {
  return confirmRetire
    ? `<div class="opt2 danger"><b>🚪 Largar a vida?</b><small>A história termina aqui, com um epílogo. Não dá pra voltar.</small>
        <div class="row"><button class="danger" onclick="estadoUI.retire(true)">Largar a vida</button><button onclick="estadoUI.retire(false)">Cancelar</button></div></div>`
    : `<button class="mini" onclick="estadoUI.retireAsk()">🚪 Largar a vida (final alternativo)</button>`;
}

function panel() {
  const o = org();
  const lv = L();
  if (allMine()) {
    if (canLevelUp()) {
      const nx = LEVELS[lv.next];
      return `<div class="ep"><h3>🏆 O ${lv.label.toLowerCase()} é seu</h3><p>Todos os lugares respondem ao ${esc(o.gang)}. O próximo passo é o ${nx.label.toLowerCase()}: lugares maiores, gangues mais fortes, e a organização manda mais apoio pros braços.</p>
        <button class="primary big" onclick="estadoUI.up()">Subir pro ${nx.label} ▶</button>${retireBox()}</div>`;
    }
    return `<div class="ep"><h3>👑 O mundo é seu</h3><p>Do terraço do Estadual ao Nexus. Não sobrou ninguém acima do ${esc(o.gang)}.</p>
      <button class="primary big" onclick="estadoUI.end('rei')">Ver o epílogo ▶</button></div>`;
  }
  if (!sel) return `<div class="ep"><p class="hint">Toque num lugar. Os com ❔ e círculo pontilhado estão na rota: dá pra mandar um braço, achar alguém de lá ou anexar na negociação.</p>${retireBox()}</div>`;
  const c = nodeDef(sel);
  const st = o.nodes[level()][sel];
  if (isMine(sel)) {
    return `<div class="ep"><h3>${c.name}</h3><p>${c.desc}</p><p>👤 Patrão: <b>${esc(st.patron.vulgo)}</b>${st.patron.chief ? ' (você)' : ''}${st.annexed ? ' · anexada' : ''} · 💵 ${money(Math.round(c.tribute * (st.tributeMult || 1)))}/dia de tributo</p></div>`;
  }
  if (!available(sel)) return `<div class="ep"><h3>${c.name}</h3><p>${c.desc}</p><p class="hint">🔒 Fora da rota. Domine um vizinho primeiro.</p></div>`;
  const mem = orgMembers();
  const why = canSend(sel);
  const aw = canAnnex(sel);
  const sup = lv.support;
  return `<div class="ep"><h3>${c.name} <small>dificuldade +${Math.round(((c.diff || 1) - 1) * 100)}%</small></h3><p>${c.desc}</p>
    ${st && st.status === 'lost' ? '<p class="hint"><b>Seu último braço caiu aqui.</b></p>' : ''}
    <div class="choice">
      <div class="opt2"><b>📨 Mandar alguém</b><small>Um membro do bonde, leal, com até ${money(sup.cap)} do caixa, ${sup.soldiers} soldados e armas. Mas é forasteiro: começa sem respeito e com as gangues de olho.</small>
        <div class="who">${mem.length ? mem.map((m) => `<button onclick="estadoUI.send(${m.id})" ${why ? 'disabled' : ''}>${avatarSVG(m.look, o.jacket, o.flag)}<span><b>${esc(m.vulgo)}</b><small>nv${m.level} · ${m.traits.map((t) => TRAITS[t].icon).join('')}</small></span></button>`).join('') : `<span class="hint">${why}</span>`}</div></div>
      <div class="opt2"><b>🔎 Achar alguém</b><small>Um personagem novo, de lá: você cria. Começa do zero, mas com respeito local. Quando fizer nome (⭐50), ${esc(o.chief.vulgo)} chama pra se filiar e manda apoio.</small>
        <button class="primary" onclick="estadoUI.find()">Criar personagem local ▶</button></div>
      <div class="opt2"><b>💼 Anexar na negociação</b><small>Paga do caixa da organização e um membro vira patrão, sem guerra. Rende 75% do tributo.${c.final ? ' O último lugar de cada nível só cai na guerra.' : ''}</small>
        <button onclick="estadoUI.annex()" ${aw ? 'disabled' : ''}>${aw || `Anexar por ${money(annexPrice(sel))}`}</button></div>
    </div></div>`;
}

function epilogueHTML() {
  const e = epilogue();
  const title = e.kind === 'rei' ? '👑 DONO DO MUNDO' : '🚪 LARGOU A VIDA';
  const text = e.kind === 'rei'
    ? `${esc(e.chief)} começou num terraço de colégio e terminou com o mundo nas mãos. O ${esc(e.gang)} virou lenda: cada cidade tem um patrão, cada rota paga pedágio, e ninguém lembra mais como era antes.`
    : `Um dia, ${esc(e.chief)} simplesmente não apareceu. O ${esc(e.gang)} continuou de pé, dividido entre os patrões, e o nome do chefe virou conversa de bar: uns dizem que foi pra praia, outros que nunca existiu.`;
  return `<div class="ep epi"><h3>${title}</h3><p>${text}</p>
    <ul>
      <li>🗺️ Chegou até o nível: <b>${e.level}</b></li>
      <li>🏙️ Lugares dominados: <b>${e.conquered.length}</b>: ${e.conquered.map((c) => `${esc(c.name)}${c.patron ? ` (${esc(c.patron)})` : ''}`).join(', ')}</li>
      <li>⚰️ Braços que caíram pelo caminho: <b>${e.fallen.length ? e.fallen.map(esc).join(', ') : 'nenhum'}</b></li>
      <li>💰 Caixa da organização no fim: <b>${money(e.treasury)}</b></li>
      <li>📅 Dias de história: <b>${e.days}</b></li>
    </ul>
    <button class="primary big" onclick="estadoUI.newGame()">Começar uma nova história ▶</button></div>`;
}

export function showEstado() {
  const o = org();
  if (!o) return;
  const lv = L();
  $('#estado').innerHTML = `<div class="ebox">
    <div class="eh">${flagSVG(o.flag)}<div><h2>${esc(o.gang)} · ${lv.label}</h2><small>Chefe: ${esc(o.chief.vulgo)} · Caixa da organização: <b>${money(o.treasury)}</b> · Tributo: ${money(tributePerDay())}/dia (entra enquanto um braço joga)</small></div>
      <button class="ic" onclick="showMenu()" title="Menu">☰</button></div>
    <div class="em">${mapSVG()}${o.ending ? epilogueHTML() : panel()}</div></div>`;
  $('#estado').classList.remove('hidden');
}
export function hideEstado() { $('#estado').classList.add('hidden'); }

export const estadoUI = {
  select(id) { sel = id; confirmRetire = false; showEstado(); },
  send(mid) { const id = sel; sel = null; hideEstado(); sendMember(id, mid); },
  find() {
    const id = sel; hideEstado();
    const nm = nodeDef(id).name;
    const local = { gang: `Bonde de ${nm}`, leader: '', flag: { bg: '#06b6d4', fg: '#111827', pattern: 'faixa', symbol: 'estrela', sym: '#f5f5f4' } };
    deps.create((opts) => { if (opts) { sel = null; findLocal(id, opts); } else showEstado(); }, local);
  },
  annex() { if (annex(sel)) { sel = null; showEstado(); } },
  up() { sel = null; levelUp(); showEstado(); },
  retireAsk() { confirmRetire = true; showEstado(); },
  retire(yes) { confirmRetire = false; if (yes) finishStory('aposentado'); showEstado(); },
  end(kind) { finishStory(kind); showEstado(); },
  newGame() { deps.newGame(); },
};
