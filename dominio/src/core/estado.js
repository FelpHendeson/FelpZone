// Camada do Estado: a organização se espalha por braços (ver docs/gdd.md 2.1).
// Mandar alguém: um membro seu, leal, com apoio, mas forasteiro. Achar alguém: um personagem novo da cidade,
// sem apoio, que só se filia quando fizer nome. Cidade dominada vira sua e manda tributo todo dia. Sem DOM.
import { CITIES, ROUTES } from '../data/estado.js';
import { state, replaceState, save, hooks, log, enterEra, eraFields } from './state.js';
import { initCrew, makeMember } from './crew.js';
import { ATTR_KEYS } from '../data/crew.js';
import { money } from './util.js';

const SUPPORT_CAP = 3000;
export const org = () => state.org || null;
export const inEstado = () => state.mode === 'estado';
const statusOf = (id) => (state.org && state.org.cities[id] ? state.org.cities[id].status : 'locked');
export const isMine = (id) => statusOf(id) === 'yours';
export const available = (id) => !isMine(id) && ROUTES.some(([a, b]) => (a === id && isMine(b)) || (b === id && isMine(a)));
export const tributePerDay = () => Object.entries(state.org ? state.org.cities : {})
  .filter(([id, c]) => c.status === 'yours' && id !== state.cityId)
  .reduce((s, [id, c]) => s + Math.round(CITIES[id].tribute * (c.tributeMult || 1)), 0);
export const orgMembers = () => (state.org ? state.org.members.filter((m) => m.status === 'ok') : []);
export const allMine = () => Object.keys(CITIES).every((id) => isMine(id));

// Primeira vez: a cidade da campanha (Porto Neon) vira a sede da organização.
export function openEstado() {
  if (!state.org) {
    state.org = {
      gang: state.player.gang, chief: { ...state.cmd }, flag: state.flag, jacket: state.jacket,
      members: state.members.filter((m) => ['ok', 'hospital', 'preso'].includes(m.status)).map((m) => ({ ...m, status: 'ok', node: null, timer: 0 })),
      treasury: Math.round(state.money * 0.5),
      cities: { porto: { status: 'yours', patron: { name: state.cmd.name, vulgo: state.cmd.vulgo, look: state.cmd.look, chief: true }, day: state.day } },
      seenTips: state.seenTips, settings: state.settings,
    };
    hooks.scene('estadoIntro', {});
  }
  state.mode = 'estado';
  save();
  hooks.changed();
}

function attrsFromLevel(level) {
  const a = Object.fromEntries(ATTR_KEYS.map((k) => [k, 1]));
  for (let i = 0; i < 3 + level; i++) a[ATTR_KEYS[i % 4]]++;
  return a;
}

