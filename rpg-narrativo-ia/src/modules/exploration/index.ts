import { evaluateConditions, type GameCondition } from '../../core/events';
import { isAttributeId, type GameState } from '../../core/state/types';
import {
  NavigationError,
  discoverLocation,
  inspectNavigationState,
  unlockLocation,
  type IndexedMap,
  type NavigationState,
} from '../navigation';
import { inspectTimeCost, type TimeCost } from '../time';
import { INITIAL_EXPLORATION_DEFINITIONS } from './initial-exploration';
import {
  DISCOVERY_KINDS,
  type DiscoveryConditionEvaluator,
  type DiscoveryDefinition,
  type DiscoveryKind,
  type ExplorationConditionSource,
  type ExplorationInspection,
  type ExplorationResult,
  type ExplorationState,
  type IndexedExploration,
  type LocationExplorationDefinition,
  type LocationExplorationState,
  type ZoneCompletion,
} from './types';

export class ExplorationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ExplorationError';
  }
}

export const ZERO_EXPLORATION_COST: TimeCost = { periods: 0 };
export const MAX_EXPLORATION_PROGRESS = 100;

export function inspectExplorationDefinitions(
  value: unknown,
  map: IndexedMap,
): ExplorationInspection<IndexedExploration> {
  const indexedMap = inspectIndexedMap(map);
  if (!indexedMap.ok) {
    return indexedMap;
  }

  if (!Array.isArray(value)) {
    return fail('As definições de exploração são inválidas.');
  }

  const definitions: LocationExplorationDefinition[] = [];
  const byLocation = new Map<string, LocationExplorationDefinition>();
  const byDiscovery = new Map<string, DiscoveryDefinition>();
  const locationByDiscovery = new Map<string, string>();

  for (const entry of value) {
    const inspected = inspectLocationDefinition(entry, indexedMap.value, byLocation, byDiscovery);
    if (!inspected.ok) {
      return inspected;
    }

    const definition = inspected.value;
    byLocation.set(definition.locationId, definition);
    for (const discovery of definition.discoveries) {
      byDiscovery.set(discovery.id, discovery);
      locationByDiscovery.set(discovery.id, definition.locationId);
    }
    definitions.push(definition);
  }

  const totalWeight = sumCompletionWeights(definitions);
  if (!totalWeight.ok) {
    return totalWeight;
  }

  return {
    ok: true,
    value: {
      definitions,
      byLocation,
      byDiscovery,
      locationByDiscovery,
    },
  };
}

export function indexExplorationDefinitions(value: unknown, map: IndexedMap): IndexedExploration {
  return requireDefinitions(value, map);
}

export function createInitialExploration(): ExplorationState {
  return { locations: [] };
}

export function inspectExplorationState(
  state: unknown,
  definitions: IndexedExploration,
  map: IndexedMap,
): ExplorationInspection<ExplorationState> {
  const indexedMap = inspectIndexedMap(map);
  if (!indexedMap.ok) {
    return indexedMap;
  }

  const indexedDefinitions = inspectIndexedDefinitions(definitions);
  if (!indexedDefinitions.ok) {
    return indexedDefinitions;
  }

  if (!isRecord(state) || !Array.isArray(state.locations)) {
    return fail('O estado de exploração é inválido.');
  }

  const seenLocations = new Set<string>();
  const locations: LocationExplorationState[] = [];

  for (const entry of state.locations) {
    const inspected = inspectLocationState(entry, indexedDefinitions.value, indexedMap.value, seenLocations);
    if (!inspected.ok) {
      return inspected;
    }

    seenLocations.add(inspected.value.locationId);
    locations.push(inspected.value);
  }

  return {
    ok: true,
    value: { locations },
  };
}

export function getLocationExploration(state: ExplorationState, locationId: string): LocationExplorationState {
  if (typeof locationId !== 'string' || locationId.trim() === '') {
    throw new ExplorationError('A localização não existe.');
  }

  const found = state.locations.find((entry) => entry.locationId === locationId);
  return found ? copyLocationState(found) : emptyLocationState(locationId);
}

export function canExploreLocation(
  map: IndexedMap,
  navigation: NavigationState,
  definitions: IndexedExploration,
  locationId: string,
): boolean {
  const indexedMap = requireIndexedMap(map);
  const current = requireNavigation(navigation, indexedMap);
  const indexedDefinitions = requireIndexedDefinitions(definitions);

  if (typeof locationId !== 'string' || locationId.trim() === '' || !indexedMap.locations.has(locationId)) {
    return false;
  }

  if (current.currentLocationId !== locationId) {
    return false;
  }

  return indexedDefinitions.byLocation.has(locationId);
}

