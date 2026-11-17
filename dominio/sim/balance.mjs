// Simulador de equilíbrio: um bot joga várias partidas e mede vitória, duração e visada.
// Uso: node sim/balance.mjs [partidas=40] [--era escola|bairro|cidade] [--sem-bonde] [--cuidar] [--armas] [--ops] [--estado <lugar de qualquer nível: ferro, capital, sertao, federal, hakuro, nexus...>]
import { state, newGame } from '../src/core/state.js';
import { ADJ } from '../src/core/era.js';
import { reachable, estDef, playerAttack, moveGuards, recruit, bribe, endDay, canBuyMoto, motoCost, buyMoto, playerAttackMult } from '../src/core/rules.js';
import { active, captainAt, assignCaptain, canPromote, promoteCaptain, spendPoint, canGift, gift, canPromoteLt, promoteLieutenant } from '../src/core/crew.js';
import { hooks } from '../src/core/state.js';
import { buyWeapon, canBuyWeapon, stock, storage, canBuyLot, buyLot, lotCost, startBuild } from '../src/core/business.js';
import { canHeist, heistOdds, doHeist } from '../src/core/ops.js';
import { TYPES } from '../src/core/era.js';
import { openEstado, sendMember, orgMembers } from '../src/core/estado.js';
import { LEVELS } from '../src/data/world.js';

const GAMES = Number(process.argv[2]) || 40;


const ERA_ID = process.argv.includes('--era') ? process.argv[process.argv.indexOf('--era') + 1] : 'cidade';
const USE_CREW = !process.argv.includes('--sem-bonde');
const MAX_DAYS = ERA_ID === 'cidade' ? 150 : 90;   // a cidade gerada é maior: partida mais longa
const CARE = process.argv.includes('--cuidar');   // dá agrado quando a lealdade cai
const ARMS = process.argv.includes('--armas');    // compra pistolas quando sobra dinheiro
const OPS = process.argv.includes('--ops');
const ESTADO = process.argv.includes('--estado') ? process.argv[process.argv.indexOf('--estado') + 1] : null;   // cidade do estado (braço mandado)       // capitães agressivos na fronteira + assaltos com boa chance

// Capitães nos pontos de fronteira mais valiosos; promove quando der; pontos de atributo em Força/Tática.
function manageCrew() {
  if (!USE_CREW) return;
  while (state.cmd.points > 0) spendPoint(state.cmd.points % 2 ? 'tatica' : 'forca');
  if (!canPromote() && state.money > 2500 * (ERA_ID === 'escola' ? 0.12 : 1)) promoteCaptain();
  const free = active().filter((m) => m.role !== 'ten' && (m.node === null || state.nodes[m.node].owner !== 'P'));
  // tenentes quando sobra dinheiro (um por capitão por vez)
  for (const cap of active().filter((m) => m.role === 'cap')) if (state.money > 3000 * (ERA_ID === 'escola' ? 0.12 : 1) && !canPromoteLt(cap)) promoteLieutenant(cap.id);
  const spots = state.nodes.filter((n) => n.owner === 'P' && !captainAt(n))
    .map((n) => ({ n, front: ADJ[n.id].filter((m) => { const o = state.nodes[m].owner; return o && o !== 'P' && o !== 'X'; }).length }))
    .sort((a, b) => (b.n.type === 'hq') - (a.n.type === 'hq') || b.front - a.front);
  for (const m of free) { const s = spots.shift(); if (!s) break; assignCaptain(m.id, s.n.id); }
  if (OPS) for (const m of active()) m.policy = m.node !== null && m.node !== 0 ? 'agressiva' : 'segura';
  if (CARE) for (const m of active()) if (m.loyalty < 40 && !canGift(m)) gift(m.id);
}

