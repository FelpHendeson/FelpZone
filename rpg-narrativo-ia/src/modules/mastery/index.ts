import { MasteryError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_MASTERY_CATALOG } from './initial-mastery';
import {
  type IndexedMastery,
  type MasteryInspection,
  type MasteryMilestoneDefinition,
  type MasteryRequirement,
  type MasteryReveal,
  type PracticeRuleDefinition,
} from './types';

export { MasteryError } from './errors';
export { applyMastery, areMasteryRequirementsMet, isRequirementMet } from './engine';

export const INITIAL_MASTERY = indexMasteryCatalog(INITIAL_MASTERY_CATALOG);

export function inspectMasteryCatalog(value: unknown): MasteryInspection<IndexedMastery> {
  if (!isRecord(value) || !Array.isArray(value.practiceRules) || !Array.isArray(value.milestones)) {
    return fail('O catálogo de maestria é inválido.');
  }

  const practiceRules: PracticeRuleDefinition[] = [];
  const ruleIds = new Set<string>();
  const ruleEncounters = new Set<string>();
  for (const entry of value.practiceRules) {
    const inspected = inspectPracticeRule(entry, ruleIds, ruleEncounters);
    if (!inspected.ok) {
      return inspected;
    }
    ruleIds.add(inspected.value.id);
    ruleEncounters.add(inspected.value.source.encounterId);
    practiceRules.push(inspected.value);
  }

  const milestones: MasteryMilestoneDefinition[] = [];
  const milestoneIds = new Set<string>();
  const milestoneLevels = new Set<number>();
  for (const entry of value.milestones) {
    const inspected = inspectMilestone(entry, milestoneIds, milestoneLevels);
    if (!inspected.ok) {
      return inspected;
    }
    milestoneIds.add(inspected.value.id);
    milestoneLevels.add(inspected.value.level);
    milestones.push(inspected.value);
  }

  return { ok: true, value: freezeCatalog(practiceRules, milestones) };
}

export function indexMasteryCatalog(value: unknown): IndexedMastery {
  const inspected = inspectMasteryCatalog(value);
  if (!inspected.ok) {
    throw new MasteryError(inspected.reason);
  }
  return inspected.value;
}

export interface MasteryReferenceSets {
  skillIds: ReadonlySet<string>;
  trainingMethodIds: ReadonlySet<string>;
  encounterIds: ReadonlySet<string>;
}

export function validateMasteryReferences(catalog: IndexedMastery, references: MasteryReferenceSets): void {
  for (const rule of catalog.practiceRules) {
    if (!references.encounterIds.has(rule.source.encounterId)) {
      throw new MasteryError(`A regra de prática ${rule.id} referencia um encontro inexistente.`);
    }
  }
  for (const milestone of catalog.milestones) {
    for (const requirement of milestone.requirements) {
      if (requirement.type !== 'level.minimum' && !references.skillIds.has(requirement.skillId)) {
        throw new MasteryError(`O marco ${milestone.id} referencia uma habilidade inexistente.`);
      }
    }
    for (const reveal of milestone.reveals) {
      if (!references.trainingMethodIds.has(reveal.methodId)) {
        throw new MasteryError(`O marco ${milestone.id} revela um método de treino inexistente.`);
      }
    }
  }
}

function inspectPracticeRule(
  value: unknown,
  existingIds: ReadonlySet<string>,
  existingEncounters: ReadonlySet<string>,
): MasteryInspection<PracticeRuleDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || existingIds.has(value.id)) {
    return fail('A regra de prática é inválida ou duplicada.');
  }
  if (!isRecord(value.source) || value.source.type !== 'combat.victory' || !nonEmpty(value.source.encounterId)) {
    return fail('A fonte da regra de prática é inválida.');
  }
  if (existingEncounters.has(value.source.encounterId)) {
    return fail('Cada encontro só pode ter uma regra de prática.');
  }
  if (
    !isRecord(value.reward) ||
    value.reward.type !== 'used-skill.proficiency.increase' ||
    !positiveSafeInteger(value.reward.amount) ||
    !positiveSafeInteger(value.reward.maximumPerSkill) ||
    value.reward.amount > value.reward.maximumPerSkill
  ) {
    return fail('A recompensa da regra de prática é inválida.');
  }
  return {
    ok: true,
    value: {
      id: value.id,
      source: { type: 'combat.victory', encounterId: value.source.encounterId },
      reward: {
        type: 'used-skill.proficiency.increase',
        amount: value.reward.amount,
        maximumPerSkill: value.reward.maximumPerSkill,
      },
    },
  };
}

