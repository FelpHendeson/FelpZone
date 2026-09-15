import { describe, expect, it } from 'vitest';
import { type GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  INITIAL_COMBAT,
  buildCombatResolution,
  combatEncounterResolvedFlag,
  createCombat,
  getEncounter,
  resolveTurn,
  type CombatState,
} from '../modules/combat';
import { executeSandboxAction, SandboxActionError, type SandboxAction } from '../modules/sandbox-actions';
import { freshState, now } from './helpers';

function exploring(saude = 80, revealThreat = true): GameState {
  const base = freshState();
  let state: GameState = {
    ...base,
    narrativeSession: null,
    attributes: { ...base.attributes, saude },
  };
  if (revealThreat) {
    for (let count = 0; count < 3; count += 1) {
      state = executeSandboxAction(state, { type: 'exploration.explore' }, { now }).current;
    }
  }
  return state;
}

function terminal(outcome: 'victory' | 'defeat' | 'fled', saude: number): CombatState {
  let state = createCombat(INITIAL_COMBAT, 'clearing-predator', {
    knownSkillIds: ['sharpened-senses'],
    playerMaxHealth: saude,
  });
  if (outcome === 'fled') {
    return resolveTurn(INITIAL_COMBAT, state, 'flee');
  }
  if (outcome === 'defeat') {
    return resolveTurn(INITIAL_COMBAT, state, 'attack');
  }
  let safety = 0;
  while (state.outcome === 'ongoing' && safety < 50) {
    state = resolveTurn(INITIAL_COMBAT, state, 'focus-strike');
    safety += 1;
  }
  return state;
}

function resolveAction(finalState: CombatState): SandboxAction {
  return { type: 'combat.resolve', resolution: buildCombatResolution(finalState, getEncounter(INITIAL_COMBAT, 'clearing-predator')) };
}

describe('Fatia 12.10 — transação terminal atômica de combate', () => {
  it('vitória cobra 1 período uma vez, persiste saúde, marca resolvido e recompensa', () => {
    const before = exploring(80);
    const finalState = terminal('victory', 80);
    const result = executeSandboxAction(before, resolveAction(finalState), { now });

    expect(result.timeCost.periods).toBe(1);
    expect(result.needsWear.periodsApplied).toBe(1);
    expect(result.current.attributes.saude).toBe(finalState.player.health);
    expect(result.current.attributes.cautela).toBe(before.attributes.cautela + 2);
    expect(result.current.flags[combatEncounterResolvedFlag('clearing-predator')]).toBe(true);
    expect(result.current.world).not.toEqual(before.world);
  });

  it('derrota retorna com saúde 1, cobra 1 período e não resolve o encontro', () => {
    const before = exploring(4);
    const defeat = terminal('defeat', 4);
    const result = executeSandboxAction(before, resolveAction(defeat), { now });

    expect(result.current.attributes.saude).toBe(1);
    expect(result.timeCost.periods).toBe(1);
    expect(result.current.flags[combatEncounterResolvedFlag('clearing-predator')]).toBeUndefined();
  });

  it('fuga persiste a saúde restante e cobra 1 período sem resolver', () => {
    const before = exploring(80);
    const finalState = terminal('fled', 80);
    const result = executeSandboxAction(before, resolveAction(finalState), { now });

    expect(result.current.attributes.saude).toBe(finalState.player.health);
    expect(result.timeCost.periods).toBe(1);
    expect(result.current.flags[combatEncounterResolvedFlag('clearing-predator')]).toBeUndefined();
  });

  it('persiste o desfecho em uma volta de serialização', () => {
    const result = executeSandboxAction(exploring(80), resolveAction(terminal('victory', 80)), { now });
    const loaded = parseGameState(serializeGameState(result.current));
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.flags[combatEncounterResolvedFlag('clearing-predator')]).toBe(true);
    }
  });

  it('rejeita resolução forjada de combate em andamento', () => {
    const ongoing = createCombat(INITIAL_COMBAT, 'clearing-predator', { playerMaxHealth: 80 });
    expect(() => executeSandboxAction(exploring(80), resolveAction(ongoing), { now })).toThrow();
    const forged = { type: 'combat.resolve', resolution: { encounterId: 'clearing-predator', outcome: 'victory', turns: -1, entryHealth: 80, remainingHealth: 5, playerActionIds: [] } } as unknown as SandboxAction;
    expect(() => executeSandboxAction(exploring(80), forged, { now })).toThrow(SandboxActionError);
  });

  it('rejeita encontro oculto, vitória reaplicada e sequência adulterada', () => {
    const finalState = terminal('victory', 80);
    const action = resolveAction(finalState);

    expect(() => executeSandboxAction(exploring(80, false), action, { now })).toThrow(SandboxActionError);

    const first = executeSandboxAction(exploring(80), action, { now });
    expect(() => executeSandboxAction(first.current, action, { now })).toThrow(SandboxActionError);

    if (action.type !== 'combat.resolve') {
      throw new Error('Ação de combate esperada.');
    }
    const tampered: SandboxAction = {
      type: 'combat.resolve',
      resolution: {
        ...action.resolution,
        outcome: 'fled',
      },
    };
    expect(() => executeSandboxAction(exploring(80), tampered, { now })).toThrow(SandboxActionError);
  });

  it('rejeita saúde de entrada ou saúde terminal forjadas', () => {
    const action = resolveAction(terminal('victory', 80));
    if (action.type !== 'combat.resolve') {
      throw new Error('Ação de combate esperada.');
    }

    expect(() => executeSandboxAction(exploring(79), action, { now })).toThrow(SandboxActionError);
    expect(() => executeSandboxAction(exploring(80), {
      type: 'combat.resolve',
      resolution: { ...action.resolution, remainingHealth: action.resolution.entryHealth },
    }, { now })).toThrow(SandboxActionError);
  });
});
