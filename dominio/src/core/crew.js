// O bonde: o seu personagem (Comandante), o vice e os capitães.
// Atributos e traços viram multiplicadores usados por rules.js. Sem DOM.
import { ATTRS, ATTR_KEYS, ATTR_BASE, ORIGINS, TRAIT_KEYS, FIRST_NAMES, NICKNAMES } from '../data/crew.js';
import { LOOK_OPTIONS, DEFAULT_LOOK } from '../data/look.js';
import { DEFAULT_FLAG, DEFAULT_JACKET } from '../data/flags.js';
import { RIVALS, ERA, ADJ, P } from './era.js';
import { state, hooks, log } from './state.js';
import { clamp, money } from './util.js';

const XP_PER_LEVEL = 40;              // nível n → n+1 custa 40·n
const BETRAYAL_LINE = 25;

// ---------- aleatório com semente (membros reproduzíveis) ----------
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pickR = (r, arr) => arr[Math.floor(r() * arr.length)];

export function randomLook(r) {
  return {
    skin: Math.floor(r() * LOOK_OPTIONS.skin), hair: pickR(r, LOOK_OPTIONS.hair), hairColor: Math.floor(r() * 4 + (r() < 0.2 ? 4 : 0)),
    brows: pickR(r, LOOK_OPTIONS.brows), mouth: pickR(r, LOOK_OPTIONS.mouth),
    scar: r() < 0.35 ? pickR(r, LOOK_OPTIONS.scar.slice(1)) : 'nenhuma', acc: pickR(r, LOOK_OPTIONS.acc),
  };
}

const ENTRY_LINES = [
  'Ouvi falar do teu bonde. Quero estar do lado de quem vai mandar nessa cidade.',
  'Não sou de falar muito. Me dá um ponto e vê o que eu faço.',
  'Minha quebrada caiu pros Corvos. Quero o troco, e vocês são os únicos com coragem.',
  'Grana, respeito e uma jaqueta dessas. É só isso que eu peço.',
  'Já briguei pela Vila inteira. Agora quero brigar por algo que valha a pena.',
];

export function makeMember(role, seed) {
  const r = rng(seed);
  const name = pickR(r, FIRST_NAMES);
  const vulgo = pickR(r, NICKNAMES.filter((v) => !(state.members || []).some((m) => m.vulgo === v)));
  const t1 = pickR(r, TRAIT_KEYS);
  const t2 = pickR(r, TRAIT_KEYS.filter((t) => t !== t1 && !(t1 === 'leal' && t === 'ganancioso') && !(t1 === 'ganancioso' && t === 'leal')));
  return {
    id: state.nextMemberId++, role, name, vulgo, traits: role === 'vice' ? ['leal', t1 === 'leal' ? t2 : t1] : [t1, t2],
    loyalty: role === 'vice' ? 80 : 55 + Math.floor(r() * 16), level: 1, xp: 0,
    look: randomLook(r), node: null, status: 'ok', timer: 0, line: pickR(r, ENTRY_LINES),
  };
}

// ---------- criação ----------
export function initCrew(opts) {
  const attrs = {};
  for (const k of ATTR_KEYS) attrs[k] = (opts.attrs && opts.attrs[k]) || ATTR_BASE;
  state.cmd = {
    name: opts.name || opts.leader, vulgo: opts.leader, origin: opts.origin || 'morro', attrs,
    look: opts.look || { ...DEFAULT_LOOK }, level: 1, xp: 0, points: 0,
  };
  state.flag = opts.flag || { ...DEFAULT_FLAG, bg: opts.color || DEFAULT_FLAG.bg };
  state.jacket = opts.jacket || { ...DEFAULT_JACKET, accent: opts.color || DEFAULT_JACKET.accent };
  state.settings = { leve: !!opts.leve };
  state.seenTips = {};
  state.nextMemberId = 1;
  state.members = [];
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  state.members.push(makeMember('vice', seed));
  state.members.push(makeMember('cap', seed + 1));
  state.members.push(makeMember('cap', seed + 2));
  if (state.cmd.origin === 'playboy') state.money += P(600);
}

