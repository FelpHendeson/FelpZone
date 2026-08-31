import { evaluateConditions, type GameCondition, type ImageReference } from '../../core/events';
import { isAttributeId, type GameState } from '../../core/state';
import { inspectTimeCost, type TimeCost } from '../time';
import { DEFAULT_STARTING_LOCATION_ID, INITIAL_WORLD_MAP } from './initial-map';
import type {
  IndexedMap,
  LocationAccess,
  LocationNode,
  LocationRelation,
  LocationVisibility,
  NavigationConditionSource,
  NavigationDestination,
  NavigationInspection,
  NavigationMoveResult,
  NavigationState,
  UnlockConditionEvaluator,
} from './types';

export class NavigationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NavigationError';
  }
}

export const DEFAULT_LOCKED_REASON = 'Este local está bloqueado.';
export const ZERO_TRAVEL_COST: TimeCost = { periods: 0 };

const IMAGE_KINDS = ['scene', 'portrait', 'icon'] as const;
const VISIBILITIES = ['known', 'hidden'] as const;

export function inspectNavigationMap(
  value: unknown,
  startingLocationId?: string,
): NavigationInspection<IndexedMap> {
  if (Array.isArray(value)) {
    if (value.length > 1) {
      return fail('O mapa possui mais de uma raiz.');
    }

    return fail('A raiz do mapa está ausente ou é inválida.');
  }

  if (!isRecord(value)) {
    return fail('A raiz do mapa está ausente ou é inválida.');
  }

  const locations = new Map<string, LocationNode>();
  const parents = new Map<string, string>();
  const children = new Map<string, string[]>();
  const seenObjects = new WeakSet<object>();
  const stack = new Set<object>();
  const indexed = indexNode(value, undefined, locations, parents, children, seenObjects, stack);

  if (!indexed.ok) {
    return indexed;
  }

  if (startingLocationId !== undefined) {
    if (typeof startingLocationId !== 'string' || startingLocationId.trim() === '') {
      return fail('A localização inicial não existe.');
    }

    if (!locations.has(startingLocationId)) {
      return fail('A localização inicial não existe.');
    }
  }

  const childIndex = new Map<string, readonly string[]>();
  for (const [id, childIds] of children) {
    childIndex.set(id, Object.freeze([...childIds]));
  }

  for (const id of locations.keys()) {
    if (!childIndex.has(id)) {
      childIndex.set(id, Object.freeze([]));
    }
  }

  return {
    ok: true,
    value: {
      root: indexed.value,
      locations,
      parents,
      children: childIndex,
    },
  };
}

export function indexNavigationMap(value: unknown, startingLocationId?: string): IndexedMap {
  return requireMap(value, startingLocationId);
}

export function createInitialNavigation(
  map: unknown = INITIAL_WORLD_MAP,
  startingLocationId: string = DEFAULT_STARTING_LOCATION_ID,
): NavigationState {
  requireMap(map, startingLocationId);
  return {
    currentLocationId: startingLocationId,
    discoveredLocationIds: [startingLocationId],
    unlockedLocationIds: [startingLocationId],
    visitedLocationIds: [startingLocationId],
  };
}

export function inspectNavigationState(
  state: unknown,
  map: IndexedMap,
): NavigationInspection<NavigationState> {
  if (!isRecord(state)) {
    return fail('O estado de navegação é inválido.');
  }

  if (typeof state.currentLocationId !== 'string' || state.currentLocationId.trim() === '') {
    return fail('A localização atual é inválida.');
  }

  const discovered = readUniqueExistingIds(state.discoveredLocationIds, map);
  if (!discovered.ok) {
    return discovered;
  }

  const unlocked = readUniqueExistingIds(state.unlockedLocationIds, map);
  if (!unlocked.ok) {
    return unlocked;
  }

  const visited = readUniqueExistingIds(state.visitedLocationIds, map);
  if (!visited.ok) {
    return visited;
  }

  const discoveredSet = new Set(discovered.value);
  const unlockedSet = new Set(unlocked.value);

  for (const locationId of visited.value) {
    if (!discoveredSet.has(locationId) || !unlockedSet.has(locationId)) {
      return fail('Um local visitado precisa estar descoberto e desbloqueado.');
    }
  }

  if (
    !map.locations.has(state.currentLocationId) ||
    !discoveredSet.has(state.currentLocationId) ||
    !unlockedSet.has(state.currentLocationId) ||
    !visited.value.includes(state.currentLocationId)
  ) {
    return fail('A localização atual precisa estar descoberta, desbloqueada e visitada.');
  }

  return {
    ok: true,
    value: {
      currentLocationId: state.currentLocationId,
      discoveredLocationIds: discovered.value,
      unlockedLocationIds: unlocked.value,
      visitedLocationIds: visited.value,
    },
  };
}

