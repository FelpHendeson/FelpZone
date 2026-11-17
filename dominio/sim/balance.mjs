// Simulador de equilíbrio: um bot joga várias partidas e mede vitória, duração e visada.
// Uso: node sim/balance.mjs [partidas=40]
import { state, newGame } from '../src/core/state.js';
import { ADJ } from '../src/data/maps/porto-neon.js';
import { reachable, estDef, playerAttack, moveGuards, recruit, bribe, endDay } from '../src/core/rules.js';

const GAMES = Number(process.argv[2]) || 40;
const MAX_DAYS = 90;

function playDay(useBribe) {
  if (state.money > 600) recruit(0, 9);
  if (useBribe && state.heat > 50) bribe();
  for (let a = 0; a < 3; a++) {
    const t = state.nodes.filter((n) => reachable(n)).map((n) => ({ n, d: estDef(n) })).sort((x, y) => x.d - y.d)[0];
    if (!t || state.free < t.d * 1.5 + 1) break;
    playerAttack(t.n.id, Math.min(state.free, Math.ceil(t.d * 1.6) + 1));
  }
  for (const n of state.nodes.filter((m) => m.owner === 'P')) {
    const front = ADJ[n.id].some((m) => { const o = state.nodes[m].owner; return o && o !== 'P' && o !== 'X'; });
    const want = n.type === 'hq' ? 5 : front ? 3 : 1;
    while (n.guards < want && state.free > 0) moveGuards(n.id, 1);
  }
  const before = state.log[0];
  endDay();
  let raids = 0, megas = 0;
  for (const l of state.log) {
    if (l === before) break;
    if (l.msg.includes('MEGAOPERAÇÃO')) megas++;
    else if (l.msg.includes('Batida policial')) raids++;
  }
  return { raids, megas };
}

function run(useBribe) {
  const res = [];
  for (let g = 0; g < GAMES; g++) {
    newGame({ gang: 'Bot', leader: 'Bot', color: '#ef4444' });
    const heats = [];
    let raids = 0, megas = 0;
    for (let d = 0; d < MAX_DAYS && !state.over; d++) {
      const r = playDay(useBribe);
      raids += r.raids; megas += r.megas; heats.push(state.heat);
    }
    const late = heats.slice(-15);
    res.push({
      win: state.over === 'win', day: state.day, money: state.money,
      lateHeat: late.reduce((a, c) => a + c, 0) / late.length,
      at90: heats.filter((h) => h >= 90).length, raids, megas,
    });
  }
  const avg = (k) => (res.reduce((a, r) => a + r[k], 0) / res.length).toFixed(1);
  const med = (k) => { const v = res.map((r) => r[k]).sort((a, b) => a - b); return Math.round(v[v.length >> 1]); };
  console.log(`${useBribe ? 'COM suborno' : 'SEM suborno'} | vitórias ${res.filter((r) => r.win).length}/${GAMES} | dias ${avg('day')} | caixa final (mediana) $${med('money')} | visada final ${avg('lateHeat')} | dias≥90 ${avg('at90')} | batidas ${avg('raids')} | mega ${avg('megas')}`);
}

run(true);
run(false);
