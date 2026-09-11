import { ObjectiveError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_OBJECTIVE_CATALOG } from './initial-objectives';
import type { GameState } from '../../core/state/types';
import {
  OBJECTIVE_KINDS,
  OBJECTIVE_STEP_MODES,
  type IndexedObjectives,
  type KnownObjective,
  type ObjectiveActivation,
  type ObjectiveCriterion,
  type ObjectiveDefinition,
  type ObjectiveInspection,
  type ObjectiveProgress,
  type ObjectivesState,
  type ObjectivesSynchronizationResult,
  type ObjectiveStatus,
  type ObjectiveStepCompletionResult,
  type ObjectiveStepDefinition,
} from './types';

export { ObjectiveError } from './errors';

export const INITIAL_OBJECTIVES = indexObjectiveCatalog(INITIAL_OBJECTIVE_CATALOG);

export function inspectObjectiveCatalog(value: unknown): ObjectiveInspection<IndexedObjectives> {
  if (!isRecord(value) || !Array.isArray(value.objectives)) {
    return fail('O catálogo de objetivos é inválido.');
  }

  const objectives: ObjectiveDefinition[] = [];
  const byId = new Map<string, ObjectiveDefinition>();

  for (const entry of value.objectives) {
    const inspected = inspectObjective(entry, byId);
    if (!inspected.ok) {
      return inspected;
    }

    const frozen = freezeObjective(inspected.value);
    objectives.push(frozen);
    byId.set(frozen.id, frozen);
  }

  return {
    ok: true,
    value: freezeCatalog(objectives),
  };
}

export function indexObjectiveCatalog(value: unknown): IndexedObjectives {
  const inspected = inspectObjectiveCatalog(value);
  if (!inspected.ok) {
    throw new ObjectiveError(inspected.reason);
  }

  return inspected.value;
}

export function createInitialObjectivesState(catalog: IndexedObjectives): ObjectivesState {
  const indexed = requireIndexedCatalog(catalog);
  return {
    entries: indexed.objectives
      .filter((objective) => objective.activation.type === 'automatic')
      .map((objective) => createProgress(objective.id)),
  };
}

export function inspectObjectivesState(
  value: unknown,
  catalog: IndexedObjectives,
): ObjectiveInspection<ObjectivesState> {
  const indexed = inspectIndexedCatalog(catalog);
  if (!indexed.ok) {
    return indexed;
  }

  if (!isRecord(value) || !Array.isArray(value.entries)) {
    return fail('O estado de objetivos é inválido.');
  }

  const entries: ObjectiveProgress[] = [];
  const seenObjectives = new Set<string>();
  let previousCatalogIndex = -1;

  for (const entry of value.entries) {
    const inspected = inspectProgress(entry, indexed.value);
    if (!inspected.ok) {
      return inspected;
    }

    const objectiveIndex = indexed.value.objectives.findIndex(
      (objective) => objective.id === inspected.value.objectiveId,
    );
    if (seenObjectives.has(inspected.value.objectiveId)) {
      return fail('O objetivo aparece mais de uma vez no estado.');
    }
    if (objectiveIndex <= previousCatalogIndex) {
      return fail('A ordem dos objetivos no estado é inválida.');
    }

    seenObjectives.add(inspected.value.objectiveId);
    previousCatalogIndex = objectiveIndex;
    entries.push(inspected.value);
  }

  for (const objective of indexed.value.objectives) {
    if (objective.activation.type === 'automatic' && !seenObjectives.has(objective.id)) {
      return fail('Um objetivo automático está ausente do estado.');
    }
  }

  return { ok: true, value: { entries } };
}

export function activateObjective(
  catalog: IndexedObjectives,
  state: ObjectivesState,
  objectiveId: string,
): ObjectivesState {
  const indexed = requireIndexedCatalog(catalog);
  const current = requireState(state, indexed);
  requireObjective(indexed, objectiveId);

  if (current.entries.some((entry) => entry.objectiveId === objectiveId)) {
    return copyState(current);
  }

  const activated = [...current.entries, createProgress(objectiveId)].sort(
    (left, right) => objectiveOrder(indexed, left.objectiveId) - objectiveOrder(indexed, right.objectiveId),
  );

  return { entries: activated.map(copyProgress) };
}