export function getLocation(map: IndexedMap, locationId: string): LocationNode {
  const location = requireIndexed(map).locations.get(locationId);
  if (!location) {
    throw new NavigationError('A localização não existe.');
  }

  return location;
}

export function getCurrentLocation(map: IndexedMap, state: NavigationState): LocationNode {
  const current = requireState(state, map);
  return getLocation(map, current.currentLocationId);
}

export function getParentLocation(map: IndexedMap, locationId: string): LocationNode | undefined {
  const indexed = requireIndexed(map);
  requireLocation(indexed, locationId);
  const parentId = indexed.parents.get(locationId);
  return parentId === undefined ? undefined : getLocation(indexed, parentId);
}

export function getChildLocations(map: IndexedMap, locationId: string): LocationNode[] {
  const indexed = requireIndexed(map);
  requireLocation(indexed, locationId);
  return (indexed.children.get(locationId) ?? []).map((childId) => getLocation(indexed, childId));
}

export function getSiblingLocations(map: IndexedMap, locationId: string): LocationNode[] {
  const indexed = requireIndexed(map);
  requireLocation(indexed, locationId);
  const parentId = indexed.parents.get(locationId);
  if (parentId === undefined) {
    return [];
  }

  return (indexed.children.get(parentId) ?? [])
    .filter((siblingId) => siblingId !== locationId)
    .map((siblingId) => getLocation(indexed, siblingId));
}

export function getLocationPath(map: IndexedMap, locationId: string): LocationNode[] {
  const indexed = requireIndexed(map);
  requireLocation(indexed, locationId);

  const path: LocationNode[] = [];
  let currentId: string | undefined = locationId;

  while (currentId !== undefined) {
    path.push(getLocation(indexed, currentId));
    currentId = indexed.parents.get(currentId);
  }

  return path.reverse();
}

export function getLocationRelation(
  map: IndexedMap,
  fromLocationId: string,
  toLocationId: string,
): LocationRelation | undefined {
  const indexed = requireIndexed(map);
  requireLocation(indexed, fromLocationId);
  requireLocation(indexed, toLocationId);

  if (fromLocationId === toLocationId) {
    return undefined;
  }

  if (indexed.parents.get(fromLocationId) === toLocationId) {
    return 'parent';
  }

  if ((indexed.children.get(fromLocationId) ?? []).includes(toLocationId)) {
    return 'child';
  }

  const parentId = indexed.parents.get(fromLocationId);
  if (parentId !== undefined && (indexed.children.get(parentId) ?? []).includes(toLocationId)) {
    return 'sibling';
  }

  return undefined;
}

export function listVisibleDestinations(
  map: IndexedMap,
  state: NavigationState,
  conditions?: NavigationConditionSource,
): NavigationDestination[] {
  const indexed = requireIndexed(map);
  const current = requireState(state, indexed);
  const evaluate = resolveEvaluator(conditions);
  const candidates = collectAdjacent(indexed, current.currentLocationId);
  const destinations: NavigationDestination[] = [];

  for (const [locationId, relation] of candidates) {
    if (!isDiscovered(current, locationId)) {
      continue;
    }

    const location = getLocation(indexed, locationId);
    destinations.push(createDestination(current, location, relation, evaluate));
  }

  return destinations;
}

export function inspectLocationAccess(
  map: IndexedMap,
  state: NavigationState,
  locationId: string,
  conditions?: NavigationConditionSource,
): LocationAccess {
  const indexed = requireIndexed(map);
  const current = requireState(state, indexed);
  const location = getLocation(indexed, locationId);
  const travelCost = readTravelCost(location);
  const evaluate = resolveEvaluator(conditions);

  if (!isDiscovered(current, locationId)) {
    return {
      accessible: false,
      blockedReason: 'Este local ainda não foi descoberto.',
      travelCost,
    };
  }

  const blockedReason = blockedReasonFor(current, location, evaluate);
  if (blockedReason) {
    return {
      accessible: false,
      blockedReason,
      travelCost,
    };
  }

  return {
    accessible: true,
    travelCost,
  };
}

