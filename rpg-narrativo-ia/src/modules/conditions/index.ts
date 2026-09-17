import { ConditionError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_CONDITIONS_CATALOG } from './initial-conditions';
import {
  AFFINITY_LABELS,
  CONDITION_STACKING,
  CONDITION_TIMING,
  type ActiveCondition,
  type ConditionDefinition,
  type ConditionEffect,
  type ConditionsInspection,
  type ElementDefinition,
  type ElementInteractionDefinition,
  type IndexedConditions,
  type PersistentConditionState,
} from './types';

export { ConditionError } from './errors';
export { INITIAL_CONDITIONS_CATALOG } from './initial-conditions';
export type {
  ActiveCondition,
  AffinityLabel,
  ConditionDefinition,
  ConditionEffect,
  ConditionsCatalog,
  ConditionsInspection,
  ElementDefinition,
  ElementInteractionDefinition,
  IndexedConditions,
  PersistentConditionEntry,
  PersistentConditionState,
} from './types';

const MAX_ENTRIES = 64;

export const INITIAL_CONDITIONS = indexConditionsCatalog(INITIAL_CONDITIONS_CATALOG);

export function inspectConditionsCatalog(value: unknown): ConditionsInspection<IndexedConditions> {
  if (!isRecord(value) || !Array.isArray(value.elements) || !Array.isArray(value.interactions) || !Array.isArray(value.conditions)) {
    return fail('O catálogo de condições é inválido.');
  }
  const elements: ElementDefinition[] = [];
  const elementIds = new Set<string>();
  for (const entry of value.elements) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || !nonEmpty(entry.name) || !nonEmpty(entry.description) || elementIds.has(entry.id)) {
      return fail('O elemento é inválido ou duplicado.');
    }
    elementIds.add(entry.id);
    elements.push({ id: entry.id, name: entry.name, description: entry.description });
  }
  if (elements.length === 0) {
    return fail('O catálogo precisa de ao menos um elemento.');
  }

  const interactions: ElementInteractionDefinition[] = [];
  const pairs = new Set<string>();
  for (const entry of value.interactions) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.sourceElementId) ||
      !elementIds.has(entry.sourceElementId) ||
      !nonEmpty(entry.targetElementId) ||
      !elementIds.has(entry.targetElementId) ||
      !includes(AFFINITY_LABELS, entry.label)
    ) {
      return fail('A relação elemental é inválida.');
    }
    if (typeof entry.multiplier !== 'number' || !(entry.multiplier > 0) || entry.multiplier > 4) {
      return fail('O multiplicador elemental é inválido.');
    }
    const key = `${entry.sourceElementId}>${entry.targetElementId}`;
    if (pairs.has(key)) {
      return fail('A relação elemental está duplicada.');
    }
    pairs.add(key);
    interactions.push({
      sourceElementId: entry.sourceElementId,
      targetElementId: entry.targetElementId,
      multiplier: entry.multiplier,
      label: entry.label,
    });
  }
  if (pairs.size !== elementIds.size ** 2) {
    return fail('Toda combinação elemental precisa de uma relação explícita.');
  }

  const conditions: ConditionDefinition[] = [];
  const conditionIds = new Set<string>();
  for (const entry of value.conditions) {
    const inspected = inspectCondition(entry, conditionIds);
    if (!inspected.ok) {
      return inspected;
    }
    conditionIds.add(inspected.value.id);
    conditions.push(inspected.value);
  }

  const elementById = new ImmutableIndex(elements.map((entry) => [entry.id, Object.freeze(entry)] as const));
  const conditionById = new ImmutableIndex(conditions.map((entry) => [entry.id, freezeCondition(entry)] as const));
  const interactionByPair = new ImmutableIndex(
    interactions.map((entry) => [`${entry.sourceElementId}>${entry.targetElementId}`, Object.freeze(entry)] as const),
  );

  return {
    ok: true,
    value: Object.freeze({
      elements: Object.freeze(elements.map((entry) => Object.freeze(entry))),
      interactions: Object.freeze(interactions.map((entry) => Object.freeze(entry))),
      conditions: Object.freeze(conditions.map(freezeCondition)),
      elementById,
      conditionById,
      interactionByPair,
    }),
  };
}

