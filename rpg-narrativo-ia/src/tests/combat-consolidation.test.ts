import { describe, expect, it } from 'vitest';
import { applyEffects } from '../core/effects';
import { type GameState } from '../core/state';
import {
  INITIAL_COMBAT,
  combatEncounterResolvedFlag,
  createCombat,
  listAvailableEncounters,
  resolveEncounterOutcome,
  resolveTurn,
  type CombatActionDefinition,
  type CombatState,
} from '../modules/combat';
import { DEFAULT_STARTING_LOCATION_ID } from '../modules/navigation';
import { freshState } from './helpers';

function exploring(): GameState {
  return { ...freshState(), narrativeSession: null };
}

function fightToEnd(knownSkillIds: string[]): CombatState {
  let state = createCombat(INITIAL_COMBAT, 'clearing-predator', { playerMaxHealth: 40, knownSkillIds });
  let safety = 0;
  while (state.outcome === 'ongoing' && safety < 50) {
    state = resolveTurn(INITIAL_COMBAT, state, 'attack');
    safety += 1;
  }
  return state;
}

describe('Fatia 12.7 — consolidação do Sistema 12', () => {
  it('mantém o catálogo de combate imutável', () => {
    expect(() => (INITIAL_COMBAT.actions as CombatActionDefinition[]).push(INITIAL_COMBAT.actions[0])).toThrow();
    expect(() => ((INITIAL_COMBAT.actions[0] as { name: string }).name = 'x')).toThrow();
  });

  it('conduz um encontro completo até a vitória e aplica a consequência no mundo', () => {
    const finished = fightToEnd([]);
    expect(finished.outcome).toBe('victory');

    const before = exploring();
    const after = applyEffects(before, resolveEncounterOutcome('clearing-predator', finished.outcome));
    expect(after.flags[combatEncounterResolvedFlag('clearing-predator')]).toBe(true);
    expect(after.attributes.cautela).toBe(before.attributes.cautela + 2);
    expect(
      listAvailableEncounters(INITIAL_COMBAT, DEFAULT_STARTING_LOCATION_ID, after.flags).map((e) => e.id),
    ).not.toContain('clearing-predator');
  });

  it('é determinístico: a mesma sequência de ações produz o mesmo desfecho', () => {
    expect(fightToEnd([])).toEqual(fightToEnd([]));
  });
});