function inspectMilestone(
  value: unknown,
  existingIds: ReadonlySet<string>,
  existingLevels: ReadonlySet<number>,
): MasteryInspection<MasteryMilestoneDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || existingIds.has(value.id)) {
    return fail('O marco é inválido ou duplicado.');
  }
  if (!positiveSafeInteger(value.level) || value.level < 2 || existingLevels.has(value.level)) {
    return fail('O nível do marco é inválido, repetido ou menor que 2.');
  }
  if (!Array.isArray(value.requirements) || value.requirements.length === 0) {
    return fail('O marco precisa declarar ao menos um requisito.');
  }
  const requirements: MasteryRequirement[] = [];
  for (const entry of value.requirements) {
    const inspected = inspectRequirement(entry);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  if (!Array.isArray(value.reveals)) {
    return fail('As revelações do marco são inválidas.');
  }
  const reveals: MasteryReveal[] = [];
  const revealedMethods = new Set<string>();
  for (const entry of value.reveals) {
    if (!isRecord(entry) || entry.type !== 'training.available' || !nonEmpty(entry.methodId) || revealedMethods.has(entry.methodId)) {
      return fail('Uma revelação do marco é inválida ou duplicada.');
    }
    revealedMethods.add(entry.methodId);
    reveals.push({ type: 'training.available', methodId: entry.methodId });
  }
  return { ok: true, value: { id: value.id, level: value.level, requirements, reveals } };
}

function inspectRequirement(value: unknown): MasteryInspection<MasteryRequirement> {
  if (!isRecord(value)) {
    return fail('O requisito do marco é inválido.');
  }
  if (value.type === 'skill.proficiency') {
    if (!nonEmpty(value.skillId) || !positiveSafeInteger(value.minimum)) {
      return fail('O requisito de proficiência é inválido.');
    }
    return { ok: true, value: { type: 'skill.proficiency', skillId: value.skillId, minimum: value.minimum } };
  }
  if (value.type === 'skill.known') {
    if (!nonEmpty(value.skillId)) {
      return fail('O requisito de habilidade conhecida é inválido.');
    }
    return { ok: true, value: { type: 'skill.known', skillId: value.skillId } };
  }
  if (value.type === 'level.minimum') {
    if (!positiveSafeInteger(value.level)) {
      return fail('O requisito de nível é inválido.');
    }
    return { ok: true, value: { type: 'level.minimum', level: value.level } };
  }
  return fail('O tipo de requisito do marco é desconhecido.');
}

function freezeCatalog(
  practiceRules: PracticeRuleDefinition[],
  milestones: MasteryMilestoneDefinition[],
): IndexedMastery {
  const frozenRules = Object.freeze(practiceRules.map(freezeRule));
  const frozenMilestones = Object.freeze(milestones.map(freezeMilestone));
  return Object.freeze({
    practiceRules: frozenRules,
    milestones: frozenMilestones,
    practiceRuleByEncounter: new ImmutableIndex(frozenRules.map((rule) => [rule.source.encounterId, rule] as const)),
    milestoneById: new ImmutableIndex(frozenMilestones.map((milestone) => [milestone.id, milestone] as const)),
  });
}

function freezeRule(rule: PracticeRuleDefinition): PracticeRuleDefinition {
  return Object.freeze({
    id: rule.id,
    source: Object.freeze({ ...rule.source }),
    reward: Object.freeze({ ...rule.reward }),
  });
}

function freezeMilestone(milestone: MasteryMilestoneDefinition): MasteryMilestoneDefinition {
  return Object.freeze({
    id: milestone.id,
    level: milestone.level,
    requirements: Object.freeze(milestone.requirements.map((requirement) => Object.freeze({ ...requirement }))) as unknown as MasteryRequirement[],
    reveals: Object.freeze(milestone.reveals.map((reveal) => Object.freeze({ ...reveal }))) as unknown as MasteryReveal[],
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function fail<T>(reason: string): MasteryInspection<T> {
  return { ok: false, reason };
}

export {
  type IndexedMastery,
  type MasteryCatalog,
  type MasteryEvidence,
  type MasteryInspection,
  type MasteryMilestoneDefinition,
  type MasteryRequirement,
  type MasteryResult,
  type MasteryReveal,
  type PracticeRuleDefinition,
  type ProficiencyGain,
} from './types';

export { INITIAL_MASTERY_CATALOG } from './initial-mastery';
