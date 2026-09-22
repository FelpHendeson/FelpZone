import type { DayPeriod } from '../../core/state/types';
import { DAY_PERIODS } from '../../core/state/types';
import { NpcError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_NPC_CATALOG } from './initial-npcs';
import map from '../../../content/first-day/world/map.json' with { type: 'json' };
import type {
  DerivedNpcView,
  IndexedNpcs,
  NpcDefinition,
  NpcInspection,
  NpcMemoryFactDefinition,
  NpcScheduleDefinition,
  NpcScheduleEntry,
  NPCsState,
  NpcStateEntry,
} from './types';

export { NpcError } from './errors';
export { INITIAL_NPC_CATALOG } from './initial-npcs';
export type {
  DerivedNpcPresence,
  DerivedNpcView,
  IndexedNpcs,
  NpcAvailability,
  NpcDefinition,
  NPCsState,
  NpcStateEntry,
} from './types';

export const INITIAL_NPCS = indexNpcCatalog(INITIAL_NPC_CATALOG, new Set(collectLocationIds(map)));

export function inspectNpcCatalog(value: unknown, locationIds: ReadonlySet<string>): NpcInspection<IndexedNpcs> {
  if (!isRecord(value) || !Array.isArray(value.npcs) || !Array.isArray(value.schedules) || !Array.isArray(value.facts)) {
    return fail('O catálogo de NPCs é inválido.');
  }
  const npcs: NpcDefinition[] = [];
  const npcIds = new Set<string>();
  for (const entry of value.npcs) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || npcIds.has(entry.id) || !nonEmpty(entry.entityId) || !nonEmpty(entry.name) || !nonEmpty(entry.defaultScheduleId)) {
      return fail('O NPC é inválido ou duplicado.');
    }
    npcIds.add(entry.id);
    npcs.push({ id: entry.id, entityId: entry.entityId, name: entry.name, defaultScheduleId: entry.defaultScheduleId });
  }

  const schedules: NpcScheduleDefinition[] = [];
  const scheduleIds = new Set<string>();
  for (const entry of value.schedules) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      scheduleIds.has(entry.id) ||
      !nonEmpty(entry.npcId) ||
      !npcIds.has(entry.npcId) ||
      !nonEmpty(entry.fallbackLocationId) ||
      !locationIds.has(entry.fallbackLocationId) ||
      !Array.isArray(entry.entries)
    ) {
      return fail('A agenda do NPC é inválida.');
    }
    const seenPeriods = new Set<string>();
    const entries: NpcScheduleEntry[] = [];
    for (const slot of entry.entries) {
      if (!isRecord(slot) || !isPeriod(slot.period) || seenPeriods.has(slot.period) || !nonEmpty(slot.locationId) || !locationIds.has(slot.locationId)) {
        return fail('A entrada de agenda é inválida.');
      }
      if (slot.availability !== 'available' && slot.availability !== 'busy' && slot.availability !== 'hidden') {
        return fail('A disponibilidade da agenda é inválida.');
      }
      seenPeriods.add(slot.period);
      entries.push({ period: slot.period, locationId: slot.locationId, availability: slot.availability });
    }
    scheduleIds.add(entry.id);
    schedules.push({
      id: entry.id,
      npcId: entry.npcId,
      fallbackLocationId: entry.fallbackLocationId,
      entries,
    });
  }

  for (const npc of npcs) {
    const schedule = schedules.find((entry) => entry.id === npc.defaultScheduleId);
    if (!schedule || schedule.npcId !== npc.id) {
      return fail('O NPC referencia uma agenda inexistente.');
    }
  }

  const facts: NpcMemoryFactDefinition[] = [];
  const factIds = new Set<string>();
  for (const entry of value.facts) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      factIds.has(entry.id) ||
      !nonEmpty(entry.npcId) ||
      !npcIds.has(entry.npcId) ||
      !nonEmpty(entry.summary) ||
      (entry.locationHint !== undefined && typeof entry.locationHint !== 'boolean')
    ) {
      return fail('O fato de memória é inválido.');
    }
    factIds.add(entry.id);
    facts.push({
      id: entry.id,
      npcId: entry.npcId,
      summary: entry.summary,
      ...(entry.locationHint === true ? { locationHint: true } : {}),
    });
  }

  const frozenNpcs = Object.freeze(npcs.map((npc) => Object.freeze({ ...npc })));
  const frozenSchedules = Object.freeze(
    schedules.map((schedule) =>
      Object.freeze({
        ...schedule,
        entries: Object.freeze(schedule.entries.map((entry) => Object.freeze({ ...entry }))),
      }),
    ),
  );
  const frozenFacts = Object.freeze(facts.map((fact) => Object.freeze({ ...fact })));
  return {
    ok: true,
    value: Object.freeze({
      locationIds: Object.freeze([...locationIds]),
      npcs: frozenNpcs,
      schedules: frozenSchedules,
      facts: frozenFacts,
      npcById: new ImmutableIndex(frozenNpcs.map((npc) => [npc.id, npc] as const)),
      scheduleById: new ImmutableIndex(frozenSchedules.map((schedule) => [schedule.id, schedule] as const)),
      factById: new ImmutableIndex(frozenFacts.map((fact) => [fact.id, fact] as const)),
    }),
  };
}

