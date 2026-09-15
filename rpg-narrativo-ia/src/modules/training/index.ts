import {
  INITIAL_SKILLS,
  areSkillRequirementsMet,
  hasPath,
  hasSkill,
  increaseSkillProficiency,
  isSkillKnown,
  learnSkill,
  listSkillsByPath,
  type IndexedSkills,
  type SkillsProgressState,
} from '../skills';
import { areMasteryRequirementsMet, parseMasteryRequirements, type MasteryRequirement } from '../mastery';
import { TrainingError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_TRAINING_CATALOG } from './initial-training';
import {
  TRAINING_EFFECT_TYPES,
  TRAINING_TARGET_TYPES,
  type IndexedTraining,
  type TrainingEffect,
  type TrainingInspection,
  type TrainingMethodDefinition,
  type TrainingPlan,
  type TrainingTarget,
} from './types';

export { TrainingError } from './errors';

export const INITIAL_TRAINING = indexTrainingCatalog(INITIAL_TRAINING_CATALOG, INITIAL_SKILLS);

export function inspectTrainingCatalog(
  value: unknown,
  skills: IndexedSkills,
): TrainingInspection<IndexedTraining> {
  if (!isRecord(value) || !Array.isArray(value.methods)) {
    return fail('O catálogo de treinamentos é inválido.');
  }

  const methods: TrainingMethodDefinition[] = [];
  const methodIds = new Set<string>();
  for (const entry of value.methods) {
    const inspected = inspectMethod(entry, methodIds, skills);
    if (!inspected.ok) {
      return inspected;
    }
    methodIds.add(inspected.value.id);
    methods.push(inspected.value);
  }

  return { ok: true, value: freezeCatalog(methods) };
}

export function indexTrainingCatalog(value: unknown, skills: IndexedSkills): IndexedTraining {
  const inspected = inspectTrainingCatalog(value, skills);
  if (!inspected.ok) {
    throw new TrainingError(inspected.reason);
  }
  return inspected.value;
}

export function getTrainingMethod(catalog: IndexedTraining, methodId: string): TrainingMethodDefinition {
  const method = requireIndexed(catalog).byId.get(methodId);
  if (!method) {
    throw new TrainingError('O método de treinamento não existe.');
  }
  return copyMethod(method);
}

export function hasTrainingMethod(catalog: IndexedTraining, methodId: unknown): methodId is string {
  return nonEmpty(methodId) && requireIndexed(catalog).byId.has(methodId);
}

export function planTraining(
  catalog: IndexedTraining,
  skills: IndexedSkills,
  progress: SkillsProgressState,
  methodId: string,
): TrainingPlan {
  const method = getTrainingMethod(catalog, methodId);
  if (method.requirements.length > 0 && !areMasteryRequirementsMet(method.requirements, progress)) {
    throw new TrainingError('O método de treino exige requisitos de domínio ainda não cumpridos.');
  }
  requireAccessibleTarget(skills, progress, method.target);
  const applicableEffects: TrainingEffect[] = [];
  for (const effect of method.effects) {
    if (effect.type === 'skill.proficiency.increase' && !isSkillKnown(progress, effect.skillId)) {
      throw new TrainingError('O treino tenta desenvolver uma habilidade ainda não conhecida.');
    }
    if (effect.type === 'skill.learn') {
      if (isSkillKnown(progress, effect.skillId)) {
        continue;
      }
      if (!areSkillRequirementsMet(skills, progress, effect.skillId)) {
        throw new TrainingError('O treino tenta revelar uma habilidade cujos requisitos ainda não foram cumpridos.');
      }
    }
    applicableEffects.push(copyEffect(effect));
  }
  if (applicableEffects.length === 0) {
    throw new TrainingError('Este método de treinamento já foi concluído.');
  }
  return {
    methodId: method.id,
    timeCost: { periods: method.cost.periods },
    effects: applicableEffects,
  };
}

export function applyTrainingPlan(
  skills: IndexedSkills,
  progress: SkillsProgressState,
  plan: TrainingPlan,
): SkillsProgressState {
  let next = progress;
  for (const effect of plan.effects) {
    if (effect.type === 'skill.proficiency.increase') {
      next = increaseSkillProficiency(skills, next, effect.skillId, effect.amount);
    } else {
      next = learnSkill(skills, next, effect.skillId);
    }
  }
  return next;
}

function requireAccessibleTarget(
  skills: IndexedSkills,
  progress: SkillsProgressState,
  target: TrainingTarget,
): void {
  if (target.type === 'skill') {
    if (!isSkillKnown(progress, target.id)) {
      throw new TrainingError('A habilidade do treino ainda não é conhecida.');
    }
    return;
  }
  if (!hasPath(skills, target.id)) {
    throw new TrainingError('O caminho do treino não existe.');
  }
  const known = listSkillsByPath(skills, target.id).some((skill) => isSkillKnown(progress, skill.id));
  if (!known) {
    throw new TrainingError('O caminho do treino ainda não é conhecido.');
  }
}

function copyEffect(effect: TrainingEffect): TrainingEffect {
  return effect.type === 'skill.proficiency.increase'
    ? { type: effect.type, skillId: effect.skillId, amount: effect.amount }
    : { type: effect.type, skillId: effect.skillId };
}