export function exploreCurrentLocation(
  map: IndexedMap,
  navigation: NavigationState,
  definitions: IndexedExploration,
  state: ExplorationState,
  conditions?: ExplorationConditionSource,
): ExplorationResult {
  const indexedMap = requireIndexedMap(map);
  const previousNavigation = requireNavigation(navigation, indexedMap);
  const indexedDefinitions = requireIndexedDefinitions(definitions);
  const previous = requireState(state, indexedDefinitions, indexedMap);
  const locationId = previousNavigation.currentLocationId;
  const definition = indexedDefinitions.byLocation.get(locationId);

  if (!definition) {
    throw new ExplorationError('Não há definição de exploração para a localização atual.');
  }

  const previousLocation = getLocationExploration(previous, locationId);

  if (previousLocation.progress >= MAX_EXPLORATION_PROGRESS) {
    return createResult({
      previous,
      current: copyState(previous),
      previousLocation,
      currentLocation: copyLocationState(previousLocation),
      progressGained: 0,
      discoveries: [],
      timeCost: { ...ZERO_EXPLORATION_COST },
      previousNavigation,
      currentNavigation: copyNavigation(previousNavigation),
    });
  }

  if (previousLocation.explorationCount >= Number.MAX_SAFE_INTEGER) {
    throw new ExplorationError('A contagem de exploração é inválida.');
  }

  const progressGained = Math.min(definition.progressPerAction, MAX_EXPLORATION_PROGRESS - previousLocation.progress);
  const currentProgress = previousLocation.progress + progressGained;
  const evaluate = resolveEvaluator(conditions);
  const discoveries = collectNewDiscoveries(
    definition,
    previousLocation.revealedDiscoveryIds,
    currentProgress,
    evaluate,
  );
  const currentLocation: LocationExplorationState = {
    locationId,
    progress: currentProgress,
    revealedDiscoveryIds: [...previousLocation.revealedDiscoveryIds, ...discoveries.map((item) => item.id)],
    explorationCount: previousLocation.explorationCount + 1,
  };

  return createResult({
    previous,
    current: upsertLocation(previous, currentLocation),
    previousLocation,
    currentLocation,
    progressGained,
    discoveries,
    timeCost: { periods: definition.timeCost.periods },
    previousNavigation,
    currentNavigation: applyDiscoveryNavigationEffects(indexedMap, previousNavigation, discoveries),
  });
}

export function reevaluateDiscoveries(
  map: IndexedMap,
  navigation: NavigationState,
  definitions: IndexedExploration,
  state: ExplorationState,
  conditions?: ExplorationConditionSource,
): ExplorationResult {
  const indexedMap = requireIndexedMap(map);
  const previousNavigation = requireNavigation(navigation, indexedMap);
  const indexedDefinitions = requireIndexedDefinitions(definitions);
  const previous = requireState(state, indexedDefinitions, indexedMap);
  const locationId = previousNavigation.currentLocationId;
  const definition = indexedDefinitions.byLocation.get(locationId);

  if (!definition) {
    throw new ExplorationError('Não há definição de exploração para a localização atual.');
  }

  const previousLocation = getLocationExploration(previous, locationId);
  const evaluate = resolveEvaluator(conditions);
  const discoveries = collectNewDiscoveries(
    definition,
    previousLocation.revealedDiscoveryIds,
    previousLocation.progress,
    evaluate,
  );

  if (discoveries.length === 0) {
    return createResult({
      previous,
      current: copyState(previous),
      previousLocation,
      currentLocation: copyLocationState(previousLocation),
      progressGained: 0,
      discoveries: [],
      timeCost: { ...ZERO_EXPLORATION_COST },
      previousNavigation,
      currentNavigation: copyNavigation(previousNavigation),
    });
  }

  const currentLocation: LocationExplorationState = {
    locationId,
    progress: previousLocation.progress,
    revealedDiscoveryIds: [...previousLocation.revealedDiscoveryIds, ...discoveries.map((item) => item.id)],
    explorationCount: previousLocation.explorationCount,
  };

  return createResult({
    previous,
    current: upsertLocation(previous, currentLocation),
    previousLocation,
    currentLocation,
    progressGained: 0,
    discoveries,
    timeCost: { ...ZERO_EXPLORATION_COST },
    previousNavigation,
    currentNavigation: applyDiscoveryNavigationEffects(indexedMap, previousNavigation, discoveries),
  });
}

