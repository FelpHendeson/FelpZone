// Operações especiais (Cidade): assalto, sequestro, extorsão, trégua, aliança, assassinato, emboscada,
// e a política dos capitães (o agressivo ataca sozinho). Sem DOM.
import { ERA, TYPES, RIVALS, ADJ, P } from './era.js';
import { state, hooks, log } from './state.js';
import { clamp, money, rnd } from './util.js';
import { active, attr, memberTitle } from './crew.js';
import { reachable, estDef, playerAttackMult, doAttack, afterPlayerAttack, linked } from './rules.js';

const special = (n) => TYPES[n.type].special;
export const nextToMe = (n) => linked(n.id).some((m) => state.nodes[m].owner === 'P');

// ===================== ASSALTO E SEQUESTRO =====================
// Segurança sobe a cada golpe recente no mesmo lugar; o valor se recompõe com o tempo.
export function heistOdds(n, send) {
  const sp = special(n);
  const sec = sp.security * (1 + 0.25 * (n.hits || 0));
  const power = send * (1 + state.respect / 200) * playerAttackMult();
  return { sec, power, chance: clamp(0.5 + (power - sec) / (sec * 2.2), 0.05, 0.95) };
}
export function canHeist(n, send) {
  const sp = special(n);
  if (!sp || !ERA.generate) return 'Indisponível';
  if (!nextToMe(n)) return 'Precisa de um ponto seu vizinho';
  if (n.cool > 0) return `Segurança reforçada por ${n.cool}d`;
  if (sp.kind === 'sequestro' && state.ransom) return 'Já tem um sequestro em andamento';
  if (state.actions <= 0) return 'Sem ⚡';
  if (send < 1 || send > state.free) return 'Sem soldados livres';
  return '';
}
export function doHeist(id, sendWanted) {
  const n = state.nodes[id];
  const send = clamp(sendWanted, 1, state.free);
  if (canHeist(n, send)) return null;
  const sp = special(n);
  const { chance } = heistOdds(n, send);
  state.actions--;
  const ok = Math.random() < chance;
  n.hits = (n.hits || 0) + 1;
  n.cool = 4;
  if (ok) {
    state.heat = clamp(state.heat + sp.heat, 0, 100);
    state.respect = clamp(state.respect + 4, 0, 100);
    if (sp.kind === 'sequestro') {
      state.ransom = { node: id, days: 2, value: Math.round(P(sp.ransom) * rnd(0.8, 1.2)) };
      log(`🏛️ SEQUESTRO na ${n.name}! O resgate (${money(state.ransom.value)}) chega em 2 dias. A cidade inteira está procurando.`, 'big');
    } else {
      const loot = Math.round(P(sp.loot) * rnd(0.75, 1.25) / (1 + 0.3 * (n.hits - 1)));
      state.money += loot;
      log(`💰 ASSALTO na ${n.name}: ${money(loot)} no bolso. Visada +${sp.heat}.`, 'big');
    }
  } else {
    const caught = Math.max(1, Math.round(send * rnd(0.3, 0.6)));
    state.free -= caught;
    state.heat = clamp(state.heat + Math.round(sp.heat / 2), 0, 100);
    state.respect = clamp(state.respect - 3, 0, 100);
    log(`🚨 O golpe na ${n.name} deu errado: ${caught} dos seus foram presos.`, 'bad');
  }
  return ok;
}
// Extorsão (lotérica, supermercado): renda diária enquanto um ponto seu for vizinho.
export const canExtort = (n) => (special(n) && special(n).extort && ERA.generate ? (nextToMe(n) ? '' : 'Precisa de um ponto seu vizinho') : 'Indisponível');
export function toggleExtort(id) {
  const n = state.nodes[id];
  if (canExtort(n)) return false;
  n.extorted = !n.extorted;
  log(n.extorted ? `🧾 O ${state.player.gang} passou a cobrar "proteção" da ${n.name}.` : `🧾 Pararam de cobrar a ${n.name}.`, 'warn');
  return true;
}
export const extortIncome = () => state.nodes.filter((n) => n.extorted && nextToMe(n)).reduce((s, n) => s + P(special(n).extort), 0);
export const extortHeat = () => state.nodes.filter((n) => n.extorted && nextToMe(n)).length;

// ===================== GANGUES: TRÉGUA, ALIANÇA, ASSASSINATO, EMBOSCADA =====================
export const truceCost = () => P(800 + 40 * state.day);
export const allianceCost = () => P(1500 + 50 * state.day);
const aliveRivals = () => Object.keys(state.rivals).filter((k) => state.rivals[k].alive);
export const isAlly = (rid) => (state.rivals[rid] && state.rivals[rid].allyUntil > state.day);
export const inTruce = (rid) => (state.rivals[rid] && state.rivals[rid].truceUntil > state.day);
// Um rival em trégua ou aliado não ataca você (ver rivalTurn).
export const peaceful = (rid) => isAlly(rid) || inTruce(rid);