// Começa a partida numa cidade nova do estado.
function startCity(cityId, mode, who) {
  const c = CITIES[cityId];
  const o = state.org;
  const seed = Math.floor(Math.random() * 1e9);
  const hqName = mode === 'mandar' ? `QG do ${o.gang}` : `QG do ${who.gang}`;
  const map = enterEra('cidade', seed, { rivalDefs: c.gangs, hqName });
  const gang = mode === 'mandar' ? `${o.gang} · ${c.name}` : who.gang;
  const leader = mode === 'mandar' ? who.vulgo : who.leader;
  const color = mode === 'mandar' ? o.flag.bg : who.flag.bg;
  replaceState({ ...eraFields(gang, leader, color), map, org: o, cityId, mode: 'city', campaign: true, cityMode: mode, affiliated: mode === 'mandar' });
  if (mode === 'mandar') {
    initCrew({ name: who.name, leader: who.vulgo, origin: 'morro', look: who.look, attrs: attrsFromLevel(who.level), flag: o.flag, jacket: o.jacket, leve: o.settings && o.settings.leve });
    state.cmd.level = who.level;
    const m = o.members.find((x) => x.id === who.id);
    m.status = 'braco'; m.city = cityId;
    // apoio da organização, mas é forasteiro
    const support = Math.min(o.treasury, SUPPORT_CAP);
    o.treasury -= support;
    state.money += support;
    state.free += 8;
    state.arsenal = { pistola: 5 };
    state.respect = 0;
    for (const rv of Object.values(state.rivals)) rv.angryUntil = 8;
  } else {
    initCrew({ ...who, leve: o.settings && o.settings.leve });
    state.respect = 20;                       // é da cidade: conhece todo mundo
  }
  // rivais de cidades mais difíceis começam maiores e armados
  for (const rv of Object.values(state.rivals)) {
    rv.reserve = Math.round(rv.reserve * c.diff);
    if (c.diff > 1) rv.wm = Math.min(1.8, Math.round(c.diff * 10) / 10);
  }
  state.seenTips = o.seenTips || {};
  state.introPending = true;
  state.introScene = mode === 'mandar' ? 'cityMandar' : 'cityAchar';
  log(mode === 'mandar'
    ? `📨 ${who.name} “${who.vulgo}” chega em ${c.name} em nome do ${o.gang}, com ${money(state.money)} e oito soldados. Ninguém aqui gosta de forasteiro.`
    : `🔎 Em ${c.name}, ${who.leader} junta os primeiros do ${who.gang}. Ainda ninguém sabe quem é ${o.chief.vulgo}.`, 'big');
  save();
  hooks.newGame();
}
export function canSend(cityId) { return available(cityId) ? (orgMembers().length ? '' : 'Ninguém disponível no bonde') : 'Cidade fora da rota'; }
export function sendMember(cityId, memberId) {
  const m = orgMembers().find((x) => x.id === memberId);
  if (!m || canSend(cityId)) return false;
  startCity(cityId, 'mandar', m);
  return true;
}
export function findLocal(cityId, opts) {
  if (!available(cityId)) return false;
  startCity(cityId, 'achar', opts);
  return true;
}

// "Achar alguém": ao fazer nome (respeito 50), o braço local chama a atenção do chefe.
export function checkAffiliation() {
  if (state.cityMode !== 'achar' || state.affiliated || state.affAsked || state.respect < 50) return;
  state.affAsked = true;
  hooks.scene('affiliation', {});
}
export function affiliate(kind) {
  const o = state.org;
  if (!o || state.affiliated) return;
  state.affiliated = true;
  const support = Math.round(Math.min(o.treasury, SUPPORT_CAP) * (kind === 'caro' ? 1.6 : 1));
  o.treasury = Math.max(0, o.treasury - support);
  state.money += support;
  state.free += 6;
  state.tributeMult = kind === 'caro' ? 0.5 : 1;
  state.flag = o.flag; state.jacket = o.jacket; state.player.color = o.flag.bg;
  state.player.gang = `${o.gang} · ${CITIES[state.cityId].name}`;
  log(`🤝 ${state.cmd.vulgo} se filiou ao ${o.gang}${kind === 'caro' ? ' e cobrou caro' : ''}: ${money(support)} e reforços. A bandeira agora é a da organização.`, 'big');
}

// Fim da cidade (vitória ou derrota): volta pro mapa do estado.
export function finishCity() {
  const o = state.org;
  const id = state.cityId;
  if (!o || !id) return;
  const braco = state.cityMode === 'mandar' ? o.members.find((m) => m.status === 'braco' && m.city === id) : null;
  if (state.over === 'win') {
    o.cities[id] = { status: 'yours', patron: { name: state.cmd.name, vulgo: state.cmd.vulgo, look: state.cmd.look }, day: state.day, tributeMult: state.tributeMult || 1 };
    if (braco) braco.status = 'patrao';
    // quem foi achado vira patrão também (não volta pro bonde central)
    o.treasury += Math.round(state.money * 0.3);
  } else {
    if (braco) braco.status = 'morto';
    o.cities[id] = { status: 'lost' };
  }
  // o bonde central ganha gente nova de vez em quando (quando acaba a reserva)
  if (!orgMembers().length) { const m = makeMember('cap', Math.floor(Math.random() * 1e9)); m.id = 1000 + Math.floor(Math.random() * 1e6); o.members.push(m); }
  state.mode = 'estado';
  state.cityId = null;
  save();
  hooks.changed();
}

// Fim do dia numa cidade do estado: tributo das outras cidades entra no caixa da organização.
export function tickOrg() {
  if (!state.org || state.mode !== 'city') return;
  state.org.treasury += tributePerDay();
  checkAffiliation();
}
