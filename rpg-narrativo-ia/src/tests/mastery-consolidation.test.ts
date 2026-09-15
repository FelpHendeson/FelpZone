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
import { INITIAL_MASTERY, applyMastery, areMasteryRequirementsMet, type MasteryMilestoneDefinition } from '../modules/mastery';
import { INITIAL_SKILLS, type SkillsProgressState } from '../modules/skills';
import { executeSandboxAction, SandboxActionError, type SandboxAction } from '../modules/sandbox-actions';
import { freshState, now } from './helpers';

function exploring(): GameState {
  return { ...freshState(), narrativeSession: null };
}

function revealed(): GameState {
  let state = exploring();
  for (let i = 0; i < 3; i += 1) {
    state = executeSandboxAction(state, { type: 'exploration.explore' }, { now }).current;
  }
  return state;
}

function victory(state: GameState): SandboxAction {
  let combat: CombatState = createCombat(INITIAL_COMBAT, 'clearing-predator', {
    knownSkillIds: state.system.entries.map((entry) => entry.skillId),
    playerMaxHealth: state.attributes.saude,
  });
  let safety = 0;
  while (combat.outcome === 'ongoing' && safety < 60) {
    combat = resolveTurn(INITIAL_COMBAT, combat, 'focus-strike');
    safety += 1;
  }
  return { type: 'combat.resolve', resolution: buildCombatResolution(combat, getEncounter(INITIAL_COMBAT, 'clearing-predator')) };
}

describe('Fatia 13.7 — consolidação do Sistema 13', () => {
  it('mantém o catálogo de maestria imutável', () => {
    expect(() => (INITIAL_MASTERY.milestones as MasteryMilestoneDefinition[]).push(INITIAL_MASTERY.milestones[0])).toThrow();
    expect(() => ((INITIAL_MASTERY.milestones[0] as { level: number }).level = 9)).toThrow();
  });

  it('mantém a atomicidade: um treino bloqueado não altera o estado', () => {
    const before = exploring();
    const snapshot = structuredClone(before);
    expect(() =>
      executeSandboxAction(before, { type: 'training.train', methodId: 'body-reinforcement-routine' }, { now }),
    ).toThrow(SandboxActionError);
    expect(before).toEqual(snapshot);
  });

  it('não concede a mesma recompensa de encontro duas vezes', () => {
    const state = revealed();
    const afterWin = executeSandboxAction(state, victory(state), { now }).current;
    // O encontro resolvido não fica mais disponível: uma nova resolução é recusada.
    expect(() => executeSandboxAction(afterWin, victory(afterWin), { now })).toThrow(SandboxActionError);
  });

  it('a avaliação de maestria é idempotente para o mesmo estado', () => {
    const atLevelTwo: SkillsProgressState = { level: 2, entries: [{ skillId: 'sharpened-senses', proficiency: 3 }] };
    const result = applyMastery(INITIAL_MASTERY, INITIAL_SKILLS, atLevelTwo, {
      type: 'training.completed',
      methodId: 'focused-perception-drill',
    });
    expect(result.current.level).toBe(2);
    expect(result.reachedMilestoneIds).toEqual([]);
    expect(areMasteryRequirementsMet([{ type: 'level.minimum', level: 2 }], atLevelTwo)).toBe(true);
  });
});
