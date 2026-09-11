import type { CharacterIdentity, GameState } from './types';
import { SCHEMA_VERSION } from './types';
import { createInitialAttributes } from '../../modules/character';
import { createInitialProgression } from '../../modules/progression';
import { createInitialSandboxState, type SandboxContext } from '../../modules/sandbox';
import { createInitialObjectivesState, INITIAL_OBJECTIVES, type IndexedObjectives } from '../../modules/objectives';
import { createInitialWorld } from '../../modules/world';

export function createInitialState(
  character: CharacterIdentity,
  campaign: { id: string; firstEventId: string },
  now = defaultNow,
  sandboxContext?: SandboxContext,
  objectiveCatalog: IndexedObjectives = INITIAL_OBJECTIVES,
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
    objectives: createInitialObjectivesState(objectiveCatalog),
    updatedAt: now(),
  };
}

export function defaultNow(): string {
  return new Date().toISOString();
}

export {
  SCHEMA_VERSION,
  SCHEMA_VERSION_V1,
  SCHEMA_VERSION_V2,
  SCHEMA_VERSION_V3,
  SCHEMA_VERSION_V4,
  SCHEMA_VERSION_V5,
  MIGRATED_CAMPAIGN_ID,
} from './types';
export {
  inspectGameState,
  inspectGameStateV1,
  inspectGameStateV2,
  inspectGameStateV3,
  inspectGameStateV4,
  inspectGameStateV5,
  migrateGameStateV1,
  migrateGameStateV2,
  migrateGameStateV3,
  migrateGameStateV4,
  migrateGameStateV5,
} from './validateGameState';
export type {
  GameStateInspection,
  GameStateV1Inspection,
  GameStateV2Inspection,
  GameStateV3Inspection,
  GameStateV4Inspection,
  GameStateV5Inspection,
} from './validateGameState';
export {
  ATTRIBUTE_IDS,
  LEGACY_ATTRIBUTE_IDS,
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
  GameStateV3,
  GameStateV4,
  GameStateV5,
  GameStatus,
  HistoryEntry,
  InventoryItem,
  LegacyAttributes,
  NarrativeSession,
  ProgressionState,
  Relationship,
  WorldState,
} from './types';
export type { SandboxState } from '../../modules/sandbox/types';