// ---------- consultas ----------
export const attr = (k) => (state.cmd ? state.cmd.attrs[k] : ATTR_BASE);
export const active = () => (state.members || []).filter((m) => m.status === 'ok');
export const member = (id) => (state.members || []).find((m) => m.id === id);
export const captainAt = (node) => (state.members || []).find((m) => m.node === node.id && m.status === 'ok');
export const has = (m, t) => m && m.traits.includes(t);
export const memberTitle = (m) => `${m.role === 'vice' ? 'Vice' : 'Cap.'} ${m.name} “${m.vulgo}”`;

export const attackMult = () => 1 + 0.04 * attr('forca') + 0.03 * attr('tatica');
export function crewDefMult(node) {
  let m = 1 + 0.03 * attr('tatica');
  const c = captainAt(node);
  if (c && c.policy === 'segura') m += 0.1;
  if (c) m += (has(c, 'brigao') ? 0.35 : 0.2) + (has(c, 'esquentado') ? 0.2 : 0) - (has(c, 'covarde') ? 0.1 : 0) + 0.05 * (c.level - 1);
  return m;
}
export function crewIncomeMult(node) {
  let m = 1;
  const c = captainAt(node);
  if (has(c, 'esperto')) m += 0.15;
  if (has(c, 'ganancioso')) m += 0.25;
  if (c && c.policy === 'lucro') m += 0.15;
  if (state.cmd && state.cmd.origin === 'oficina' && node.type === 'desmanche') m += 0.2;
  return m;
}
export function crewHeatAdj(node) {
  const c = captainAt(node);
  return (has(c, 'esquentado') ? 1 : 0) - (has(c, 'frio') ? 2 : 0) + (c && c.policy === 'lucro' ? 1 : 0) - (c && c.policy === 'segura' ? 1 : 0);
}
export const heatTargetMult = () => Math.max(0.5, 1 - 0.04 * attr('frio'));
export const recruitBonus = () => Math.floor(attr('labia') / 2) + (state.cmd && state.cmd.origin === 'morro' ? 1 : 0);
export const negotiateDiscount = () => attr('labia') * 40;
export const salaries = () => active().filter((m) => m.role !== 'vice').length * ERA.cfg.captainSalary;   // o vice é sócio, não recebe salário

export const captainCount = () => active().filter((m) => m.role === 'cap').length;
export const captainCap = () => Math.min(6, 2 + Math.floor((state.cmd ? state.cmd.level : 1) / 2));
export const captainCost = () => P((500 + 300 * captainCount()) * (1 - 0.05 * attr('labia')));
export const captainRespect = () => 10 + 10 * captainCount();

// ---------- ações do jogador ----------
export function assignCaptain(memberId, nodeId) {
  const m = member(memberId);
  const node = state.nodes[nodeId];
  if (!m || m.status !== 'ok' || node.owner !== 'P') return false;
  const prev = captainAt(node);
  if (prev) prev.node = null;
  m.node = nodeId;
  log(`👤 ${memberTitle(m)} agora comanda ${node.name}.`, 'good');
  return true;
}
export function unassignCaptain(memberId) {
  const m = member(memberId);
  if (m) m.node = null;
}
export function canPromote() {
  if (captainCount() >= captainCap()) return `Limite de ${captainCap()} capitães (sobe com o seu nível)`;
  if (state.respect < captainRespect()) return `Precisa de ⭐${captainRespect()}`;
  if (state.money < captainCost()) return `Precisa de ${money(captainCost())}`;
  return '';
}
export function promoteCaptain() {
  if (canPromote()) return null;
  state.money -= captainCost();
  const m = makeMember('cap', Math.floor(Math.random() * 1e9));
  // Promover alguém de fora deixa os ambiciosos com ciúme.
  active().forEach((o) => { if (has(o, 'ganancioso') || has(o, 'esquentado')) loyal(o, -6); });
  state.members.push(m);
  log(`🧥 ${m.name} “${m.vulgo}” vestiu a jaqueta do bonde como capitão.`, 'good');
  hooks.scene('newCaptain', { m: m.id });
  return m;
}
// Agrado: dinheiro na mão pra segurar a lealdade. Um por membro a cada 3 dias.
export const giftCost = (m) => P(150 + 100 * m.level);
export function canGift(m) {
  if (!m || m.status !== 'ok') return 'Indisponível';
  if (m.giftDay && state.day - m.giftDay < 3) return `De novo em ${3 - (state.day - m.giftDay)}d`;
  if (state.money < giftCost(m)) return `Precisa de ${money(giftCost(m))}`;
  return '';
}
export function gift(memberId) {
  const m = member(memberId);
  if (canGift(m)) return false;
  state.money -= giftCost(m);
  m.giftDay = state.day;
  loyal(m, 15);
  log(`💵 ${memberTitle(m)} recebeu um agrado. Lealdade +15.`, 'good');
  return true;
}