export function getRevealedDiscoveries(
  definitions: IndexedExploration,
  state: ExplorationState,
  locationId: string,
): DiscoveryDefinition[] {
  const indexedDefinitions = requireIndexedDefinitions(definitions);
  if (typeof locationId !== 'string' || locationId.trim() === '') {
    throw new ExplorationError('A localização não existe.');
  }

  const location = state.locations.find((entry) => entry.locationId === locationId);
  if (!location) {
    return [];
  }

  return location.revealedDiscoveryIds.map((discoveryId) => {
    const discovery = indexedDefinitions.byDiscovery.get(discoveryId);
    if (!discovery) {
      throw new ExplorationError('O estado de exploração possui descoberta inexistente.');
    }

    return copyDiscovery(discovery);
  });
}

export function calculateZoneCompletion(
  map: IndexedMap,
  definitions: IndexedExploration,
  state: ExplorationState,
  zoneId: string,
): ZoneCompletion {
  const indexedMap = requireIndexedMap(map);
  const indexedDefinitions = requireIndexedDefinitions(definitions);
  const current = requireState(state, indexedDefinitions, indexedMap);
  requireLocation(indexedMap, zoneId);

  const revealedByLocation = new Map(
    current.locations.map((entry) => [entry.locationId, new Set(entry.revealedDiscoveryIds)]),
  );
  let completedPoints = 0;
  let totalPoints = 0;

  for (const locationId of collectZoneLocationIds(indexedMap, zoneId)) {
    const definition = indexedDefinitions.byLocation.get(locationId);
    if (!definition) {
      continue;
    }

    const revealed = revealedByLocation.get(locationId) ?? new Set<string>();
    for (const discovery of definition.discoveries) {
      totalPoints = addCompletionWeight(totalPoints, discovery.completionWeight);
      if (revealed.has(discovery.id)) {
        completedPoints = addCompletionWeight(completedPoints, discovery.completionWeight);
      }
    }
  }

  return {
    zoneId,
    completedPoints,
    totalPoints,
    percentage: zonePercentage(completedPoints, totalPoints),
  };
}

export function applyDiscoveryNavigationEffects(
  map: IndexedMap,
  navigation: NavigationState,
  discoveries: readonly DiscoveryDefinition[],
): NavigationState {
  const indexedMap = requireIndexedMap(map);
  let current = copyNavigation(requireNavigation(navigation, indexedMap));

  try {
    for (const discovery of discoveries) {
      if ((discovery.kind !== 'subarea' && discovery.kind !== 'passage') || !discovery.targetId) {
        continue;
      }

      current = discoverLocation(indexedMap, current, discovery.targetId);
      if (discovery.unlockTarget === true) {
        current = unlockLocation(indexedMap, current, discovery.targetId);
      }
    }
  } catch (error) {
    throw wrapNavigationError(error);
  }

  return current;
}

export function createDiscoveryEvaluator(state: GameState): DiscoveryConditionEvaluator {
  return (conditions) => evaluateConditions(conditions ? copyConditions(conditions) : undefined, state);
}

export { INITIAL_EXPLORATION_DEFINITIONS };
export type {
  DiscoveryConditionEvaluator,
  DiscoveryDefinition,
  DiscoveryKind,
  ExplorationConditionSource,
  ExplorationInspection,
  ExplorationResult,
  ExplorationState,
  IndexedExploration,
  LocationExplorationDefinition,
  LocationExplorationState,
  ZoneCompletion,
} from './types';

