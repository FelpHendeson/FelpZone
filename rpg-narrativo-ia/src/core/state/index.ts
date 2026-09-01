import type { CharacterIdentity, GameState } from './types';
import { SCHEMA_VERSION } from './types';
import { createInitialAttributes } from '../../modules/character';
import { createInitialProgression } from '../../modules/progression';
import { createInitialSandboxState, type SandboxContext } from '../../modules/sandbox';
import { createInitialWorld } from '../../modules/world';

export function createInitialState(
  character: CharacterIdentity,
  firstEventId: string,
  now = defaultNow,
  sandboxContext?: SandboxContext,
): GameState {
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
    sandbox: createInitialSandboxState(sandboxContext),
    updatedAt: now(),
  };
}

export function defaultNow(): string {
  return new Date().toISOString();
}

export { SCHEMA_VERSION, SCHEMA_VERSION_V1 } from './types';
export { inspectGameState, inspectGameStateV1, migrateGameStateV1 } from './validateGameState';
export {
  ATTRIBUTE_IDS,
  DAY_PERIODS,
  isAttributeId,
  isDayPeriod,
} from './types';
export type {
  AttributeId,
  Attributes,
  CharacterIdentity,
  DayPeriod,
  GameState,
  GameStateV1,
  GameStatus,
  HistoryEntry,
  InventoryItem,
  ProgressionState,
  Relationship,
  WorldState,
} from './types';
export type { SandboxState } from '../../modules/sandbox/types';
