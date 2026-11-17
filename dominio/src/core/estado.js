// Expansão por braços em níveis: Estado → País → Mundo (ver docs/gdd.md 2.1).
// Mandar alguém: um membro, leal, com apoio, mas forasteiro. Achar alguém: um personagem novo do lugar,
// sem apoio, que se filia ao fazer nome. Nó dominado vira seu e manda tributo. Dá pra anexar com dinheiro
// (menos o último de cada nível) e largar a vida a qualquer momento. Sem DOM.
import { LEVELS, gangsFor } from '../data/world.js';
import { state, save, hooks, log, enterEra, eraFields, replaceState } from './state.js';
import { initCrew, makeMember } from './crew.js';
import { ATTR_KEYS } from '../data/crew.js';
import { money } from './util.js';

// ---------- organização ----------
// Saves da F5 guardavam as cidades em org.cities: viram org.nodes.estado.
function normalize(o) {
  if (o && o.cities && !o.nodes) { o.nodes = { estado: o.cities }; o.level = 'estado'; delete o.cities; }
  return o;
}
export const org = () => normalize(state.org) || null;
export const inEstado = () => state.mode === 'estado';
export const level = () => (org() ? org().level : 'estado');
export const L = () => LEVELS[level()];
export const nodeDef = (id, lv = level()) => LEVELS[lv].nodes[id];
const lvNodes = (lv = level()) => (org() ? org().nodes[lv] || (org().nodes[lv] = {}) : {});
const statusOf = (id) => (lvNodes()[id] ? lvNodes()[id].status : 'locked');
export const isMine = (id) => statusOf(id) === 'yours';
export const available = (id) => !isMine(id) && L().routes.some(([a, b]) => (a === id && isMine(b)) || (b === id && isMine(a)));
export const allMine = () => !!org() && Object.keys(L().nodes).every((id) => isMine(id));
export const orgMembers = () => (org() ? org().members.filter((m) => m.status === 'ok') : []);
export function tributePerDay() {
  const o = org();
  if (!o) return 0;
  let t = 0;
  for (const [lv, nodes] of Object.entries(o.nodes)) {
    for (const [id, c] of Object.entries(nodes)) {
      if (c.status !== 'yours' || (lv === o.level && id === state.cityId)) continue;
      t += Math.round(LEVELS[lv].nodes[id].tribute * (c.tributeMult || 1));
    }
  }
  return t;
}

// Primeira vez: a cidade da campanha (Porto Neon) vira a sede da organização.
export function openEstado() {
  if (!state.org) {
    state.org = {
      gang: state.player.gang, chief: { ...state.cmd }, flag: state.flag, jacket: state.jacket,
      members: state.members.filter((m) => ['ok', 'hospital', 'preso'].includes(m.status)).map((m) => ({ ...m, status: 'ok', node: null, timer: 0 })),
      treasury: Math.round(state.money * 0.5), level: 'estado',
      nodes: { estado: { porto: { status: 'yours', patron: { name: state.cmd.name, vulgo: state.cmd.vulgo, look: state.cmd.look, chief: true }, day: state.day } } },
      seenTips: state.seenTips, settings: state.settings, startedDay: state.day, history: state.history || [],
    };
    hooks.scene('estadoIntro', {});
  }
  state.mode = 'estado';
  save();
  hooks.changed();
}

function attrsFromLevel(lvl) {
  const a = Object.fromEntries(ATTR_KEYS.map((k) => [k, 1]));
  for (let i = 0; i < 3 + lvl; i++) a[ATTR_KEYS[i % 4]]++;
  return a;
}

