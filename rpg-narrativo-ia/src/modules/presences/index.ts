import { evaluateConditions, type GameCondition, type ImageReference } from '../../core/events';
import { isAttributeId, type GameState } from '../../core/state/types';
import type { IndexedExploration } from '../exploration';
import type { IndexedMap } from '../navigation';
import { INITIAL_PRESENCE_CATALOG } from './initial-presences';
import {
  WORLD_ENTITY_KINDS,
  type IndexedPresences,
  type PresenceConditionEvaluator,
  type PresenceConditionSource,
  type PresenceInspection,
  type PresenceState,
  type PresenceStatus,
  type WorldEntityDefinition,
  type WorldEntityKind,
  type WorldPresenceDefinition,
} from './types';

export class PresenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PresenceError';
  }
}

const IMAGE_KINDS = ['scene', 'portrait', 'icon'] as const;

export function inspectPresenceCatalog(
  value: unknown,
  map: IndexedMap,
  exploration: IndexedExploration,
): PresenceInspection<IndexedPresences> {
  const indexedMap = inspectIndexedMap(map);
  if (!indexedMap.ok) {
    return indexedMap;
  }

  const indexedExploration = inspectIndexedExploration(exploration);
  if (!indexedExploration.ok) {
    return indexedExploration;
  }

  if (!isRecord(value) || !Array.isArray(value.entities) || !Array.isArray(value.presences)) {
    return fail('O catálogo de presenças é inválido.');
  }

  const entities: WorldEntityDefinition[] = [];
  const byEntity = new Map<string, WorldEntityDefinition>();

  for (const entry of value.entities) {
    const inspected = inspectEntity(entry, byEntity);
    if (!inspected.ok) {
      return inspected;
    }

    const frozen = freezeEntity(inspected.value);
    byEntity.set(frozen.id, frozen);
    entities.push(frozen);
  }

  const presences: WorldPresenceDefinition[] = [];
  const byPresence = new Map<string, WorldPresenceDefinition>();
  const idsByLocation = new Map<string, string[]>();

  for (const entry of value.presences) {
    const inspected = inspectPresence(
      entry,
      byEntity,
      byPresence,
      indexedMap.value,
      indexedExploration.value,
    );
    if (!inspected.ok) {
      return inspected;
    }

    const frozen = freezePresence(inspected.value);
    byPresence.set(frozen.id, frozen);
    presences.push(frozen);

    const linked = idsByLocation.get(frozen.locationId) ?? [];
    linked.push(frozen.id);
    idsByLocation.set(frozen.locationId, linked);
  }

  const presenceIdsByLocation = new Map<string, readonly string[]>();
  for (const [locationId, presenceIds] of idsByLocation) {
    presenceIdsByLocation.set(locationId, Object.freeze([...presenceIds]));
  }

  return {
    ok: true,
    value: {
      entities: Object.freeze(entities),
      presences: Object.freeze(presences),
      byEntity,
      byPresence,
      presenceIdsByLocation,
    },
  };
}

export function indexPresenceCatalog(
  value: unknown,
  map: IndexedMap,
  exploration: IndexedExploration,
): IndexedPresences {
  const inspected = inspectPresenceCatalog(value, map, exploration);
  if (!inspected.ok) {
    throw new PresenceError(inspected.reason);
  }

  return inspected.value;
}

export function createInitialPresenceState(catalog: IndexedPresences): PresenceState {
  requireIndexedCatalog(catalog);
  return {
    discoveredPresenceIds: [],
    resolvedPresenceIds: [],
  };
}

export function inspectPresenceState(
  state: unknown,
  catalog: IndexedPresences,
): PresenceInspection<PresenceState> {
  const indexed = inspectIndexedCatalog(catalog);
  if (!indexed.ok) {
    return indexed;
  }

  if (!isRecord(state) || !Array.isArray(state.discoveredPresenceIds) || !Array.isArray(state.resolvedPresenceIds)) {
    return fail('O estado de presenças é inválido.');
  }

  const discovered = inspectIdList(state.discoveredPresenceIds, indexed.value);
  if (!discovered.ok) {
    return discovered;
  }

  const resolved = inspectIdList(state.resolvedPresenceIds, indexed.value);
  if (!resolved.ok) {
    return resolved;
  }

  const discoveredSet = new Set(discovered.value);
  for (const presenceId of resolved.value) {
    if (!discoveredSet.has(presenceId)) {
      return fail('A presença resolvida precisa estar descoberta.');
    }

    const presence = indexed.value.byPresence.get(presenceId);
    if (!presence?.resolvable) {
      return fail('A presença não pode ser resolvida.');
    }
  }

  return {
    ok: true,
    value: {
      discoveredPresenceIds: discovered.value,
      resolvedPresenceIds: resolved.value,
    },
  };
}