function inspectLocationDefinition(
  value: unknown,
  map: IndexedMap,
  byLocation: ReadonlyMap<string, LocationExplorationDefinition>,
  byDiscovery: ReadonlyMap<string, DiscoveryDefinition>,
): ExplorationInspection<LocationExplorationDefinition> {
  if (!isRecord(value)) {
    return fail('As definições de exploração são inválidas.');
  }

  if (typeof value.locationId !== 'string' || value.locationId.trim() === '') {
    return fail('A localização não existe.');
  }

  if (!map.locations.has(value.locationId)) {
    return fail('A localização não existe.');
  }

  if (byLocation.has(value.locationId)) {
    return fail('A definição de exploração para a localização está duplicada.');
  }

  if (!isPositiveSafeInteger(value.progressPerAction)) {
    return fail('O ganho de progresso precisa ser um inteiro positivo.');
  }

  const timeCost = inspectTimeCost(value.timeCost);
  if (!timeCost.ok) {
    return fail(timeCost.reason);
  }

  if (!Array.isArray(value.discoveries)) {
    return fail('As definições de exploração são inválidas.');
  }

  const discoveries: DiscoveryDefinition[] = [];
  const localIds = new Set<string>(byDiscovery.keys());

  for (const entry of value.discoveries) {
    const discovery = inspectDiscovery(entry, value.locationId, map, localIds);
    if (!discovery.ok) {
      return discovery;
    }

    localIds.add(discovery.value.id);
    discoveries.push(discovery.value);
  }

  return {
    ok: true,
    value: {
      locationId: value.locationId,
      progressPerAction: value.progressPerAction,
      timeCost: { periods: timeCost.value.periods },
      discoveries,
    },
  };
}

function inspectDiscovery(
  value: unknown,
  locationId: string,
  map: IndexedMap,
  seenIds: ReadonlySet<string>,
): ExplorationInspection<DiscoveryDefinition> {
  if (!isRecord(value)) {
    return fail('As definições de exploração são inválidas.');
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return fail('A descoberta possui identificador vazio.');
  }

  if (seenIds.has(value.id)) {
    return fail('As definições possuem identificadores de descoberta duplicados.');
  }

  if (!isDiscoveryKind(value.kind)) {
    return fail('O tipo de descoberta é desconhecido.');
  }

  if (!isProgressValue(value.revealAt)) {
    return fail('O limiar de revelação precisa ser um inteiro entre 0 e 100.');
  }

  if (!isPositiveSafeInteger(value.completionWeight)) {
    return fail('O peso de conclusão precisa ser um inteiro positivo.');
  }

  if (value.once !== true) {
    return fail('A descoberta precisa ser única (once: true).');
  }

  if (value.unlockTarget !== undefined && typeof value.unlockTarget !== 'boolean') {
    return fail('O desbloqueio do destino é inválido.');
  }

  let conditions: GameCondition[] | undefined;
  if (value.conditions !== undefined) {
    const inspectedConditions = inspectConditions(value.conditions);
    if (!inspectedConditions.ok) {
      return inspectedConditions;
    }

    conditions = inspectedConditions.value;
  }

  const requiresTarget = value.kind === 'subarea' || value.kind === 'passage';
  if (requiresTarget && (typeof value.targetId !== 'string' || value.targetId.trim() === '')) {
    return fail('A subárea ou passagem precisa de um destino.');
  }

  if (typeof value.targetId === 'string') {
    if (value.targetId.trim() === '' || !map.locations.has(value.targetId)) {
      return fail('O destino da subárea não existe.');
    }

    if (value.targetId === locationId) {
      return fail('O destino da descoberta não pode ser o próprio local.');
    }
  }

  const discovery: DiscoveryDefinition = {
    id: value.id,
    kind: value.kind,
    revealAt: value.revealAt,
    completionWeight: value.completionWeight,
    once: true,
  };

  if (conditions) {
    discovery.conditions = conditions;
  }

  if (typeof value.targetId === 'string') {
    discovery.targetId = value.targetId;
  }

  if (value.unlockTarget !== undefined) {
    discovery.unlockTarget = value.unlockTarget;
  }

  return { ok: true, value: discovery };
}

