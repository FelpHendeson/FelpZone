// Negócios do bonde (eras Bairro e Cidade): arsenal e fornecedores, lotes e obras, eventos e boatos.
// Sem DOM. Os efeitos entram nas regras via weaponMult(), weaponHeat(), ammoCost(), buffSum()...
import { ERA, TYPES, RIVALS, ADJ, P, has } from './era.js';
import { BUILDABLE } from '../data/types.js';
import { WEAPONS, WEAPON_ORDER, BASE_STORAGE, SUPPLIERS, EVENTS } from '../data/arsenal.js';
import { state, log } from './state.js';
import { clamp, money } from './util.js';
import { active, gainXP } from './crew.js';

const soldiers = () => state.free + state.nodes.filter((n) => n.owner === 'P').reduce((s, n) => s + n.guards, 0);

// ===================== ARSENAL =====================
export const arsenal = () => state.arsenal || (state.arsenal = {});
export const stock = () => Object.values(arsenal()).reduce((a, b) => a + b, 0);
export const storage = () => BASE_STORAGE + state.nodes.filter((n) => n.owner === 'P' && !n.build).reduce((s, n) => s + (TYPES[n.type].storage || 0), 0);
export const suppliersHere = () => Object.entries(SUPPLIERS).filter(([, s]) => s.era.includes(ERA.id));

// As melhores armas vão pra mão dos primeiros; o resto luta no braço (força 1).
export function weaponMult() {
  if (!has('weapons')) return 1;
  const total = soldiers();
  if (!total) return 1;
  let left = total, extra = 0;
  for (const k of WEAPON_ORDER) {
    const n = Math.min(arsenal()[k] || 0, left);
    extra += n * (WEAPONS[k].power - 1);
    left -= n;
  }
  return 1 + extra / total;
}
export const armed = () => Math.min(stock(), soldiers());
export const weaponHeat = () => (has('weapons') ? Object.entries(arsenal()).reduce((s, [k, v]) => s + v * WEAPONS[k].heat, 0) : 0);
export const ammoCost = () => (has('weapons') ? Object.entries(arsenal()).reduce((s, [k, v]) => s + v * P(WEAPONS[k].ammo || 0) * (WEAPONS[k].ammo ? 1 : 0), 0) : 0);

export function canBuyWeapon(sid, w, qty) {
  const s = SUPPLIERS[sid];
  if (!has('weapons') || !s || !s.prices[w] || !s.era.includes(ERA.id)) return 'Indisponível';
  if (stock() + qty > storage()) return 'Arsenal cheio (construa um depósito)';
  if (state.money < P(s.prices[w]) * qty) return 'Sem grana';
  return '';
}
export function buyWeapon(sid, w, qty = 1) {
  if (canBuyWeapon(sid, w, qty)) return false;
  const s = SUPPLIERS[sid];
  const cost = P(s.prices[w]) * qty;
  state.money -= cost;
  arsenal()[w] = (arsenal()[w] || 0) + qty;
  log(`${WEAPONS[w].icon} Comprou ${qty}× ${WEAPONS[w].label} com ${s.name} (${money(cost)}).`, 'good');
  if (Math.random() < s.risk) {
    state.heat = clamp(state.heat + 15, 0, 100);
    log(`🕵️ A compra com ${s.name} foi rastreada. A polícia ficou sabendo. Visada +15.`, 'bad');
  }
  return true;
}

