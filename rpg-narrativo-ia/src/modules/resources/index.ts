import { evaluateConditions, type GameCondition } from '../../core/events';
import { isAttributeId, type GameState, type InventoryItem } from '../../core/state/types';
import {
  inspectExplorationState,
  type ExplorationState,
  type IndexedExploration,
} from '../exploration';
import { addItem } from '../inventory';
import {
  inspectNavigationState,
  type IndexedMap,
  type NavigationState,
} from '../navigation';
import {
  DEFAULT_PERIODS,
  inspectTimeConfig,
  inspectTimeCost,
  inspectTimeState,
  type PeriodDefinition,
  type TimeCost,
  type TimeState,
} from '../time';
import type { DayCycleEvent } from '../day-cycle';
import { INITIAL_POPULATIONS, INITIAL_RESOURCE_NODES } from './initial-resources';
import { derivePopulationStatus, recoverPopulation } from './population';
import {
  compareGameTime,
  copyNodeState,
  copyTime,
  isSameGameTime,
  restoreNodeIfDue,
  scheduleRenewal,
} from './renewal';
import {
  ResourceError,
  type IndexedResources,
  type PopulationDefinition,
  type PopulationState,
  type PopulationStatus,
  type RenewalPolicy,
  type ResourceAccess,
  type ResourceCollectionResult,
  type ResourceConditionEvaluator,
  type ResourceConditionSource,
  type ResourceInspection,
  type ResourceNodeDefinition,
  type ResourceNodeState,
  type ResourceYield,
  type ResourcesState,
} from './types';

export { ResourceError };

export const DEFAULT_RESOURCE_BLOCKED_REASON = 'Este ponto de recurso está bloqueado.';
export const UNREVEALED_RESOURCE_REASON = 'Este ponto ainda não foi descoberto.';
export const WRONG_LOCATION_REASON = 'O ponto de recurso não está no local atual.';
export const EXHAUSTED_RESOURCE_REASON = 'Este ponto está esgotado.';
export const EXTINCT_POPULATION_REASON = 'A população local está esgotada.';
export const UNAVAILABLE_RESOURCE_REASON = 'Não há unidades disponíveis.';
export const COLLECTION_IN_THE_PAST_REASON = 'A coleta não pode ocorrer antes da última coleta.';
export const RESOURCE_NODE_KINDS = ['resourceNode', 'creatureHabitat'] as const;

const RESOURCE_ERROR = ResourceError;

export function inspectResourceDefinitions(
  nodes: unknown,
  populations: unknown,
  map: IndexedMap,
  exploration: IndexedExploration,
): ResourceInspection<IndexedResources> {
  const indexedMap = inspectIndexedMap(map);
  if (!indexedMap.ok) {
    return indexedMap;
  }

  const indexedExploration = inspectIndexedExploration(exploration);
  if (!indexedExploration.ok) {
    return indexedExploration;
  }

  const inspectedPopulations = inspectPopulationDefinitions(populations);
  if (!inspectedPopulations.ok) {
    return inspectedPopulations;
  }

  if (!Array.isArray(nodes)) {
    return fail('As definições de recursos são inválidas.');
  }

  const definitions: ResourceNodeDefinition[] = [];
  const byNode = new Map<string, ResourceNodeDefinition>();
  const nodesByPopulation = new Map<string, string[]>();

  for (const entry of nodes) {
    const inspected = inspectNodeDefinition(
      entry,
      indexedMap.value,
      indexedExploration.value,
      inspectedPopulations.value.byPopulation,
      byNode,
    );
    if (!inspected.ok) {
      return inspected;
    }

    const definition = inspected.value;
    byNode.set(definition.id, definition);
    definitions.push(definition);

    if (definition.renewal.type === 'population') {
      const linked = nodesByPopulation.get(definition.renewal.populationId) ?? [];
      linked.push(definition.id);
      nodesByPopulation.set(definition.renewal.populationId, linked);
    }
  }

  const frozenLinks = new Map<string, readonly string[]>();
  for (const [populationId, nodeIds] of nodesByPopulation) {
    frozenLinks.set(populationId, Object.freeze([...nodeIds]));
  }

  return {
    ok: true,
    value: {
      nodes: definitions,
      populations: inspectedPopulations.value.populations,
      byNode,
      byPopulation: inspectedPopulations.value.byPopulation,
      nodesByPopulation: frozenLinks,
    },
  };
}

export function indexResourceDefinitions(
  nodes: unknown,
  populations: unknown,
  map: IndexedMap,
  exploration: IndexedExploration,
): IndexedResources {
  const inspected = inspectResourceDefinitions(nodes, populations, map, exploration);
  if (!inspected.ok) {
    throw new RESOURCE_ERROR(inspected.reason);
  }

  return inspected.value;
}

export function createInitialResources(definitions: IndexedResources): ResourcesState {
  const indexed = requireIndexedDefinitions(definitions);
  return {
    nodes: indexed.nodes.map((node) => ({
      nodeId: node.id,
      availableUnits: node.capacity,
      exhausted: false,
    })),
    populations: indexed.populations.map((population) => ({
      populationId: population.id,
      current: population.carryingCapacity,
      pressure: 0,
      locallyExtinct: false,
      lastRecoveredDay: 1,
    })),
  };
}

