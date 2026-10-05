import { describe, expect, it } from 'vitest';
import { startGame } from '../core/engine';
import type { GameState } from '../core/state';
import { firstDayCampaign } from '../campaigns/first-day';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  INITIAL_COMBAT,
  INITIAL_COMBAT_CATALOG,
  buildCombatResolution,
  createCombat,
  getEncounter,
  indexCombatCatalog,
  inspectCombatCatalog,
  resolveRound,
  type CombatState,
} from '../modules/combat';
import { buildCombatLoadout } from '../modules/equipment';
import { INITIAL_ITEMS } from '../modules/items';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { INITIAL_SKILLS } from '../modules/skills';
import { describeSandboxFeedback } from '../ui/sandbox/feedback';
import { now } from './helpers';

const sandboxContext = createSandboxContext();

function catalogWith(combo: Record<string, unknown>) {
  return inspectCombatCatalog({ ...INITIAL_COMBAT_CATALOG, combos: [combo] }, INITIAL_SKILLS);
}

function swordsman(): GameState {
  let state = startGame({ firstName: 'Ana', lastName: 'Cruz', sex: 'female', archetypeId: 'apprentice-swordsman' }, firstDayCampaign, now);
  state = { ...state, narrativeSession: null };
  for (let count = 0; count < 3; count += 1) state = executeSandboxAction(state, { type: 'exploration.explore' }, { now }).current;
  return state;
}

function fight(state: GameState, plan: string[]): CombatState {
  const portrait = buildCombatLoadout(INITIAL_ITEMS, state.items);
  let combat = createCombat(INITIAL_COMBAT, 'clearing-predator', {
    playerName: 'Ana Cruz',
    knownSkillIds: state.system.entries.map((entry) => entry.skillId),
    playerMaxHealth: state.attributes.saude,
    loadout: portrait.loadout,
    prepared: portrait.prepared,
    execution: state.execution,
  });
  for (let safety = 0; combat.outcome === 'ongoing' && safety < 40; safety += 1) combat = resolveRound(INITIAL_COMBAT, combat, plan);
  return combat;
}

describe('Combos: catálogo', () => {
  it('o pack traz nove sequências, cada uma ligando duas ações do jogador', () => {
    expect(INITIAL_COMBAT.combos.map((combo) => combo.id)).toEqual([
      'advancing-cut', 'shadow-counter', 'safe-distance', 'guarded-cast', 'open-breach',
      'distraction', 'instant-reply', 'short-volley', 'shielded-burst',
    ]);
    expect(INITIAL_COMBAT.comboByPair.get('advance>twin-cut')?.bonus).toEqual({ type: 'damage', amount: 2 });
  });

  it('recusa combos sem sentido: ação inexistente, bônus de dano em quem não golpeia, inabalável em quem não é interrompível', () => {
    const base = { id: 'x', name: 'X', description: 'X', first: 'advance', second: 'attack' };
    expect(catalogWith({ ...base, bonus: { type: 'damage', amount: 2 } }).ok).toBe(true);
    expect(catalogWith({ ...base, second: 'inexistente', bonus: { type: 'critical' } }).ok).toBe(false);
    expect(catalogWith({ ...base, second: 'guard', bonus: { type: 'damage', amount: 2 } }).ok).toBe(false);
    expect(catalogWith({ ...base, bonus: { type: 'uninterruptible' } }).ok).toBe(false);
    expect(catalogWith({ ...base, bonus: { type: 'critical' }, requiresEvade: true }).ok).toBe(false);
    expect(catalogWith({ ...base, first: 'ember-cut', bonus: { type: 'critical' } }).ok).toBe(false);
    expect(
      inspectCombatCatalog({ ...INITIAL_COMBAT_CATALOG, combos: [{ ...base, bonus: { type: 'critical' } }, { ...base, id: 'y', bonus: { type: 'critical' } }] }, INITIAL_SKILLS).ok,
    ).toBe(false);
  });
});