export function completeObjectiveStep(
  catalog: IndexedObjectives,
  state: ObjectivesState,
  objectiveId: string,
  stepId: string,
): ObjectiveStepCompletionResult {
  const indexed = requireIndexedCatalog(catalog);
  const current = requireState(state, indexed);
  const objective = requireObjective(indexed, objectiveId);
  const progress = current.entries.find((entry) => entry.objectiveId === objectiveId);

  if (!progress) {
    throw new ObjectiveError('O objetivo ainda não está ativo.');
  }

  const stepIndex = objective.steps.findIndex((step) => step.id === stepId);
  if (stepIndex < 0) {
    throw new ObjectiveError('A etapa do objetivo não existe.');
  }

  if (progress.completedStepIds.includes(stepId)) {
    return completionResult(current, current, objectiveId, stepId, false, false);
  }

  if (objective.stepMode === 'sequential' && stepIndex !== progress.completedStepIds.length) {
    throw new ObjectiveError('A etapa anterior do objetivo ainda não foi concluída.');
  }

  const completedStepIds = objective.steps
    .filter((step) => progress.completedStepIds.includes(step.id) || step.id === stepId)
    .map((step) => step.id);
  const completed = completedStepIds.length === objective.steps.length;
  const nextEntries = current.entries.map((entry) =>
    entry.objectiveId === objectiveId
      ? { objectiveId, completedStepIds, completed }
      : copyProgress(entry),
  );
  const next = { entries: nextEntries };

  return completionResult(current, next, objectiveId, stepId, true, completed && !progress.completed);
}

export function getObjective(catalog: IndexedObjectives, objectiveId: string): ObjectiveDefinition {
  return copyObjective(requireObjective(requireIndexedCatalog(catalog), objectiveId));
}

export function getObjectiveStatus(
  catalog: IndexedObjectives,
  state: ObjectivesState,
  objectiveId: string,
): ObjectiveStatus {
  const indexed = requireIndexedCatalog(catalog);
  const current = requireState(state, indexed);
  requireObjective(indexed, objectiveId);
  const progress = current.entries.find((entry) => entry.objectiveId === objectiveId);

  if (!progress) {
    return 'locked';
  }
  return progress.completed ? 'completed' : 'active';
}

export function listKnownObjectives(catalog: IndexedObjectives, state: ObjectivesState): KnownObjective[] {
  const indexed = requireIndexedCatalog(catalog);
  const current = requireState(state, indexed);

  return current.entries.map((progress) => {
    const objective = requireObjective(indexed, progress.objectiveId);
    return {
      objective: copyObjective(objective),
      progress: copyProgress(progress),
      status: progress.completed ? 'completed' : 'active',
      nextStepIds: getNextStepIds(objective, progress),
    };
  });
}

export function evaluateObjectiveCriterion(criterion: ObjectiveCriterion, state: GameState): boolean {
  switch (criterion.type) {
    case 'progression.ability.has':
      return state.progression.abilityIds.includes(criterion.abilityId);
    case 'navigation.location.visited':
      return state.sandbox.navigation.visitedLocationIds.includes(criterion.locationId);
    case 'exploration.discovery.revealed':
      return state.sandbox.exploration.locations.some((location) =>
        location.revealedDiscoveryIds.includes(criterion.discoveryId),
      );
    case 'inventory.item.quantity':
      return (state.inventory.find((item) => item.itemId === criterion.itemId)?.quantity ?? 0) >= criterion.quantity;
    case 'crafting.structure.active':
      return state.sandbox.crafting.structures.some(
        (structure) =>
          structure.structureId === criterion.structureId &&
          structure.active &&
          (criterion.locationId === undefined || structure.locationId === criterion.locationId),
      );
    case 'presence.discovered':
      return state.sandbox.presences.discoveredPresenceIds.includes(criterion.presenceId);
    case 'presence.resolved':
      return state.sandbox.presences.resolvedPresenceIds.includes(criterion.presenceId);
    case 'flag.is':
      return (state.flags[criterion.flag] ?? false) === criterion.value;
    case 'world.day.min':
      return state.world.day >= criterion.day;
  }
}

