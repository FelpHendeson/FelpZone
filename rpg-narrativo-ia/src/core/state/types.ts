import type { SandboxState } from '../../modules/sandbox/types';
import { DEFAULT_PERIODS } from '../../modules/time';

export const SCHEMA_VERSION_V1 = 1 as const;
export const SCHEMA_VERSION = 2 as const;

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

interface NarrativeState {
  status: GameStatus;
  character: CharacterIdentity;
  currentEventId: string;
  attributes: Attributes;
  inventory: InventoryItem[];
  relationships: Relationship[];
  flags: Record<string, boolean>;
  history: HistoryEntry[];
  world: WorldState;
  progression: ProgressionState;
  updatedAt: string;
}

export interface GameStateV1 extends NarrativeState {
  schemaVersion: typeof SCHEMA_VERSION_V1;
}

export interface GameState extends NarrativeState {
  schemaVersion: typeof SCHEMA_VERSION;
  sandbox: SandboxState;
}