describe('Combos: rodada', () => {
  const granted = { ...createCombat(INITIAL_COMBAT, 'clearing-predator').loadout, grantedActionIds: ['twin-cut', 'shadow-strike'] };

  it('duas ações seguidas na ordem certa acionam o combo, com o efeito extra na segunda', () => {
    const start = createCombat(INITIAL_COMBAT, 'clearing-predator', { loadout: granted });
    const withCombo = resolveRound(INITIAL_COMBAT, start, ['advance', 'twin-cut']);
    const event = withCombo.lastRound!.find((entry) => entry.kind === 'combo');
    expect(event?.text).toContain('Combo: Corte em Avanço!');
    expect(withCombo.triggeredCombos).toEqual(['advancing-cut']);
    const hit = withCombo.lastRound!.find((entry) => entry.kind === 'hit' && entry.actionId === 'twin-cut');
    expect(hit).toBeDefined();

    const apart = resolveRound(INITIAL_COMBAT, start, ['advance', 'guard', 'twin-cut']);
    expect(apart.lastRound!.some((entry) => entry.kind === 'combo')).toBe(false);
    expect(apart.triggeredCombos).toBeUndefined();
  });

  it('o bônus de dano soma ao primeiro golpe da segunda ação', () => {
    // Mesmo combate, mesma IA: só muda a ordem do jogador; a diferença de dano é o bônus do combo.
    const catalog = indexCombatCatalog({ ...INITIAL_COMBAT_CATALOG, combos: [] }, INITIAL_SKILLS);
    const plain = resolveRound(catalog, createCombat(catalog, 'clearing-predator', { loadout: granted }), ['advance', 'twin-cut']);
    const combo = resolveRound(INITIAL_COMBAT, createCombat(INITIAL_COMBAT, 'clearing-predator', { loadout: granted }), ['advance', 'twin-cut']);
    expect(plain.opponent.health - combo.opponent.health).toBe(2);
  });

  it('o contra-ataque só vale se a esquiva já evitou um golpe nesta rodada', () => {
    const kinds = (encounterId: string) => {
      const loadout = { ...createCombat(INITIAL_COMBAT, encounterId).loadout, grantedActionIds: ['shadow-strike'] };
      const round = resolveRound(INITIAL_COMBAT, createCombat(INITIAL_COMBAT, encounterId, { loadout }), ['dodge', 'shadow-strike']);
      return round.lastRound!.map((entry) => `${entry.kind}:${entry.actionId}`);
    };
    // Serpente: a mordida cai na esquiva antes do golpe — combo com dano dobrado.
    expect(kinds('spring-serpent').slice(0, 3)).toEqual(['self:dodge', 'evaded:venom-bite', 'combo:shadow-strike']);
    // Predador: o golpe sai antes de a esquiva evitar qualquer coisa — sem combo.
    expect(kinds('clearing-predator').some((entry) => entry.startsWith('combo'))).toBe(false);
  });
});

describe('Combos: mundo e save', () => {
  it('o combo do confronto é registrado pelo replay, avisado pelo Sistema e salvo', () => {
    const state = swordsman();
    const final = fight(state, ['advance', 'twin-cut', 'guard']);
    expect(final.outcome).toBe('victory');
    const resolution = buildCombatResolution(final, getEncounter(INITIAL_COMBAT, 'clearing-predator'));
    expect(resolution.combos).toEqual(['advancing-cut']);
    const result = executeSandboxAction(state, { type: 'combat.resolve', resolution }, { now });
    expect(result.current.combos).toEqual({ discovered: ['advancing-cut'] });
    expect(describeSandboxFeedback(result, sandboxContext).message).toContain('Sequência registrada: Corte em Avanço');
    expect(parseGameState(serializeGameState(result.current))).toEqual({ status: 'ok', state: result.current });
  });

  it('combos declarados pelo cliente não contam: só vale o que o replay mostra', () => {
    const state = swordsman();
    const final = fight(state, ['advance', 'guard', 'twin-cut']);
    const resolution = { ...buildCombatResolution(final, getEncounter(INITIAL_COMBAT, 'clearing-predator')), combos: ['open-breach'] };
    const result = executeSandboxAction(state, { type: 'combat.resolve', resolution }, { now });
    expect(result.current.combos?.discovered ?? []).toEqual([]);
  });

  it('o save recusa combo desconhecido ou repetido', () => {
    const state = { ...swordsman(), combos: { discovered: ['advancing-cut'] } };
    const raw = JSON.parse(serializeGameState(state));
    expect(parseGameState(JSON.stringify(raw)).status).toBe('ok');
    expect(parseGameState(JSON.stringify({ ...raw, combos: { discovered: ['inventado'] } })).status).toBe('corrupt');
    expect(parseGameState(JSON.stringify({ ...raw, combos: { discovered: ['advancing-cut', 'advancing-cut'] } })).status).toBe('corrupt');
  });
});
