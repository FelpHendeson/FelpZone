import { describe, expect, it } from 'vitest';
import {
  INITIAL_MASTERY,
  applyMastery,
  areMasteryRequirementsMet,
} from '../modules/mastery';
import {
  INITIAL_SKILLS,
  createInitialSkillsProgress,
  getSkillProficiency,
  type SkillsProgressState,
} from '../modules/skills';

function baseline(): SkillsProgressState {
  return createInitialSkillsProgress(INITIAL_SKILLS); // conhece sharpened-senses, prof 0, nível 1
}

describe('Fatia 13.2 — motor puro de prática e marcos', () => {
  it('concede +1 por habilidade usada e conhecida numa vitória, sem duplicar', () => {
    const result = applyMastery(INITIAL_MASTERY, INITIAL_SKILLS, baseline(), {
      type: 'combat.victory',
      encounterId: 'clearing-predator',
      usedSkillIds: ['sharpened-senses', 'sharpened-senses'],
    });

    expect(result.proficiencyGains).toEqual([{ skillId: 'sharpened-senses', amount: 1, source: 'combat' }]);
    expect(getSkillProficiency(result.current, 'sharpened-senses')).toBe(1);
  });

  it('ignora habilidades não conhecidas e vitórias sem regra de prática', () => {
    const unknownSkill = applyMastery(INITIAL_MASTERY, INITIAL_SKILLS, baseline(), {
      type: 'combat.victory',
      encounterId: 'clearing-predator',
      usedSkillIds: ['guiding-spark'],
    });
    expect(unknownSkill.proficiencyGains).toEqual([]);

    const noRule = applyMastery(INITIAL_MASTERY, INITIAL_SKILLS, baseline(), {
      type: 'combat.victory',
      encounterId: 'sem-regra',
      usedSkillIds: ['sharpened-senses'],
    });
    expect(noRule.proficiencyGains).toEqual([]);
  });

  it('treinamento concluído não concede proficiência extra (só avalia marcos)', () => {
    const result = applyMastery(INITIAL_MASTERY, INITIAL_SKILLS, baseline(), {
      type: 'training.completed',
      methodId: 'focused-perception-drill',
    });
    expect(result.proficiencyGains).toEqual([]);
    expect(result.current.level).toBe(1);
  });

  it('alcança o nível 2 e revela a Rotina ao atingir proficiência 3', () => {
    const trained: SkillsProgressState = { level: 1, entries: [{ skillId: 'sharpened-senses', proficiency: 3 }] };
    const result = applyMastery(INITIAL_MASTERY, INITIAL_SKILLS, trained, {
      type: 'training.completed',
      methodId: 'focused-perception-drill',
    });

    expect(result.current.level).toBe(2);
    expect(result.reachedMilestoneIds).toEqual(['attentive-awakening']);
    expect(result.revealedTrainingIds).toEqual(['body-reinforcement-routine']);
  });

  it('é idempotente: reavaliar o mesmo estado não sobe o nível de novo', () => {
    const atLevel2: SkillsProgressState = { level: 2, entries: [{ skillId: 'sharpened-senses', proficiency: 3 }] };
    const result = applyMastery(INITIAL_MASTERY, INITIAL_SKILLS, atLevel2, {
      type: 'training.completed',
      methodId: 'focused-perception-drill',
    });
    expect(result.current.level).toBe(2);
    expect(result.reachedMilestoneIds).toEqual([]);
    expect(result.revealedTrainingIds).toEqual([]);
  });

  it('não muta o estado de entrada', () => {
    const before = baseline();
    applyMastery(INITIAL_MASTERY, INITIAL_SKILLS, before, {
      type: 'combat.victory',
      encounterId: 'clearing-predator',
      usedSkillIds: ['sharpened-senses'],
    });
    expect(getSkillProficiency(before, 'sharpened-senses')).toBe(0);
  });

  it('avalia requisitos de marco corretamente', () => {
    const progress: SkillsProgressState = { level: 1, entries: [{ skillId: 'sharpened-senses', proficiency: 3 }] };
    expect(areMasteryRequirementsMet([{ type: 'skill.proficiency', skillId: 'sharpened-senses', minimum: 3 }], progress)).toBe(true);
    expect(areMasteryRequirementsMet([{ type: 'skill.proficiency', skillId: 'sharpened-senses', minimum: 4 }], progress)).toBe(false);
    expect(areMasteryRequirementsMet([{ type: 'level.minimum', level: 2 }], progress)).toBe(false);
    expect(areMasteryRequirementsMet([{ type: 'skill.known', skillId: 'steady-body' }], progress)).toBe(false);
  });
});
