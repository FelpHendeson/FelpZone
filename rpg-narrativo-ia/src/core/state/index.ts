import type { CharacterIdentity, GameState } from './types';
import { SCHEMA_VERSION } from './types';
import { createInitialAttributes } from '../../modules/character';
import { createInitialProgression } from '../../modules/progression';
import { createInitialWorld } from '../../modules/world';

export function createInitialState(character: CharacterIdentity, firstEventId: string, now = defaultNow): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    status: 'playing',
    character,
    currentEventId: firstEventId,
    attributes: createInitialAttributes(),
    inventory: [],
    relationships: [],
    flags: {},
    history: [],
    world: createInitialWorld(),
    progression: createInitialProgression(),
    updatedAt: now(),
  };
}

export function defaultNow(): string {
  return new Date().toISOString();
}

export { SCHEMA_VERSION } from './types';
export type {
  AttributeId,
  Attributes,
  CharacterIdentity,
  DayPeriod,
  GameState,
  GameStatus,
  HistoryEntry,
  InventoryItem,
  ProgressionState,
  Relationship,
  WorldState,
} from './types';
