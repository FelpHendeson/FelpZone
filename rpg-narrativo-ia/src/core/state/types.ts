import type { SandboxCoreState, SandboxState } from '../../modules/sandbox/types';
import type { ObjectivesState } from '../../modules/objectives/types';
import type { SkillsProgressState } from '../../modules/skills/types';
import { DEFAULT_PERIODS } from '../../modules/time';

export const SCHEMA_VERSION_V1 = 1 as const;
export const SCHEMA_VERSION_V2 = 2 as const;
export const SCHEMA_VERSION_V3 = 3 as const;
export const SCHEMA_VERSION_V4 = 4 as const;
export const SCHEMA_VERSION_V5 = 5 as const;
export const SCHEMA_VERSION_V6 = 6 as const;
export const SCHEMA_VERSION = 7 as const;

export const MIGRATED_CAMPAIGN_ID = 'first-day';

export type GameStatus = 'playing' | 'completed';

export const LEGACY_ATTRIBUTE_IDS = ['saude', 'energia', 'fome', 'humanidade', 'cautela'] as const;
export const ATTRIBUTE_IDS = ['saude', 'energia', 'fome', 'sede', 'humanidade', 'cautela'] as const;

export type AttributeId = (typeof ATTRIBUTE_IDS)[number];

export type DayPeriod = (typeof DEFAULT_PERIODS)[number]['id'];

export const DAY_PERIODS: readonly DayPeriod[] = DEFAULT_PERIODS.map((period) => period.id);

export function isAttributeId(value: unknown): value is AttributeId {
  return (ATTRIBUTE_IDS as readonly string[]).includes(value as string);
}

export function isDayPeriod(value: unknown): value is DayPeriod {
  return typeof value === 'string' && (DAY_PERIODS as readonly string[]).includes(value);
}

export interface LegacyAttributes {
  saude: number;
  energia: number;
  fome: number;
  humanidade: number;
  cautela: number;
}

export interface Attributes extends LegacyAttributes {
  sede: number;
}

export interface CharacterIdentity {
  firstName: string;
  lastName: string;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface Relationship {
  characterId: string;
  trust: number;
}

export interface WorldState {
  day: number;
  period: DayPeriod;
}

export interface ProgressionState {
  abilityIds: string[];
  titleIds: string[];
}

export interface HistoryEntry {
  eventId: string;
  eventTitle: string;
  choiceId: string;
  choiceLabel: string;
  notable: boolean;
}

export interface NarrativeSession {
  campaignId: string;
  eventId: string;
}

interface SharedState<TAttributes> {
  status: GameStatus;
  character: CharacterIdentity;
  attributes: TAttributes;
  inventory: InventoryItem[];
  relationships: Relationship[];
  flags: Record<string, boolean>;
  history: HistoryEntry[];
  world: WorldState;
  progression: ProgressionState;
  updatedAt: string;
}

export interface GameStateV1 extends SharedState<LegacyAttributes> {
  schemaVersion: typeof SCHEMA_VERSION_V1;
  currentEventId: string;
}

export interface GameStateV2 extends SharedState<LegacyAttributes> {
  schemaVersion: typeof SCHEMA_VERSION_V2;
  currentEventId: string;
  sandbox: SandboxCoreState;
}

export interface GameStateV3 extends SharedState<LegacyAttributes> {
  schemaVersion: typeof SCHEMA_VERSION_V3;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxCoreState;
}

export interface GameStateV4 extends SharedState<LegacyAttributes> {
  schemaVersion: typeof SCHEMA_VERSION_V4;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
}

export interface GameStateV5 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V5;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
}

export interface GameStateV6 extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION_V6;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
  objectives: ObjectivesState;
}

export interface GameState extends SharedState<Attributes> {
  schemaVersion: typeof SCHEMA_VERSION;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
  objectives: ObjectivesState;
  system: SkillsProgressState;
}
