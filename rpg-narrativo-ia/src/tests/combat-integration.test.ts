import { describe, expect, it } from 'vitest';
import { applyEffects } from '../core/effects';
import { type GameState } from '../core/state';
import {
  INITIAL_COMBAT,
  combatEncounterResolvedFlag,
  listAvailableEncounters,
  resolveEncounterOutcome,
} from '../modules/combat';
import { DEFAULT_STARTING_LOCATION_ID } from '../modules/navigation';
import { freshState } from './helpers';

function exploring(): GameState {
  return { ...freshState(), narrativeSession: null };
}

describe('Fatia 12.4 — integração de combate com o mundo', () => {
  it('lista encontros do local e oculta os já resolvidos', () => {
    const available = listAvailableEncounters(INITIAL_COMBAT, DEFAULT_STARTING_LOCATION_ID, {});
    expect(available.map((encounter) => encounter.id)).toContain('clearing-predator');

    const resolvedFlags = { [combatEncounterResolvedFlag('clearing-predator')]: true };
    const afterWin = listAvailableEncounters(INITIAL_COMBAT, DEFAULT_STARTING_LOCATION_ID, resolvedFlags);
    expect(afterWin.map((encounter) => encounter.id)).not.toContain('clearing-predator');
  });

  it('converte a vitória em flag de encontro resolvido e recompensa, aplicável ao GameState', () => {
    const effects = resolveEncounterOutcome('clearing-predator', 'victory');
    const before = exploring();
    const after = applyEffects(before, effects);

    expect(after.flags[combatEncounterResolvedFlag('clearing-predator')]).toBe(true);
    expect(after.attributes.cautela).toBe(before.attributes.cautela + 2);
  });

  it('converte a derrota em perda de vitalidade e não marca o encontro', () => {
    const effects = resolveEncounterOutcome('clearing-predator', 'defeat');
    const before = exploring();
    const after = applyEffects(before, effects);

    expect(after.attributes.saude).toBe(before.attributes.saude - 8);
    expect(after.flags[combatEncounterResolvedFlag('clearing-predator')]).toBeUndefined();
  });

  it('a fuga não deixa consequência', () => {
    expect(resolveEncounterOutcome('clearing-predator', 'fled')).toEqual([]);
  });

  it('rejeita converter um combate ainda em andamento', () => {
    expect(() => resolveEncounterOutcome('clearing-predator', 'ongoing')).toThrow();
  });
});
