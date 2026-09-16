import { describe, expect, it } from 'vitest';
import { applyEffects } from '../core/effects';
import { type GameState } from '../core/state';
import {
  CombatError,
  INITIAL_COMBAT,
  buildCombatResolution,
  combatEncounterResolvedFlag,
  combatResolutionEffects,
  createCombat,
  getEncounter,
  resolveTurn,
  type CombatState,
} from '../modules/combat';
import { freshState } from './helpers';

function exploring(saude = 80): GameState {
  const base = freshState();
  return { ...base, narrativeSession: null, attributes: { ...base.attributes, saude } };
}

function fightTo(outcome: 'victory' | 'fled', saude: number): CombatState {
  let state = createCombat(INITIAL_COMBAT, 'clearing-predator', {
    knownSkillIds: ['sharpened-senses'],
    playerMaxHealth: saude,
  });
  if (outcome === 'fled') {
    return resolveTurn(INITIAL_COMBAT, state, 'flee');
  }
  let safety = 0;
  while (state.outcome === 'ongoing' && safety < 50) {
    state = resolveTurn(INITIAL_COMBAT, state, 'focus-strike');
    safety += 1;
  }
  return state;
}

describe('Fatia 12.9 — ponte de vitalidade e resolução terminal', () => {
  it('inicia o combate com a vitalidade vinda da saúde do mundo', () => {
    const combat = createCombat(INITIAL_COMBAT, 'clearing-predator', { playerMaxHealth: 64 });
    expect(combat.player.maxHealth).toBe(64);
    expect(combat.player.health).toBe(64);
  });

  it('produz uma resolução terminal validada a partir do estado de combate', () => {
    const encounter = getEncounter(INITIAL_COMBAT, 'clearing-predator');
    const terminal = fightTo('victory', 80);
    const resolution = buildCombatResolution(terminal, encounter);

    expect(resolution.outcome).toBe('victory');
    expect(resolution.entryHealth).toBe(80);
    expect(resolution.remainingHealth).toBe(terminal.player.health);
    expect(resolution.turns).toBeGreaterThan(0);
  });

  it('rejeita resolução de combate em andamento ou de outro encontro', () => {
    const encounter = getEncounter(INITIAL_COMBAT, 'clearing-predator');
    const ongoing = createCombat(INITIAL_COMBAT, 'clearing-predator', { playerMaxHealth: 80 });
    expect(() => buildCombatResolution(ongoing, encounter)).toThrow(CombatError);
    const terminal = fightTo('fled', 80);
    expect(() => buildCombatResolution(terminal, { ...encounter, id: 'outro' })).toThrow(CombatError);
  });

  it('vitória e fuga persistem a saúde restante, sem cura grátis acima da entrada', () => {
    const encounter = getEncounter(INITIAL_COMBAT, 'clearing-predator');
    const terminal = fightTo('victory', 80);
    const resolution = buildCombatResolution(terminal, encounter);
    const before = exploring(80);
    const after = applyEffects(before, combatResolutionEffects(resolution, before.attributes.saude));

    expect(after.attributes.saude).toBe(resolution.remainingHealth);
    expect(after.attributes.saude).toBeLessThanOrEqual(80);
    expect(after.flags[combatEncounterResolvedFlag('clearing-predator')]).toBe(true);
    expect(after.attributes.cautela).toBe(before.attributes.cautela + 2);
  });

  it('derrota retorna com saúde 1 e sem a antiga penalidade fixa nem flag de resolvido', () => {
    const resolution = {
      encounterId: 'clearing-predator',
      outcome: 'defeat' as const,
      turns: 3,
      entryHealth: 80,
      remainingHealth: 0,
      playerActionIds: ['attack', 'attack', 'attack'],
      usedPrepared: [],
      equipment: { 'main-hand': null, body: null, accessory: null },
    };
    const before = exploring(80);
    const after = applyEffects(before, combatResolutionEffects(resolution, before.attributes.saude));

    expect(after.attributes.saude).toBe(1);
    expect(after.flags[combatEncounterResolvedFlag('clearing-predator')]).toBeUndefined();
  });
});
