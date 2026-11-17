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
// (se o acaso deixou todo mundo fora de combate, devolve um capitão pra testar)
let low = active().find((m) => m.role === 'cap');
if (!low) { low = state.members.find((m) => m.role === 'cap'); low.status = 'ok'; low.timer = 0; }
low.loyalty = 10;
const lvl = state.cmd.level;

// ---------- Salto no tempo: Escola → Bairro ----------
const { stayed, left } = advanceEra('bairro', { gang: 'Facção do Farol' });
assert.equal(state.era, 'bairro');
assert.equal(E.ERA.id, 'bairro');
assert.equal(state.player.gang, 'Facção do Farol', 'bonde renomeado');
assert.equal(state.nodes[0].name, 'Laje do Farol', 'mapa do bairro');
assert.equal(state.cmd.level, lvl, 'Comandante mantém o nível');
assert.ok(left.some((m) => m.id === low.id), 'lealdade baixa seguiu outro caminho');
assert.equal(low.status, 'saiu');
assert.ok(stayed.length >= 1);
assert.equal(state.members.filter((m) => m.status === 'ok' && m.role === 'vice').length, 1, 'sempre tem um vice');
assert.ok(state.members.filter((m) => m.status === 'ok' && m.role === 'cap').length >= 2, 'pelo menos 2 capitães');
assert.ok(state.money > 800, 'respeito da escola vira capital');
assert.equal(state.over, null);
assert.equal(state.history[0].era, 'escola');

// capitão funciona no bairro
assert.ok(assignCaptain(stayed[0].id, 0));

// ---------- F3: lote, obra, armas, evento, boatos ----------
const B = await import('../src/core/business.js');
state.money = 20000;
const lot = state.nodes.find((n) => n.type === 'lote' && n.owner === null && E.ADJ[n.id].some((m) => state.nodes[m].owner === 'P'))
  || (() => { const l = state.nodes.find((n) => n.type === 'lote'); state.nodes[E.ADJ[l.id][0]].owner = 'P'; return l; })();
assert.equal(R.reachable(lot), false, 'lote vazio não se ataca');
assert.ok(B.buyLot(lot), 'comprou lote');
assert.ok(B.startBuild(lot, 'deposito'), 'obra começou');
for (let d = 0; d < 3; d++) R.endDay();
assert.equal(lot.owner === 'P' ? lot.type : 'deposito', 'deposito', 'obra terminou e virou depósito');
const cap0 = B.storage();
assert.ok(cap0 >= 20);
assert.ok(B.buyWeapon('sargento', 'pistola', 5), 'comprou pistolas');
assert.ok(B.weaponMult() > 1, 'armas aumentam a força');
assert.ok(R.forecast().ammo > 0, 'munição custa por dia');
assert.equal(B.canBuyWeapon('porto', 'fuzil', 1), 'Indisponível', 'fuzil só na cidade');
state.actions = 3; state.eventToday = false;
const hq0 = state.nodes[0];
assert.ok(B.holdEvent(hq0, 'churrasco'), 'churrasco no QG');
assert.equal(B.canHoldEvent(hq0, 'bailao'), 'Um evento por dia');
// boatos: com inferninho, o plano do rival aparece como ameaça
const inf = state.nodes.find((n) => n.type === 'inferninho'); inf.owner = 'P';
const alive = Object.keys(state.rivals).find((k) => state.rivals[k].alive);
state.rivals[alive].plan = 0;
assert.ok(B.threats().some((x) => x.node === 0), 'boato mostra o ataque planejado');