function inspectLocationState(
  value: unknown,
  definitions: IndexedExploration,
  map: IndexedMap,
  seenLocations: ReadonlySet<string>,
): ExplorationInspection<LocationExplorationState> {
  if (!isRecord(value)) {
    return fail('O estado de exploração é inválido.');
  }

  if (typeof value.locationId !== 'string' || value.locationId.trim() === '') {
    return fail('A localização não existe.');
  }

  if (!map.locations.has(value.locationId) || !definitions.byLocation.has(value.locationId)) {
    return fail('A localização da exploração não existe nas definições.');
  }

  if (seenLocations.has(value.locationId)) {
    return fail('O estado de exploração possui localização duplicada.');
  }

  if (!isProgressValue(value.progress)) {
    return fail('O progresso de exploração é inválido.');
  }

  if (!isNonNegativeSafeInteger(value.explorationCount)) {
    return fail('A contagem de exploração é inválida.');
  }

  if (!Array.isArray(value.revealedDiscoveryIds)) {
    return fail('O estado de exploração é inválido.');
  }

  const revealed = new Set<string>();
  const revealedDiscoveryIds: string[] = [];
  const definition = definitions.byLocation.get(value.locationId);

  for (const entry of value.revealedDiscoveryIds) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      return fail('O estado de exploração possui descoberta inexistente.');
    }

    if (revealed.has(entry)) {
      return fail('O estado de exploração possui descobertas duplicadas.');
    }

    const owner = definitions.locationByDiscovery.get(entry);
    if (!definitions.byDiscovery.has(entry)) {
      return fail('O estado de exploração possui descoberta inexistente.');
    }

    if (owner !== value.locationId || !definition?.discoveries.some((item) => item.id === entry)) {
      return fail('A descoberta foi registrada no local errado.');
    }

    const discovery = definitions.byDiscovery.get(entry);
    if (!discovery || value.progress < discovery.revealAt) {
      return fail('A descoberta foi registrada antes do limiar de revelação.');
    }

    revealed.add(entry);
    revealedDiscoveryIds.push(entry);
  }

  return {
    ok: true,
    value: {
      locationId: value.locationId,
      progress: value.progress,
      revealedDiscoveryIds,
      explorationCount: value.explorationCount,
    },
  };
}

function inspectConditions(value: unknown): ExplorationInspection<GameCondition[]> {
  if (!Array.isArray(value)) {
    return fail('A descoberta possui condições malformadas.');
  }

  const conditions: GameCondition[] = [];
  for (const entry of value) {
    const condition = inspectCondition(entry);
    if (!condition.ok) {
      return condition;
    }

    conditions.push(condition.value);
  }

  return { ok: true, value: conditions };
}

function inspectCondition(value: unknown): ExplorationInspection<GameCondition> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('A descoberta possui condições malformadas.');
  }

  switch (value.type) {
    case 'flag.is':
      if (typeof value.flag !== 'string' || value.flag.trim() === '' || typeof value.value !== 'boolean') {
        return fail('A descoberta possui condições malformadas.');
      }
      return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
    case 'attribute.min':
    case 'attribute.max':
      if (!isAttributeId(value.attribute) || !isFiniteNumber(value.amount)) {
        return fail('A descoberta possui condições malformadas.');
      }
      return {
        ok: true,
        value: { type: value.type, attribute: value.attribute, amount: value.amount },
      };
    case 'inventory.has':
      if (typeof value.itemId !== 'string' || value.itemId.trim() === '') {
        return fail('A descoberta possui condições malformadas.');
      }
      if (value.quantity !== undefined && !isPositiveInteger(value.quantity)) {
        return fail('A descoberta possui condições malformadas.');
      }
      return {
        ok: true,
        value:
          value.quantity === undefined
            ? { type: 'inventory.has', itemId: value.itemId }
            : { type: 'inventory.has', itemId: value.itemId, quantity: value.quantity },
      };
    case 'relationship.min':
      if (typeof value.characterId !== 'string' || value.characterId.trim() === '' || !isFiniteNumber(value.amount)) {
        return fail('A descoberta possui condições malformadas.');
      }
      return {
        ok: true,
        value: { type: 'relationship.min', characterId: value.characterId, amount: value.amount },
      };
    default:
      return fail('A descoberta possui condições malformadas.');
  }
}

function collectNewDiscoveries(
  definition: LocationExplorationDefinition,
  revealedIds: readonly string[],
  progress: number,
  evaluate: DiscoveryConditionEvaluator | undefined,
): DiscoveryDefinition[] {
  const revealed = new Set(revealedIds);
  const discoveries: DiscoveryDefinition[] = [];

  for (const discovery of definition.discoveries) {
    if (revealed.has(discovery.id) || progress < discovery.revealAt) {
      continue;
    }

    if (!areConditionsSatisfied(discovery.conditions, evaluate)) {
      continue;
    }

    discoveries.push(copyDiscovery(discovery));
  }

  return discoveries;
}

function collectZoneLocationIds(map: IndexedMap, zoneId: string): string[] {
  const ids = [zoneId];
  const queue = [zoneId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) {
      break;
    }

    for (const childId of map.children.get(currentId) ?? []) {
      ids.push(childId);
      queue.push(childId);
    }
  }

  return ids;
}