export function inspectResourcesState(
  state: unknown,
  definitions: IndexedResources,
  timeConfig: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): ResourceInspection<ResourcesState> {
  const indexed = inspectIndexedDefinitions(definitions);
  if (!indexed.ok) {
    return indexed;
  }

  const periods = inspectTimeConfig(timeConfig);
  if (!periods.ok) {
    return fail(periods.reason);
  }

  if (!isRecord(state) || !Array.isArray(state.nodes) || !Array.isArray(state.populations)) {
    return fail('O estado de recursos é inválido.');
  }

  const nodes = inspectNodeStates(state.nodes, indexed.value, periods.value);
  if (!nodes.ok) {
    return nodes;
  }

  const populations = inspectPopulationStates(state.populations, indexed.value);
  if (!populations.ok) {
    return populations;
  }

  const populationById = new Map(populations.value.map((entry) => [entry.populationId, entry]));
  for (const node of nodes.value) {
    const definition = indexed.value.byNode.get(node.nodeId);
    if (!definition) {
      return fail('O estado de recursos possui identificadores inexistentes.');
    }

    const population =
      definition.renewal.type === 'population'
        ? populationById.get(definition.renewal.populationId)
        : undefined;
    if (node.exhausted !== isNodeExhausted(node.availableUnits, population)) {
      return fail('O esgotamento do ponto é inconsistente.');
    }
  }

  return {
    ok: true,
    value: {
      nodes: nodes.value,
      populations: populations.value,
    },
  };
}

export function getResourceNode(state: ResourcesState, nodeId: string): ResourceNodeState {
  if (typeof nodeId !== 'string' || nodeId.trim() === '') {
    throw new RESOURCE_ERROR('O ponto de recurso não existe.');
  }

  const found = state.nodes.find((entry) => entry.nodeId === nodeId);
  if (!found) {
    throw new RESOURCE_ERROR('O ponto de recurso não existe.');
  }

  return copyNodeState(found);
}

export function getPopulation(state: ResourcesState, populationId: string): PopulationState {
  if (typeof populationId !== 'string' || populationId.trim() === '') {
    throw new RESOURCE_ERROR('A população não existe.');
  }

  const found = state.populations.find((entry) => entry.populationId === populationId);
  if (!found) {
    throw new RESOURCE_ERROR('A população não existe.');
  }

  return copyPopulationState(found);
}

export function getEffectiveAvailability(
  definitions: IndexedResources,
  state: ResourcesState,
  nodeId: string,
): number {
  const indexed = requireIndexedDefinitions(definitions);
  const definition = requireNodeDefinition(indexed, nodeId);
  const node = getResourceNode(state, nodeId);
  const population = linkedPopulation(state, definition);
  return effectiveUnits(node.availableUnits, population);
}

export function getMaxCollectable(
  definitions: IndexedResources,
  state: ResourcesState,
  nodeId: string,
): number {
  const indexed = requireIndexedDefinitions(definitions);
  const definition = requireNodeDefinition(indexed, nodeId);
  const node = getResourceNode(state, nodeId);
  const population = linkedPopulation(state, definition);
  return maxCollectable(indexed, definition, node.availableUnits, population);
}

export function getPopulationStatus(
  definitions: IndexedResources,
  state: ResourcesState,
  populationId: string,
): PopulationStatus {
  const indexed = requireIndexedDefinitions(definitions);
  const definition = requirePopulationDefinition(indexed, populationId);
  return derivePopulationStatus(definition, getPopulation(state, populationId));
}

export function inspectResourceAccess(
  map: IndexedMap,
  navigation: NavigationState,
  exploration: IndexedExploration,
  explorationState: ExplorationState,
  definitions: IndexedResources,
  state: ResourcesState,
  nodeId: string,
  conditions?: ResourceConditionSource,
  timeConfig: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): ResourceAccess {
  const context = requireCollectionContext(
    map,
    navigation,
    exploration,
    explorationState,
    definitions,
    state,
    timeConfig,
  );
  const definition = context.definitions.byNode.get(nodeId);
  if (!definition) {
    throw new RESOURCE_ERROR('O ponto de recurso não existe.');
  }

  const node = getResourceNode(context.state, nodeId);
  const population = linkedPopulation(context.state, definition);
  const availableUnits = effectiveUnits(node.availableUnits, population);
  const max = maxCollectable(context.definitions, definition, node.availableUnits, population);
  const blockedReason = collectionBlockReason(
    context.navigation.currentLocationId,
    context.explorationState,
    context.exploration,
    definition,
    population,
    max,
    resolveEvaluator(conditions),
  );

  const access: ResourceAccess = {
    collectable: blockedReason === undefined && max > 0,
    availableUnits,
    maxCollectable: blockedReason === undefined ? max : 0,
  };

  if (blockedReason) {
    access.blockedReason = blockedReason;
  }

  return access;
}

export function canCollectResource(
  map: IndexedMap,
  navigation: NavigationState,
  exploration: IndexedExploration,
  explorationState: ExplorationState,
  definitions: IndexedResources,
  state: ResourcesState,
  nodeId: string,
  conditions?: ResourceConditionSource,
  timeConfig: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): boolean {
  return inspectResourceAccess(
    map,
    navigation,
    exploration,
    explorationState,
    definitions,
    state,
    nodeId,
    conditions,
    timeConfig,
  ).collectable;
}

export function getResourceYields(definitions: IndexedResources, nodeId: string): ResourceYield[] {
  return requireNodeDefinition(requireIndexedDefinitions(definitions), nodeId).yields.map(copyYield);
}

export function getCollectionCost(definitions: IndexedResources, nodeId: string): TimeCost {
  const cost = requireNodeDefinition(requireIndexedDefinitions(definitions), nodeId).collectionCost;
  return { periods: cost.periods };
}