// Começa a partida num nó do nível atual.
function startNode(id, mode, who) {
  const o = org();
  const c = nodeDef(id);
  const lv = L();
  const seed = Math.floor(Math.random() * 1e9);
  const hqName = `QG do ${mode === 'mandar' ? o.gang : who.gang}`;
  const map = enterEra('cidade', seed, { rivalDefs: gangsFor(o.level, id), hqName, size: lv.mapSize });
  const gang = mode === 'mandar' ? `${o.gang} · ${c.name}` : who.gang;
  const leader = mode === 'mandar' ? who.vulgo : who.leader;
  const color = mode === 'mandar' ? o.flag.bg : who.flag.bg;
  replaceState({ ...eraFields(gang, leader, color), map, org: o, cityId: id, mode: 'city', campaign: true, cityMode: mode, affiliated: mode === 'mandar' });
  if (mode === 'mandar') {
    initCrew({ name: who.name, leader: who.vulgo, origin: 'morro', look: who.look, attrs: attrsFromLevel(who.level), flag: o.flag, jacket: o.jacket, leve: o.settings && o.settings.leve });
    state.cmd.level = who.level;
    const m = o.members.find((x) => x.id === who.id);
    m.status = 'braco'; m.city = id;
    applySupport(1);
    state.respect = 0;                                   // forasteiro
    for (const rv of Object.values(state.rivals)) rv.angryUntil = 8;
  } else {
    initCrew({ ...who, leve: o.settings && o.settings.leve });
    state.respect = 20;                                  // é do lugar: conhece todo mundo
  }
  state.rivalBoost = 1 + ((c.diff || 1) - 1) * 0.6;    // vale a partida inteira (crescimento e agressividade)
  for (const rv of Object.values(state.rivals)) {
    rv.reserve = Math.round(rv.reserve * (c.diff || 1));
    if ((c.diff || 1) > 1) rv.wm = Math.min(1.8, Math.round(c.diff * 10) / 10);
  }
  state.seenTips = o.seenTips || {};
  state.introPending = true;
  state.introScene = mode === 'mandar' ? 'cityMandar' : 'cityAchar';
  log(mode === 'mandar'
    ? `📨 ${who.name} “${who.vulgo}” chega em ${c.name} em nome do ${o.gang}, com ${money(state.money)}. Ninguém aqui gosta de forasteiro.`
    : `🔎 Em ${c.name}, ${who.leader} junta os primeiros do ${who.gang}. Ainda ninguém sabe quem é ${o.chief.vulgo}.`, 'big');
  save();
  hooks.newGame();
}
// Apoio da organização (cresce a cada nível): dinheiro do caixa, soldados e armas.
function applySupport(mult) {
  const o = org();
  const s = L().support;
  const cash = Math.min(o.treasury, Math.round(s.cap * mult));
  o.treasury -= cash;
  state.money += cash;
  state.free += Math.round(s.soldiers * (mult > 1 ? 0.75 : 1));
  state.arsenal = { ...(state.arsenal || {}) };
  for (const [w, n] of Object.entries(s.arms)) state.arsenal[w] = (state.arsenal[w] || 0) + n;
  return cash;
}
export function canSend(id) { return available(id) ? (orgMembers().length ? '' : 'Ninguém disponível no bonde') : 'Fora da rota'; }
export function sendMember(id, memberId) {
  const m = orgMembers().find((x) => x.id === memberId);
  if (!m || canSend(id)) return false;
  startNode(id, 'mandar', m);
  return true;
}
export function findLocal(id, opts) {
  if (!available(id)) return false;
  startNode(id, 'achar', opts);
  return true;
}

// Anexar por negociação: paga do caixa e um membro vira patrão (o último nó do nível não se compra).
export const annexPrice = (id) => Math.round((nodeDef(id).annex || 0));
export function canAnnex(id) {
  const n = nodeDef(id);
  if (!available(id)) return 'Fora da rota';
  if (n.final || !n.annex) return 'Esse não se compra: só na guerra';
  if (org().treasury < annexPrice(id)) return `Caixa precisa de ${money(annexPrice(id))}`;
  return '';
}
export function annex(id) {
  if (canAnnex(id)) return false;
  const o = org();
  o.treasury -= annexPrice(id);
  let m = orgMembers().sort((a, b) => b.loyalty - a.loyalty)[0];
  if (!m) { m = makeMember('cap', Math.floor(Math.random() * 1e9)); m.id = 2000 + Math.floor(Math.random() * 1e6); o.members.push(m); }
  m.status = 'patrao'; m.city = id;
  lvNodes()[id] = { status: 'yours', patron: { name: m.name, vulgo: m.vulgo, look: m.look }, tributeMult: 0.75, annexed: true };
  hooks.fx('annex', { id });
  log(`💼 ${nodeDef(id).name} foi anexada na negociação por ${money(annexPrice(id))}. ${m.vulgo} vira patrão (tributo 75%).`, 'big');
  save(); hooks.changed();
  return true;
}