// ===================== LOTES E OBRAS =====================
export const lotCost = () => P(300 + 100 * (state.stats.lots || 0));
export const nextToMine = (n) => ADJ[n.id].some((m) => state.nodes[m].owner === 'P');
export function canBuyLot(n) {
  if (!has('build') || n.type !== 'lote' || n.owner !== null) return 'Indisponível';
  if (!nextToMine(n)) return 'Precisa de um ponto seu vizinho';
  if (state.money < lotCost()) return `Precisa de ${money(lotCost())}`;
  return '';
}
export function buyLot(n) {
  if (canBuyLot(n)) return false;
  state.money -= lotCost();
  state.stats.lots = (state.stats.lots || 0) + 1;
  n.owner = 'P'; n.guards = 0;
  log(`🚧 Comprou o ${n.name}. Agora é escolher o que levantar ali.`, 'good');
  return true;
}
export const buildOptions = () => Object.entries(BUILDABLE).map(([type, b]) => ({ type, cost: P(b.cost), days: b.days, t: TYPES[type] }));
export function canBuild(n, type) {
  const b = BUILDABLE[type];
  if (!has('build') || !b || n.owner !== 'P' || n.type !== 'lote' || n.build) return 'Indisponível';
  if (state.money < P(b.cost)) return 'Sem grana';
  return '';
}
export function startBuild(n, type) {
  if (canBuild(n, type)) return false;
  const b = BUILDABLE[type];
  state.money -= P(b.cost);
  n.build = { type, days: b.days };
  state.stats.builds = (state.stats.builds || 0) + 1;
  log(`🏗️ Obra começou no ${n.name}: ${TYPES[type].label} em ${b.days} dia(s).`, 'good');
  return true;
}
export function tickBuilds() {
  for (const n of state.nodes) {
    if (!n.build) continue;
    if (n.owner !== 'P') { delete n.build; continue; }
    if (--n.build.days <= 0) {
      const type = n.build.type;
      delete n.build;
      n.type = type; n.level = 1;
      log(`🏁 Obra pronta: ${n.name} agora é ${TYPES[type].icon} ${TYPES[type].label}.`, 'good');
    }
  }
}

// ===================== EVENTOS =====================
export const eventsFor = (n) => (has('events') && n.owner === 'P' && !n.build ? Object.entries(EVENTS).filter(([, e]) => e.where.includes(n.type)) : []);
export function canHoldEvent(n, key) {
  const e = EVENTS[key];
  if (!e || !eventsFor(n).some(([k]) => k === key)) return 'Indisponível';
  if (state.eventToday) return 'Um evento por dia';
  if (e.action && state.actions <= 0) return 'Sem ⚡';
  if (state.money < P(e.cost)) return `Precisa de ${money(P(e.cost))}`;
  return '';
}
export function holdEvent(n, key) {
  if (canHoldEvent(n, key)) return false;
  const e = EVENTS[key];
  state.money -= P(e.cost);
  if (e.action) state.actions--;
  state.eventToday = true;
  state.stats.events = (state.stats.events || 0) + 1;
  if (e.respect) state.respect = clamp(state.respect + e.respect, 0, 100);
  if (e.heat) state.heat = clamp(state.heat + e.heat, 0, 100);
  if (e.loyalty) active().forEach((m) => { m.loyalty = clamp(m.loyalty + e.loyalty, 0, 100); });
  if (e.xp) gainXP(e.xp);
  if (e.buff) (state.buffs || (state.buffs = [])).push({ ...e.buff, src: key });
  let extra = '';
  if (e.risk && Math.random() < e.risk) {
    const m = active().filter((x) => x.role === 'cap')[0];
    if (m) { m.status = 'hospital'; m.timer = 2; m.node = null; extra = ` ${m.name} “${m.vulgo}” se machucou e fica 2 dias fora.`; }
    else if (state.free > 0) { state.free--; extra = ' Um soldado se machucou feio e largou o bonde.'; }
  }
  log(`${e.icon} ${e.label} no ${n.name}! ${e.desc}${extra}`, extra ? 'warn' : 'good');
  return true;
}
export const buffSum = (k) => (state.buffs || []).reduce((s, b) => s + (typeof b[k] === 'number' ? b[k] : 0), 0);
export const buffOn = (k) => (state.buffs || []).some((b) => b[k]);
export function tickBuffs() {
  state.buffs = (state.buffs || []).filter((b) => --b.days > 0);
  state.eventToday = false;
}

// ===================== BOATOS (inferninho) =====================
export const hasIntel = () => state.nodes.some((n) => n.owner === 'P' && !n.lowkey && !n.build && TYPES[n.type].intel);
export function threats() {
  if (!hasIntel()) return [];
  return Object.entries(state.rivals)
    .filter(([, r]) => r.alive && r.plan !== undefined && r.plan !== null && state.nodes[r.plan] && state.nodes[r.plan].owner === 'P')
    .map(([id, r]) => ({ rival: id, node: r.plan, name: RIVALS[id].name }));
}
export function reportIntel() {
  for (const t of threats()) log(`👂 Boato no inferninho: ${t.name} vão pra cima do ${state.nodes[t.node].name} amanhã.`, 'warn');
}