export function collectResource(
  map: IndexedMap,
  navigation: NavigationState,
  exploration: IndexedExploration,
  explorationState: ExplorationState,
  definitions: IndexedResources,
  state: ResourcesState,
  inventory: readonly InventoryItem[],
  nodeId: string,
  requestedUnits: number,
  collectedAt: TimeState,
  conditions?: ResourceConditionSource,
  timeConfig: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): ResourceCollectionResult {
  const context = requireCollectionContext(
    map,
    navigation,
    exploration,
    explorationState,
    definitions,
    state,
    timeConfig,
  );
  const definition = requireNodeDefinition(context.definitions, nodeId);
  const previousNode = getResourceNode(context.state, nodeId);
  const previousPopulation = linkedPopulation(context.state, definition);
  const previousInventory = requireInventory(inventory);
  const now = requireTime(collectedAt, timeConfig);

  if (!isPositiveSafeInteger(requestedUnits)) {
    throw new RESOURCE_ERROR('A quantidade solicitada precisa ser um inteiro positivo.');
  }

  if (
    previousNode.lastCollectedAt &&
    compareGameTime(now, previousNode.lastCollectedAt, timeConfig) < 0
  ) {
    throw new RESOURCE_ERROR(COLLECTION_IN_THE_PAST_REASON);
  }

  const blockedReason = collectionBlockReason(
    context.navigation.currentLocationId,
    context.explorationState,
    context.exploration,
    definition,
    previousPopulation,
    maxCollectable(context.definitions, definition, previousNode.availableUnits, previousPopulation),
    resolveEvaluator(conditions),
  );
  if (blockedReason) {
    throw new RESOURCE_ERROR(blockedReason);
  }

  const allowed = maxCollectable(
    context.definitions,
    definition,
    previousNode.availableUnits,
    previousPopulation,
  );
  const collectedUnits = requestedUnits < allowed ? requestedUnits : allowed;
  if (collectedUnits <= 0) {
    throw new RESOURCE_ERROR(UNAVAILABLE_RESOURCE_REASON);
  }

  const yields = computeYields(definition.yields, collectedUnits);
  const nextInventory = applyYields(previousInventory, yields);
  const currentPopulation = previousPopulation
    ? applyPopulationCollection(previousPopulation, collectedUnits)
    : undefined;
  const currentNode = applyNodeCollection(
    definition,
    previousNode,
    collectedUnits,
    now,
    currentPopulation,
    timeConfig,
  );
  const current = upsertCollectionState(context.state, context.definitions, currentNode, currentPopulation);

  const result: ResourceCollectionResult = {
    previous: copyState(context.state),
    current,
    inventory: {
      previous: copyInventory(previousInventory),
      current: nextInventory,
    },
    node: {
      previous: copyNodeState(previousNode),
      current: copyNodeState(currentNode),
    },
    collectedUnits,
    yields,
    timeCost: { periods: definition.collectionCost.periods },
    collectedAt: copyTime(now),
  };

  if (previousPopulation && currentPopulation && definition.renewal.type === 'population') {
    result.population = {
      previous: copyPopulationState(previousPopulation),
      current: copyPopulationState(currentPopulation),
      status: derivePopulationStatus(
        requirePopulationDefinition(context.definitions, definition.renewal.populationId),
        currentPopulation,
      ),
    };
  }

  return result;
}

export function synchronizeResourceRenewal(
  definitions: IndexedResources,
  state: ResourcesState,
  now: TimeState,
  timeConfig: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): ResourcesState {
  const indexed = requireIndexedDefinitions(definitions);
  const previous = requireState(state, indexed, timeConfig);
  const currentTime = requireTime(now, timeConfig);

  return {
    nodes: previous.nodes.map((node) => {
      const definition = requireNodeDefinition(indexed, node.nodeId);
      return restoreNodeIfDue(node, definition.capacity, definition.renewal, currentTime, timeConfig);
    }),
    populations: previous.populations.map(copyPopulationState),
  };
}

export function applyPopulationDayCycle(
  state: ResourcesState,
  definitions: IndexedResources,
  events: readonly DayCycleEvent[],
  timeConfig: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): ResourcesState {
  const indexed = requireIndexedDefinitions(definitions);
  const previous = requireState(state, indexed, timeConfig);
  const inspectedEvents = requireEvents(events);

  const populations = previous.populations.map(copyPopulationState);
  const recoveredByPopulation = new Map<string, number>();

  for (const event of inspectedEvents) {
    if (event.type !== 'day.started') {
      continue;
    }

    for (let index = 0; index < populations.length; index += 1) {
      const current = populations[index];
      const definition = requirePopulationDefinition(indexed, current.populationId);
      if (event.day <= current.lastRecoveredDay) {
        continue;
      }

      const days = event.day - current.lastRecoveredDay;
      const recovered = recoverPopulation(definition, current, days, event.day);
      populations[index] = recovered.state;
      recoveredByPopulation.set(
        current.populationId,
        addSafe(recoveredByPopulation.get(current.populationId) ?? 0, recovered.recovered),
      );
    }
  }

  const populationById = new Map(populations.map((entry) => [entry.populationId, entry]));
  const nodes = previous.nodes.map((node) => {
    const definition = requireNodeDefinition(indexed, node.nodeId);
    if (definition.renewal.type !== 'population') {
      return copyNodeState(node);
    }

    const population = populationById.get(definition.renewal.populationId);
    if (!population) {
      throw new RESOURCE_ERROR('A população referenciada não existe.');
    }

    const recovered = recoveredByPopulation.get(definition.renewal.populationId) ?? 0;
    const room = definition.capacity - node.availableUnits;
    const added = recovered < room ? recovered : room;
    const availableUnits = addSafe(node.availableUnits, added);
    return {
      nodeId: node.nodeId,
      availableUnits,
      lastCollectedAt: node.lastCollectedAt ? copyTime(node.lastCollectedAt) : undefined,
      exhausted: isNodeExhausted(availableUnits, population),
    };
  });

  return { nodes, populations };
}

export function createResourceEvaluator(state: GameState): ResourceConditionEvaluator {
  return (conditions) => evaluateConditions(conditions ? copyConditions(conditions) : undefined, state);
}

export { INITIAL_POPULATIONS, INITIAL_RESOURCE_NODES };
export { derivePopulationStatus } from './population';
export type {
  IndexedResources,
  PopulationDefinition,
  PopulationState,
  PopulationStatus,
  RenewalPolicy,
  ResourceAccess,
  ResourceCollectionResult,
  ResourceConditionEvaluator,
  ResourceConditionSource,
  ResourceInspection,
  ResourceNodeDefinition,
  ResourceNodeState,
  ResourceYield,
  ResourcesState,
} from './types';