export function discoverPresence(
  catalog: IndexedPresences,
  state: PresenceState,
  presenceId: string,
): PresenceState {
  const indexed = requireIndexedCatalog(catalog);
  const current = requireState(state, indexed);
  requirePresence(indexed, presenceId);

  if (current.discoveredPresenceIds.includes(presenceId)) {
    return copyState(current);
  }

  return {
    discoveredPresenceIds: [...current.discoveredPresenceIds, presenceId],
    resolvedPresenceIds: [...current.resolvedPresenceIds],
  };
}

export function resolvePresence(
  catalog: IndexedPresences,
  state: PresenceState,
  presenceId: string,
): PresenceState {
  const indexed = requireIndexedCatalog(catalog);
  const current = requireState(state, indexed);
  const presence = requirePresence(indexed, presenceId);

  if (!current.discoveredPresenceIds.includes(presenceId)) {
    throw new PresenceError('A presença não está descoberta.');
  }

  if (!presence.resolvable) {
    throw new PresenceError('A presença não pode ser resolvida.');
  }

  if (current.resolvedPresenceIds.includes(presenceId)) {
    return copyState(current);
  }

  return {
    discoveredPresenceIds: [...current.discoveredPresenceIds],
    resolvedPresenceIds: [...current.resolvedPresenceIds, presenceId],
  };
}

export function getPresence(catalog: IndexedPresences, presenceId: string): WorldPresenceDefinition {
  return copyPresence(requirePresence(requireIndexedCatalog(catalog), presenceId));
}

export function getEntity(catalog: IndexedPresences, entityId: string): WorldEntityDefinition {
  const indexed = requireIndexedCatalog(catalog);
  if (typeof entityId !== 'string' || entityId.trim() === '') {
    throw new PresenceError('A entidade não existe.');
  }

  const entity = indexed.byEntity.get(entityId);
  if (!entity) {
    throw new PresenceError('A entidade não existe.');
  }

  return copyEntity(entity);
}

export function listDiscoveredPresencesAtLocation(
  catalog: IndexedPresences,
  state: PresenceState,
  locationId: string,
): WorldPresenceDefinition[] {
  const indexed = requireIndexedCatalog(catalog);
  const current = requireState(state, indexed);

  if (typeof locationId !== 'string' || locationId.trim() === '') {
    throw new PresenceError('A localização não existe.');
  }

  const discovered = new Set(current.discoveredPresenceIds);
  const presenceIds = indexed.presenceIdsByLocation.get(locationId) ?? [];

  return presenceIds
    .filter((presenceId) => discovered.has(presenceId))
    .map((presenceId) => copyPresence(requirePresence(indexed, presenceId)));
}

export function getPresenceStatus(
  catalog: IndexedPresences,
  state: PresenceState,
  presenceId: string,
  locationId: string,
  conditions?: PresenceConditionSource,
): PresenceStatus {
  const indexed = requireIndexedCatalog(catalog);
  const current = requireState(state, indexed);
  const presence = requirePresence(indexed, presenceId);

  if (typeof locationId !== 'string' || locationId.trim() === '') {
    throw new PresenceError('A localização não existe.');
  }

  if (!current.discoveredPresenceIds.includes(presenceId)) {
    return 'hidden';
  }

  if (current.resolvedPresenceIds.includes(presenceId)) {
    return 'resolved';
  }

  if (presence.locationId !== locationId) {
    return 'unavailable';
  }

  const evaluate = resolveEvaluator(conditions);
  return areConditionsSatisfied(presence.availabilityConditions, evaluate) ? 'available' : 'unavailable';
}

export function createPresenceEvaluator(state: GameState): PresenceConditionEvaluator {
  return (conditions) => evaluateConditions(conditions ? copyConditions(conditions) : undefined, state);
}

export { INITIAL_PRESENCE_CATALOG };
export type {
  IndexedPresences,
  PresenceCatalog,
  PresenceCatalogContext,
  PresenceConditionEvaluator,
  PresenceConditionSource,
  PresenceInspection,
  PresenceState,
  PresenceStatus,
  WorldEntityDefinition,
  WorldEntityKind,
  WorldPresenceDefinition,
} from './types';
export { PRESENCE_STATUSES, WORLD_ENTITY_KINDS } from './types';