function zonePercentage(completedPoints: number, totalPoints: number): number {
  if (totalPoints === 0) {
    return MAX_EXPLORATION_PROGRESS;
  }

  const rounded = Math.round((completedPoints / totalPoints) * MAX_EXPLORATION_PROGRESS);
  return Math.min(MAX_EXPLORATION_PROGRESS, Math.max(0, rounded));
}

function upsertLocation(state: ExplorationState, location: LocationExplorationState): ExplorationState {
  const locations = state.locations.map(copyLocationState);
  const index = locations.findIndex((entry) => entry.locationId === location.locationId);

  if (index === -1) {
    locations.push(copyLocationState(location));
  } else {
    locations[index] = copyLocationState(location);
  }

  return { locations };
}

function createResult(input: {
  previous: ExplorationState;
  current: ExplorationState;
  previousLocation: LocationExplorationState;
  currentLocation: LocationExplorationState;
  progressGained: number;
  discoveries: DiscoveryDefinition[];
  timeCost: TimeCost;
  previousNavigation: NavigationState;
  currentNavigation: NavigationState;
}): ExplorationResult {
  return {
    previous: copyState(input.previous),
    current: copyState(input.current),
    location: {
      previous: copyLocationState(input.previousLocation),
      current: copyLocationState(input.currentLocation),
    },
    progressGained: input.progressGained,
    discoveries: input.discoveries.map(copyDiscovery),
    timeCost: { periods: input.timeCost.periods },
    navigation: {
      previous: copyNavigation(input.previousNavigation),
      current: copyNavigation(input.currentNavigation),
    },
  };
}

function copyState(state: ExplorationState): ExplorationState {
  return {
    locations: state.locations.map(copyLocationState),
  };
}

function copyLocationState(state: LocationExplorationState): LocationExplorationState {
  return {
    locationId: state.locationId,
    progress: state.progress,
    revealedDiscoveryIds: [...state.revealedDiscoveryIds],
    explorationCount: state.explorationCount,
  };
}

function emptyLocationState(locationId: string): LocationExplorationState {
  return {
    locationId,
    progress: 0,
    revealedDiscoveryIds: [],
    explorationCount: 0,
  };
}

function copyDiscovery(discovery: DiscoveryDefinition): DiscoveryDefinition {
  const copied: DiscoveryDefinition = {
    id: discovery.id,
    kind: discovery.kind,
    revealAt: discovery.revealAt,
    completionWeight: discovery.completionWeight,
    once: true,
  };

  if (discovery.conditions) {
    copied.conditions = copyConditions(discovery.conditions);
  }

  if (discovery.targetId !== undefined) {
    copied.targetId = discovery.targetId;
  }

  if (discovery.unlockTarget !== undefined) {
    copied.unlockTarget = discovery.unlockTarget;
  }

  return copied;
}

function copyNavigation(state: NavigationState): NavigationState {
  return {
    currentLocationId: state.currentLocationId,
    discoveredLocationIds: [...state.discoveredLocationIds],
    unlockedLocationIds: [...state.unlockedLocationIds],
    visitedLocationIds: [...state.visitedLocationIds],
  };
}

function areConditionsSatisfied(
  conditions: readonly GameCondition[] | undefined,
  evaluate: DiscoveryConditionEvaluator | undefined,
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  if (!evaluate) {
    return false;
  }

  return evaluate(copyConditions(conditions));
}

function copyConditions(conditions: readonly GameCondition[]): GameCondition[] {
  return conditions.map(copyCondition);
}

function copyCondition(condition: GameCondition): GameCondition {
  switch (condition.type) {
    case 'flag.is':
      return { type: 'flag.is', flag: condition.flag, value: condition.value };
    case 'attribute.min':
    case 'attribute.max':
      return { type: condition.type, attribute: condition.attribute, amount: condition.amount };
    case 'inventory.has':
      return condition.quantity === undefined
        ? { type: 'inventory.has', itemId: condition.itemId }
        : { type: 'inventory.has', itemId: condition.itemId, quantity: condition.quantity };
    case 'relationship.min':
      return { type: 'relationship.min', characterId: condition.characterId, amount: condition.amount };
  }
}