function inspectPopulationDefinitions(value: unknown): ResourceInspection<{
  populations: PopulationDefinition[];
  byPopulation: Map<string, PopulationDefinition>;
}> {
  if (!Array.isArray(value)) {
    return fail('As definições de recursos são inválidas.');
  }

  const populations: PopulationDefinition[] = [];
  const byPopulation = new Map<string, PopulationDefinition>();

  for (const entry of value) {
    const inspected = inspectPopulationDefinition(entry, byPopulation);
    if (!inspected.ok) {
      return inspected;
    }

    byPopulation.set(inspected.value.id, inspected.value);
    populations.push(inspected.value);
  }

  return { ok: true, value: { populations, byPopulation } };
}

function inspectPopulationDefinition(
  value: unknown,
  seen: ReadonlyMap<string, PopulationDefinition>,
): ResourceInspection<PopulationDefinition> {
  if (!isRecord(value)) {
    return fail('As definições de recursos são inválidas.');
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return fail('A população possui identificador vazio.');
  }

  if (seen.has(value.id)) {
    return fail('As definições possuem identificadores de população duplicados.');
  }

  if (typeof value.speciesId !== 'string' || value.speciesId.trim() === '') {
    return fail('A espécie da população possui identificador vazio.');
  }

  if (!isPositiveSafeInteger(value.carryingCapacity)) {
    return fail('A capacidade da população precisa ser um inteiro positivo.');
  }

  if (!isNonNegativeSafeInteger(value.recoveryPerDay)) {
    return fail('A recuperação diária precisa ser um inteiro não negativo.');
  }

  if (
    !isNonNegativeSafeInteger(value.criticalThreshold) ||
    !isNonNegativeSafeInteger(value.warningThreshold) ||
    value.criticalThreshold >= value.warningThreshold ||
    value.warningThreshold > value.carryingCapacity
  ) {
    return fail('Os limiares da população são incoerentes.');
  }

  return {
    ok: true,
    value: {
      id: value.id,
      speciesId: value.speciesId,
      carryingCapacity: value.carryingCapacity,
      recoveryPerDay: value.recoveryPerDay,
      warningThreshold: value.warningThreshold,
      criticalThreshold: value.criticalThreshold,
    },
  };
}

function inspectNodeDefinition(
  value: unknown,
  map: IndexedMap,
  exploration: IndexedExploration,
  populations: ReadonlyMap<string, PopulationDefinition>,
  seen: ReadonlyMap<string, ResourceNodeDefinition>,
): ResourceInspection<ResourceNodeDefinition> {
  if (!isRecord(value)) {
    return fail('As definições de recursos são inválidas.');
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return fail('O ponto de recurso possui identificador vazio.');
  }

  if (seen.has(value.id)) {
    return fail('As definições possuem identificadores de ponto duplicados.');
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    return fail('O ponto de recurso possui nome vazio.');
  }

  if (typeof value.locationId !== 'string' || value.locationId.trim() === '' || !map.locations.has(value.locationId)) {
    return fail('A localização não existe.');
  }

  if (typeof value.discoveryId !== 'string' || value.discoveryId.trim() === '') {
    return fail('A descoberta não existe.');
  }

  const discovery = exploration.byDiscovery.get(value.discoveryId);
  const discoveryLocation = exploration.locationByDiscovery.get(value.discoveryId);
  if (!discovery) {
    return fail('A descoberta não existe.');
  }

  if (!(RESOURCE_NODE_KINDS as readonly string[]).includes(discovery.kind)) {
    return fail('O tipo de descoberta é incompatível com o ponto de recurso.');
  }

  if (discoveryLocation !== value.locationId) {
    return fail('A descoberta não pertence à localização do ponto.');
  }

  if (!isPositiveSafeInteger(value.capacity)) {
    return fail('A capacidade precisa ser um inteiro positivo.');
  }

  if (value.maxCollectionPerAction !== undefined && !isPositiveSafeInteger(value.maxCollectionPerAction)) {
    return fail('O limite por ação é inválido.');
  }

  const timeCost = inspectTimeCost(value.collectionCost);
  if (!timeCost.ok) {
    return fail(timeCost.reason);
  }

  const renewal = inspectRenewal(value.renewal, populations);
  if (!renewal.ok) {
    return renewal;
  }

  const yields = inspectYields(value.yields);
  if (!yields.ok) {
    return yields;
  }

  let conditions: GameCondition[] | undefined;
  if (value.conditions !== undefined) {
    const inspectedConditions = inspectConditions(value.conditions);
    if (!inspectedConditions.ok) {
      return inspectedConditions;
    }

    conditions = inspectedConditions.value;
  }

  if (value.blockedReason !== undefined && typeof value.blockedReason !== 'string') {
    return fail('O ponto de recurso possui motivo de bloqueio inválido.');
  }

  const definition: ResourceNodeDefinition = {
    id: value.id,
    discoveryId: value.discoveryId,
    locationId: value.locationId,
    name: value.name,
    capacity: value.capacity,
    collectionCost: { periods: timeCost.value.periods },
    renewal: renewal.value,
    yields: yields.value,
  };

  if (value.maxCollectionPerAction !== undefined) {
    definition.maxCollectionPerAction = value.maxCollectionPerAction;
  }

  if (conditions) {
    definition.conditions = conditions;
  }

  if (typeof value.blockedReason === 'string') {
    definition.blockedReason = value.blockedReason;
  }

  return { ok: true, value: definition };
}

function inspectRenewal(
  value: unknown,
  populations: ReadonlyMap<string, PopulationDefinition>,
): ResourceInspection<RenewalPolicy> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('A política de renovação é desconhecida.');
  }

  switch (value.type) {
    case 'none':
      return { ok: true, value: { type: 'none' } };
    case 'short':
      if (!isPositiveSafeInteger(value.periods)) {
        return fail('Os períodos de renovação precisam ser um inteiro positivo.');
      }

      {
        const cost = inspectTimeCost({ periods: value.periods });
        if (!cost.ok) {
          return fail(cost.reason);
        }

        return { ok: true, value: { type: 'short', periods: value.periods } };
      }
    case 'long':
      if (!isPositiveSafeInteger(value.days)) {
        return fail('Os dias de renovação precisam ser um inteiro positivo.');
      }

      return { ok: true, value: { type: 'long', days: value.days } };
    case 'population':
      if (typeof value.populationId !== 'string' || value.populationId.trim() === '') {
        return fail('A população referenciada não existe.');
      }

      if (!populations.has(value.populationId)) {
        return fail('A população referenciada não existe.');
      }

      return { ok: true, value: { type: 'population', populationId: value.populationId } };
    default:
      return fail('A política de renovação é desconhecida.');
  }
}