function playDay(useBribe) {
  manageCrew();
  if (canBuyMoto() && state.money > motoCost() * 1.5) buyMoto();
  // negócios: compra lote vizinho e ergue uma boca quando sobra dinheiro
  if (state.money > lotCost() + 900 + 1500) {
    const lot = state.nodes.find((n) => !canBuyLot(n));
    if (lot && buyLot(lot)) startBuild(lot, 'boca');
  }
  if (ARMS) while (state.money > 2500 && !canBuyWeapon('primo', 'pistola', 1)) buyWeapon('primo', 'pistola', 1);
  if (state.money > 600 * (ERA_ID === 'escola' ? 0.12 : 1)) recruit(0, 9);
  if (useBribe && state.heat > 50) bribe();
  if (OPS) for (const n of state.nodes.filter((x) => TYPES[x.type].special && TYPES[x.type].special.kind === 'assalto')) {
    const send = Math.min(state.free, 12);
    if (!canHeist(n, send) && heistOdds(n, send).chance >= 0.7 && state.heat < 55) doHeist(n.id, send);
  }
  for (let a = 0; a < 5; a++) {
    const t = state.nodes.filter((n) => reachable(n)).map((n) => ({ n, d: estDef(n) })).sort((x, y) => x.d - y.d)[0];
    const pm = playerAttackMult();                    // como uma pessoa vendo a chance no painel
    if (!t || state.free < (t.d * 1.5) / pm + 1) break;
    playerAttack(t.n.id, Math.min(state.free, Math.ceil((t.d * 1.6) / pm) + 1));
  }
  for (const n of state.nodes.filter((m) => m.owner === 'P')) {
    const front = ADJ[n.id].some((m) => { const o = state.nodes[m].owner; return o && o !== 'P' && o !== 'X'; });
    const want = n.type === 'hq' ? 5 : front ? 3 : 1;
    while (n.guards < want && state.free > 0) moveGuards(n.id, 1);
  }
  const before = state.log[0];
  endDay();
  let raids = 0, megas = 0, traicoes = 0, mortes = 0;
  for (const l of state.log) {
    if (l === before) break;
    if (l.msg.includes('MEGAOPERAÇÃO')) megas++;
    else if (l.msg.includes('Batida policial') || l.msg.includes('Advertência') || l.msg.includes('ADVERTÊNCIA')) raids++;
    if (l.msg.startsWith('🐍')) traicoes++;
    if (l.msg.startsWith('⚰️')) mortes++;
  }
  return { raids, megas, traicoes, mortes };
}

function run(useBribe) {
  const res = [];
  for (let g = 0; g < GAMES; g++) {
    newGame({ gang: 'Bot', leader: 'Bot', color: '#ef4444', era: ERA_ID, skipIntro: true });
    if (ESTADO) {
      // simula a chegada de um braço mandado: organização criada, cidades no caminho já são suas
      state.campaign = true; openEstado();
      const lv = Object.keys(LEVELS).find((k) => LEVELS[k].nodes[ESTADO]);
      state.org.level = lv; state.org.nodes[lv] = state.org.nodes[lv] || {};
      state.org.treasury = LEVELS[lv].support.cap;
      // tudo do nível já é seu, menos o alvo (pra ele ficar na rota)
      for (const id of Object.keys(LEVELS[lv].nodes)) if (id !== ESTADO) state.org.nodes[lv][id] = { status: 'yours', patron: { name: 'x', vulgo: 'x', look: state.cmd.look } };
      sendMember(ESTADO, orgMembers()[0].id);
    }
    const heats = [];
    let raids = 0, megas = 0, traicoes = 0, mortes = 0;
    for (let d = 0; d < MAX_DAYS && !state.over; d++) {
      const r = playDay(useBribe);
      raids += r.raids; megas += r.megas; traicoes += r.traicoes; mortes += r.mortes; heats.push(state.heat);
    }
    const late = heats.slice(-15);
    res.push({
      win: state.over === 'win', day: state.day, money: state.money,
      lateHeat: late.reduce((a, c) => a + c, 0) / late.length,
      at90: heats.filter((h) => h >= 90).length, raids, megas, traicoes, mortes,
    });
  }
  const avg = (k) => (res.reduce((a, r) => a + r[k], 0) / res.length).toFixed(1);
  const med = (k) => { const v = res.map((r) => r[k]).sort((a, b) => a - b); return Math.round(v[v.length >> 1]); };
  console.log(`${useBribe ? 'COM suborno' : 'SEM suborno'} | vitórias ${res.filter((r) => r.win).length}/${GAMES} | dias ${avg('day')} | caixa final (mediana) $${med('money')} | visada final ${avg('lateHeat')} | dias≥90 ${avg('at90')} | batidas ${avg('raids')} | mega ${avg('megas')} | traições ${avg('traicoes')} | mortes ${avg('mortes')}`);
}

hooks.scene = () => {};
console.log(`Era: ${ERA_ID}`);
console.log(USE_CREW ? `Bot usando o bonde (capitães, promoções, atributos)${CARE ? ' e cuidando da lealdade' : ', sem cuidar da lealdade'}` : 'Bot sem usar o bonde');
run(true);
run(false);