// "Achar alguém": ao fazer nome (respeito 50), o braço local chama a atenção do chefe.
export function checkAffiliation() {
  if (state.cityMode !== 'achar' || state.affiliated || state.affAsked || state.respect < 50) return;
  state.affAsked = true;
  hooks.scene('affiliation', {});
}
export function affiliate(kind) {
  const o = org();
  if (!o || state.affiliated) return;
  state.affiliated = true;
  const cash = applySupport(kind === 'caro' ? 1.6 : 1);
  state.tributeMult = kind === 'caro' ? 0.5 : 1;
  state.flag = o.flag; state.jacket = o.jacket; state.player.color = o.flag.bg;
  state.player.gang = `${o.gang} · ${nodeDef(state.cityId).name}`;
  log(`🤝 ${state.cmd.vulgo} se filiou ao ${o.gang}${kind === 'caro' ? ' e cobrou caro' : ''}: ${money(cash)} e reforços. A bandeira agora é a da organização.`, 'big');
}

// Fim do nó (vitória ou derrota): volta pro mapa.
export function finishCity() {
  const o = org();
  const id = state.cityId;
  if (!o || !id) return;
  const braco = state.cityMode === 'mandar' ? o.members.find((m) => m.status === 'braco' && m.city === id) : null;
  o.days = (o.days || 0) + state.day;
  if (state.over === 'win') {
    lvNodes()[id] = { status: 'yours', patron: { name: state.cmd.name, vulgo: state.cmd.vulgo, look: state.cmd.look }, day: state.day, tributeMult: state.tributeMult || 1 };
    if (braco) braco.status = 'patrao';
    o.treasury += Math.round(state.money * 0.3);
  } else {
    if (braco) { braco.status = 'morto'; (o.fallen || (o.fallen = [])).push(braco.vulgo); }
    lvNodes()[id] = { status: 'lost' };
  }
  if (!orgMembers().length) { const m = makeMember('cap', Math.floor(Math.random() * 1e9)); m.id = 1000 + Math.floor(Math.random() * 1e6); o.members.push(m); }
  state.mode = 'estado';
  state.cityId = null;
  save();
  hooks.changed();
}

// Nível completo: sobe (Estado → País → Mundo). No Mundo, é o fim.
export function canLevelUp() { return allMine() && !!L().next; }
export function levelUp() {
  if (!canLevelUp()) return false;
  const o = org();
  const next = L().next;
  o.level = next;
  const home = LEVELS[next].home;
  o.nodes[next] = { [home]: { status: 'yours', patron: { name: o.chief.name, vulgo: o.chief.vulgo, look: o.chief.look, chief: true } } };
  // gente nova pro bonde central: o nome cresceu
  for (let i = 0; i < 2; i++) { const m = makeMember('cap', Math.floor(Math.random() * 1e9)); m.id = 3000 + Math.floor(Math.random() * 1e6); m.level = 2; o.members.push(m); }
  hooks.scene(`level_${next}`, {});
  hooks.fx('orgLevel', { level: next });
  save(); hooks.changed();
  return true;
}

// ---------- finais ----------
export function finishStory(kind) {
  const o = org();
  if (!o) return;
  o.ending = kind;                                       // 'rei' (mundo dominado) ou 'aposentado' (largou a vida)
  hooks.fx('ending', { kind });
  save(); hooks.changed();
}
export function epilogue() {
  const o = org();
  const conquered = Object.entries(o.nodes).flatMap(([lv, ns]) => Object.entries(ns).filter(([, c]) => c.status === 'yours').map(([id, c]) => ({ lv, name: LEVELS[lv].nodes[id].name, patron: c.patron && c.patron.vulgo, annexed: c.annexed })));
  return {
    kind: o.ending, gang: o.gang, chief: o.chief.vulgo, level: LEVELS[o.level].label, conquered,
    fallen: o.fallen || [], members: o.members.length, treasury: o.treasury, days: (o.startedDay || 0) + (o.days || 0),
    history: o.history || [],
  };
}

// Fim do dia num nó: tributo de tudo que é seu entra no caixa da organização.
export function tickOrg() {
  if (!org() || state.mode !== 'city') return;
  org().treasury += tributePerDay();
  checkAffiliation();
}
export { replaceState };