// ---------- Expansão: Bairro → Cidade (ninguém sai) ----------
for (const k in state.rivals) if (state.rivals[k].alive) R.eliminate(k, 'P');
R.checkEnd();
const okBefore = state.members.filter((m) => m.status === 'ok').length;
state.members.forEach((m) => { if (m.status === 'ok') m.loyalty = 30; });
const moneyBefore = state.money;
const arms = state.arsenal.pistola;
const exp = advanceEra('cidade');
assert.equal(state.era, 'cidade');
assert.equal(state.nodes[0].name, 'QG do Farol', 'mapa da cidade');
assert.equal(exp.left.length, 0, 'na expansão ninguém sai, mesmo com lealdade baixa');
assert.equal(state.members.filter((m) => m.status === 'ok').length, okBefore);
assert.equal(state.arsenal.pistola, arms, 'armas vêm junto');
assert.ok(state.money >= Math.round(moneyBefore * 0.5), 'metade do caixa vem junto');
assert.equal(state.nodes.length, E.MAP.length, 'cidade com os lotes novos');

// save no meio da campanha volta na era certa
const reloaded = load();
assert.ok(reloaded);
assert.equal(state.era, 'cidade');
assert.equal(E.ERA.id, 'cidade');
console.log(`campanha: ok (escola vencida, ${stayed.length} continuaram, ${left.length} saíram; briga ${won ? 'vencida' : 'perdida'} em ${rounds} rodada(s))`);

// ---------- F5: mercado ----------
const MK = await import('../src/core/market.js');
assert.ok(MK.hasMarket(), 'mercado existe na cidade');
const boca = state.nodes.find((n) => n.type === 'boca'); boca.owner = 'P'; boca.lowkey = false; delete boca.build;
const incPo = R.nodeIncome(boca);
MK.setMarket('product', 'sintetico');
assert.ok(R.nodeIncome(boca) > incPo, 'sintético rende mais que pó');
MK.setMarket('supplier', 'cartel');
assert.ok(R.forecast().supply > 0, 'fornecedor custa por dia');
MK.setMarket('price', 'barato');
const rivalBoca = state.nodes.find((n) => n.type === 'boca' && n.owner && n.owner !== 'P' && n.owner !== 'X');
if (rivalBoca) assert.ok(MK.rivalBocaMult() < 1, 'preço baixo derruba a renda das bocas rivais');
for (let d = 0; d < 3; d++) MK.tickMarket();
MK.setMarket('price', 'justo'); MK.setMarket('supplier', 'local');

