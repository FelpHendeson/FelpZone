import { describe, expect, it } from 'vitest';
import { type GameState } from '../core/state';
import { getSkillProficiency, isSkillKnown } from '../modules/skills';
import { executeSandboxAction, SandboxActionError } from '../modules/sandbox-actions';
import { freshState, now } from './helpers';

function exploring(): GameState {
  return { ...freshState(), narrativeSession: null };
}

describe('Fatia 13.4 — nível por marco e requisitos de treino', () => {
  it('bloqueia a Rotina de Reforço antes do nível 2', () => {
    expect(() =>
      executeSandboxAction(exploring(), { type: 'training.train', methodId: 'body-reinforcement-routine' }, { now }),
    ).toThrow(SandboxActionError);
  });

  it('treinar Sentidos Aguçados até proficiência 3 alcança o nível 2 e revela a Rotina', () => {
    let state = exploring();
    let lastMasteryLevelUp = false;
    let revealed: readonly string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const result = executeSandboxAction(state, { type: 'training.train', methodId: 'focused-perception-drill' }, { now });
      state = result.current;
      if (result.mastery && result.mastery.reachedMilestoneIds.length > 0) {
        lastMasteryLevelUp = true;
        revealed = result.mastery.revealedTrainingIds;
      }
    }

    expect(getSkillProficiency(state.system, 'sharpened-senses')).toBe(3);
    expect(state.system.level).toBe(2);
    expect(lastMasteryLevelUp).toBe(true);
    expect(revealed).toContain('body-reinforcement-routine');
  });

  it('completa o ciclo Sentidos → nível 2 → Rotina → Corpo Firme sem alterar o schema', () => {
    let state = exploring();
    for (let i = 0; i < 3; i += 1) {
      state = executeSandboxAction(state, { type: 'training.train', methodId: 'focused-perception-drill' }, { now }).current;
    }
    expect(state.system.level).toBe(2);
    expect(state.schemaVersion).toBe(7);

    const afterRoutine = executeSandboxAction(state, { type: 'training.train', methodId: 'body-reinforcement-routine' }, { now }).current;
    expect(isSkillKnown(afterRoutine.system, 'steady-body')).toBe(true);
    expect(afterRoutine.schemaVersion).toBe(7);
  });
});