export function synchronizeObjectives(
  catalog: IndexedObjectives,
  objectivesState: ObjectivesState,
  gameState: GameState,
): ObjectivesSynchronizationResult {
  const indexed = requireIndexedCatalog(catalog);
  const previous = requireState(objectivesState, indexed);
  let current = copyState(previous);
  const activatedObjectiveIds: string[] = [];
  const completedSteps: { objectiveId: string; stepId: string }[] = [];
  const completedObjectiveIds: string[] = [];

  for (const objective of indexed.objectives) {
    const known = current.entries.some((entry) => entry.objectiveId === objective.id);
    if (
      !known &&
      objective.activation.type === 'criteria' &&
      objective.activation.criteria.every((criterion) => evaluateObjectiveCriterion(criterion, gameState))
    ) {
      current = activateObjective(indexed, current, objective.id);
      activatedObjectiveIds.push(objective.id);
    }
  }

  for (const objective of indexed.objectives) {
    let progress = current.entries.find((entry) => entry.objectiveId === objective.id);
    if (!progress || progress.completed) {
      continue;
    }

    const candidates = objective.stepMode === 'sequential'
      ? objective.steps.slice(progress.completedStepIds.length)
      : objective.steps.filter((step) => !progress?.completedStepIds.includes(step.id));

    for (const step of candidates) {
      const satisfied = step.criteria.every((criterion) => evaluateObjectiveCriterion(criterion, gameState));
      if (!satisfied) {
        if (objective.stepMode === 'sequential') {
          break;
        }
        continue;
      }

      const result = completeObjectiveStep(indexed, current, objective.id, step.id);
      current = result.current;
      progress = current.entries.find((entry) => entry.objectiveId === objective.id);
      if (result.stepNewlyCompleted) {
        completedSteps.push({ objectiveId: objective.id, stepId: step.id });
      }
      if (result.objectiveNewlyCompleted) {
        completedObjectiveIds.push(objective.id);
      }
    }
  }

  return {
    previous: copyState(previous),
    current: copyState(current),
    activatedObjectiveIds,
    completedSteps,
    completedObjectiveIds,
  };
}

function inspectObjective(
  value: unknown,
  existing: ReadonlyMap<string, ObjectiveDefinition>,
): ObjectiveInspection<ObjectiveDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.title) || !nonEmpty(value.description)) {
    return fail('A definição de objetivo é inválida.');
  }
  if (existing.has(value.id)) {
    return fail('Os IDs de objetivo precisam ser únicos.');
  }
  if (!includes(OBJECTIVE_KINDS, value.kind)) {
    return fail('O tipo do objetivo é inválido.');
  }
  if (!includes(OBJECTIVE_STEP_MODES, value.stepMode)) {
    return fail('O modo de etapas do objetivo é inválido.');
  }
  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    return fail('O objetivo precisa possuir ao menos uma etapa.');
  }

  const activation = inspectActivation(value.activation);
  if (!activation.ok) {
    return activation;
  }

  const steps: ObjectiveStepDefinition[] = [];
  const stepIds = new Set<string>();
  for (const entry of value.steps) {
    const step = inspectStep(entry, stepIds);
    if (!step.ok) {
      return step;
    }
    stepIds.add(step.value.id);
    steps.push(step.value);
  }

  if (value.completionText !== undefined && !nonEmpty(value.completionText)) {
    return fail('O texto de conclusão do objetivo é inválido.');
  }

  return {
    ok: true,
    value: {
      id: value.id,
      title: value.title,
      description: value.description,
      kind: value.kind,
      stepMode: value.stepMode,
      activation: activation.value,
      steps,
      ...(value.completionText === undefined ? {} : { completionText: value.completionText }),
    },
  };
}

