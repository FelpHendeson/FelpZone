import type { SandboxState } from '../../modules/sandbox/types';
import { DEFAULT_PERIODS } from '../../modules/time';

export const SCHEMA_VERSION_V1 = 1 as const;
export const SCHEMA_VERSION_V2 = 2 as const;
export const SCHEMA_VERSION = 3 as const;

export const MIGRATED_CAMPAIGN_ID = 'first-day';

export type GameStatus = 'playing' | 'completed';

export const ATTRIBUTE_IDS = ['saude', 'energia', 'fome', 'humanidade', 'cautela'] as const;

export type AttributeId = (typeof ATTRIBUTE_IDS)[number];

export type DayPeriod = (typeof DEFAULT_PERIODS)[number]['id'];

export const DAY_PERIODS: readonly DayPeriod[] = DEFAULT_PERIODS.map((period) => period.id);

export function isAttributeId(value: unknown): value is AttributeId {
  return (ATTRIBUTE_IDS as readonly string[]).includes(value as string);
}

export function isDayPeriod(value: unknown): value is DayPeriod {
  return typeof value === 'string' && (DAY_PERIODS as readonly string[]).includes(value);
}

export interface Attributes {
  saude: number;
  energia: number;
  fome: number;
  humanidade: number;
  cautela: number;
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

interface SharedState {
  status: GameStatus;
  character: CharacterIdentity;
  attributes: Attributes;
  inventory: InventoryItem[];
  relationships: Relationship[];
  flags: Record<string, boolean>;
  history: HistoryEntry[];
  world: WorldState;
  progression: ProgressionState;
  updatedAt: string;
}

export interface GameStateV1 extends SharedState {
  schemaVersion: typeof SCHEMA_VERSION_V1;
  currentEventId: string;
}

export interface GameStateV2 extends SharedState {
  schemaVersion: typeof SCHEMA_VERSION_V2;
  currentEventId: string;
  sandbox: SandboxState;
}

export interface GameState extends SharedState {
  schemaVersion: typeof SCHEMA_VERSION;
  narrativeSession: NarrativeSession | null;
  sandbox: SandboxState;
}