function inspectYields(value: unknown): ResourceInspection<ResourceYield[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return fail('Os rendimentos do ponto não podem estar vazios.');
  }

  const yields: ResourceYield[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!isRecord(entry)) {
      return fail('Os rendimentos do ponto não podem estar vazios.');
    }

    if (typeof entry.itemId !== 'string' || entry.itemId.trim() === '') {
      return fail('O rendimento possui identificador de item vazio.');
    }

    if (seen.has(entry.itemId)) {
      return fail('O ponto possui rendimentos duplicados.');
    }

    if (!isPositiveSafeInteger(entry.quantityPerUnit)) {
      return fail('A quantidade por unidade precisa ser um inteiro positivo.');
    }

    seen.add(entry.itemId);
    yields.push({ itemId: entry.itemId, quantityPerUnit: entry.quantityPerUnit });
  }

  return { ok: true, value: yields };
}

function inspectNodeStates(
  value: unknown[],
  definitions: IndexedResources,
  timeConfig: readonly PeriodDefinition[],
): ResourceInspection<ResourceNodeState[]> {
  if (value.length !== definitions.nodes.length) {
    return fail(
      value.length < definitions.nodes.length
        ? 'O estado de recursos omite pontos obrigatórios.'
        : 'O estado de recursos possui pontos extras.',
    );
  }

  const seen = new Set<string>();
  const nodes: ResourceNodeState[] = [];

  for (const entry of value) {
    const inspected = inspectNodeState(entry, definitions, seen, timeConfig);
    if (!inspected.ok) {
      return inspected;
    }

    seen.add(inspected.value.nodeId);
    nodes.push(inspected.value);
  }

  for (const definition of definitions.nodes) {
    if (!seen.has(definition.id)) {
      return fail('O estado de recursos omite pontos obrigatórios.');
    }
  }

  return { ok: true, value: nodes };
}

function inspectNodeState(
  value: unknown,
  definitions: IndexedResources,
  seen: ReadonlySet<string>,
  timeConfig: readonly PeriodDefinition[],
): ResourceInspection<ResourceNodeState> {
  if (!isRecord(value)) {
    return fail('O estado de recursos é inválido.');
  }

  if (typeof value.nodeId !== 'string' || value.nodeId.trim() === '') {
    return fail('O estado de recursos possui identificadores inexistentes.');
  }

  if (seen.has(value.nodeId)) {
    return fail('O estado de recursos possui identificadores duplicados.');
  }

  const definition = definitions.byNode.get(value.nodeId);
  if (!definition) {
    return fail('O estado de recursos possui identificadores inexistentes.');
  }

  if (!isNonNegativeSafeInteger(value.availableUnits) || value.availableUnits > definition.capacity) {
    return fail('A disponibilidade do ponto é inválida.');
  }

  if (typeof value.exhausted !== 'boolean') {
    return fail('O esgotamento do ponto é inconsistente.');
  }

  const lastCollectedAt = inspectOptionalTime(value.lastCollectedAt, timeConfig, 'A data do ponto é inválida.');
  if (!lastCollectedAt.ok) {
    return lastCollectedAt;
  }

  const nextRenewalAt = inspectOptionalTime(value.nextRenewalAt, timeConfig, 'A renovação agendada é inválida.');
  if (!nextRenewalAt.ok) {
    return nextRenewalAt;
  }

  if (definition.renewal.type === 'none' || definition.renewal.type === 'population') {
    if (nextRenewalAt.value) {
      return fail('A renovação agendada é inválida.');
    }
  } else if (value.availableUnits === definition.capacity) {
    if (nextRenewalAt.value) {
      return fail('A renovação agendada é inválida.');
    }
  } else {
    if (!lastCollectedAt.value) {
      return fail('A data do ponto é inválida.');
    }

    if (!nextRenewalAt.value) {
      return fail('A renovação agendada é inválida.');
    }

    let expected: TimeState;
    try {
      const scheduled = scheduleRenewal(lastCollectedAt.value, definition.renewal, timeConfig);
      if (!scheduled) {
        return fail('A renovação agendada é inválida.');
      }

      expected = scheduled;
    } catch (error) {
      if (error instanceof ResourceError) {
        return fail('A renovação agendada é inválida.');
      }

      throw error;
    }

    if (!isSameGameTime(nextRenewalAt.value, expected)) {
      return fail('A renovação agendada é inválida.');
    }
  }

  const node: ResourceNodeState = {
    nodeId: value.nodeId,
    availableUnits: value.availableUnits,
    exhausted: value.exhausted,
  };

  if (lastCollectedAt.value) {
    node.lastCollectedAt = lastCollectedAt.value;
  }

  if (nextRenewalAt.value) {
    node.nextRenewalAt = nextRenewalAt.value;
  }

  return { ok: true, value: node };
}

function inspectPopulationStates(
  value: unknown[],
  definitions: IndexedResources,
): ResourceInspection<PopulationState[]> {
  if (value.length !== definitions.populations.length) {
    return fail(
      value.length < definitions.populations.length
        ? 'O estado de recursos omite populações obrigatórias.'
        : 'O estado de recursos possui populações extras.',
    );
  }

  const seen = new Set<string>();
  const populations: PopulationState[] = [];

  for (const entry of value) {
    const inspected = inspectPopulationState(entry, definitions, seen);
    if (!inspected.ok) {
      return inspected;
    }

    seen.add(inspected.value.populationId);
    populations.push(inspected.value);
  }

  for (const definition of definitions.populations) {
    if (!seen.has(definition.id)) {
      return fail('O estado de recursos omite populações obrigatórias.');
    }
  }

  return { ok: true, value: populations };
}