function inspectActivation(value: unknown): ObjectiveInspection<ObjectiveActivation> {
  if (!isRecord(value)) {
    return fail('A ativação do objetivo é inválida.');
  }
  if (value.type === 'automatic') {
    return { ok: true, value: { type: 'automatic' } };
  }
  if (value.type !== 'criteria' || !Array.isArray(value.criteria) || value.criteria.length === 0) {
    return fail('A ativação do objetivo é inválida.');
  }

  const criteria = inspectCriteria(value.criteria);
  return criteria.ok ? { ok: true, value: { type: 'criteria', criteria: criteria.value } } : criteria;
}

function inspectStep(value: unknown, existing: ReadonlySet<string>): ObjectiveInspection<ObjectiveStepDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.title)) {
    return fail('A etapa do objetivo é inválida.');
  }
  if (existing.has(value.id)) {
    return fail('Os IDs de etapa precisam ser únicos dentro do objetivo.');
  }
  if (value.description !== undefined && !nonEmpty(value.description)) {
    return fail('A descrição da etapa é inválida.');
  }
  if (!Array.isArray(value.criteria) || value.criteria.length === 0) {
    return fail('A etapa precisa possuir ao menos um critério.');
  }

  const criteria = inspectCriteria(value.criteria);
  if (!criteria.ok) {
    return criteria;
  }

  return {
    ok: true,
    value: {
      id: value.id,
      title: value.title,
      ...(value.description === undefined ? {} : { description: value.description }),
      criteria: criteria.value,
    },
  };
}

function inspectCriteria(values: readonly unknown[]): ObjectiveInspection<ObjectiveCriterion[]> {
  const criteria: ObjectiveCriterion[] = [];
  for (const value of values) {
    const inspected = inspectCriterion(value);
    if (!inspected.ok) {
      return inspected;
    }
    criteria.push(inspected.value);
  }
  return { ok: true, value: criteria };
}

function inspectCriterion(value: unknown): ObjectiveInspection<ObjectiveCriterion> {
  if (!isRecord(value) || !nonEmpty(value.type)) {
    return fail('O critério do objetivo é inválido.');
  }

  switch (value.type) {
    case 'progression.ability.has':
      return stringCriterion(value, 'abilityId', value.type);
    case 'navigation.location.visited':
      return stringCriterion(value, 'locationId', value.type);
    case 'exploration.discovery.revealed':
      return stringCriterion(value, 'discoveryId', value.type);
    case 'presence.discovered':
    case 'presence.resolved':
      return stringCriterion(value, 'presenceId', value.type);
    case 'inventory.item.quantity':
      if (!nonEmpty(value.itemId) || !positiveSafeInteger(value.quantity)) {
        return fail('O critério de quantidade de item é inválido.');
      }
      return { ok: true, value: { type: value.type, itemId: value.itemId, quantity: value.quantity } };
    case 'crafting.structure.active':
      if (!nonEmpty(value.structureId) || (value.locationId !== undefined && !nonEmpty(value.locationId))) {
        return fail('O critério de estrutura é inválido.');
      }
      return {
        ok: true,
        value: {
          type: value.type,
          structureId: value.structureId,
          ...(value.locationId === undefined ? {} : { locationId: value.locationId }),
        },
      };
    case 'flag.is':
      if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
        return fail('O critério de flag é inválido.');
      }
      return { ok: true, value: { type: value.type, flag: value.flag, value: value.value } };
    case 'world.day.min':
      if (!positiveSafeInteger(value.day)) {
        return fail('O critério de dia é inválido.');
      }
      return { ok: true, value: { type: value.type, day: value.day } };
    default:
      return fail('O tipo de critério do objetivo é inválido.');
  }
}

function stringCriterion<T extends ObjectiveCriterion['type'], K extends string>(
  value: Record<string, unknown>,
  key: K,
  type: T,
): ObjectiveInspection<ObjectiveCriterion> {
  const field = value[key];
  if (!nonEmpty(field)) {
    return fail('O critério do objetivo é inválido.');
  }
  return { ok: true, value: { type, [key]: field } as ObjectiveCriterion };
}

