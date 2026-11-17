// Mercado: a "linha" das suas bocas (produto, fornecedor, preço) e a atração dos inferninhos.
// Entra nas regras via bocaMult(), bocaHeatMult(), rivalBocaMult(), marketCost() e tickMarket(). Sem DOM.
import { ERA, P, RIVALS } from './era.js';
import { PRODUCTS, MARKET_SUPPLIERS, PRICES, ATTRACTIONS, MARKET_EVENTS, DEFAULT_MARKET } from '../data/market.js';
import { state, log } from './state.js';
import { clamp, money, rnd } from './util.js';

export const hasMarket = () => !!ERA.cfg.market;
export const market = () => state.market || (state.market = { ...DEFAULT_MARKET });

// Demanda do produto hoje: evento ativo + oscilação diária (guardada pra não mudar a cada clique).
export function demand(product = market().product) {
  const m = market();
  let d = m.swing && m.swing[product] ? m.swing[product] : 1;
  if (m.event && (m.event.product === null || m.event.product === product)) d *= m.event.mult;
  return d;
}
export function bocaMult(product = market().product, supplier = market().supplier, price = market().price) {
  if (!hasMarket()) return 1;
  return PRODUCTS[product].mult * MARKET_SUPPLIERS[supplier].quality * PRICES[price].income * demand(product);
}
export const bocaHeatMult = () => (hasMarket() ? PRODUCTS[market().product].heat : 1);
const myBocasAny = () => state.nodes.some((n) => n.owner === 'P' && n.type === 'boca');
export const rivalBocaMult = () => (hasMarket() && myBocasAny() ? PRICES[market().price].rival : 1);
const myBocas = () => state.nodes.filter((n) => n.owner === 'P' && n.type === 'boca' && !n.lowkey && !n.build);
export const marketCost = () => (hasMarket() ? myBocas().length * P(MARKET_SUPPLIERS[market().supplier].cost) : 0);
export const attraction = () => ATTRACTIONS[market().attraction] || ATTRACTIONS.dj;

export function setMarket(key, value) {
  const m = market();
  const table = { product: PRODUCTS, supplier: MARKET_SUPPLIERS, price: PRICES, attraction: ATTRACTIONS }[key];
  if (!table || !table[value] || m[key] === value) return false;
  m[key] = value;
  const labels = { product: 'Produto', supplier: 'Fornecedor', price: 'Preço', attraction: 'Atração dos inferninhos' };
  log(`📈 ${labels[key]}: ${table[value].icon} ${table[value].label}.`, 'warn');
  return true;
}

// Fim do dia: oscilação, eventos, apreensão de carga, efeitos do preço.
export function tickMarket() {
  if (!hasMarket()) return;
  const m = market();
  m.swing = {};
  for (const [k, p] of Object.entries(PRODUCTS)) m.swing[k] = Math.round(rnd(1 - p.swing, 1 + p.swing) * 100) / 100;
  if (m.event && --m.event.days <= 0) { log('📈 O mercado voltou ao normal.', 'warn'); m.event = null; }
  if (!m.event && Math.random() < 0.1) {
    const e = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
    m.event = { key: e.key, product: e.product, mult: e.mult, days: e.days };
    log(e.text, 'warn');
  }
  const bocas = myBocas();
  if (bocas.length && Math.random() < MARKET_SUPPLIERS[m.supplier].risk) {
    const lost = Math.round(bocas.reduce((s, n) => s + 200, 0) * ERA.cfg.price * rnd(1, 2));
    state.money = Math.max(0, state.money - lost);
    state.heat = clamp(state.heat + 8, 0, 100);
    log(`🚨 A carga do ${MARKET_SUPPLIERS[m.supplier].label} caiu na polícia: prejuízo de ${money(lost)} e visada +8.`, 'bad');
  }
  if (bocas.length && PRICES[m.price].respect) state.respect = clamp(state.respect + PRICES[m.price].respect, 0, 100);
  if (bocas.length && PRICES[m.price].anger) {
    // quem perde freguês fica com raiva (às vezes)
    for (const [rid, rv] of Object.entries(state.rivals)) {
      if (rv.alive && Math.random() < 0.12 && state.nodes.some((n) => n.owner === rid && n.type === 'boca')) {
        rv.angryUntil = state.day + 4;
        log(`😡 ${RIVALS[rid].name} perderam freguês pro seu preço baixo e estão putos.`, 'rival');
      }
    }
  }
}

// Prévia pra tela do mercado: renda por boca com a linha escolhida.
export function preview(product, supplier, price) {
  const base = 220 * P(1);
  return { perBoca: Math.round(base * bocaMult(product, supplier, price)), cost: P(MARKET_SUPPLIERS[supplier].cost), heat: PRODUCTS[product].heat };
}