export function discoverLocation(map: IndexedMap, state: NavigationState, locationId: string): NavigationState {
  const indexed = requireIndexed(map);
  const current = requireState(state, indexed);
  requireLocation(indexed, locationId);

  if (current.discoveredLocationIds.includes(locationId)) {
    return copyState(current);
  }

  return {
    ...copyState(current),
    discoveredLocationIds: [...current.discoveredLocationIds, locationId],
  };
}

export function unlockLocation(map: IndexedMap, state: NavigationState, locationId: string): NavigationState {
  const indexed = requireIndexed(map);
  const current = requireState(state, indexed);
  requireLocation(indexed, locationId);

  if (current.unlockedLocationIds.includes(locationId)) {
    return copyState(current);
  }

  return {
    ...copyState(current),
    unlockedLocationIds: [...current.unlockedLocationIds, locationId],
  };
}

export function moveToLocation(
  map: IndexedMap,
  state: NavigationState,
  locationId: string,
  conditions?: NavigationConditionSource,
): NavigationMoveResult {
  const indexed = requireIndexed(map);
  const previous = requireState(state, indexed);
  if (!indexed.locations.has(locationId)) {
    throw new NavigationError('O destino não existe.');
  }

  const destination = getLocation(indexed, locationId);
  const evaluate = resolveEvaluator(conditions);
  const relation = getLocationRelation(indexed, previous.currentLocationId, locationId);

  if (!isDiscovered(previous, locationId)) {
    throw new NavigationError('O destino ainda não foi descoberto.');
  }

  const blockedReason = blockedReasonFor(previous, destination, evaluate);
  if (blockedReason) {
    throw new NavigationError(blockedReason);
  }

  if (!relation) {
    throw new NavigationError('O destino não é adjacente à localização atual.');
  }

  const visitedLocationIds = previous.visitedLocationIds.includes(locationId)
    ? [...previous.visitedLocationIds]
    : [...previous.visitedLocationIds, locationId];

  return {
    previous,
    current: {
      currentLocationId: locationId,
      discoveredLocationIds: [...previous.discoveredLocationIds],
      unlockedLocationIds: [...previous.unlockedLocationIds],
      visitedLocationIds,
    },
    fromLocationId: previous.currentLocationId,
    toLocationId: locationId,
    relation,
    travelCost: readTravelCost(destination),
  };
}

export function getTravelCost(map: IndexedMap, locationId: string): TimeCost {
  return readTravelCost(getLocation(map, locationId));
}

export function createUnlockEvaluator(state: GameState): UnlockConditionEvaluator {
  return (conditions) => evaluateConditions(conditions, state);
}

export { DEFAULT_STARTING_LOCATION_ID, INITIAL_WORLD_MAP };
export type {
  IndexedMap,
  LocationAccess,
  LocationNode,
  LocationRelation,
  LocationVisibility,
  NavigationConditionSource,
  NavigationDestination,
  NavigationInspection,
  NavigationMoveResult,
  NavigationState,
  UnlockConditionEvaluator,
} from './types';

