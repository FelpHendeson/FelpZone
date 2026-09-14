import { INITIAL_SKILLS, hasPath, hasSkill, type IndexedSkills } from '../skills';
import { TrainingError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_TRAINING_CATALOG } from './initial-training';
import {
  TRAINING_TARGET_TYPES,
  type IndexedTraining,
  type TrainingInspection,
  type TrainingMethodDefinition,
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

  return {
    ok: true,
    value: {
      id: value.id,
      name: value.name,
      description: value.description,
      target: target.value,
      cost: { periods: value.cost.periods },
    },
  };
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
  });
}

function copyMethod(method: TrainingMethodDefinition): TrainingMethodDefinition {
  return { ...method, target: { ...method.target }, cost: { ...method.cost } };
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
  TRAINING_TARGET_TYPES,
  type IndexedTraining,
  type TrainingCatalog,
  type TrainingCost,
  type TrainingInspection,
  type TrainingMethodDefinition,
  type TrainingTarget,
  type TrainingTargetType,
} from './types';

export { INITIAL_TRAINING_CATALOG } from './initial-training';
