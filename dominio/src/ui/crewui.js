// Tela do bonde (hierarquia, lealdade, atributos) e escolha de capitão para um ponto.
import { ATTRS, ATTR_KEYS, ORIGINS, TRAITS } from '../data/crew.js';
import { state, save } from '../core/state.js';
import {
  active, captainAt, memberTitle, assignCaptain, unassignCaptain, canPromote, promoteCaptain, captainCost,
  captainCap, captainCount, captainRespect, spendPoint, canGift, gift, giftCost, lieutenantsOf, canPromoteLt, promoteLieutenant, lieutenantCost,
} from '../core/crew.js';
import { money } from '../core/util.js';
import { ERA } from '../core/era.js';
import { POLICIES, policyOf, cyclePolicy } from '../core/ops.js';
import { avatarSVG, flagSVG } from './art.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let deps = { changed() {}, focusNode() {}, editIdentity() {} };
export function initCrewUI(d) { deps = { ...deps, ...d }; }

const STATUS = {
  ok: '', hospital: '🏥 No hospital', preso: '🚔 Preso', morto: '⚰️ Morto', traidor: '🐍 Traidor',
};
const loyColor = (v) => (v >= 60 ? '#86efac' : v >= 35 ? '#fcd34d' : '#fca5a5');

function memberCard(m) {
  const node = m.node !== null ? state.nodes[m.node] : null;
  const status = m.status === 'ok'
    ? (node ? `📍 Comanda <b>${esc(node.name)}</b>` : '<span class="warnc">Sem ponto (−1 lealdade/dia)</span>')
    : `${STATUS[m.status]}${m.timer ? ` · ${m.timer}d` : ''}`;
  const giftWhy = canGift(m);
  return `<div class="mcard ${m.status !== 'ok' ? 'off' : ''}">
    <div class="ma">${avatarSVG(m.look, state.jacket, state.flag, { status: m.status })}</div>
    <div class="mb">
      <div class="mt"><b>${esc(m.vulgo)}</b><small>${m.role === 'vice' ? 'Vice' : m.role === 'ten' ? 'Tenente' : 'Capitão'} · ${esc(m.name)} · nv${m.level}</small></div>
      <div class="tr">${m.traits.map((t) => `<span class="trait" title="${TRAITS[t].desc}">${TRAITS[t].icon} ${TRAITS[t].label}</span>`).join('')}</div>
      ${m.status === 'ok' ? `<div class="loy" title="Lealdade: abaixo de 25 pode trair"><i style="width:${m.loyalty}%;background:${loyColor(m.loyalty)}"></i><span>🤝 ${m.loyalty}</span></div>` : ''}
      <div class="st">${status}</div>
      ${m.status === 'ok' && m.role !== 'ten' && lieutenantsOf(m).length ? `<div class="lts">${lieutenantsOf(m).map((t) => `<span class="lt" title="Tenente · ${TRAITS[t.traits[0]].label} · lealdade ${t.loyalty}">${avatarSVG(t.look, state.jacket, state.flag)}<b>${esc(t.vulgo)}</b><small>🤝${t.loyalty}</small></span>`).join('')}</div>` : ''}
      ${m.status === 'ok' ? `<div class="mbtn">
        ${node ? `<button onclick="crewUI.goto(${node.id})">Ver ponto</button><button onclick="crewUI.unassign(${m.id})">Tirar do ponto</button>` : ''}
        <button onclick="crewUI.gift(${m.id})" ${giftWhy ? 'disabled' : ''} title="+15 de lealdade">💵 Agrado ${giftWhy || money(giftCost(m))}</button>
        ${m.role !== 'ten' ? (() => { const w = canPromoteLt(m); return `<button onclick="crewUI.lt(${m.id})" ${w ? `disabled title="${w}"` : 'title="Tenente: +8% de defesa no ponto do capitão, +2% de ataque do bonde; assume se o capitão cair"'}>🎖️ + Tenente ${w ? '' : money(lieutenantCost())}</button>`; })() : ''}
        ${ERA.generate ? `<button onclick="crewUI.policy(${m.id})" title="${POLICIES[policyOf(m)].desc}">${POLICIES[policyOf(m)].icon} ${POLICIES[policyOf(m)].label}</button>` : ''}
      </div>` : ''}
    </div></div>`;
}

