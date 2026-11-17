// Tela do arsenal: estoque, força do bonde armado, munição, visada e compra com fornecedores.
import { P } from '../core/era.js';
import { state, save } from '../core/state.js';
import { WEAPONS, WEAPON_ORDER } from '../data/arsenal.js';
import { arsenal, stock, storage, weaponMult, weaponHeat, ammoCost, armed, suppliersHere, canBuyWeapon, buyWeapon } from '../core/business.js';
import { totalSoldiers } from '../core/rules.js';
import { money } from '../core/util.js';

const $ = (sel) => document.querySelector(sel);
let onChange = () => {};
export function initArsenalUI(fn) { onChange = fn; }
export const arsenalOpen = () => !$('#crew').classList.contains('hidden') && $('#crew').dataset.view === 'arsenal';

export function showArsenal() {
  const a = arsenal();
  const pct = Math.round((weaponMult() - 1) * 100);
  const el = $('#crew');
  el.dataset.view = 'arsenal';
  el.innerHTML = `<div class="crbox">
    <div class="crhead"><div><h2>🔫 Arsenal</h2><small>${stock()}/${storage()} armas guardadas · ${armed()} de ${totalSoldiers()} soldados armados</small></div>
      <button class="x" onclick="arsenalUI.close()" aria-label="Fechar">✕</button></div>
    <div class="crbody">
      <div class="arms">
        <div class="ast"><b>+${pct}%</b><small>força do bonde (ataque e defesa)</small></div>
        <div class="ast"><b>${money(ammoCost())}</b><small>munição por dia</small></div>
        <div class="ast"><b>+${Math.round(weaponHeat())}</b><small>visada (vira parte do alvo)</small></div>
      </div>
      <div class="stock">${WEAPON_ORDER.map((k) => `<div class="wpn"><span class="wi">${WEAPONS[k].icon}</span><b>${a[k] || 0}</b><small>${WEAPONS[k].label} · força ${WEAPONS[k].power}</small></div>`).join('')}</div>
      <p class="hint">As melhores armas vão pra mão dos primeiros; quem não tem arma briga no braço. Mais espaço: construa um 📦 Depósito num lote.</p>
      <h4>Fornecedores</h4>
      <div class="sup">${suppliersHere().map(([sid, s]) => `<div class="scard">
        <div class="sh"><span class="si">${s.icon}</span><div><b>${s.name}</b><small>“${s.line}”</small>
          <small>Risco de rastreio: ${s.risk ? `${Math.round(s.risk * 100)}%` : 'nenhum'}</small></div></div>
        ${Object.entries(s.prices).map(([w, pr]) => {
          const why1 = canBuyWeapon(sid, w, 1), why5 = canBuyWeapon(sid, w, 5);
          return `<div class="buy"><span>${WEAPONS[w].icon} ${WEAPONS[w].label} <small>${money(P(pr))}${WEAPONS[w].ammo ? ` · munição ${money(P(WEAPONS[w].ammo))}/dia` : ''}</small></span>
            <button onclick="arsenalUI.buy('${sid}','${w}',1)" ${why1 ? `disabled title="${why1}"` : ''}>+1</button>
            <button onclick="arsenalUI.buy('${sid}','${w}',5)" ${why5 ? `disabled title="${why5}"` : ''}>+5</button></div>`;
        }).join('')}
      </div>`).join('')}</div>
    </div></div>`;
  el.classList.remove('hidden');
}

export const arsenalUI = {
  close() { $('#crew').classList.add('hidden'); delete $('#crew').dataset.view; onChange(); },
  buy(sid, w, q) { buyWeapon(sid, w, q); save(); onChange(); showArsenal(); },
};
