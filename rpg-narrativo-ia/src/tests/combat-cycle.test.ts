import { describe, expect, it } from 'vitest';
import { type GameState } from '../core/state';
import {
  INITIAL_COMBAT,
  buildCombatResolution,
  combatEncounterResolvedFlag,
  createCombat,
  getEncounter,
  listAvailableEncounters,
  resolveTurn,
  type CombatState,
} from '../modules/combat';
import { DEFAULT_STARTING_LOCATION_ID } from '../modules/navigation';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { freshState, now } from './helpers';

function exploring(): GameState {
  return { ...freshState(), narrativeSession: null };
}

function revealedAt(state: GameState, locationId: string): string[] {
  return state.sandbox.exploration.locations.find((location) => location.locationId === locationId)?.revealedDiscoveryIds ?? [];
}

function fightToVictory(state: GameState): CombatState {
  let combat = createCombat(INITIAL_COMBAT, 'clearing-predator', {
    playerMaxHealth: state.attributes.saude,
    knownSkillIds: state.system.entries.map((entry) => entry.skillId),
  });
  let safety = 0;
  while (combat.outcome === 'ongoing' && safety < 50) {
    combat = resolveTurn(INITIAL_COMBAT, combat, 'focus-strike');
    safety += 1;
  }
  return combat;
}

describe('Fatia 12.12 — ciclo de combate ponta a ponta', () => {
  it('descobre a ameaça, luta e aplica a transação única no mundo com retorno', () => {
    let state = exploring();

    // 1. A ameaça não aparece antes da descoberta.
    expect(
      listAvailableEncounters(INITIAL_COMBAT, DEFAULT_STARTING_LOCATION_ID, state.flags, revealedAt(state, DEFAULT_STARTING_LOCATION_ID))
        .map((encounter) => encounter.id),
    ).not.toContain('clearing-predator');

    // 2. Explorar até 30% revela a pista do predador.
    for (let i = 0; i < 3; i += 1) {
      state = executeSandboxAction(state, { type: 'exploration.explore' }, { now }).current;
    }
    expect(revealedAt(state, DEFAULT_STARTING_LOCATION_ID)).toContain('wary-predator-tracks');
    expect(
      listAvailableEncounters(INITIAL_COMBAT, DEFAULT_STARTING_LOCATION_ID, state.flags, revealedAt(state, DEFAULT_STARTING_LOCATION_ID))
        .map((encounter) => encounter.id),
    ).toContain('clearing-predator');

    // 3. Combater até a vitória (estado transitório).
    const saudeAntes = state.attributes.saude;
    const cautelaAntes = state.attributes.cautela;
    const mundoAntes = { ...state.world };
    const terminal = fightToVictory(state);
    expect(terminal.outcome).toBe('victory');

    // 4. Uma única transação terminal no mundo.
    const resolution = buildCombatResolution(terminal, getEncounter(INITIAL_COMBAT, 'clearing-predator'));
    const result = executeSandboxAction(state, { type: 'combat.resolve', resolution }, { now });

    expect(result.timeCost.periods).toBe(1);
    expect(result.needsWear.periodsApplied).toBe(1);
    expect(result.current.attributes.saude).toBe(terminal.player.health);
    expect(result.current.attributes.saude).toBeLessThanOrEqual(saudeAntes);
    expect(result.current.attributes.cautela).toBe(cautelaAntes + 2);
    expect(result.current.flags[combatEncounterResolvedFlag('clearing-predator')]).toBe(true);
    expect(result.current.world).not.toEqual(mundoAntes);

    // 5. A ameaça resolvida some do local.
    expect(
      listAvailableEncounters(
        INITIAL_COMBAT,
        DEFAULT_STARTING_LOCATION_ID,
        result.current.flags,
        revealedAt(result.current, DEFAULT_STARTING_LOCATION_ID),
      ).map((encounter) => encounter.id),
    ).not.toContain('clearing-predator');
  });
});