function inspectPopulationState(
  value: unknown,
  definitions: IndexedResources,
  seen: ReadonlySet<string>,
): ResourceInspection<PopulationState> {
  if (!isRecord(value)) {
    return fail('O estado de recursos é inválido.');
  }

  if (typeof value.populationId !== 'string' || value.populationId.trim() === '') {
    return fail('O estado de recursos possui identificadores inexistentes.');
  }

  if (seen.has(value.populationId)) {
    return fail('O estado de recursos possui identificadores duplicados.');
  }

  const definition = definitions.byPopulation.get(value.populationId);
  if (!definition) {
    return fail('O estado de recursos possui identificadores inexistentes.');
  }

  if (!isNonNegativeSafeInteger(value.current) || value.current > definition.carryingCapacity) {
    return fail('A população atual é inválida.');
  }

  if (!isNonNegativeSafeInteger(value.pressure)) {
    return fail('A pressão da população é inválida.');
  }

  if (typeof value.locallyExtinct !== 'boolean' || value.locallyExtinct !== (value.current === 0)) {
    return fail('A extinção local é inconsistente.');
  }

  if (!isPositiveSafeInteger(value.lastRecoveredDay)) {
    return fail('O dia de recuperação é inválido.');
  }

  return {
    ok: true,
    value: {
      populationId: value.populationId,
      current: value.current,
      pressure: value.pressure,
      locallyExtinct: value.locallyExtinct,
      lastRecoveredDay: value.lastRecoveredDay,
    },
  };
}

function inspectOptionalTime(
  value: unknown,
  timeConfig: readonly PeriodDefinition[],
  reason: string,
): ResourceInspection<TimeState | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  const inspected = inspectTimeState(value, timeConfig);
  if (!inspected.ok) {
    return fail(reason);
  }

  return { ok: true, value: inspected.value };
}

function inspectConditions(value: unknown): ResourceInspection<GameCondition[]> {
  if (!Array.isArray(value)) {
    return fail('O ponto de recurso possui condições malformadas.');
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

function inspectCondition(value: unknown): ResourceInspection<GameCondition> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('O ponto de recurso possui condições malformadas.');
  }

  switch (value.type) {
    case 'flag.is':
      if (typeof value.flag !== 'string' || value.flag.trim() === '' || typeof value.value !== 'boolean') {
        return fail('O ponto de recurso possui condições malformadas.');
      }
      return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
    case 'attribute.min':
    case 'attribute.max':
      if (!isAttributeId(value.attribute) || !isFiniteNumber(value.amount)) {
        return fail('O ponto de recurso possui condições malformadas.');
      }
      return {
        ok: true,
        value: { type: value.type, attribute: value.attribute, amount: value.amount },
      };
    case 'inventory.has':
      if (typeof value.itemId !== 'string' || value.itemId.trim() === '') {
        return fail('O ponto de recurso possui condições malformadas.');
      }
      if (value.quantity !== undefined && !isPositiveInteger(value.quantity)) {
        return fail('O ponto de recurso possui condições malformadas.');
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
        return fail('O ponto de recurso possui condições malformadas.');
      }
      return {
        ok: true,
        value: { type: 'relationship.min', characterId: value.characterId, amount: value.amount },
      };
    default:
      return fail('O ponto de recurso possui condições malformadas.');
  }
}

function collectionBlockReason(
  currentLocationId: string,
  explorationState: ExplorationState,
  exploration: IndexedExploration,
  definition: ResourceNodeDefinition,
  population: PopulationState | undefined,
  max: number,
  evaluate: ResourceConditionEvaluator | undefined,
): string | undefined {
  if (currentLocationId !== definition.locationId) {
    return WRONG_LOCATION_REASON;
  }

  if (!isDiscoveryRevealed(explorationState, exploration, definition)) {
    return UNREVEALED_RESOURCE_REASON;
  }

  if (!areConditionsSatisfied(definition.conditions, evaluate)) {
    return definition.blockedReason && definition.blockedReason.trim() !== ''
      ? definition.blockedReason
      : DEFAULT_RESOURCE_BLOCKED_REASON;
  }

  if (population?.locallyExtinct || population?.current === 0) {
    return EXTINCT_POPULATION_REASON;
  }

  if (max <= 0) {
    return population ? UNAVAILABLE_RESOURCE_REASON : EXHAUSTED_RESOURCE_REASON;
  }

  return undefined;
}

function isDiscoveryRevealed(
  explorationState: ExplorationState,
  exploration: IndexedExploration,
  definition: ResourceNodeDefinition,
): boolean {
  const owner = exploration.locationByDiscovery.get(definition.discoveryId);
  if (owner !== definition.locationId) {
    return false;
  }

  const location = explorationState.locations.find((entry) => entry.locationId === definition.locationId);
  return location?.revealedDiscoveryIds.includes(definition.discoveryId) === true;
}

function maxCollectable(
  indexed: IndexedResources,
  definition: ResourceNodeDefinition,
  availableUnits: number,
  population: PopulationState | undefined,
): number {
  let max = effectiveUnits(availableUnits, population);
  if (definition.maxCollectionPerAction !== undefined && definition.maxCollectionPerAction < max) {
    max = definition.maxCollectionPerAction;
  }

  if (!population || definition.renewal.type !== 'population') {
    return max;
  }

  const populationDefinition = indexed.byPopulation.get(definition.renewal.populationId);
  if (!populationDefinition) {
    throw new RESOURCE_ERROR('A população referenciada não existe.');
  }

  const status = derivePopulationStatus(populationDefinition, population);
  if (status === 'exhausted') {
    return 0;
  }

  if (status === 'declining' || status === 'threatened') {
    return max < 1 ? 0 : 1;
  }

  return max;
}

