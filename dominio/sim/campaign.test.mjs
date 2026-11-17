// Teste da campanha: Escola até vencer → salto no tempo → Cidade; briga de bonde; objetivos.
// Uso: node sim/campaign.test.mjs
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };

const { state, newGame, advanceEra, hooks, load } = await import('../src/core/state.js');
const E = await import('../src/core/era.js');   // sem desestruturar: ERA e ADJ são ligações vivas
const R = await import('../src/core/rules.js');
const { startBrawl, brawlRound, closeBrawl, MOVES } = await import('../src/core/brawl.js');
const { assignCaptain, active } = await import('../src/core/crew.js');

const objectivesDone = [];
hooks.scene = () => {};
hooks.objective = (o) => objectivesDone.push(o.id);

// ---------- Escola ----------
newGame({ gang: 'Bonde do Estadual', leader: 'Felp', color: '#ef4444', era: 'escola', origin: 'lutador', seed: 7 });
assert.equal(state.era, 'escola');
assert.equal(E.ERA.id, 'escola');
assert.equal(state.campaign, true);
assert.equal(state.nodes[0].name, 'Terraço do Estadual');

// objetivo 1: recrutar 2
R.recruit(0, 2);
assert.ok(objectivesDone.includes('recrutar'), 'objetivo de recrutar cumprido');

// briga de bonde contra um QG (força o alcance pra testar a mecânica)
const hq = state.nodes.find((n) => n.type === 'hq' && n.owner === 'B');
const origReach = R.reachable;
state.free = 30; state.actions = 3;
const neighbor = E.ADJ[hq.id].find((m) => state.nodes[m].owner !== 'X');
state.nodes[neighbor].owner = 'P';                    // dá um ponto vizinho pra liberar o alcance
const b = startBrawl(hq.id, 30);
assert.ok(b, 'briga começou');
assert.equal(state.actions, 2, 'briga gasta 1 ação');
let rounds = 0;
while (!state.brawl.done) { brawlRound('avancar', rounds === 0); rounds++; }
assert.ok(rounds >= 1 && rounds <= 3, 'até 3 rodadas');
assert.ok(state.brawl.history[0].cmd, 'Comandante entrou na briga na 1ª rodada');
const won = state.brawl.win;
closeBrawl();
assert.equal(state.brawl, undefined, 'briga fechada');
if (won) assert.equal(state.rivals.B.alive, false, 'vitória na briga derruba o colégio');
assert.ok(Object.keys(MOVES).length === 3);
void origReach;

// joga até vencer a escola (bot simples, com muitos soldados)
for (let d = 0; d < 120 && !state.over; d++) {
  state.free += 6;
  for (let a = 0; a < 3; a++) {
    const t = state.nodes.filter((n) => R.reachable(n)).sort((x, y) => R.estDef(x) - R.estDef(y))[0];
    if (!t) break;
    R.playerAttack(t.id, Math.min(state.free, Math.ceil(R.estDef(t) * 2) + 2));
  }
  R.endDay();
}
assert.equal(state.over, 'win', 'escola vencida');
assert.ok(objectivesDone.includes('banheiro') || state.objIdx >= 1, 'tutorial avançou');

// deixa um membro com lealdade baixa pra ver ele seguir outro caminho
const low = active().find((m) => m.role === 'cap');
low.loyalty = 10;
const lvl = state.cmd.level;

// ---------- Salto no tempo ----------
const { stayed, left } = advanceEra('cidade', { gang: 'Facção do Farol' });
assert.equal(state.era, 'cidade');
assert.equal(E.ERA.id, 'cidade');
assert.equal(state.player.gang, 'Facção do Farol', 'bonde renomeado');
assert.equal(state.nodes[0].name, 'QG do Farol', 'mapa da cidade');
assert.equal(state.cmd.level, lvl, 'Comandante mantém o nível');
assert.ok(left.some((m) => m.id === low.id), 'lealdade baixa seguiu outro caminho');
assert.equal(low.status, 'saiu');
assert.ok(stayed.length >= 1);
assert.equal(state.members.filter((m) => m.status === 'ok' && m.role === 'vice').length, 1, 'sempre tem um vice');
assert.ok(state.members.filter((m) => m.status === 'ok' && m.role === 'cap').length >= 2, 'pelo menos 2 capitães');
assert.ok(state.money > 800, 'respeito da escola vira capital');
assert.equal(state.over, null);
assert.equal(state.history[0].era, 'escola');

// capitão funciona na cidade
assert.ok(assignCaptain(stayed[0].id, 0));

// save no meio da campanha volta na era certa
const reloaded = load();
assert.ok(reloaded);
assert.equal(state.era, 'cidade');
assert.equal(E.ERA.id, 'cidade');
console.log(`campanha: ok (escola vencida, ${stayed.length} continuaram, ${left.length} saíram; briga ${won ? 'vencida' : 'perdida'} em ${rounds} rodada(s))`);