export function copyTrainingPlan(plan: TrainingPlan): TrainingPlan {
  return {
    methodId: plan.methodId,
    timeCost: { periods: plan.timeCost.periods },
    effects: plan.effects.map(copyEffect),
  };
}

function inspectMethod(
  value: unknown,
  existing: ReadonlySet<string>,
  skills: IndexedSkills,
): TrainingInspection<TrainingMethodDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.name) || !nonEmpty(value.description)) {
    return fail('A definição de método de treinamento é inválida.');
  }
  if (existing.has(value.id)) {
    return fail('Os IDs de método de treinamento precisam ser únicos.');
  }

  const target = inspectTarget(value.target, skills);
  if (!target.ok) {
    return target;
  }

  if (!isRecord(value.cost) || !positiveSafeInteger(value.cost.periods)) {
    return fail('O custo em períodos do método de treinamento é inválido.');
  }

  if (!Array.isArray(value.effects) || value.effects.length === 0) {
    return fail('O método de treinamento precisa declarar ao menos um efeito.');
  }

  const effects: TrainingEffect[] = [];
  for (const entry of value.effects) {
    const inspected = inspectEffect(entry, skills);
    if (!inspected.ok) {
      return inspected;
    }
    effects.push(inspected.value);
  }

  const requirements = parseMasteryRequirements(value.requirements);
  if (requirements === null) {
    return fail('Os requisitos de domínio do método de treinamento são inválidos.');
  }

  return {
    ok: true,
    value: {
      id: value.id,
      name: value.name,
      description: value.description,
      target: target.value,
      cost: { periods: value.cost.periods },
      effects,
      requirements,
    },
  };
}

function inspectEffect(value: unknown, skills: IndexedSkills): TrainingInspection<TrainingEffect> {
  if (!isRecord(value) || !includes(TRAINING_EFFECT_TYPES, value.type)) {
    return fail('O efeito do método de treinamento é inválido.');
  }
  if (!hasSkill(skills, value.skillId)) {
    return fail('O efeito de treinamento referencia uma habilidade inexistente.');
  }
  if (value.type === 'skill.proficiency.increase') {
    if (!positiveSafeInteger(value.amount)) {
      return fail('O incremento de proficiência do treino é inválido.');
    }
    return { ok: true, value: { type: value.type, skillId: value.skillId, amount: value.amount } };
  }
  return { ok: true, value: { type: value.type, skillId: value.skillId } };
}

function inspectTarget(value: unknown, skills: IndexedSkills): TrainingInspection<TrainingTarget> {
  if (!isRecord(value) || !includes(TRAINING_TARGET_TYPES, value.type) || !nonEmpty(value.id)) {
    return fail('O alvo do método de treinamento é inválido.');
  }
  if (value.type === 'path' && !hasPath(skills, value.id)) {
    return fail('O método de treinamento referencia um caminho inexistente.');
  }
  if (value.type === 'skill' && !hasSkill(skills, value.id)) {
    return fail('O método de treinamento referencia uma habilidade inexistente.');
  }
  return { ok: true, value: { type: value.type, id: value.id } };
}

function freezeCatalog(methods: TrainingMethodDefinition[]): IndexedTraining {
  const frozenMethods = Object.freeze(methods.map(freezeMethod));
  return Object.freeze({
    methods: frozenMethods,
    byId: new ImmutableIndex(frozenMethods.map((method) => [method.id, method] as const)),
  });
}

function freezeMethod(method: TrainingMethodDefinition): TrainingMethodDefinition {
  return Object.freeze({
    ...method,
    target: Object.freeze({ ...method.target }),
    cost: Object.freeze({ ...method.cost }),
    effects: Object.freeze(method.effects.map((effect) => Object.freeze(copyEffect(effect)))) as unknown as TrainingEffect[],
    requirements: Object.freeze(method.requirements.map((requirement) => Object.freeze({ ...requirement }))) as unknown as MasteryRequirement[],
  });
}

function copyMethod(method: TrainingMethodDefinition): TrainingMethodDefinition {
  return {
    ...method,
    target: { ...method.target },
    cost: { ...method.cost },
    effects: method.effects.map(copyEffect),
    requirements: method.requirements.map((requirement) => ({ ...requirement })),
  };
}

function requireIndexed(catalog: IndexedTraining): IndexedTraining {
  if (!isRecord(catalog) || !Array.isArray(catalog.methods) || !isReadonlyMap(catalog.byId)) {
    throw new TrainingError('O catálogo indexado de treinamentos é inválido.');
  }
  return catalog;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReadonlyMap(value: unknown): value is ReadonlyMap<unknown, unknown> {
  return isRecord(value) && typeof value.get === 'function' && typeof value.keys === 'function' && typeof value.size === 'number';
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function includes<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function fail<T>(reason: string): TrainingInspection<T> {
  return { ok: false, reason };
}

export {
  TRAINING_EFFECT_TYPES,
  TRAINING_TARGET_TYPES,
  type IndexedTraining,
  type TrainingCatalog,
  type TrainingCost,
  type TrainingEffect,
  type TrainingInspection,
  type TrainingMethodDefinition,
  type TrainingPlan,
  type TrainingTarget,
  type TrainingTargetType,
} from './types';

export { INITIAL_TRAINING_CATALOG } from './initial-training';
