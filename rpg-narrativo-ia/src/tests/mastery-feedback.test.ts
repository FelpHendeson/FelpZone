import { describe, expect, it } from 'vitest';
import { type GameState } from '../core/state';
import { INITIAL_MASTERY, applyMastery } from '../modules/mastery';
import { INITIAL_SKILLS, type SkillsProgressState } from '../modules/skills';
import { buildSystemStatus, describeMasteryProgress } from '../modules/system-interface';
import { freshState } from './helpers';

function exploring(system?: SkillsProgressState): GameState {
  const base = freshState();
  return { ...base, narrativeSession: null, ...(system ? { system } : {}) };
}

describe('Fatia 13.5 — feedback e Status de progressão', () => {
  it('mostra o próximo marco conhecido com requisito e progresso', () => {
    const status = buildSystemStatus(exploring());
    expect(status.nextMilestone).toEqual({
      level: 2,
      requirements: [{ text: 'Sentidos Aguçados em proficiência 3', met: false }],
    });
  });

  it('marca o requisito como cumprido e some com o marco após alcançá-lo', () => {
    const atThree = exploring({ level: 1, entries: [{ skillId: 'sharpened-senses', proficiency: 3 }] });
    expect(buildSystemStatus(atThree).nextMilestone?.requirements[0].met).toBe(true);

    const atLevelTwo = exploring({ level: 2, entries: [{ skillId: 'sharpened-senses', proficiency: 3 }] });
    expect(buildSystemStatus(atLevelTwo).nextMilestone).toBeNull();
  });

  it('a Rotina revelada mostra seu requisito de nível', () => {
    const atLevelTwo = exploring({ level: 2, entries: [{ skillId: 'sharpened-senses', proficiency: 3 }] });
    const routine = buildSystemStatus(atLevelTwo).trainings.find((training) => training.methodId === 'body-reinforcement-routine');
    expect(routine?.requirementsSummary).toEqual(['Nível 2']);
  });

  it('descreve prática, nível alcançado e método revelado a partir do resultado', () => {
    const almost: SkillsProgressState = { level: 1, entries: [{ skillId: 'sharpened-senses', proficiency: 2 }] };
    const result = applyMastery(INITIAL_MASTERY, INITIAL_SKILLS, almost, {
      type: 'combat.victory',
      encounterId: 'clearing-predator',
      usedSkillIds: ['sharpened-senses'],
    });
    const text = describeMasteryProgress(result);
    expect(text).toContain('Você praticou Sentidos Aguçados (+1)');
    expect(text).toContain('Nível 2 alcançado');
    expect(text).toContain('Rotina de Reforço do Corpo');
  });
});
