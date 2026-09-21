import rawGuidance from '../../../content/first-day/ui/guidance.json' with { type: 'json' };
import {
  GUIDANCE_CATEGORIES,
  type GuidanceCatalogInspection,
  type GuidanceState,
  type GuidanceStateInspection,
  type GuidanceTopicDefinition,
  type IndexedGuidance,
} from './types';

export class GuidanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuidanceError';
  }
}

export function inspectGuidanceCatalog(value: unknown): GuidanceCatalogInspection {
  if (!isRecord(value) || !Array.isArray(value.topics) || value.topics.length > 256) {
    return failCatalog('O catálogo de orientação é inválido.');
  }

  const topics: GuidanceTopicDefinition[] = [];
  const byId = new Map<string, GuidanceTopicDefinition>();

  for (const rawTopic of value.topics) {
    if (
      !isRecord(rawTopic) ||
      !nonEmpty(rawTopic.id) ||
      !nonEmpty(rawTopic.title) ||
      !nonEmpty(rawTopic.summary) ||
      !Array.isArray(rawTopic.body) ||
      rawTopic.body.length === 0 ||
      rawTopic.body.length > 32 ||
      rawTopic.body.some((paragraph) => !nonEmpty(paragraph)) ||
      typeof rawTopic.category !== 'string' ||
      !(GUIDANCE_CATEGORIES as readonly string[]).includes(rawTopic.category) ||
      (rawTopic.popupOnUnlock !== undefined && typeof rawTopic.popupOnUnlock !== 'boolean') ||
      byId.has(rawTopic.id)
    ) {
      return failCatalog('O catálogo de orientação é inválido.');
    }

    const topic: GuidanceTopicDefinition = {
      id: rawTopic.id,
      title: rawTopic.title,
      summary: rawTopic.summary,
      body: [...rawTopic.body] as string[],
      category: rawTopic.category as GuidanceTopicDefinition['category'],
      ...(rawTopic.popupOnUnlock === undefined ? {} : { popupOnUnlock: rawTopic.popupOnUnlock }),
    };
    topics.push(topic);
    byId.set(topic.id, topic);
  }

  return {
    ok: true,
    value: {
      topics: Object.freeze(topics),
      byId,
    },
  };
}

export function indexGuidanceCatalog(value: unknown): IndexedGuidance {
  const inspected = inspectGuidanceCatalog(value);
  if (!inspected.ok) {
    throw new GuidanceError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_GUIDANCE = indexGuidanceCatalog(rawGuidance);

export function createInitialGuidanceState(): GuidanceState {
  return { unlockedTopicIds: [], seenTopicIds: [] };
}

export function createMigratedGuidanceState(catalog: IndexedGuidance = INITIAL_GUIDANCE): GuidanceState {
  const ids = catalog.topics.map((topic) => topic.id);
  return { unlockedTopicIds: [...ids], seenTopicIds: [...ids] };
}

export function inspectGuidanceState(value: unknown, catalog: IndexedGuidance = INITIAL_GUIDANCE): GuidanceStateInspection {
  if (!isRecord(value) || !Array.isArray(value.unlockedTopicIds) || !Array.isArray(value.seenTopicIds)) {
    return failState('O estado de orientação é inválido.');
  }

  const unlocked = readKnownUniqueIds(value.unlockedTopicIds, catalog);
  const seen = readKnownUniqueIds(value.seenTopicIds, catalog);
  if (!unlocked || !seen) {
    return failState('O estado de orientação é inválido.');
  }

  const unlockedSet = new Set(unlocked);
  if (seen.some((id) => !unlockedSet.has(id))) {
    return failState('Um tópico visto precisa estar desbloqueado.');
  }

  return {
    ok: true,
    value: {
      unlockedTopicIds: orderByCatalog(catalog, unlockedSet),
      seenTopicIds: orderByCatalog(catalog, new Set(seen)),
    },
  };
}

export function unlockGuidanceTopic(
  catalog: IndexedGuidance,
  state: GuidanceState,
  topicId: string,
): GuidanceState {
  requireTopic(catalog, topicId);
  if (state.unlockedTopicIds.includes(topicId)) {
    return state;
  }
  return {
    unlockedTopicIds: orderByCatalog(catalog, new Set([...state.unlockedTopicIds, topicId])),
    seenTopicIds: [...state.seenTopicIds],
  };
}

export function markGuidanceTopicSeen(
  catalog: IndexedGuidance,
  state: GuidanceState,
  topicId: string,
): GuidanceState {
  requireTopic(catalog, topicId);
  if (!state.unlockedTopicIds.includes(topicId)) {
    throw new GuidanceError('O tópico precisa estar desbloqueado antes de ser marcado como visto.');
  }
  if (state.seenTopicIds.includes(topicId)) {
    return state;
  }
  return {
    unlockedTopicIds: [...state.unlockedTopicIds],
    seenTopicIds: orderByCatalog(catalog, new Set([...state.seenTopicIds, topicId])),
  };
}

export function listUnlockedGuidanceTopics(
  catalog: IndexedGuidance,
  state: GuidanceState,
): GuidanceTopicDefinition[] {
  const unlocked = new Set(state.unlockedTopicIds);
  return catalog.topics.filter((topic) => unlocked.has(topic.id));
}

export function listUnseenGuidanceTopics(
  catalog: IndexedGuidance,
  state: GuidanceState,
): GuidanceTopicDefinition[] {
  const unlocked = new Set(state.unlockedTopicIds);
  const seen = new Set(state.seenTopicIds);
  return catalog.topics.filter((topic) => unlocked.has(topic.id) && !seen.has(topic.id));
}

function requireTopic(catalog: IndexedGuidance, topicId: string): GuidanceTopicDefinition {
  const topic = catalog.byId.get(topicId);
  if (!topic) {
    throw new GuidanceError(`Tópico de orientação inexistente: ${topicId}.`);
  }
  return topic;
}

function readKnownUniqueIds(value: unknown[], catalog: IndexedGuidance): string[] | undefined {
  if (value.length > catalog.topics.length) {
    return undefined;
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string' || !catalog.byId.has(entry) || seen.has(entry)) {
      return undefined;
    }
    seen.add(entry);
    ids.push(entry);
  }
  return ids;
}

function orderByCatalog(catalog: IndexedGuidance, ids: Set<string>): string[] {
  return catalog.topics.filter((topic) => ids.has(topic.id)).map((topic) => topic.id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function failCatalog(reason: string): GuidanceCatalogInspection {
  return { ok: false, reason };
}

function failState(reason: string): GuidanceStateInspection {
  return { ok: false, reason };
}

export type {
  GuidanceCatalogInspection,
  GuidanceCategory,
  GuidanceState,
  GuidanceStateInspection,
  GuidanceTopicDefinition,
  IndexedGuidance,
} from './types';