export function indexNpcCatalog(value: unknown, locationIds: ReadonlySet<string>): IndexedNpcs {
  const inspected = inspectNpcCatalog(value, locationIds);
  if (!inspected.ok) {
    throw new NpcError(inspected.reason);
  }
  return inspected.value;
}

export function createInitialNpcsState(): NPCsState {
  return { entries: [] };
}

export function inspectNpcsState(value: unknown, catalog: IndexedNpcs = INITIAL_NPCS): NpcInspection<NPCsState> {
  if (!isRecord(value) || !Array.isArray(value.entries)) {
    return fail('O estado de NPCs é inválido.');
  }
  const entries: NpcStateEntry[] = [];
  const seen = new Set<string>();
  for (const entry of value.entries) {
    if (!isRecord(entry) || !nonEmpty(entry.npcId) || seen.has(entry.npcId) || !catalog.npcById.has(entry.npcId)) {
      return fail('O NPC persistido é inválido.');
    }
    const npcId = entry.npcId;
    const status = entry.status;
    if (status !== 'active' && status !== 'unavailable' && status !== 'departed') {
      return fail('O status do NPC é inválido.');
    }
    if (typeof entry.known !== 'boolean') {
      return fail('O reconhecimento do NPC é inválido.');
    }
    if (
      entry.locationOverrideId !== null &&
      (!nonEmpty(entry.locationOverrideId) || !catalog.locationIds.includes(entry.locationOverrideId))
    ) {
      return fail('A localização alternativa do NPC é inválida.');
    }
    if (entry.scheduleOverrideId !== null) {
      if (!nonEmpty(entry.scheduleOverrideId)) {
        return fail('A agenda alternativa do NPC é inválida.');
      }
      const override = catalog.scheduleById.get(entry.scheduleOverrideId);
      if (!override || override.npcId !== npcId) {
        return fail('A agenda alternativa do NPC é inválida.');
      }
    }
    const facts: string[] = [];
    const seenFacts = new Set<string>();
    if (!Array.isArray(entry.memoryFactIds)) {
      return fail('A memória do NPC é inválida.');
    }
    for (const factId of entry.memoryFactIds) {
      if (typeof factId !== 'string' || seenFacts.has(factId)) {
        return fail('A memória do NPC referencia um fato inválido.');
      }
      const fact = catalog.factById.get(factId);
      if (!fact || fact.npcId !== npcId) {
        return fail('A memória do NPC referencia um fato inválido.');
      }
      seenFacts.add(factId);
      facts.push(factId);
    }
    seen.add(npcId);
    entries.push({
      npcId,
      known: entry.known,
      status,
      locationOverrideId: entry.locationOverrideId,
      memoryFactIds: facts,
      scheduleOverrideId: entry.scheduleOverrideId,
    });
  }
  return { ok: true, value: { entries } };
}

export function copyNpcsState(state: NPCsState): NPCsState {
  return {
    entries: state.entries.map((entry) => ({
      ...entry,
      memoryFactIds: [...entry.memoryFactIds],
    })),
  };
}

