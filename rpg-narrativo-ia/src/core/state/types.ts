export const SCHEMA_VERSION = 1 as const;

export type GameStatus = 'playing' | 'completed';

export type AttributeId = 'saude' | 'energia' | 'fome' | 'humanidade' | 'cautela';

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

export type DayPeriod = 'alvorecer' | 'manha' | 'meio-dia' | 'tarde' | 'entardecer' | 'noite';

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

export interface GameState {
  schemaVersion: typeof SCHEMA_VERSION;
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
