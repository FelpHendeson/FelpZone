import { describe, expect, it } from 'vitest';
import { type GameState } from '../core/state';
import {
  INITIAL_COMBAT,
  buildCombatResolution,
  createCombat,
  getEncounter,
  resolveTurn,
  type CombatState,
} from '../modules/combat';
import { getSkillProficiency } from '../modules/skills';
import { executeSandboxAction, type SandboxAction } from '../modules/sandbox-actions';
import { freshState, now } from './helpers';

function revealed(saude = 80): GameState {
  const base = freshState();
  let state: GameState = { ...base, narrativeSession: null, attributes: { ...base.attributes, saude } };
  for (let i = 0; i < 3; i += 1) {
    state = executeSandboxAction(state, { type: 'exploration.explore' }, { now }).current;
  }
  return state;
}

function terminal(action: 'focus-strike' | 'attack' | 'flee', state: GameState): CombatState {
  let combat = createCombat(INITIAL_COMBAT, 'clearing-predator', {
    knownSkillIds: state.system.entries.map((entry) => entry.skillId),
    playerMaxHealth: state.attributes.saude,
  });
  if (action === 'flee') {
    return resolveTurn(INITIAL_COMBAT, combat, 'flee');
  }
  let safety = 0;
  while (combat.outcome === 'ongoing' && safety < 60) {
    combat = resolveTurn(INITIAL_COMBAT, combat, action);
    safety += 1;
  }
  return combat;
}

function resolveAction(finalState: CombatState): SandboxAction {
  return { type: 'combat.resolve', resolution: buildCombatResolution(finalState, getEncounter(INITIAL_COMBAT, 'clearing-predator')) };
}

describe('Fatia 13.3 — prática por vitória na transação de combate', () => {
  it('vitória usando uma habilidade concede +1 de proficiência na mesma transação', () => {
    const state = revealed();
    const result = executeSandboxAction(state, resolveAction(terminal('focus-strike', state)), { now });

    expect(result.mastery).toBeDefined();
    expect(result.mastery?.proficiencyGains).toEqual([{ skillId: 'sharpened-senses', amount: 1, source: 'combat' }]);
    expect(getSkillProficiency(result.current.system, 'sharpened-senses')).toBe(1);
  });

  it('repetir a mesma habilidade em vários turnos concede no máximo um incremento', () => {
    const state = revealed();
    const finalState = terminal('focus-strike', state);
    expect(finalState.turn).toBeGreaterThanOrEqual(2);
    const result = executeSandboxAction(state, resolveAction(finalState), { now });
    expect(getSkillProficiency(result.current.system, 'sharpened-senses')).toBe(1);
  });

  it('vitória só com ações básicas (sem habilidade) não concede proficiência', () => {
    const state = revealed();
    const result = executeSandboxAction(state, resolveAction(terminal('attack', state)), { now });
    expect(result.mastery?.proficiencyGains).toEqual([]);
    expect(getSkillProficiency(result.current.system, 'sharpened-senses')).toBe(0);
  });

  it('fuga não concede prática nem maestria', () => {
    const state = revealed();
    const result = executeSandboxAction(state, resolveAction(terminal('flee', state)), { now });
    expect(result.mastery).toBeUndefined();
    expect(getSkillProficiency(result.current.system, 'sharpened-senses')).toBe(0);
  });
});