function inspectProgress(value: unknown, catalog: IndexedObjectives): ObjectiveInspection<ObjectiveProgress> {
  if (!isRecord(value) || !nonEmpty(value.objectiveId) || !Array.isArray(value.completedStepIds)) {
    return fail('O progresso do objetivo é inválido.');
  }
  if (typeof value.completed !== 'boolean') {
    return fail('O estado de conclusão do objetivo é inválido.');
  }

  const objective = catalog.byId.get(value.objectiveId);
  if (!objective) {
    return fail('O progresso referencia um objetivo inexistente.');
  }

  const completedStepIds: string[] = [];
  const seen = new Set<string>();
  let previousStepIndex = -1;
  for (const stepId of value.completedStepIds) {
    if (!nonEmpty(stepId) || seen.has(stepId)) {
      return fail('As etapas concluídas do objetivo são inválidas.');
    }
    const stepIndex = objective.steps.findIndex((step) => step.id === stepId);
    if (stepIndex < 0) {
      return fail('O progresso referencia uma etapa inexistente.');
    }
    if (stepIndex <= previousStepIndex) {
      return fail('A ordem das etapas concluídas é inválida.');
    }
    seen.add(stepId);
    previousStepIndex = stepIndex;
    completedStepIds.push(stepId);
  }

  if (objective.stepMode === 'sequential') {
    const expected = objective.steps.slice(0, completedStepIds.length).map((step) => step.id);
    if (!sameStrings(completedStepIds, expected)) {
      return fail('Um objetivo sequencial não pode possuir lacunas.');
    }
  }

  const shouldBeCompleted = completedStepIds.length === objective.steps.length;
  if (value.completed !== shouldBeCompleted) {
    return fail('O estado de conclusão do objetivo é incoerente.');
  }

  return { ok: true, value: { objectiveId: value.objectiveId, completedStepIds, completed: value.completed } };
}

function inspectIndexedCatalog(value: unknown): ObjectiveInspection<IndexedObjectives> {
  if (!isRecord(value) || !Array.isArray(value.objectives) || !isReadonlyMap(value.byId)) {
    return fail('O catálogo indexado de objetivos é inválido.');
  }

  const rebuilt = inspectObjectiveCatalog({ objectives: value.objectives });
  if (!rebuilt.ok) {
    return rebuilt;
  }
  if (value.byId.size !== rebuilt.value.objectives.length) {
    return fail('O catálogo indexado de objetivos está inconsistente.');
  }

  const keys = [...value.byId.keys()];
  const expectedKeys = rebuilt.value.objectives.map((objective) => objective.id);
  if (!sameStrings(keys, expectedKeys)) {
    return fail('O catálogo indexado de objetivos está inconsistente.');
  }

  for (const objective of rebuilt.value.objectives) {
    const mapped = value.byId.get(objective.id);
    const normalized = inspectObjectiveCatalog({ objectives: mapped === undefined ? [] : [mapped] });
    if (!normalized.ok || normalized.value.objectives.length !== 1) {
      return fail('O catálogo indexado de objetivos está inconsistente.');
    }
    if (JSON.stringify(normalized.value.objectives[0]) !== JSON.stringify(objective)) {
      return fail('O catálogo indexado de objetivos está inconsistente.');
    }
  }

  return rebuilt;
}

function requireIndexedCatalog(catalog: IndexedObjectives): IndexedObjectives {
  const inspected = inspectIndexedCatalog(catalog);
  if (!inspected.ok) {
    throw new ObjectiveError(inspected.reason);
  }
  return inspected.value;
}

function requireState(state: ObjectivesState, catalog: IndexedObjectives): ObjectivesState {
  const inspected = inspectObjectivesState(state, catalog);
  if (!inspected.ok) {
    throw new ObjectiveError(inspected.reason);
  }
  return inspected.value;
}

function requireObjective(catalog: IndexedObjectives, objectiveId: string): ObjectiveDefinition {
  if (!nonEmpty(objectiveId)) {
    throw new ObjectiveError('O objetivo não existe.');
  }
  const objective = catalog.byId.get(objectiveId);
  if (!objective) {
    throw new ObjectiveError('O objetivo não existe.');
  }
  return objective;
}

