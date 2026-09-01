import type { CharacterIdentity, GameState } from './types';
import { SCHEMA_VERSION } from './types';
import { createInitialAttributes } from '../../modules/character';
import { createInitialProgression } from '../../modules/progression';
import { createInitialSandboxState, type SandboxContext } from '../../modules/sandbox';
import { createInitialWorld } from '../../modules/world';

export function createInitialState(
  character: CharacterIdentity,
  campaign: { id: string; firstEventId: string },
  now = defaultNow,
  sandboxContext?: SandboxContext,
): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    status: 'playing',
    character,
    narrativeSession: {
      campaignId: campaign.id,
      eventId: campaign.firstEventId,
    },
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

export { SCHEMA_VERSION, SCHEMA_VERSION_V1, SCHEMA_VERSION_V2, MIGRATED_CAMPAIGN_ID } from './types';
export {
  inspectGameState,
  inspectGameStateV1,
  inspectGameStateV2,
  migrateGameStateV1,
  migrateGameStateV2,
} from './validateGameState';
export type {
  GameStateInspection,
  GameStateV1Inspection,
  GameStateV2Inspection,
} from './validateGameState';
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
  GameStateV2,
  GameStatus,
  HistoryEntry,
  InventoryItem,
  NarrativeSession,
  ProgressionState,
  Relationship,
  WorldState,
} from './types';
export type { SandboxState } from '../../modules/sandbox/types';