function effectiveUnits(availableUnits: number, population: PopulationState | undefined): number {
  if (!population) {
    return availableUnits;
  }

  if (population.locallyExtinct || population.current === 0) {
    return 0;
  }

  return availableUnits < population.current ? availableUnits : population.current;
}

function isNodeExhausted(availableUnits: number, population: PopulationState | undefined): boolean {
  if (availableUnits === 0) {
    return true;
  }

  return population !== undefined && (population.locallyExtinct || population.current === 0);
}

function linkedPopulation(
  state: ResourcesState,
  definition: ResourceNodeDefinition,
): PopulationState | undefined {
  if (definition.renewal.type !== 'population') {
    return undefined;
  }

  return getPopulation(state, definition.renewal.populationId);
}

function computeYields(
  yields: readonly ResourceYield[],
  collectedUnits: number,
): Array<{ itemId: string; quantity: number }> {
  return yields.map((entry) => ({
    itemId: entry.itemId,
    quantity: multiplySafe(collectedUnits, entry.quantityPerUnit),
  }));
}

function applyYields(
  inventory: InventoryItem[],
  yields: Array<{ itemId: string; quantity: number }>,
): InventoryItem[] {
  let next = copyInventory(inventory);
  for (const entry of yields) {
    const existing = next.find((item) => item.itemId === entry.itemId)?.quantity ?? 0;
    if (existing > 0) {
      addSafe(existing, entry.quantity);
    }

    next = addItem(next, entry.itemId, entry.quantity);
  }

  return next;
}

function applyNodeCollection(
  definition: ResourceNodeDefinition,
  previous: ResourceNodeState,
  collectedUnits: number,
  collectedAt: TimeState,
  population: PopulationState | undefined,
  timeConfig: readonly PeriodDefinition[],
): ResourceNodeState {
  const availableUnits = previous.availableUnits - collectedUnits;
  const next: ResourceNodeState = {
    nodeId: previous.nodeId,
    availableUnits,
    lastCollectedAt: copyTime(collectedAt),
    exhausted: isNodeExhausted(availableUnits, population),
  };

  if (definition.renewal.type === 'short' || definition.renewal.type === 'long') {
    const scheduled = scheduleRenewal(collectedAt, definition.renewal, timeConfig);
    if (!scheduled) {
      throw new RESOURCE_ERROR('A renovação agendada é inválida.');
    }

    next.nextRenewalAt = scheduled;
  }

  return next;
}

function applyPopulationCollection(previous: PopulationState, collectedUnits: number): PopulationState {
  const current = previous.current - collectedUnits;
  return {
    populationId: previous.populationId,
    current,
    pressure: addSafe(previous.pressure, collectedUnits),
    locallyExtinct: current === 0,
    lastRecoveredDay: previous.lastRecoveredDay,
  };
}

function upsertCollectionState(
  state: ResourcesState,
  definitions: IndexedResources,
  currentNode: ResourceNodeState,
  currentPopulation: PopulationState | undefined,
): ResourcesState {
  const populationId = currentPopulation?.populationId;
  return {
    nodes: state.nodes.map((node) => {
      if (node.nodeId === currentNode.nodeId) {
        return copyNodeState(currentNode);
      }

      if (!populationId) {
        return copyNodeState(node);
      }

      const definition = definitions.byNode.get(node.nodeId);
      if (definition?.renewal.type === 'population' && definition.renewal.populationId === populationId) {
        const copied = copyNodeState(node);
        copied.exhausted = isNodeExhausted(copied.availableUnits, currentPopulation);
        return copied;
      }

      return copyNodeState(node);
    }),
    populations: state.populations.map((population) =>
      currentPopulation && population.populationId === currentPopulation.populationId
        ? copyPopulationState(currentPopulation)
        : copyPopulationState(population),
    ),
  };
}

function copyState(state: ResourcesState): ResourcesState {
  return {
    nodes: state.nodes.map(copyNodeState),
    populations: state.populations.map(copyPopulationState),
  };
}

function copyPopulationState(state: PopulationState): PopulationState {
  return {
    populationId: state.populationId,
    current: state.current,
    pressure: state.pressure,
    locallyExtinct: state.locallyExtinct,
    lastRecoveredDay: state.lastRecoveredDay,
  };
}

function copyInventory(items: readonly InventoryItem[]): InventoryItem[] {
  return items.map((item) => ({ itemId: item.itemId, quantity: item.quantity }));
}

function copyYield(yieldItem: ResourceYield): ResourceYield {
  return { itemId: yieldItem.itemId, quantityPerUnit: yieldItem.quantityPerUnit };
}