// ---------- F5: estado ----------
const ES = await import('../src/core/estado.js');
const scenes = [];
hooks.scene = (id) => scenes.push(id);
for (const k in state.rivals) if (state.rivals[k].alive) R.eliminate(k, 'P');
R.checkEnd();
assert.equal(state.over, 'win');
ES.openEstado();
assert.equal(state.mode, 'estado');
assert.ok(state.org && ES.isMine('porto'), 'Porto Neon é a sede');
assert.ok(scenes.includes('estadoIntro'));
assert.ok(ES.available('ferro') && ES.available('praia') && !ES.available('capital'), 'só cidades na rota');
const env = ES.orgMembers()[0];
state.org.treasury = 5000;
assert.ok(ES.sendMember('ferro', env.id), 'mandou alguém pro Vale do Ferro');
assert.equal(state.mode, 'city');
assert.equal(state.cityId, 'ferro');
assert.equal(state.cmd.vulgo, env.vulgo, 'o braço é o protagonista');
assert.equal(state.respect, 0, 'forasteiro começa sem respeito');
assert.ok(state.money >= 3000 && state.org.treasury === 2000, 'apoio saiu do caixa da organização');
assert.ok(Object.values(E.RIVALS).some((r) => r.name === 'Os Fundidores'), 'gangues locais do Vale do Ferro');
assert.ok(state.nodes.some((n) => n.name === 'QG dos Fundidores'));
const t0 = state.org.treasury; R.endDay();
assert.ok(state.org.treasury > t0, 'tributo de Porto Neon entra no caixa enquanto o braço joga');
for (const k in state.rivals) if (state.rivals[k].alive) R.eliminate(k, 'P');
R.checkEnd();
ES.finishCity();
assert.equal(state.mode, 'estado');
assert.ok(ES.isMine('ferro'), 'Vale do Ferro conquistado');
assert.equal(state.org.members.find((m) => m.id === env.id).status, 'patrao', 'o braço virou patrão');
assert.ok(ES.available('serra'), 'Serra Azul entra na rota');
// achar alguém na Praia Dourada
assert.ok(ES.findLocal('praia', { name: 'Kai', leader: 'Kai', origin: 'playboy', gang: 'Bonde da Orla', flag: { bg: '#06b6d4', fg: '#111827', pattern: 'lisa', symbol: 'lua', sym: '#f5f5f4' }, jacket: { color: '#111827', accent: '#06b6d4' }, look: state.cmd.look, attrs: { forca: 2, tatica: 2, labia: 3, frio: 2 } }));
assert.equal(state.respect, 20, 'quem é da cidade começa com respeito');
assert.equal(state.affiliated, false);
state.respect = 55; scenes.length = 0;
ES.checkAffiliation();
assert.ok(scenes.includes('affiliation'), 'ao fazer nome, o chefe chama');
const cash = state.money;
ES.affiliate('caro');
assert.ok(state.affiliated && state.money > cash, 'filiou e recebeu apoio');
assert.equal(state.flag.bg, state.org.flag.bg, 'bandeira da organização');
for (const k in state.rivals) if (state.rivals[k].alive) R.eliminate(k, 'P');
R.checkEnd(); ES.finishCity();
assert.ok(ES.isMine('praia'));
assert.equal(state.org.nodes.estado.praia.tributeMult, 0.5, 'quem cobrou caro manda metade do tributo');
assert.ok(ES.available('capital'), 'Capital na rota');
// anexar a Serra Azul com dinheiro; a Capital (final) não se compra
state.org.treasury = 100000;
assert.ok(ES.annex('serra'), 'Serra Azul anexada');
assert.equal(ES.canAnnex('capital'), 'Esse não se compra: só na guerra');
state.org.nodes.estado.capital = { status: 'yours', patron: { name: 'x', vulgo: 'x', look: state.cmd.look } };
assert.ok(ES.allMine() && ES.canLevelUp(), 'estado completo');
assert.ok(ES.levelUp());
assert.equal(ES.level(), 'pais');
assert.ok(ES.isMine('farol') && ES.available('sertao') && ES.available('metropole'));
assert.ok(ES.tributePerDay() > 3000, 'tributo soma estado inteiro + país');
// braço no País: gangues geradas, mapa menor, apoio maior
const bp = ES.orgMembers()[0];
state.org.treasury = 20000;
assert.ok(ES.sendMember('sertao', bp.id));
assert.equal(state.nodes.length <= 46, true, 'cidade do país é menor');
assert.ok(state.arsenal.escopeta >= 4, 'apoio do país inclui escopetas');
assert.ok(Object.values(E.RIVALS).every((r) => r.name && r.leader), 'gangues geradas');
for (const k in state.rivals) if (state.rivals[k].alive) R.eliminate(k, 'P');
R.checkEnd(); ES.finishCity();
assert.ok(ES.isMine('sertao'));
// pula o resto do país e do mundo
for (const id of Object.keys(ES.L().nodes)) state.org.nodes.pais[id] = { status: 'yours', patron: { name: 'x', vulgo: 'x', look: state.cmd.look } };
assert.ok(ES.levelUp());
assert.equal(ES.level(), 'mundo');
for (const id of Object.keys(ES.L().nodes)) state.org.nodes.mundo[id] = { status: 'yours', patron: { name: 'x', vulgo: 'x', look: state.cmd.look } };
assert.ok(ES.allMine() && !ES.canLevelUp(), 'mundo é o último nível');
ES.finishStory('rei');
const ep = ES.epilogue();
assert.equal(ep.kind, 'rei');
assert.ok(ep.conquered.length >= 15, 'epílogo lista o que foi dominado');
console.log(`estado/país/mundo: ok (${ep.conquered.length} lugares dominados, ${ep.days} dias de história)`);
