// Tela do mercado: linha das bocas (produto, fornecedor, preço) e atração dos inferninhos.
import { state, save } from '../core/state.js';
import { PRODUCTS, MARKET_SUPPLIERS, PRICES, ATTRACTIONS } from '../data/market.js';
import { market, setMarket, preview, demand, marketCost } from '../core/market.js';
import { P } from '../core/era.js';
import { money } from '../core/util.js';

const $ = (sel) => document.querySelector(sel);
let onChange = () => {};
export function initMarketUI(fn) { onChange = fn; }

function group(key, table, extra) {
  const m = market();
  return `<div class="mk">${Object.entries(table).map(([k, v]) => `<button class="${m[key] === k ? 'sel' : ''}" onclick="marketUI.set('${key}','${k}')">
    <span class="mi">${v.icon}</span><b>${v.label}</b><small>${v.desc}</small>${extra ? `<small class="mx">${extra(k)}</small>` : ''}</button>`).join('')}</div>`;
}

export function showMarket() {
  const m = market();
  const bocas = state.nodes.filter((n) => n.owner === 'P' && n.type === 'boca').length;
  const infs = state.nodes.filter((n) => n.owner === 'P' && n.type === 'inferninho').length;
  const pv = preview(m.product, m.supplier, m.price);
  const el = $('#crew');
  el.dataset.view = 'market';
  el.innerHTML = `<div class="crbox">
    <div class="crhead"><div><h2>📈 Mercado</h2><small>${bocas} boca(s) · ${infs} inferninho(s) · fornecedor custa ${money(marketCost())}/dia</small></div>
      <button class="x" onclick="marketUI.close()" aria-label="Fechar">✕</button></div>
    <div class="crbody">
      <div class="arms">
        <div class="ast"><b>${money(pv.perBoca)}</b><small>renda por boca nível 1 (antes era ${money(220 * P(1))})</small></div>
        <div class="ast"><b>×${pv.heat}</b><small>visada das bocas</small></div>
        <div class="ast"><b>${m.event ? `${m.event.mult > 1 ? '📈' : '📉'} ${m.event.days}d` : '—'}</b><small>${m.event ? 'evento de mercado ativo' : 'mercado normal'}</small></div>
      </div>
      <h4>Produto</h4>${group('product', PRODUCTS, (k) => `demanda hoje ×${demand(k).toFixed(2)}`)}
      <h4>Fornecedor</h4>${group('supplier', MARKET_SUPPLIERS, (k) => `${money(P(MARKET_SUPPLIERS[k].cost))}/boca/dia · qualidade ×${MARKET_SUPPLIERS[k].quality}${MARKET_SUPPLIERS[k].risk ? ` · ${Math.round(MARKET_SUPPLIERS[k].risk * 100)}% de apreensão/dia` : ''}`)}
      <h4>Preço</h4>${group('price', PRICES)}
      <h4>Atração da semana nos inferninhos</h4>${group('attraction', ATTRACTIONS)}
      <p class="hint">Tudo vale pra todas as suas bocas e inferninhos. Dá pra mudar a qualquer hora, sem gastar ação.</p>
    </div></div>`;
  el.classList.remove('hidden');
}

export const marketUI = {
  close() { $('#crew').classList.add('hidden'); delete $('#crew').dataset.view; onChange(); },
  set(k, v) { if (setMarket(k, v)) { save(); onChange(); } showMarket(); },
};
