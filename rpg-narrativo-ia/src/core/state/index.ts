import type { CharacterIdentityInput, GameState } from './types';
import { SCHEMA_VERSION, copyCharacterIdentity } from './types';
import { INITIAL_ARCHETYPES, applyArchetypeStart } from '../../modules/archetypes';
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
import { createInitialGuidanceState } from '../../modules/guidance';
import { createInitialContextualActivitiesState } from '../../modules/activities';
import { createChanceState } from '../../modules/chance';
import { createInitialStoryState } from '../../modules/story';

export function createInitialState(
  character: CharacterIdentityInput,
  campaign: { id: string; firstEventId: string },
  now = defaultNow,
  sandboxContext?: SandboxContext,
  objectiveCatalog: IndexedObjectives = INITIAL_OBJECTIVES,
): GameState {
  const context = sandboxContext ?? createSandboxContext();
  const createdAt = now();
  // O arquétipo de aprendiz já desperta com o equipamento de assinatura nas mãos.
  const start = character.archetypeId
    ? applyArchetypeStart(INITIAL_ARCHETYPES, character.archetypeId, [], createInitialItemsState(), context.items)
    : { inventory: [], items: createInitialItemsState() };
  return {
    schemaVersion: SCHEMA_VERSION,
    status: 'playing',
    character: copyCharacterIdentity({
      firstName: character.firstName,
      lastName: character.lastName,
      sex: character.sex ?? 'unspecified',
      ...(character.archetypeId ? { archetypeId: character.archetypeId } : {}),
      ...(character.portrait ? { portrait: character.portrait } : {}),
    }),
    narrativeSession: {
      campaignId: campaign.id,
      eventId: campaign.firstEventId,
    },
    attributes: createInitialAttributes(),
    inventory: start.inventory,
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
    items: start.items,
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
    guidance: createInitialGuidanceState(),
    activities: createInitialContextualActivitiesState(),
    rng: createChanceState(`${createdAt}|${character.firstName} ${character.lastName}`),
    story: createInitialStoryState(),
    updatedAt: createdAt,
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
  SCHEMA_VERSION_V23,
  SCHEMA_VERSION_V24,
  SCHEMA_VERSION_V25,
  SCHEMA_VERSION_V26,
  SCHEMA_VERSION_V27,
  MIGRATED_CAMPAIGN_ID,
  PORTRAIT_OPTION_COUNT,
  PORTRAIT_PRESET_ID,
  copyCharacterIdentity,
  isPortraitConfig,
} from './types';
export type { PortraitConfig } from './types';
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
  inspectGameStateV23,
  inspectGameStateV24,
  inspectGameStateV25,
  inspectGameStateV26,
  inspectGameStateV27,
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
  migrateGameStateV23,
  migrateGameStateV24,
  migrateGameStateV25,
  migrateGameStateV26,
  migrateGameStateV27,
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
  GameStateV23Inspection,
  GameStateV24Inspection,
  GameStateV25Inspection,
  GameStateV26Inspection,
  GameStateV27Inspection,
} from './validateGameState';
export {
  ATTRIBUTE_IDS,
  LEGACY_ATTRIBUTE_IDS,
  CHARACTER_SEXES,
  DAY_PERIODS,
  isAttributeId,
  isDayPeriod,
} from './types';
export type {
  AttributeId,
  Attributes,
  CharacterIdentity,
  CharacterIdentityInput,
  CharacterSex,
  LegacyCharacterIdentity,
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
  GameStateV23,
  GameStateV24,
  GameStateV25,
  GameStateV26,
  GameStateV27,
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