export function relocateNpc(
  catalog: IndexedNpcs,
  state: NPCsState,
  npcId: string,
  locationId: string,
): NPCsState {
  if (!catalog.npcById.has(npcId)) {
    throw new NpcError('O NPC não existe.');
  }
  if (!catalog.locationIds.includes(locationId)) {
    throw new NpcError('A localização alternativa do NPC é inválida.');
  }
  const entries = copyNpcsState(state).entries.map((entry) => ({ ...entry }));
  const existing = entries.find((entry) => entry.npcId === npcId);
  if (existing?.status === 'departed') {
    throw new NpcError('Um NPC que partiu não pode ser relocado.');
  }
  if (!existing) {
    return {
      entries: [
        ...entries,
        {
          npcId,
          known: true,
          status: 'active',
          locationOverrideId: locationId,
          memoryFactIds: [],
          scheduleOverrideId: null,
        },
      ],
    };
  }
  return {
    entries: entries.map((entry) =>
      entry.npcId === npcId ? { ...entry, locationOverrideId: locationId } : entry,
    ),
  };
}

export function rememberNpcFact(catalog: IndexedNpcs, state: NPCsState, npcId: string, factId: string): NPCsState {
  const fact = catalog.factById.get(factId);
  if (!fact || fact.npcId !== npcId) {
    throw new NpcError('O fato de memória não pertence a este NPC.');
  }
  const entries = copyNpcsState(state).entries.map((entry) => ({
    ...entry,
    memoryFactIds: [...entry.memoryFactIds],
  }));
  const existing = entries.find((entry) => entry.npcId === npcId);
  if (!existing) {
    return {
      entries: [
        ...entries,
        {
          npcId,
          known: true,
          status: 'active',
          locationOverrideId: null,
          memoryFactIds: [factId],
          scheduleOverrideId: null,
        },
      ],
    };
  }
  return {
    entries: entries.map((entry) =>
      entry.npcId === npcId
        ? {
            ...entry,
            known: true,
            memoryFactIds: entry.memoryFactIds.includes(factId) ? entry.memoryFactIds : [...entry.memoryFactIds, factId],
          }
        : entry,
    ),
  };
}

export function deriveNpcAt(
  catalog: IndexedNpcs,
  state: NPCsState,
  npcId: string,
  period: DayPeriod,
  locationKnown: (locationId: string) => boolean,
): DerivedNpcView | null {
  const npc = catalog.npcById.get(npcId);
  if (!npc) {
    throw new NpcError('O NPC não existe.');
  }
  const entry = state.entries.find((item) => item.npcId === npcId);
  if (!entry || !entry.known) {
    return null;
  }
  if (entry.status === 'departed') {
    return { npcId, name: npc.name, locationId: '', availability: 'hidden', presence: 'departed', knownFactIds: [...entry.memoryFactIds] };
  }
  const schedule = catalog.scheduleById.get(entry.scheduleOverrideId ?? npc.defaultScheduleId);
  if (!schedule) {
    throw new NpcError('A agenda do NPC não existe.');
  }
  const slot = schedule.entries.find((item) => item.period === period);
  const locationId = entry.locationOverrideId ?? slot?.locationId ?? schedule.fallbackLocationId;
  const availability = slot?.availability ?? 'available';
  if (!locationKnown(locationId)) {
    return {
      npcId,
      name: npc.name,
      locationId: '',
      availability: 'hidden',
      presence: 'absent',
      knownFactIds: [...entry.memoryFactIds],
      hint: locationHintFor(catalog, entry),
    };
  }
  const presence =
    availability === 'hidden' ? 'absent' : availability === 'busy' ? 'present-unavailable' : 'present-available';
  return {
    npcId,
    name: npc.name,
    locationId,
    availability,
    presence,
    knownFactIds: [...entry.memoryFactIds],
    hint: locationHintFor(catalog, entry),
  };
}

function locationHintFor(catalog: IndexedNpcs, entry: NpcStateEntry): string | undefined {
  for (const factId of entry.memoryFactIds) {
    const fact = catalog.factById.get(factId);
    if (fact?.locationHint) {
      return fact.summary;
    }
  }
  return undefined;
}

function collectLocationIds(node: { id: string; children?: readonly { id: string; children?: readonly unknown[] }[] }): string[] {
  return [node.id, ...(node.children ?? []).flatMap((child) => collectLocationIds(child as typeof node))];
}

function isPeriod(value: unknown): value is DayPeriod {
  return typeof value === 'string' && (DAY_PERIODS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function fail<T>(reason: string): NpcInspection<T> {
  return { ok: false, reason };
}
