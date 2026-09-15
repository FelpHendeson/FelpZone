import { describe, expect, it } from 'vitest';
import {
  INITIAL_MASTERY,
  INITIAL_MASTERY_CATALOG,
  MasteryError,
  indexMasteryCatalog,
  inspectMasteryCatalog,
  validateMasteryReferences,
  type MasteryCatalog,
  type MasteryMilestoneDefinition,
  type PracticeRuleDefinition,
} from '../modules/mastery';
import { INITIAL_SKILLS } from '../modules/skills';
import { INITIAL_TRAINING } from '../modules/training';
import { INITIAL_COMBAT } from '../modules/combat';

function rule(overrides: Partial<PracticeRuleDefinition> = {}): PracticeRuleDefinition {
  return {
    id: 'r1',
    source: { type: 'combat.victory', encounterId: 'clearing-predator' },
    reward: { type: 'used-skill.proficiency.increase', amount: 1, maximumPerSkill: 1 },
    ...overrides,
  };
}

function milestone(overrides: Partial<MasteryMilestoneDefinition> = {}): MasteryMilestoneDefinition {
  return {
    id: 'm1',
    level: 2,
    requirements: [{ type: 'skill.proficiency', skillId: 'sharpened-senses', minimum: 3 }],
    reveals: [{ type: 'training.available', methodId: 'body-reinforcement-routine' }],
    ...overrides,
  };
}

function catalog(overrides: Partial<MasteryCatalog> = {}): MasteryCatalog {
  return { practiceRules: [rule()], milestones: [milestone()], ...overrides };
}

describe('Fatia 13.1 — catálogo de maestria', () => {
  it('indexa regras e marcos válidos', () => {
    const value = indexMasteryCatalog(catalog());
    expect(value.practiceRuleByEncounter.get('clearing-predator')?.id).toBe('r1');
    expect(value.milestoneById.get('m1')?.level).toBe(2);
  });

  it.each([
    null,
    {},
    { practiceRules: 'x', milestones: [] },
    catalog({ practiceRules: [rule({ id: '' })] }),
    catalog({ practiceRules: [rule(), rule()] }),
    catalog({ practiceRules: [rule({ reward: { type: 'used-skill.proficiency.increase', amount: 2, maximumPerSkill: 1 } })] }),
    catalog({ practiceRules: [rule({ reward: { type: 'used-skill.proficiency.increase', amount: 0, maximumPerSkill: 1 } })] }),
    catalog({ milestones: [milestone({ level: 1 })] }),
    catalog({ milestones: [milestone(), milestone({ id: 'm2', level: 2 })] }),
    catalog({ milestones: [milestone({ requirements: [] })] }),
    catalog({ milestones: [milestone({ requirements: [{ type: 'skill.proficiency', skillId: 's', minimum: 0 }] })] }),
    catalog({ milestones: [milestone({ reveals: [{ type: 'training.available', methodId: '' }] })] }),
  ])('rejeita catálogo inválido %#', (value) => {
    expect(inspectMasteryCatalog(value).ok).toBe(false);
  });

  it('valida referências de composição contra skills, treino e encontros', () => {
    const references = {
      skillIds: new Set(INITIAL_SKILLS.skills.map((skill) => skill.id)),
      trainingMethodIds: new Set(INITIAL_TRAINING.methods.map((method) => method.id)),
      encounterIds: new Set(INITIAL_COMBAT.encounters.map((encounter) => encounter.id)),
    };
    expect(() => validateMasteryReferences(INITIAL_MASTERY, references)).not.toThrow();
    expect(() =>
      validateMasteryReferences(INITIAL_MASTERY, { ...references, encounterIds: new Set<string>() }),
    ).toThrow(MasteryError);
    expect(() =>
      validateMasteryReferences(INITIAL_MASTERY, { ...references, skillIds: new Set<string>() }),
    ).toThrow(MasteryError);
    expect(() =>
      validateMasteryReferences(INITIAL_MASTERY, { ...references, trainingMethodIds: new Set<string>() }),
    ).toThrow(MasteryError);
  });

  it('congela o catálogo indexado', () => {
    expect(() => (INITIAL_MASTERY.milestones as MasteryMilestoneDefinition[]).push(milestone())).toThrow();
    expect(inspectMasteryCatalog(INITIAL_MASTERY_CATALOG).ok).toBe(true);
  });
});