function indexNode(
  value: unknown,
  parentId: string | undefined,
  locations: Map<string, LocationNode>,
  parents: Map<string, string>,
  children: Map<string, string[]>,
  seenObjects: WeakSet<object>,
  stack: Set<object>,
): NavigationInspection<LocationNode> {
  if (!isRecord(value)) {
    return fail('A raiz do mapa está ausente ou é inválida.');
  }

  if (stack.has(value)) {
    return fail('O mapa possui um ciclo.');
  }

  if (seenObjects.has(value)) {
    return fail('O mapa possui o mesmo nó em mais de um ponto.');
  }

  stack.add(value);
  seenObjects.add(value);

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return fail('A localização possui identificador vazio.');
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    return fail('A localização possui nome vazio.');
  }

  if (locations.has(value.id)) {
    return fail('O mapa possui identificadores duplicados.');
  }

  if (value.visibility !== undefined && !isVisibility(value.visibility)) {
    return fail('A localização possui visibilidade desconhecida.');
  }

  if (value.travelCost !== undefined && !inspectTimeCost(value.travelCost).ok) {
    return fail('A localização possui custo de viagem inválido.');
  }

  if (value.unlockConditions !== undefined && !inspectConditions(value.unlockConditions).ok) {
    return fail('A localização possui condições malformadas.');
  }

  if (value.image !== undefined && !inspectImage(value.image).ok) {
    return fail('A localização possui imagem malformada.');
  }

  if (value.lockedReason !== undefined && typeof value.lockedReason !== 'string') {
    return fail('A localização possui motivo de bloqueio inválido.');
  }

  if (value.description !== undefined && typeof value.description !== 'string') {
    return fail('A localização possui descrição inválida.');
  }

  const node = value as unknown as LocationNode;
  locations.set(node.id, node);
  children.set(node.id, []);

  if (parentId !== undefined) {
    parents.set(node.id, parentId);
    children.get(parentId)?.push(node.id);
  }

  if (value.children !== undefined) {
    if (!Array.isArray(value.children)) {
      return fail('A localização possui filhos inválidos.');
    }

    const childIds = new Set<string>();
    const childObjects = new Set<object>();

    for (const child of value.children) {
      if (!isRecord(child)) {
        return fail('A localização possui filhos inválidos.');
      }

      if (childObjects.has(child)) {
        return fail('A localização possui filhos duplicados.');
      }

      childObjects.add(child);

      if (typeof child.id === 'string') {
        if (childIds.has(child.id)) {
          return fail('A localização possui filhos duplicados.');
        }

        childIds.add(child.id);
      }

      const indexedChild = indexNode(child, node.id, locations, parents, children, seenObjects, stack);
      if (!indexedChild.ok) {
        return indexedChild;
      }
    }
  }

  stack.delete(value);
  return { ok: true, value: node };
}

function collectAdjacent(map: IndexedMap, locationId: string): Array<[string, LocationRelation]> {
  const adjacent: Array<[string, LocationRelation]> = [];
  const parentId = map.parents.get(locationId);

  if (parentId !== undefined) {
    adjacent.push([parentId, 'parent']);
  }

  for (const childId of map.children.get(locationId) ?? []) {
    adjacent.push([childId, 'child']);
  }

  if (parentId !== undefined) {
    for (const siblingId of map.children.get(parentId) ?? []) {
      if (siblingId !== locationId) {
        adjacent.push([siblingId, 'sibling']);
      }
    }
  }

  return adjacent;
}

function createDestination(
  state: NavigationState,
  location: LocationNode,
  relation: LocationRelation,
  evaluate: UnlockConditionEvaluator | undefined,
): NavigationDestination {
  const blockedReason = blockedReasonFor(state, location, evaluate);
  const destination: NavigationDestination = {
    location,
    relation,
    accessible: blockedReason === undefined,
    travelCost: readTravelCost(location),
  };

  if (blockedReason) {
    destination.blockedReason = blockedReason;
  }

  return destination;
}

function blockedReasonFor(
  state: NavigationState,
  location: LocationNode,
  evaluate: UnlockConditionEvaluator | undefined,
): string | undefined {
  const unlocked = state.unlockedLocationIds.includes(location.id);
  const conditionsSatisfied = areConditionsSatisfied(location.unlockConditions, evaluate);

  if (unlocked && conditionsSatisfied) {
    return undefined;
  }

  return location.lockedReason && location.lockedReason.trim() !== ''
    ? location.lockedReason
    : DEFAULT_LOCKED_REASON;
}

function areConditionsSatisfied(
  conditions: GameCondition[] | undefined,
  evaluate: UnlockConditionEvaluator | undefined,
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  if (!evaluate) {
    return false;
  }

  return evaluate(conditions);
}

function resolveEvaluator(source: NavigationConditionSource | undefined): UnlockConditionEvaluator | undefined {
  if (source === undefined) {
    return undefined;
  }

  if (typeof source === 'function') {
    return source;
  }

  return createUnlockEvaluator(source);
}

function readTravelCost(location: LocationNode): TimeCost {
  if (location.travelCost === undefined) {
    return { ...ZERO_TRAVEL_COST };
  }

  const inspected = inspectTimeCost(location.travelCost);
  if (!inspected.ok) {
    throw new NavigationError('A localização possui custo de viagem inválido.');
  }

  return { periods: inspected.value.periods };
}