function getNextStepIds(objective: ObjectiveDefinition, progress: ObjectiveProgress): string[] {
  if (progress.completed) {
    return [];
  }
  const incomplete = objective.steps.filter((step) => !progress.completedStepIds.includes(step.id));
  return objective.stepMode === 'sequential' ? incomplete.slice(0, 1).map((step) => step.id) : incomplete.map((step) => step.id);
}

function freezeCatalog(objectives: ObjectiveDefinition[]): IndexedObjectives {
  const frozenObjectives = Object.freeze([...objectives]);
  return Object.freeze({
    objectives: frozenObjectives,
    byId: new ImmutableIndex(frozenObjectives.map((objective) => [objective.id, objective] as const)),
  });
}

function freezeObjective(objective: ObjectiveDefinition): ObjectiveDefinition {
  const activation = objective.activation.type === 'automatic'
    ? Object.freeze({ type: 'automatic' as const })
    : Object.freeze({
        type: 'criteria' as const,
        criteria: Object.freeze(objective.activation.criteria.map(freezeCriterion)) as unknown as ObjectiveCriterion[],
      });
  const steps = objective.steps.map((step) => Object.freeze({
    id: step.id,
    title: step.title,
    ...(step.description === undefined ? {} : { description: step.description }),
    criteria: Object.freeze(step.criteria.map(freezeCriterion)) as unknown as ObjectiveCriterion[],
  }));

  return Object.freeze({
    ...objective,
    activation,
    steps: Object.freeze(steps) as unknown as ObjectiveStepDefinition[],
  });
}

function freezeCriterion(criterion: ObjectiveCriterion): ObjectiveCriterion {
  return Object.freeze({ ...criterion });
}

function copyObjective(objective: ObjectiveDefinition): ObjectiveDefinition {
  return {
    ...objective,
    activation: objective.activation.type === 'automatic'
      ? { type: 'automatic' }
      : { type: 'criteria', criteria: objective.activation.criteria.map((criterion) => ({ ...criterion })) },
    steps: objective.steps.map((step) => ({
      ...step,
      criteria: step.criteria.map((criterion) => ({ ...criterion })),
    })),
  };
}

function createProgress(objectiveId: string): ObjectiveProgress {
  return { objectiveId, completedStepIds: [], completed: false };
}

function copyProgress(progress: ObjectiveProgress): ObjectiveProgress {
  return { ...progress, completedStepIds: [...progress.completedStepIds] };
}

function copyState(state: ObjectivesState): ObjectivesState {
  return { entries: state.entries.map(copyProgress) };
}

function completionResult(
  previous: ObjectivesState,
  current: ObjectivesState,
  objectiveId: string,
  stepId: string,
  stepNewlyCompleted: boolean,
  objectiveNewlyCompleted: boolean,
): ObjectiveStepCompletionResult {
  return {
    previous: copyState(previous),
    current: copyState(current),
    objectiveId,
    stepId,
    stepNewlyCompleted,
    objectiveNewlyCompleted,
  };
}

function objectiveOrder(catalog: IndexedObjectives, objectiveId: string): number {
  return catalog.objectives.findIndex((objective) => objective.id === objectiveId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReadonlyMap(value: unknown): value is ReadonlyMap<string, unknown> {
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

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function fail<T>(reason: string): ObjectiveInspection<T> {
  return { ok: false, reason };
}

export type {
  IndexedObjectives,
  KnownObjective,
  ObjectiveActivation,
  ObjectiveCatalog,
  ObjectiveCriterion,
  ObjectiveDefinition,
  ObjectiveInspection,
  ObjectiveKind,
  ObjectiveProgress,
  ObjectivesState,
  ObjectiveStatus,
  ObjectiveStepCompletionResult,
  ObjectiveStepReference,
  ObjectiveStepDefinition,
  ObjectiveStepMode,
  ObjectivesSynchronizationResult,
} from './types';

export { INITIAL_OBJECTIVE_CATALOG } from './initial-objectives';