function inspectEntity(
  value: unknown,
  byEntity: ReadonlyMap<string, WorldEntityDefinition>,
): PresenceInspection<WorldEntityDefinition> {
  if (!isRecord(value)) {
    return fail('O catálogo de presenças é inválido.');
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return fail('O identificador da entidade é inválido.');
  }

  if (byEntity.has(value.id)) {
    return fail(`A entidade ${value.id} está duplicada.`);
  }

  if (!isEntityKind(value.kind)) {
    return fail(`O tipo da entidade ${value.id} é desconhecido.`);
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    return fail(`O nome da entidade ${value.id} é inválido.`);
  }

  if (typeof value.description !== 'string' || value.description.trim() === '') {
    return fail(`A descrição da entidade ${value.id} é inválida.`);
  }

  const image = inspectOptionalImage(value.image, `A entidade ${value.id} possui imagem malformada.`);
  if (!image.ok) {
    return image;
  }

  return {
    ok: true,
    value: copyEntity({
      id: value.id,
      kind: value.kind,
      name: value.name,
      description: value.description,
      image: image.value,
    }),
  };
}

function inspectPresence(
  value: unknown,
  byEntity: ReadonlyMap<string, WorldEntityDefinition>,
  byPresence: ReadonlyMap<string, WorldPresenceDefinition>,
  map: IndexedMap,
  exploration: IndexedExploration,
): PresenceInspection<WorldPresenceDefinition> {
  if (!isRecord(value)) {
    return fail('O catálogo de presenças é inválido.');
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return fail('O identificador da presença é inválido.');
  }

  if (byPresence.has(value.id)) {
    return fail(`A presença ${value.id} está duplicada.`);
  }

  if (typeof value.entityId !== 'string' || value.entityId.trim() === '' || !byEntity.has(value.entityId)) {
    return fail(`A entidade da presença ${value.id} não existe.`);
  }

  if (typeof value.locationId !== 'string' || value.locationId.trim() === '' || !map.locations.has(value.locationId)) {
    return fail(`A localização da presença ${value.id} não existe.`);
  }

  if (typeof value.discoveryId !== 'string' || value.discoveryId.trim() === '') {
    return fail(`A descoberta da presença ${value.id} não existe nas definições de exploração.`);
  }

  const discoveryLocation = exploration.locationByDiscovery.get(value.discoveryId);
  if (!exploration.byDiscovery.has(value.discoveryId) || discoveryLocation === undefined) {
    return fail(`A descoberta da presença ${value.id} não existe nas definições de exploração.`);
  }

  if (discoveryLocation !== value.locationId) {
    return fail(`A presença ${value.id} e a descoberta pertencem a locais diferentes.`);
  }

  if (typeof value.resolvable !== 'boolean') {
    return fail(`A presença ${value.id} possui resolubilidade inválida.`);
  }

  const conditions = inspectOptionalConditions(
    value.availabilityConditions,
    `A presença ${value.id} possui condições malformadas.`,
  );
  if (!conditions.ok) {
    return conditions;
  }

  return {
    ok: true,
    value: copyPresence({
      id: value.id,
      entityId: value.entityId,
      locationId: value.locationId,
      discoveryId: value.discoveryId,
      availabilityConditions: conditions.value,
      resolvable: value.resolvable,
    }),
  };
}

function inspectIdList(
  value: unknown,
  catalog: IndexedPresences,
): PresenceInspection<string[]> {
  if (!Array.isArray(value)) {
    return fail('O estado de presenças é inválido.');
  }

  const ids: string[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim() === '') {
      return fail('O estado de presenças possui identificadores inexistentes.');
    }

    if (!catalog.byPresence.has(entry)) {
      return fail('O estado de presenças possui identificadores inexistentes.');
    }

    if (seen.has(entry)) {
      return fail('O estado de presenças possui identificadores duplicados.');
    }

    seen.add(entry);
    ids.push(entry);
  }

  return { ok: true, value: ids };
}

function inspectOptionalImage(
  value: unknown,
  reason: string,
): PresenceInspection<ImageReference | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(value) || !isImageKind(value.kind) || typeof value.label !== 'string' || value.label.trim() === '') {
    return fail(reason);
  }

  return { ok: true, value: { kind: value.kind, label: value.label } };
}

function inspectOptionalConditions(
  value: unknown,
  reason: string,
): PresenceInspection<GameCondition[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  const inspected = inspectConditions(value, reason);
  if (!inspected.ok) {
    return inspected;
  }

  return { ok: true, value: inspected.value };
}

function inspectConditions(value: unknown, reason: string): PresenceInspection<GameCondition[]> {
  if (!Array.isArray(value)) {
    return fail(reason);
  }

  const conditions: GameCondition[] = [];
  for (const entry of value) {
    const condition = inspectCondition(entry, reason);
    if (!condition.ok) {
      return condition;
    }

    conditions.push(condition.value);
  }

  return { ok: true, value: conditions };
}