function readUniqueExistingIds(value: unknown, map: IndexedMap): NavigationInspection<string[]> {
  if (!Array.isArray(value)) {
    return fail('O estado de navegação é inválido.');
  }

  const seen = new Set<string>();
  const ids: string[] = [];

  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      return fail('O estado de navegação é inválido.');
    }

    if (seen.has(entry)) {
      return fail('O estado de navegação possui identificadores duplicados.');
    }

    if (!map.locations.has(entry)) {
      return fail('O estado de navegação possui identificadores inexistentes.');
    }

    seen.add(entry);
    ids.push(entry);
  }

  return { ok: true, value: ids };
}

function inspectConditions(value: unknown): NavigationInspection<GameCondition[]> {
  if (!Array.isArray(value)) {
    return fail('A localização possui condições malformadas.');
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

function inspectCondition(value: unknown): NavigationInspection<GameCondition> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('A localização possui condições malformadas.');
  }

  switch (value.type) {
    case 'flag.is':
      if (typeof value.flag !== 'string' || value.flag.trim() === '' || typeof value.value !== 'boolean') {
        return fail('A localização possui condições malformadas.');
      }
      return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
    case 'attribute.min':
    case 'attribute.max':
      if (!isAttributeId(value.attribute) || !isFiniteNumber(value.amount)) {
        return fail('A localização possui condições malformadas.');
      }
      return {
        ok: true,
        value: { type: value.type, attribute: value.attribute, amount: value.amount },
      };
    case 'inventory.has':
      if (typeof value.itemId !== 'string' || value.itemId.trim() === '') {
        return fail('A localização possui condições malformadas.');
      }
      if (value.quantity !== undefined && !isPositiveInteger(value.quantity)) {
        return fail('A localização possui condições malformadas.');
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
        return fail('A localização possui condições malformadas.');
      }
      return {
        ok: true,
        value: { type: 'relationship.min', characterId: value.characterId, amount: value.amount },
      };
    default:
      return fail('A localização possui condições malformadas.');
  }
}

function inspectImage(value: unknown): NavigationInspection<ImageReference> {
  if (!isRecord(value) || !isImageKind(value.kind) || typeof value.label !== 'string' || value.label.trim() === '') {
    return fail('A localização possui imagem malformada.');
  }

  return {
    ok: true,
    value: { kind: value.kind, label: value.label },
  };
}

function requireMap(value: unknown, startingLocationId?: string): IndexedMap {
  const inspected = inspectNavigationMap(value, startingLocationId);
  if (!inspected.ok) {
    throw new NavigationError(inspected.reason);
  }

  return inspected.value;
}

function requireIndexed(map: IndexedMap): IndexedMap {
  if (
    !isRecord(map) ||
    !(map.locations instanceof Map) ||
    !(map.parents instanceof Map) ||
    !(map.children instanceof Map)
  ) {
    throw new NavigationError('O mapa indexado é inválido.');
  }

  return map;
}

function requireState(state: NavigationState, map: IndexedMap): NavigationState {
  const inspected = inspectNavigationState(state, map);
  if (!inspected.ok) {
    throw new NavigationError(inspected.reason);
  }

  return inspected.value;
}

function requireLocation(map: IndexedMap, locationId: string): LocationNode {
  return getLocation(map, locationId);
}

function isDiscovered(state: NavigationState, locationId: string): boolean {
  return state.discoveredLocationIds.includes(locationId);
}

function copyState(state: NavigationState): NavigationState {
  return {
    currentLocationId: state.currentLocationId,
    discoveredLocationIds: [...state.discoveredLocationIds],
    unlockedLocationIds: [...state.unlockedLocationIds],
    visitedLocationIds: [...state.visitedLocationIds],
  };
}

function isVisibility(value: unknown): value is LocationVisibility {
  return typeof value === 'string' && (VISIBILITIES as readonly string[]).includes(value);
}

function isImageKind(value: unknown): value is ImageReference['kind'] {
  return typeof value === 'string' && (IMAGE_KINDS as readonly string[]).includes(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): NavigationInspection<never> {
  return { ok: false, reason };
}