export function indexConditionsCatalog(value: unknown): IndexedConditions {
  const inspected = inspectConditionsCatalog(value);
  if (!inspected.ok) {
    throw new ConditionError(inspected.reason);
  }
  return inspected.value;
}

export function resolveElementInteraction(
  catalog: IndexedConditions,
  sourceElementId: string,
  targetElementId: string,
): ElementInteractionDefinition {
  const interaction = catalog.interactionByPair.get(`${sourceElementId}>${targetElementId}`);
  if (!interaction) {
    throw new ConditionError('A relação elemental não existe.');
  }
  return { ...interaction };
}

export function applyCondition(
  catalog: IndexedConditions,
  current: readonly ActiveCondition[],
  incoming: ActiveCondition,
): ActiveCondition[] {
  const definition = catalog.conditionById.get(incoming.conditionId);
  if (!definition) {
    throw new ConditionError('A condição não existe.');
  }
  const next = current.map((entry) => ({ ...entry }));
  const index = next.findIndex((entry) => entry.conditionId === incoming.conditionId);
  if (index < 0) {
    return [...next, { ...incoming }];
  }
  if (definition.stacking === 'none') {
    return next;
  }
  if (definition.stacking === 'refresh') {
    next[index] = { ...incoming, remainingTurns: Math.max(next[index].remainingTurns, incoming.remainingTurns) };
    return next;
  }
  if (incoming.potency > next[index].potency) {
    next[index] = { ...incoming };
  }
  return next;
}

export function tickConditions(
  catalog: IndexedConditions,
  current: readonly ActiveCondition[],
  timing: ConditionDefinition['timing'],
): { conditions: ActiveCondition[]; damage: number } {
  let damage = 0;
  const kept: ActiveCondition[] = [];
  for (const entry of current) {
    const definition = catalog.conditionById.get(entry.conditionId);
    if (!definition) {
      throw new ConditionError('A condição não existe.');
    }
    if (definition.timing === timing) {
      for (const effect of definition.effects) {
        if (effect.type === 'damage') {
          damage += effect.amount * Math.max(1, entry.potency);
        }
      }
    }
    const remaining = timing === 'turn-end' ? entry.remainingTurns - 1 : entry.remainingTurns;
    if (remaining > 0) {
      kept.push({ ...entry, remainingTurns: remaining });
    }
  }
  return { conditions: kept, damage };
}

export function cleanseConditions(
  current: readonly ActiveCondition[],
  conditionId: string | undefined,
  count: number,
): ActiveCondition[] {
  if (conditionId) {
    return current.filter((entry) => entry.conditionId !== conditionId).map((entry) => ({ ...entry }));
  }
  return current.slice(count).map((entry) => ({ ...entry }));
}

export function isActionBlocked(
  catalog: IndexedConditions,
  conditions: readonly ActiveCondition[],
  category: 'heal' | 'damage' | 'guard',
): boolean {
  return conditions.some((entry) => {
    const definition = catalog.conditionById.get(entry.conditionId);
    return definition?.effects.some((effect) => effect.type === 'action.block' && effect.category === category);
  });
}

export function createInitialLingering(): PersistentConditionState {
  return { entries: [] };
}