export function truceOdds() { return clamp(0.45 + 0.08 * attr('labia') + state.respect / 400, 0.1, 0.95); }
export function canTruce(rid) {
  if (!ERA.generate || !state.rivals[rid] || !state.rivals[rid].alive) return 'Indisponível';
  if (peaceful(rid)) return 'Já em paz';
  if (state.respect < 30) return 'Precisa de ⭐30';
  if (state.actions <= 0) return 'Sem ⚡';
  if (state.money < truceCost()) return `Precisa de ${money(truceCost())}`;
  return '';
}
export function proposeTruce(rid) {
  if (canTruce(rid)) return null;
  state.actions--;
  const rv = state.rivals[rid];
  if (Math.random() < truceOdds()) {
    state.money -= truceCost();
    rv.truceUntil = state.day + 6;
    log(`🕊️ Trégua com ${RIVALS[rid].name} até o dia ${rv.truceUntil}. Eles não vão vir pra cima de você.`, 'good');
    return true;
  }
  state.money -= Math.round(truceCost() / 2);
  rv.angryUntil = state.day + 5;
  log(`🕊️ ${RIVALS[rid].leader} recusou a trégua e ficou com metade da grana. Estão com raiva.`, 'bad');
  return false;
}
// Aliança: o rival para de te atacar e foca no inimigo que você escolher. No fim, pode trair.
export function canAlly(rid) {
  if (!ERA.generate || !state.rivals[rid] || !state.rivals[rid].alive) return 'Indisponível';
  if (aliveRivals().length < 3) return 'Precisa de pelo menos 3 gangues vivas';
  if (peaceful(rid)) return 'Já em paz';
  if (state.respect < 45) return 'Precisa de ⭐45';
  if (state.actions <= 0) return 'Sem ⚡';
  if (state.money < allianceCost()) return `Precisa de ${money(allianceCost())}`;
  return '';
}
export function proposeAlliance(rid) {
  if (canAlly(rid)) return null;
  state.actions--;
  state.money -= allianceCost();
  const rv = state.rivals[rid];
  const target = aliveRivals().filter((k) => k !== rid).sort((a, b) => state.nodes.filter((n) => n.owner === b).length - state.nodes.filter((n) => n.owner === a).length)[0];
  rv.allyUntil = state.day + 10; rv.allyTarget = target;
  log(`🤝 Aliança com ${RIVALS[rid].name} até o dia ${rv.allyUntil}: eles vão pra cima de ${RIVALS[target].name}.`, 'big');
  return true;
}
// Chamado no fim do dia: aliança que acaba pode virar traição.
export function tickDiplomacy() {
  for (const rid of aliveRivals()) {
    const rv = state.rivals[rid];
    if (rv.allyUntil && rv.allyUntil === state.day) {
      if (Math.random() < 0.3) {
        rv.angryUntil = state.day + 6; rv.plan = null;
        log(`🐍 ${RIVALS[rid].name} ROMPERAM a aliança! ${RIVALS[rid].leader}: “Negócio é negócio.” Eles vêm com tudo.`, 'big');
      } else log(`🤝 A aliança com ${RIVALS[rid].name} acabou em paz.`, 'warn');
    }
  }
  if (state.ransom && --state.ransom.days <= 0) {
    state.money += state.ransom.value;
    log(`💼 O resgate chegou: ${money(state.ransom.value)}.`, 'big');
    delete state.ransom;
  }
  for (const n of state.nodes) if (n.cool > 0) { n.cool--; if (!n.cool && n.hits) n.hits = Math.max(0, n.hits - 1); }
}

