import { describe, expect, it } from 'vitest';
import { type GameState } from '../core/state';
import {
  INITIAL_SKILLS,
  areSkillRequirementsMet,
  deriveSkillTree,
  increaseSkillProficiency,
  learnSkill,
  type SkillDefinition,
} from '../modules/skills';
import { INITIAL_TRAINING, applyTrainingPlan, planTraining } from '../modules/training';
import { buildSystemStatus } from '../modules/system-interface';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { freshState, now } from './helpers';

function exploring(): GameState {
  return { ...freshState(), narrativeSession: null };
}

describe('Fatia 11.7 — consolidação do Sistema 11', () => {
  it('mantém a atomicidade: um treino inválido não altera o estado de entrada', () => {
    const before = exploring();
    const snapshot = structuredClone(before);

    expect(() =>
      executeSandboxAction(before, { type: 'training.train', methodId: 'inexistente' }, { now }),
    ).toThrow();
    expect(before).toEqual(snapshot);
  });

  it('mantém catálogos versionados imutáveis', () => {
    expect(() => (INITIAL_SKILLS.skills as SkillDefinition[]).push(INITIAL_SKILLS.skills[0])).toThrow();
    expect(() => ((INITIAL_SKILLS.skills[0] as { name: string }).name = 'adulterado')).toThrow();
    expect(() => (INITIAL_TRAINING.methods as { length: number }).length).not.toThrow();
  });

  it('não vaza conteúdo oculto pela árvore nem pelo Status', () => {
    const tree = JSON.stringify(deriveSkillTree(INITIAL_SKILLS, exploring().system));
    const status = JSON.stringify(buildSystemStatus(exploring()));
    expect(tree).not.toContain('Fagulha Condutora');
    expect(status).not.toContain('Fagulha Condutora');
  });

  it('expõe os contratos públicos necessários a um futuro banco de ações', () => {
    // Progressão e habilidades: reutilizáveis por combate futuro sem acessar internos.
    expect(typeof deriveSkillTree).toBe('function');
    expect(typeof areSkillRequirementsMet).toBe('function');
    expect(typeof increaseSkillProficiency).toBe('function');
    expect(typeof learnSkill).toBe('function');
    // Planejamento declarativo com custo e efeitos: molde para o banco de ações.
    expect(typeof planTraining).toBe('function');
    expect(typeof applyTrainingPlan).toBe('function');

    const plan = planTraining(INITIAL_TRAINING, INITIAL_SKILLS, exploring().system, 'focused-perception-drill');
    expect(plan).toMatchObject({ timeCost: { periods: expect.any(Number) }, effects: expect.any(Array) });
  });
});