function sumCompletionWeights(
  definitions: readonly LocationExplorationDefinition[],
): ExplorationInspection<number> {
  let total = 0;
  for (const definition of definitions) {
    for (const discovery of definition.discoveries) {
      const added = tryAddCompletionWeight(total, discovery.completionWeight);
      if (!added.ok) {
        return added;
      }
      total = added.value;
    }
  }

  return { ok: true, value: total };
}

function addCompletionWeight(total: number, weight: number): number {
  const added = tryAddCompletionWeight(total, weight);
  if (!added.ok) {
    throw new ExplorationError(added.reason);
  }

  return added.value;
}

function tryAddCompletionWeight(total: number, weight: number): ExplorationInspection<number> {
  if (!isPositiveSafeInteger(weight) || !isNonNegativeSafeInteger(total)) {
    return fail('A soma dos pesos de conclusão ultrapassa o inteiro seguro.');
  }

  if (weight > Number.MAX_SAFE_INTEGER - total) {
    return fail('A soma dos pesos de conclusão ultrapassa o inteiro seguro.');
  }

  return { ok: true, value: total + weight };
}

function resolveEvaluator(source: ExplorationConditionSource | undefined): DiscoveryConditionEvaluator | undefined {
  if (source === undefined) {
    return undefined;
  }

  if (typeof source === 'function') {
    return source;
  }

  return createDiscoveryEvaluator(source);
}

function requireDefinitions(value: unknown, map: IndexedMap): IndexedExploration {
  const inspected = inspectExplorationDefinitions(value, map);
  if (!inspected.ok) {
    throw new ExplorationError(inspected.reason);
  }

  return inspected.value;
}

function requireIndexedMap(map: IndexedMap): IndexedMap {
  const inspected = inspectIndexedMap(map);
  if (!inspected.ok) {
    throw new ExplorationError(inspected.reason);
  }

  return inspected.value;
}

function requireIndexedDefinitions(definitions: IndexedExploration): IndexedExploration {
  const inspected = inspectIndexedDefinitions(definitions);
  if (!inspected.ok) {
    throw new ExplorationError(inspected.reason);
  }

  return inspected.value;
}

function requireNavigation(state: NavigationState, map: IndexedMap): NavigationState {
  try {
    const inspected = inspectNavigationState(state, map);
    if (!inspected.ok) {
      throw new ExplorationError(inspected.reason);
    }

    return inspected.value;
  } catch (error) {
    throw wrapNavigationError(error);
  }
}

function requireState(
  state: ExplorationState,
  definitions: IndexedExploration,
  map: IndexedMap,
): ExplorationState {
  const inspected = inspectExplorationState(state, definitions, map);
  if (!inspected.ok) {
    throw new ExplorationError(inspected.reason);
  }

  return inspected.value;
}

function requireLocation(map: IndexedMap, locationId: string): void {
  if (typeof locationId !== 'string' || locationId.trim() === '' || !map.locations.has(locationId)) {
    throw new ExplorationError('A localização não existe.');
  }
}

function inspectIndexedMap(map: unknown): ExplorationInspection<IndexedMap> {
  if (
    !isRecord(map) ||
    !(map.locations instanceof Map) ||
    !(map.parents instanceof Map) ||
    !(map.children instanceof Map)
  ) {
    return fail('O mapa indexado é inválido.');
  }

  return { ok: true, value: map as unknown as IndexedMap };
}

function inspectIndexedDefinitions(definitions: unknown): ExplorationInspection<IndexedExploration> {
  if (
    !isRecord(definitions) ||
    !Array.isArray(definitions.definitions) ||
    !(definitions.byLocation instanceof Map) ||
    !(definitions.byDiscovery instanceof Map) ||
    !(definitions.locationByDiscovery instanceof Map)
  ) {
    return fail('As definições de exploração são inválidas.');
  }

  return { ok: true, value: definitions as unknown as IndexedExploration };
}

function wrapNavigationError(error: unknown): ExplorationError {
  if (error instanceof ExplorationError) {
    return error;
  }

  if (error instanceof NavigationError) {
    return new ExplorationError(error.message, { cause: error });
  }

  if (error instanceof Error) {
    return new ExplorationError(error.message, { cause: error });
  }

  return new ExplorationError('A navegação da exploração é inválida.');
}

function isDiscoveryKind(value: unknown): value is DiscoveryKind {
  return typeof value === 'string' && (DISCOVERY_KINDS as readonly string[]).includes(value);
}

function isProgressValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_EXPLORATION_PROGRESS;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): ExplorationInspection<never> {
  return { ok: false, reason };
}