function areConditionsSatisfied(
  conditions: readonly GameCondition[] | undefined,
  evaluate: ResourceConditionEvaluator | undefined,
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

function resolveEvaluator(source: ResourceConditionSource | undefined): ResourceConditionEvaluator | undefined {
  if (source === undefined) {
    return undefined;
  }

  if (typeof source === 'function') {
    return source;
  }

  return createResourceEvaluator(source);
}

function requireCollectionContext(
  map: IndexedMap,
  navigation: NavigationState,
  exploration: IndexedExploration,
  explorationState: ExplorationState,
  definitions: IndexedResources,
  state: ResourcesState,
  timeConfig: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): {
  map: IndexedMap;
  navigation: NavigationState;
  exploration: IndexedExploration;
  explorationState: ExplorationState;
  definitions: IndexedResources;
  state: ResourcesState;
} {
  const indexedMap = requireIndexedMap(map);
  const currentNavigation = requireNavigation(navigation, indexedMap);
  const indexedExploration = requireIndexedExploration(exploration);
  const currentExploration = requireExplorationState(explorationState, indexedExploration, indexedMap);
  const indexedDefinitions = requireIndexedDefinitions(definitions);
  const currentState = requireState(state, indexedDefinitions, timeConfig);

  return {
    map: indexedMap,
    navigation: currentNavigation,
    exploration: indexedExploration,
    explorationState: currentExploration,
    definitions: indexedDefinitions,
    state: currentState,
  };
}

function requireIndexedMap(map: IndexedMap): IndexedMap {
  const inspected = inspectIndexedMap(map);
  if (!inspected.ok) {
    throw new RESOURCE_ERROR(inspected.reason);
  }

  return inspected.value;
}

function requireIndexedExploration(exploration: IndexedExploration): IndexedExploration {
  const inspected = inspectIndexedExploration(exploration);
  if (!inspected.ok) {
    throw new RESOURCE_ERROR(inspected.reason);
  }

  return inspected.value;
}

function requireIndexedDefinitions(definitions: IndexedResources): IndexedResources {
  const inspected = inspectIndexedDefinitions(definitions);
  if (!inspected.ok) {
    throw new RESOURCE_ERROR(inspected.reason);
  }

  return inspected.value;
}

function requireNavigation(state: NavigationState, map: IndexedMap): NavigationState {
  const inspected = inspectNavigationState(state, map);
  if (!inspected.ok) {
    throw new RESOURCE_ERROR(inspected.reason);
  }

  return inspected.value;
}

function requireExplorationState(
  state: ExplorationState,
  definitions: IndexedExploration,
  map: IndexedMap,
): ExplorationState {
  const inspected = inspectExplorationState(state, definitions, map);
  if (!inspected.ok) {
    throw new RESOURCE_ERROR(inspected.reason);
  }

  return inspected.value;
}

function requireState(
  state: ResourcesState,
  definitions: IndexedResources,
  timeConfig: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): ResourcesState {
  const inspected = inspectResourcesState(state, definitions, timeConfig);
  if (!inspected.ok) {
    throw new RESOURCE_ERROR(inspected.reason);
  }

  return inspected.value;
}

function requireNodeDefinition(definitions: IndexedResources, nodeId: string): ResourceNodeDefinition {
  if (typeof nodeId !== 'string' || nodeId.trim() === '') {
    throw new RESOURCE_ERROR('O ponto de recurso não existe.');
  }

  const definition = definitions.byNode.get(nodeId);
  if (!definition) {
    throw new RESOURCE_ERROR('O ponto de recurso não existe.');
  }

  return definition;
}

function requirePopulationDefinition(
  definitions: IndexedResources,
  populationId: string,
): PopulationDefinition {
  if (typeof populationId !== 'string' || populationId.trim() === '') {
    throw new RESOURCE_ERROR('A população não existe.');
  }

  const definition = definitions.byPopulation.get(populationId);
  if (!definition) {
    throw new RESOURCE_ERROR('A população não existe.');
  }

  return definition;
}

function requireInventory(value: unknown): InventoryItem[] {
  if (!Array.isArray(value)) {
    throw new RESOURCE_ERROR('O inventário é inválido.');
  }

  const seen = new Set<string>();
  const items: InventoryItem[] = [];

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.itemId !== 'string' || entry.itemId.trim() === '') {
      throw new RESOURCE_ERROR('O inventário é inválido.');
    }

    if (!isPositiveSafeInteger(entry.quantity) || seen.has(entry.itemId)) {
      throw new RESOURCE_ERROR('O inventário é inválido.');
    }

    seen.add(entry.itemId);
    items.push({ itemId: entry.itemId, quantity: entry.quantity });
  }

  return items;
}

function requireTime(value: TimeState, timeConfig: readonly PeriodDefinition[]): TimeState {
  const inspected = inspectTimeState(value, timeConfig);
  if (!inspected.ok) {
    throw new RESOURCE_ERROR('A data do ponto é inválida.');
  }

  return inspected.value;
}

function requireEvents(events: readonly DayCycleEvent[]): DayCycleEvent[] {
  if (!Array.isArray(events)) {
    throw new RESOURCE_ERROR('Os eventos do ciclo diário são inválidos.');
  }

  return events.map((event) => inspectEvent(event));
}

function inspectEvent(value: unknown): DayCycleEvent {
  if (!isRecord(value) || typeof value.type !== 'string' || !isPositiveSafeInteger(value.day)) {
    throw new RESOURCE_ERROR('Os eventos do ciclo diário são inválidos.');
  }

  switch (value.type) {
    case 'day.started':
    case 'day.ended':
      return { type: value.type, day: value.day };
    case 'period.ended':
    case 'period.started':
      if (typeof value.periodId !== 'string' || value.periodId.trim() === '') {
        throw new RESOURCE_ERROR('Os eventos do ciclo diário são inválidos.');
      }

      return { type: value.type, day: value.day, periodId: value.periodId };
    default:
      throw new RESOURCE_ERROR('Os eventos do ciclo diário são inválidos.');
  }
}

function inspectIndexedMap(map: unknown): ResourceInspection<IndexedMap> {
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

function inspectIndexedExploration(definitions: unknown): ResourceInspection<IndexedExploration> {
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

function inspectIndexedDefinitions(definitions: unknown): ResourceInspection<IndexedResources> {
  if (
    !isRecord(definitions) ||
    !Array.isArray(definitions.nodes) ||
    !Array.isArray(definitions.populations) ||
    !(definitions.byNode instanceof Map) ||
    !(definitions.byPopulation instanceof Map) ||
    !(definitions.nodesByPopulation instanceof Map)
  ) {
    return fail('As definições de recursos são inválidas.');
  }

  return { ok: true, value: definitions as unknown as IndexedResources };
}

function addSafe(left: number, right: number): number {
  if (right > Number.MAX_SAFE_INTEGER - left) {
    throw new RESOURCE_ERROR('A soma ultrapassa o inteiro seguro.');
  }

  return left + right;
}

function multiplySafe(left: number, right: number): number {
  if (left === 0 || right === 0) {
    return 0;
  }

  if (left > Number.MAX_SAFE_INTEGER / right) {
    throw new RESOURCE_ERROR('A multiplicação ultrapassa o inteiro seguro.');
  }

  return left * right;
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

function fail(reason: string): ResourceInspection<never> {
  return { ok: false, reason };
}