export function inspectPersistentConditions(
  value: unknown,
  catalog: IndexedConditions = INITIAL_CONDITIONS,
): ConditionsInspection<PersistentConditionState> {
  if (!isRecord(value) || !Array.isArray(value.entries) || value.entries.length > MAX_ENTRIES) {
    return fail('O estado persistente de condições é inválido.');
  }
  const entries: PersistentConditionState['entries'][number][] = [];
  const seen = new Set<string>();
  for (const entry of value.entries) {
    if (!isRecord(entry) || !nonEmpty(entry.conditionId) || seen.has(entry.conditionId)) {
      return fail('A condição persistente é inválida ou duplicada.');
    }
    const definition = catalog.conditionById.get(entry.conditionId);
    if (!definition || !definition.lingering) {
      return fail('O save referencia uma condição persistente desconhecida.');
    }
    if (!positiveSafeInteger(entry.remainingPeriods) || !positiveSafeInteger(entry.potency)) {
      return fail('A condição persistente possui valores inválidos.');
    }
    seen.add(entry.conditionId);
    entries.push({ conditionId: entry.conditionId, remainingPeriods: entry.remainingPeriods, potency: entry.potency });
  }
  return { ok: true, value: { entries } };
}

export function advanceLingering(
  catalog: IndexedConditions,
  state: PersistentConditionState,
  periods: number,
): PersistentConditionState {
  if (!Number.isSafeInteger(periods) || periods < 0) {
    throw new ConditionError('O avanço de condições persistentes é inválido.');
  }
  if (periods === 0) {
    return { entries: state.entries.map((entry) => ({ ...entry })) };
  }
  const entries = [];
  for (const entry of state.entries) {
    if (!catalog.conditionById.get(entry.conditionId)?.lingering) {
      continue;
    }
    const remaining = entry.remainingPeriods - periods;
    if (remaining > 0) {
      entries.push({ ...entry, remainingPeriods: remaining });
    }
  }
  return { entries };
}

export function copyPersistentConditions(state: PersistentConditionState): PersistentConditionState {
  return { entries: state.entries.map((entry) => ({ ...entry })) };
}

function inspectCondition(value: unknown, existing: ReadonlySet<string>): ConditionsInspection<ConditionDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || existing.has(value.id) || !nonEmpty(value.name) || !nonEmpty(value.description)) {
    return fail('A condição é inválida ou duplicada.');
  }
  if (!includes(CONDITION_STACKING, value.stacking) || !includes(CONDITION_TIMING, value.timing) || typeof value.lingering !== 'boolean') {
    return fail('A política da condição é inválida.');
  }
  if (!Array.isArray(value.effects) || value.effects.length === 0) {
    return fail('A condição precisa de efeitos.');
  }
  const effects: ConditionEffect[] = [];
  for (const entry of value.effects) {
    if (!isRecord(entry)) {
      return fail('O efeito da condição é inválido.');
    }
    if (entry.type === 'damage' && positiveSafeInteger(entry.amount)) {
      effects.push({ type: 'damage', amount: entry.amount });
      continue;
    }
    if (
      entry.type === 'combat.value.modify' &&
      (entry.target === 'damage' || entry.target === 'guard' || entry.target === 'healing') &&
      typeof entry.amount === 'number' &&
      Number.isSafeInteger(entry.amount) &&
      entry.amount !== 0
    ) {
      effects.push({ type: 'combat.value.modify', target: entry.target, amount: entry.amount });
      continue;
    }
    if (entry.type === 'action.block' && (entry.category === 'heal' || entry.category === 'damage' || entry.category === 'guard')) {
      effects.push({ type: 'action.block', category: entry.category });
      continue;
    }
    return fail('O efeito da condição é inválido.');
  }
  return {
    ok: true,
    value: {
      id: value.id,
      name: value.name,
      description: value.description,
      stacking: value.stacking,
      timing: value.timing,
      lingering: value.lingering,
      effects,
    },
  };
}

function freezeCondition(condition: ConditionDefinition): ConditionDefinition {
  return Object.freeze({
    ...condition,
    effects: Object.freeze(condition.effects.map((effect) => Object.freeze({ ...effect }))),
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

function includes<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

function fail<T>(reason: string): ConditionsInspection<T> {
  return { ok: false, reason };
}