export function spendPoint(k) {
  if (!state.cmd || state.cmd.points <= 0 || !ATTRS[k]) return;
  state.cmd.points--; state.cmd.attrs[k]++;
}

// ---------- progressão e consequências ----------
export function gainXP(amount) {
  const c = state.cmd;
  if (!c) return;
  c.xp += amount;
  while (c.xp >= XP_PER_LEVEL * c.level) {
    c.xp -= XP_PER_LEVEL * c.level;
    c.level++; c.points++;
    log(`🆙 ${c.vulgo} chegou ao nível ${c.level}! +1 ponto de atributo.`, 'big');
    hooks.scene('levelUp', { nivel: c.level });
  }
}
function loyal(m, delta) {
  if (delta < 0 && has(m, 'leal')) delta = Math.ceil(delta / 2);
  m.loyalty = clamp(m.loyalty + delta, 0, 100);
}
export function onPlayerWin(node, prev) {
  if (!state.cmd) return;
  gainXP(node.type === 'hq' && prev ? 50 : prev ? 12 : 6);
  if (state.lastWinBoost !== state.day) { state.lastWinBoost = state.day; active().forEach((m) => loyal(m, 1)); }
}
export function onPlayerLoss() { active().forEach((m) => loyal(m, -2)); }
export function onDefended(node) {
  const c = captainAt(node);
  if (!c) return;
  loyal(c, 3);
  c.xp += 10;
  if (c.xp >= 30 * c.level) { c.xp = 0; c.level++; log(`⬆️ ${memberTitle(c)} subiu pro nível ${c.level}.`, 'good'); }
}
// Ponto perdido: o capitão que comandava pode morrer, fugir, ir pro hospital (modo leve) ou ser preso (polícia).
export function onNodeLost(node, cause = 'rival') {
  const c = captainAt(node);
  if (!c) return;
  c.node = null;
  if (cause === 'police') {
    c.status = 'preso'; c.timer = 8;
    log(`🚔 ${memberTitle(c)} caiu na operação da polícia. Volta da cadeia em 8 dias, se não abrir o bico.`, 'bad');
    return;
  }
  if (ERA.id === 'escola') {
    // briga de colégio: ninguém morre. Quem apanha fica de molho em casa.
    if (!has(c, 'covarde') && Math.random() < 0.4) {
      c.status = 'hospital'; c.timer = 3;
      log(`🤕 ${memberTitle(c)} se machucou na briga em ${node.name} e ficou 3 dias de molho em casa.`, 'bad');
    } else {
      loyal(c, -10);
      log(`🏃 ${memberTitle(c)} saiu correndo de ${node.name} quando o ponto caiu.`, 'warn');
    }
    return;
  }
  if (!has(c, 'covarde') && Math.random() < 0.4) {
    if (state.settings && state.settings.leve) {
      c.status = 'hospital'; c.timer = 5;
      log(`🏥 ${memberTitle(c)} levou um tiro em ${node.name}. Fica 5 dias no hospital.`, 'bad');
    } else {
      c.status = 'morto';
      log(`⚰️ ${memberTitle(c)} morreu defendendo ${node.name}.`, 'bad');
      active().forEach((m) => loyal(m, -3));
      hooks.scene('captainDied', { m: c.id, nome: `${c.name} “${c.vulgo}”`, ponto: node.name });
    }
    return;
  }
  loyal(c, -10);
  log(`🏃 ${memberTitle(c)} fugiu de ${node.name} quando o ponto caiu.`, 'warn');
}

