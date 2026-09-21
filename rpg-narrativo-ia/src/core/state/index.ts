import type { CharacterIdentity, GameState } from './types';
import { SCHEMA_VERSION } from './types';
import { createInitialAttributes } from '../../modules/character';
import { createInitialProgression } from '../../modules/progression';
import { createInitialSandboxState, createSandboxContext, type SandboxContext } from '../../modules/sandbox';
import { createInitialObjectivesState, INITIAL_OBJECTIVES, type IndexedObjectives } from '../../modules/objectives';
import { createInitialSkillsProgress, INITIAL_SKILLS } from '../../modules/skills';
import { createInitialItemsState } from '../../modules/items';
import { createInitialLingering } from '../../modules/conditions';
import { createInitialGardenState } from '../../modules/garden';
import { createInitialNpcsState } from '../../modules/npcs';
import { createInitialBondsState } from '../../modules/bonds';
import { createInitialRegistryState } from '../../modules/registry';
import { createInitialOrganizationsState } from '../../modules/organizations';
import { createInitialExecutionState } from '../../modules/execution';
import { createInitialPartyState } from '../../modules/party';
import { createInitialCalendarState } from '../../modules/calendar';
import { createInitialFamilyState } from '../../modules/family';
import { createInitialCivicState } from '../../modules/civic';
import { createInitialEconomyState } from '../../modules/economy';
import { createInitialSettlementsState } from '../../modules/settlements';
import { createInitialPoliticsState } from '../../modules/politics';
import { createInitialInteractablesState } from '../../modules/interactables';
import { createInitialWorld } from '../../modules/world';

export function createInitialState(
  character: CharacterIdentity,
  campaign: { id: string; firstEventId: string },
  now = defaultNow,
  sandboxContext?: SandboxContext,
  objectiveCatalog: IndexedObjectives = INITIAL_OBJECTIVES,
): GameState {
  const context = sandboxContext ?? createSandboxContext();
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
    sandbox: {
      ...createInitialSandboxState(context),
      npcs: createInitialNpcsState(),
      interactables: createInitialInteractablesState(),
    },
    objectives: createInitialObjectivesState(objectiveCatalog),
    system: createInitialSkillsProgress(context.skills ?? INITIAL_SKILLS),
    items: createInitialItemsState(),
    lingering: createInitialLingering(),
    garden: createInitialGardenState(),
    bonds: createInitialBondsState(),
    registry: createInitialRegistryState(context.registry),
    organizations: createInitialOrganizationsState(),
    execution: createInitialExecutionState(context.execution),
    party: createInitialPartyState(),
    calendar: createInitialCalendarState(),
    family: createInitialFamilyState(),
    civic: createInitialCivicState(),
    economy: createInitialEconomyState(context.economy),
    settlements: createInitialSettlementsState(),
    politics: createInitialPoliticsState(),
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
  SCHEMA_VERSION_V6,
  SCHEMA_VERSION_V7,
  SCHEMA_VERSION_V8,
  SCHEMA_VERSION_V9,
  SCHEMA_VERSION_V10,
  SCHEMA_VERSION_V11,
  SCHEMA_VERSION_V12,
  SCHEMA_VERSION_V13,
  SCHEMA_VERSION_V14,
  SCHEMA_VERSION_V15,
  SCHEMA_VERSION_V16,
  SCHEMA_VERSION_V17,
  SCHEMA_VERSION_V18,
  SCHEMA_VERSION_V19,
  SCHEMA_VERSION_V20,
  SCHEMA_VERSION_V21,
  SCHEMA_VERSION_V22,
  MIGRATED_CAMPAIGN_ID,
} from './types';
export {
  inspectGameState,
  inspectGameStateV1,
  inspectGameStateV2,
  inspectGameStateV3,
  inspectGameStateV4,
  inspectGameStateV5,
  inspectGameStateV6,
  inspectGameStateV7,
  inspectGameStateV8,
  inspectGameStateV9,
  inspectGameStateV10,
  inspectGameStateV11,
  inspectGameStateV12,
  inspectGameStateV13,
  inspectGameStateV14,
  inspectGameStateV15,
  inspectGameStateV16,
  inspectGameStateV17,
  inspectGameStateV18,
  inspectGameStateV19,
  inspectGameStateV20,
  inspectGameStateV21,
  inspectGameStateV22,
  migrateGameStateV1,
  migrateGameStateV2,
  migrateGameStateV3,
  migrateGameStateV4,
  migrateGameStateV5,
  migrateGameStateV6,
  migrateGameStateV7,
  migrateGameStateV8,
  migrateGameStateV9,
  migrateGameStateV10,
  migrateGameStateV11,
  migrateGameStateV12,
  migrateGameStateV13,
  migrateGameStateV14,
  migrateGameStateV15,
  migrateGameStateV16,
  migrateGameStateV17,
  migrateGameStateV18,
  migrateGameStateV19,
  migrateGameStateV20,
  migrateGameStateV21,
  migrateGameStateV22,
} from './validateGameState';
export type {
  GameStateInspection,
  GameStateV1Inspection,
  GameStateV2Inspection,
  GameStateV3Inspection,
  GameStateV4Inspection,
  GameStateV5Inspection,
  GameStateV6Inspection,
  GameStateV7Inspection,
  GameStateV8Inspection,
  GameStateV9Inspection,
  GameStateV10Inspection,
  GameStateV11Inspection,
  GameStateV12Inspection,
  GameStateV13Inspection,
  GameStateV14Inspection,
  GameStateV15Inspection,
  GameStateV16Inspection,
  GameStateV17Inspection,
  GameStateV18Inspection,
  GameStateV19Inspection,
  GameStateV20Inspection,
  GameStateV21Inspection,
  GameStateV22Inspection,
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
  GameStateV6,
  GameStateV7,
  GameStateV8,
  GameStateV9,
  GameStateV10,
  GameStateV11,
  GameStateV12,
  GameStateV13,
  GameStateV14,
  GameStateV15,
  GameStateV16,
  GameStateV17,
  GameStateV18,
  GameStateV19,
  GameStateV20,
  GameStateV21,
  GameStateV22,
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