function inspectCondition(value: unknown, reason: string): PresenceInspection<GameCondition> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail(reason);
  }

  switch (value.type) {
    case 'flag.is':
      if (typeof value.flag !== 'string' || value.flag.trim() === '' || typeof value.value !== 'boolean') {
        return fail(reason);
      }
      return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
    case 'attribute.min':
    case 'attribute.max':
      if (!isAttributeId(value.attribute) || !isFiniteNumber(value.amount)) {
        return fail(reason);
      }
      return {
        ok: true,
        value: { type: value.type, attribute: value.attribute, amount: value.amount },
      };
    case 'inventory.has':
      if (typeof value.itemId !== 'string' || value.itemId.trim() === '') {
        return fail(reason);
      }
      if (value.quantity !== undefined && !isPositiveInteger(value.quantity)) {
        return fail(reason);
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
        return fail(reason);
      }
      return {
        ok: true,
        value: { type: 'relationship.min', characterId: value.characterId, amount: value.amount },
      };
    default:
      return fail(reason);
  }
}

function inspectIndexedMap(map: unknown): PresenceInspection<IndexedMap> {
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

function inspectIndexedExploration(definitions: unknown): PresenceInspection<IndexedExploration> {
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

function inspectIndexedCatalog(catalog: unknown): PresenceInspection<IndexedPresences> {
  if (
    !isRecord(catalog) ||
    !Array.isArray(catalog.entities) ||
    !Array.isArray(catalog.presences) ||
    !(catalog.byEntity instanceof Map) ||
    !(catalog.byPresence instanceof Map) ||
    !(catalog.presenceIdsByLocation instanceof Map)
  ) {
    return fail('O catálogo de presenças indexado é inválido.');
  }

  return { ok: true, value: catalog as unknown as IndexedPresences };
}

function requireIndexedCatalog(catalog: IndexedPresences): IndexedPresences {
  const inspected = inspectIndexedCatalog(catalog);
  if (!inspected.ok) {
    throw new PresenceError(inspected.reason);
  }

  return inspected.value;
}

function requireState(state: PresenceState, catalog: IndexedPresences): PresenceState {
  const inspected = inspectPresenceState(state, catalog);
  if (!inspected.ok) {
    throw new PresenceError(inspected.reason);
  }

  return inspected.value;
}

function requirePresence(catalog: IndexedPresences, presenceId: string): WorldPresenceDefinition {
  if (typeof presenceId !== 'string' || presenceId.trim() === '') {
    throw new PresenceError('A presença não existe.');
  }

  const presence = catalog.byPresence.get(presenceId);
  if (!presence) {
    throw new PresenceError('A presença não existe.');
  }

  return presence;
}

function copyState(state: PresenceState): PresenceState {
  return {
    discoveredPresenceIds: [...state.discoveredPresenceIds],
    resolvedPresenceIds: [...state.resolvedPresenceIds],
  };
}

function copyEntity(entity: WorldEntityDefinition): WorldEntityDefinition {
  const copied: WorldEntityDefinition = {
    id: entity.id,
    kind: entity.kind,
    name: entity.name,
    description: entity.description,
  };

  if (entity.image) {
    copied.image = { kind: entity.image.kind, label: entity.image.label };
  }

  return copied;
}

function freezeEntity(entity: WorldEntityDefinition): WorldEntityDefinition {
  const copied = copyEntity(entity);
  if (copied.image) {
    Object.freeze(copied.image);
  }
  return Object.freeze(copied);
}

function freezePresence(presence: WorldPresenceDefinition): WorldPresenceDefinition {
  const copied = copyPresence(presence);
  if (copied.availabilityConditions) {
    Object.freeze(copied.availabilityConditions);
  }
  return Object.freeze(copied);
}

function copyPresence(presence: WorldPresenceDefinition): WorldPresenceDefinition {
  const copied: WorldPresenceDefinition = {
    id: presence.id,
    entityId: presence.entityId,
    locationId: presence.locationId,
    discoveryId: presence.discoveryId,
    resolvable: presence.resolvable,
  };

  if (presence.availabilityConditions) {
    copied.availabilityConditions = copyConditions(presence.availabilityConditions);
  }

  return copied;
}

function areConditionsSatisfied(
  conditions: readonly GameCondition[] | undefined,
  evaluate: PresenceConditionEvaluator | undefined,
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  if (!evaluate) {
    return false;
  }

  return evaluate(copyConditions(conditions));
}

function resolveEvaluator(source: PresenceConditionSource | undefined): PresenceConditionEvaluator | undefined {
  if (!source) {
    return undefined;
  }

  return typeof source === 'function' ? source : createPresenceEvaluator(source);
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

function isEntityKind(value: unknown): value is WorldEntityKind {
  return typeof value === 'string' && (WORLD_ENTITY_KINDS as readonly string[]).includes(value);
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

function fail(reason: string): PresenceInspection<never> {
  return { ok: false, reason };
}