export function showCrew() {
  const c = state.cmd;
  const o = ORIGINS[c.origin];
  const xpNeed = 40 * c.level;
  const alive = state.members.filter((m) => m.status !== 'morto' && m.status !== 'traidor' && !(m.role === 'ten' && m.status === 'ok'));
  const gone = state.members.filter((m) => m.status === 'morto' || m.status === 'traidor');
  const why = canPromote();
  delete $('#crew').dataset.view;
  $('#crew').innerHTML = `<div class="crbox">
    <div class="crhead">
      <div class="crflag">${flagSVG(state.flag)}</div>
      <div><h2>${esc(state.player.gang)}</h2><small>${captainCount()}/${captainCap()} capitães · salário ${money(15)}/dia por capitão (o vice é sócio)</small></div>
      <button class="x" onclick="crewUI.close()" aria-label="Fechar">✕</button>
    </div>
    <div class="crbody">
      <section class="cmd">
        <div class="ca">${avatarSVG(c.look, state.jacket, state.flag, { cls: 'avatar big' })}</div>
        <div class="cb">
          <h3>${esc(c.vulgo)} <small>Comandante · ${esc(c.name)}</small></h3>
          <div class="sub">${o.icon} ${o.label} · Nível ${c.level}</div>
          <div class="xp" title="Experiência: vence ataques e toma QGs"><i style="width:${Math.round((c.xp / xpNeed) * 100)}%"></i><span>XP ${c.xp}/${xpNeed}</span></div>
          ${c.points ? `<div class="pts">🆙 ${c.points} ponto(s) pra distribuir</div>` : ''}
          <div class="attrs">${ATTR_KEYS.map((k) => `<div class="at" title="${ATTRS[k].desc}">${ATTRS[k].icon} ${ATTRS[k].label} <b>${c.attrs[k]}</b>${c.points ? `<button onclick="crewUI.point('${k}')">+</button>` : ''}</div>`).join('')}</div>
          <button class="mini" onclick="crewUI.identity()">🏴 Bandeira e jaqueta</button>
        </div>
      </section>
      <h4>Hierarquia</h4>
      <div class="mgrid">${alive.map(memberCard).join('')}</div>
      <div class="promo">
        <button class="primary" onclick="crewUI.promote()" ${why ? 'disabled' : ''}>🧥 Promover capitão ${why ? '' : money(captainCost())}</button>
        <small>${why || `Precisa de ⭐${captainRespect()}. Os ambiciosos ficam com ciúme.`}</small>
      </div>
      ${gone.length ? `<details><summary>Memorial e traidores (${gone.length})</summary><div class="mgrid">${gone.map(memberCard).join('')}</div></details>` : ''}
    </div></div>`;
  $('#crew').classList.remove('hidden');
}
export const crewOpen = () => !$('#crew').classList.contains('hidden');

// Escolher capitão para um ponto.
export function showCaptainPicker(nodeId) {
  const node = state.nodes[nodeId];
  const cur = captainAt(node);
  const list = active().filter((m) => m.role !== 'ten');
  $('#crew').innerHTML = `<div class="crbox small">
    <div class="crhead"><div><h2>Capitão de ${esc(node.name)}</h2><small>Dá +20% de defesa e os bônus dos traços.</small></div>
      <button class="x" onclick="crewUI.close()" aria-label="Fechar">✕</button></div>
    <div class="crbody"><div class="pick">${list.length ? list.map((m) => {
      const at = m.node !== null ? state.nodes[m.node] : null;
      return `<button class="pk ${cur && cur.id === m.id ? 'sel' : ''}" onclick="crewUI.assign(${m.id}, ${nodeId})">
        ${avatarSVG(m.look, state.jacket, state.flag)}
        <span><b>${esc(m.vulgo)}</b><small>${m.traits.map((t) => `${TRAITS[t].icon} ${TRAITS[t].label}`).join(' · ')}</small>
        <small>🤝 ${m.loyalty} · ${at ? `hoje em ${esc(at.name)}` : 'sem ponto'}</small></span></button>`;
    }).join('') : '<p class="hint">Ninguém disponível. Promova um capitão no 👥 Bonde.</p>'}</div></div></div>`;
  $('#crew').classList.remove('hidden');
}

export const crewUI = {
  close() { $('#crew').classList.add('hidden'); deps.changed(); },
  goto(id) { $('#crew').classList.add('hidden'); deps.focusNode(id); },
  unassign(id) { unassignCaptain(id); save(); deps.changed(); showCrew(); },
  assign(mid, nid) { assignCaptain(mid, nid); save(); $('#crew').classList.add('hidden'); deps.changed(); },
  gift(id) { gift(id); save(); deps.changed(); showCrew(); },
  policy(id) { cyclePolicy(id); save(); deps.changed(); showCrew(); },
  lt(id) { promoteLieutenant(id); save(); deps.changed(); showCrew(); },
  point(k) { spendPoint(k); save(); deps.changed(); showCrew(); },
  promote() { if (promoteCaptain()) { save(); $('#crew').classList.add('hidden'); deps.changed(); } },
  identity() { $('#crew').classList.add('hidden'); deps.editIdentity(); },
};
export { memberTitle };