// Chamado no fim do dia: salário, traços, lealdade, voltas do hospital/cadeia e traição.
export function dailyCrew(paidAll) {
  if (!state.members) return;
  for (const m of state.members) {
    // hospital vizinho de um ponto seu: recuperação em dobro
    if (m.status === 'hospital' && state.nodes.some((h) => h.type === 'hospital' && ADJ[h.id].some((k) => state.nodes[k].owner === 'P'))) m.timer--;
    if ((m.status === 'hospital' || m.status === 'preso') && --m.timer <= 0) {
      const from = m.status === 'preso' ? 'da cadeia' : 'do hospital';
      m.status = 'ok';
      log(`↩️ ${memberTitle(m)} voltou ${from}.`, 'good');
    }
  }
  for (const m of active()) {
    if (!paidAll) loyal(m, -6);                      // salário em dia é obrigação; atrasar dói
    if (m.node === null) loyal(m, -1);              // capitão sem ponto pra comandar se sente encostado
    if (has(m, 'leal')) loyal(m, 1);
    if (has(m, 'ganancioso')) loyal(m, -2);
    if (m.node !== null && has(m, 'carismatico')) state.respect = clamp(state.respect + 1, 0, 100);
  }
  // Tentação: um rival tenta comprar alguém do bonde. Quem não é muito fiel balança (e o rádio avisa).
  const alive = Object.keys(state.rivals).filter((k) => state.rivals[k].alive);
  const pool = active().filter((m) => m.loyalty < 70);
  if (alive.length && pool.length && Math.random() < 0.1) {
    const m = pool[Math.floor(Math.random() * pool.length)];
    const rv = RIVALS[alive[Math.floor(Math.random() * alive.length)]];
    loyal(m, -12);
    log(`👀 ${rv.name} andam oferecendo grana pra ${memberTitle(m)}. A lealdade caiu pra ${m.loyalty}.`, 'warn');
  }
  for (const m of active()) {
    if (m.loyalty >= BETRAYAL_LINE) continue;
    if (Math.random() < Math.max(0.03, 0.14 - 0.02 * attr('frio'))) betray(m);
  }
}

export function betray(m) {
  const rivals = Object.keys(state.rivals).filter((k) => state.rivals[k].alive);
  const node = m.node !== null ? state.nodes[m.node] : null;
  m.status = 'traidor'; m.node = null;
  if (m.role === 'vice') {
    const stolen = Math.round(state.money * 0.25);
    state.money -= stolen;
    const take = Math.min(state.free, 3); state.free -= take;
    log(`🐍 O VICE ${m.name} “${m.vulgo}” TRAIU o bonde! Levou ${money(stolen)} e ${take} soldado(s).`, 'big');
    hooks.scene('betrayalVice', { m: m.id });
  } else if (node && node.owner === 'P' && node.type !== 'hq' && rivals.length) {
    const rid = rivals[Math.floor(Math.random() * rivals.length)];
    node.owner = rid; node.lowkey = false;
    log(`🐍 ${memberTitle(m)} TRAIU o bonde e entregou ${node.name} pr${RIVALS[rid].name.startsWith('As') ? 'as' : 'os'} ${RIVALS[rid].name.replace(/^(Os|As) /, '')}!`, 'big');
    hooks.scene('betrayalCaptain', { m: m.id, rival: RIVALS[rid].name, ponto: node.name });
  } else {
    const stolen = Math.round(state.money * 0.15);
    state.money -= stolen;
    const take = Math.min(state.free, 3); state.free -= take;
    log(`🐍 ${memberTitle(m)} largou o bonde levando ${money(stolen)} e ${take} soldado(s).`, 'bad');
    hooks.scene('betrayalFree', { m: m.id });
  }
}

// Personagem padrão pra saves antigos e para a simulação.
export function defaultCrewOpts(base) {
  return { name: base.leader, leader: base.leader, origin: 'morro', color: base.color, seed: 12345 };
}
export { ORIGINS };
