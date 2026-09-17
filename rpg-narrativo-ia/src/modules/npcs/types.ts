import type { DayPeriod } from '../../core/state/types';

export type NpcStatus = 'active' | 'unavailable' | 'departed';

export type NpcAvailability = 'available' | 'busy' | 'hidden';

export type DerivedNpcPresence =
  | 'unknown'
  | 'absent'
  | 'present-unavailable'
  | 'present-available'
  | 'departed';

export interface NpcDefinition {
  id: string;
  entityId: string;
  name: string;
  defaultScheduleId: string;
}

export interface NpcScheduleEntry {
  period: DayPeriod;
  locationId: string;
  availability: NpcAvailability;
}

export interface NpcScheduleDefinition {
  id: string;
  npcId: string;
  entries: readonly NpcScheduleEntry[];
  fallbackLocationId: string;
}

export interface NpcMemoryFactDefinition {
  id: string;
  npcId: string;
  summary: string;
  locationHint?: boolean;
}

export interface NpcCatalog {
  npcs: readonly NpcDefinition[];
  schedules: readonly NpcScheduleDefinition[];
  facts: readonly NpcMemoryFactDefinition[];
}

export interface NpcStateEntry {
  npcId: string;
  known: boolean;
  status: NpcStatus;
  locationOverrideId: string | null;
  memoryFactIds: readonly string[];
  scheduleOverrideId: string | null;
}

export interface NPCsState {
  entries: readonly NpcStateEntry[];
}

export interface IndexedNpcs {
  readonly locationIds: readonly string[];
  readonly npcs: readonly NpcDefinition[];
  readonly schedules: readonly NpcScheduleDefinition[];
  readonly facts: readonly NpcMemoryFactDefinition[];
  readonly npcById: ReadonlyMap<string, NpcDefinition>;
  readonly scheduleById: ReadonlyMap<string, NpcScheduleDefinition>;
  readonly factById: ReadonlyMap<string, NpcMemoryFactDefinition>;
}

export interface DerivedNpcView {
  npcId: string;
  name: string;
  locationId: string;
  availability: NpcAvailability;
  presence: DerivedNpcPresence;
  knownFactIds: readonly string[];
  hint?: string;
}

export type NpcInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