// Assassinato do braço direito de um líder rival: o executor é o seu melhor capitão livre.
export const hitman = () => active().filter((m) => m.role === 'cap').sort((a, b) => b.level - a.level || b.loyalty - a.loyalty)[0];
export function hitOdds(m) { return clamp(0.3 + 0.04 * (attr('frio') + attr('forca')) + 0.06 * ((m && m.level) || 1), 0.1, 0.85); }
export function canHit(rid) {
  if (!ERA.generate || !state.rivals[rid] || !state.rivals[rid].alive) return 'Indisponível';
  if (isAlly(rid)) return 'Aliado';
  if (!hitman()) return 'Precisa de um capitão disponível';
  if (state.actions <= 0) return 'Sem ⚡';
  return '';
}
export function orderHit(rid) {
  if (canHit(rid)) return null;
  state.actions--;
  const m = hitman();
  const rv = state.rivals[rid];
  const ok = Math.random() < hitOdds(m);
  state.heat = clamp(state.heat + 12, 0, 100);
  rv.angryUntil = state.day + 8;
  if (ok) {
    rv.reserve = Math.floor(rv.reserve * 0.6);
    rv.money = Math.floor(rv.money * 0.8);
    state.nodes.forEach((n) => { if (n.owner === rid && n.guards > 1) n.guards--; });
    state.respect = clamp(state.respect + 6, 0, 100);
    m.xp += 15;
    log(`🗡️ ${memberTitle(m)} apagou o braço direito de ${RIVALS[rid].leader}. ${RIVALS[rid].name} estão desorganizados (e furiosos).`, 'big');
  }
  // o executor pode ser pego, com sucesso ou não
  if (!ok || Math.random() < 0.25) {
    m.node = null;
    if (!ok && !(state.settings && state.settings.leve) && Math.random() < 0.35) {
      m.status = 'morto';
      log(`⚰️ ${memberTitle(m)} não voltou da missão contra ${RIVALS[rid].name}.`, 'bad');
      hooks.scene('captainDied', { m: m.id, nome: `${m.name} “${m.vulgo}”`, ponto: 'território inimigo' });
    } else {
      m.status = 'preso'; m.timer = 10;
      log(`🚔 ${memberTitle(m)} foi pego ${ok ? 'depois do serviço' : 'antes de chegar no alvo'}. 10 dias de cadeia.`, 'bad');
    }
  }
  return ok;
}
// Emboscada: só com boato do inferninho. Se o rival vier, ele cai numa armadilha.
export function canAmbush(n) {
  if (!ERA.generate || n.owner !== 'P') return 'Indisponível';
  const t = Object.entries(state.rivals).find(([, r]) => r.alive && r.plan === n.id);
  if (!t) return 'Sem boato de ataque aqui';
  if (state.ambush === n.id) return 'Emboscada armada';
  if (state.actions <= 0) return 'Sem ⚡';
  return '';
}
export function setAmbush(id) {
  const n = state.nodes[id];
  if (canAmbush(n)) return false;
  state.actions--;
  state.ambush = id;
  log(`🪤 Emboscada armada no ${n.name}. Se vierem, vão se arrepender.`, 'good');
  return true;
}
// Usada pela IA dos rivais: multiplicador de defesa quando há emboscada no alvo.
export function ambushMult(n) {
  if (state.ambush !== n.id) return 1;
  delete state.ambush;
  log(`🪤 Os rivais caíram na emboscada no ${n.name}!`, 'big');
  return 2.4;
}

// ===================== POLÍTICA DOS CAPITÃES =====================
export const POLICIES = {
  equilibrada: { label: 'Equilibrada', icon: '⚖️', desc: 'Sem bônus nem custo.' },
  segura:      { label: 'Segura',      icon: '🛡️', desc: '+10% de defesa e −1 de visada no ponto.' },
  lucro:       { label: 'Lucro',       icon: '💵', desc: '+15% de renda e +1 de visada no ponto.' },
  agressiva:   { label: 'Agressiva',   icon: '⚔️', desc: 'Ataca sozinho um vizinho fraco por dia, com os guardas que sobrarem (sem gastar ação).' },
};
export const POLICY_KEYS = Object.keys(POLICIES);
export const policyOf = (m) => (m && m.policy) || 'equilibrada';
export function cyclePolicy(memberId) {
  const m = state.members.find((x) => x.id === memberId);
  if (!m) return;
  m.policy = POLICY_KEYS[(POLICY_KEYS.indexOf(policyOf(m)) + 1) % POLICY_KEYS.length];
}
// Fim do dia: capitães agressivos atacam por conta própria.
export function aggressiveCaptains() {
  for (const m of active()) {
    if (policyOf(m) !== 'agressiva' || m.node === null) continue;
    const base = state.nodes[m.node];
    if (!base || base.owner !== 'P' || base.guards < 4) continue;
    const pm = playerAttackMult();
    const avail = base.guards - 2;
    const target = ADJ[base.id].map((k) => state.nodes[k])
      .filter((t) => reachable(t) && t.type !== 'hq' && !(t.owner && peaceful(t.owner)))
      .map((t) => ({ t, d: estDef(t) })).filter((o) => (o.d * 1.5) / pm + 1 <= avail).sort((a, b) => a.d - b.d)[0];
    if (!target) continue;
    const send = Math.min(avail, Math.ceil((target.d * 1.6) / pm) + 1);
    base.guards -= send;
    log(`⚔️ ${memberTitle(m)} partiu pra cima de ${target.t.name} por conta própria, com ${send}.`, 'warn');
    const { r, prev } = doAttack('P', send, target.t);
    if (!r.win) {
      // quem volta, volta pro ponto do capitão (applyResult tinha devolvido pros livres)
      base.guards += r.survivors;
      state.free -= r.survivors;
    }
    afterPlayerAttack(target.t, r, prev);
  }
}
