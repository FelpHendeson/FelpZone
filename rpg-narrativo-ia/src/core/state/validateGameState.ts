import { inspectTimeState } from '../../modules/time';
import { INITIAL_NEEDS_SNAPSHOT } from '../../modules/needs';
import {
  INITIAL_OBJECTIVES,
  createInitialObjectivesState,
  inspectObjectivesState,
  synchronizeObjectives,
  type IndexedObjectives,
} from '../../modules/objectives';
import {
  createInitialSandboxState,
  createSandboxContext,
  inspectLegacySandboxState,
  inspectSandboxContext,
  inspectSandboxState,
  type SandboxContext,
} from '../../modules/sandbox';
import {
  createInitialPresenceState,
  resolvePresencesRevealedByDiscovery,
  synchronizeDiscoveredPresences,
  type IndexedPresences,
  type PresenceState,
} from '../../modules/presences';
import { worldTriggerConsumedFlag } from '../../modules/world-events';
import {
  INITIAL_SKILLS,
  createInitialSkillsProgress,
  inspectSkillsProgress,
} from '../../modules/skills';
import {
  INITIAL_ITEMS,
  createInitialItemsState,
  inspectItemsAgainstInventory,
} from '../../modules/items';
import {
  createInitialLingering,
  inspectPersistentConditions,
} from '../../modules/conditions';
import { createInitialGardenState, inspectGardenState } from '../../modules/garden';
import { createInitialNpcsState, inspectNpcsState } from '../../modules/npcs';
import {
  createInitialInteractablesState,
  inspectInteractablesState,
  synchronizeDiscoveredInteractables,
} from '../../modules/interactables';
import { createInitialBondsState, inspectBondsState } from '../../modules/bonds';
import { createInitialRegistryState, inspectRegistryState } from '../../modules/registry';
import { createInitialOrganizationsState, inspectOrganizationsState } from '../../modules/organizations';
import { createInitialExecutionState, inspectExecutionState } from '../../modules/execution';
import { createInitialPartyState, inspectPartyState } from '../../modules/party';
import { createInitialCalendarState, inspectCalendarState } from '../../modules/calendar';
import { createInitialFamilyState, inspectFamilyState } from '../../modules/family';
import { createInitialCivicState, inspectCivicState } from '../../modules/civic';
import { createInitialEconomyState, inspectEconomyState } from '../../modules/economy';
import { createInitialSettlementsState, inspectSettlementsState } from '../../modules/settlements';
import { createInitialPoliticsState, inspectPoliticsState } from '../../modules/politics';
import {
  ATTRIBUTE_IDS,
  LEGACY_ATTRIBUTE_IDS,
  MIGRATED_CAMPAIGN_ID,
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
  isDayPeriod,
  type GameState,
  type GameStateV1,
  type GameStateV2,
  type GameStateV3,
  type GameStateV4,
  type GameStateV5,
  type GameStateV6,
  type GameStateV7,
  type GameStateV8,
  type GameStateV9,
  type GameStateV10,
  type GameStateV11,
  type GameStateV12,
  type GameStateV13,
  type GameStateV14,
  type GameStateV15,
  type GameStateV16,
  type GameStateV17,
  type GameStateV18,
  type GameStateV19,
  type GameStateV20,
  type GameStateV21,
  type GameStateV22,
  type GameStatus,
  type NarrativeSession,
} from './types';

export type GameStateInspection =
  | { ok: true; state: GameState }
  | { ok: false; reason: string };

export type GameStateV1Inspection =
  | { ok: true; state: GameStateV1 }
  | { ok: false; reason: string };

export type GameStateV2Inspection =
  | { ok: true; state: GameStateV2 }
  | { ok: false; reason: string };

export type GameStateV3Inspection =
  | { ok: true; state: GameStateV3 }
  | { ok: false; reason: string };

export type GameStateV4Inspection =
  | { ok: true; state: GameStateV4 }
  | { ok: false; reason: string };

export type GameStateV5Inspection =
  | { ok: true; state: GameStateV5 }
  | { ok: false; reason: string };

export type GameStateV6Inspection =
  | { ok: true; state: GameStateV6 }
  | { ok: false; reason: string };

export type GameStateV7Inspection =
  | { ok: true; state: GameStateV7 }
  | { ok: false; reason: string };

export type GameStateV8Inspection =
  | { ok: true; state: GameStateV8 }
  | { ok: false; reason: string };

export type GameStateV9Inspection =
  | { ok: true; state: GameStateV9 }
  | { ok: false; reason: string };

export type GameStateV10Inspection =
  | { ok: true; state: GameStateV10 }
  | { ok: false; reason: string };

export type GameStateV11Inspection =
  | { ok: true; state: GameStateV11 }
  | { ok: false; reason: string };

export type GameStateV12Inspection =
  | { ok: true; state: GameStateV12 }
  | { ok: false; reason: string };

export type GameStateV13Inspection =
  | { ok: true; state: GameStateV13 }
  | { ok: false; reason: string };

export type GameStateV14Inspection =
  | { ok: true; state: GameStateV14 }
  | { ok: false; reason: string };

export type GameStateV15Inspection =
  | { ok: true; state: GameStateV15 }
  | { ok: false; reason: string };

export type GameStateV16Inspection =
  | { ok: true; state: GameStateV16 }
  | { ok: false; reason: string };

export type GameStateV17Inspection =
  | { ok: true; state: GameStateV17 }
  | { ok: false; reason: string };

export type GameStateV18Inspection =
  | { ok: true; state: GameStateV18 }
  | { ok: false; reason: string };

export type GameStateV19Inspection =
  | { ok: true; state: GameStateV19 }
  | { ok: false; reason: string };

export type GameStateV20Inspection =
  | { ok: true; state: GameStateV20 }
  | { ok: false; reason: string };

export type GameStateV21Inspection =
  | { ok: true; state: GameStateV21 }
  | { ok: false; reason: string };

export type GameStateV22Inspection =
  | { ok: true; state: GameStateV22 }
  | { ok: false; reason: string };

export function inspectGameState(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateInspection {
  try {
    return inspectCurrent(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV1(value: unknown): GameStateV1Inspection {
  try {
    return inspectV1(value);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV2(value: unknown, context?: SandboxContext): GameStateV2Inspection {
  try {
    return inspectV2(value, context);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV3(value: unknown, context?: SandboxContext): GameStateV3Inspection {
  try {
    return inspectV3(value, context);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV4(value: unknown, context?: SandboxContext): GameStateV4Inspection {
  try {
    return inspectV4(value, context);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV5(value: unknown, context?: SandboxContext): GameStateV5Inspection {
  try {
    return inspectV5(value, context);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV6(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV6Inspection {
  try {
    return inspectV6(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV7(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV7Inspection {
  try {
    return inspectV7(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV8(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV8Inspection {
  try {
    return inspectV8(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV9(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV9Inspection {
  try {
    return inspectV9(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV10(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV10Inspection {
  try {
    return inspectV10(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV11(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV11Inspection {
  try {
    return inspectV11(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV12(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV12Inspection {
  try {
    return inspectV12(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV13(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV13Inspection {
  try {
    return inspectV13(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV14(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV14Inspection {
  try {
    return inspectV14(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV15(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV15Inspection {
  try {
    return inspectV15(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV16(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV16Inspection {
  try {
    return inspectV16(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV17(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV17Inspection {
  try {
    return inspectV17(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV18(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV18Inspection {
  try {
    return inspectV18(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV19(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV19Inspection {
  try {
    return inspectV19(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV20(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV20Inspection {
  try {
    return inspectV20(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV21(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV21Inspection {
  try {
    return inspectV21(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function inspectGameStateV22(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV22Inspection {
  try {
    return inspectV22(value, context, objectiveCatalog);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

export function migrateGameStateV1(
  state: GameStateV1,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV4(
    migrateGameStateV3ToV4(migrateGameStateV2ToV3(migrateGameStateV1ToV2(state, context), context), context),
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV2(
  state: GameStateV2,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV4(migrateGameStateV3ToV4(migrateGameStateV2ToV3(state, context), context), context, objectiveCatalog);
}

export function migrateGameStateV3(
  state: GameStateV3,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV4(migrateGameStateV3ToV4(state, context), context, objectiveCatalog);
}

export function migrateGameStateV4(
  state: GameStateV4,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV5(migrateGameStateV4ToV5(state, context), context, objectiveCatalog);
}

export function migrateGameStateV5(
  state: GameStateV5,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV6(migrateGameStateV5ToV6(state, context, objectiveCatalog), objectiveCatalog);
}

export function migrateGameStateV6(
  state: GameStateV6,
  objectiveCatalog?: IndexedObjectives,
  context?: SandboxContext,
): GameState {
  return migrateGameStateV7(migrateGameStateV6ToV7(state, objectiveCatalog), context, objectiveCatalog);
}

function migrateGameStateV6ToV7(
  state: GameStateV6,
  objectiveCatalog?: IndexedObjectives,
): GameStateV7 {
  const catalog = requireObjectiveCatalog(objectiveCatalog);
  const candidate: GameStateV7 = {
    ...structuredClone(state),
    schemaVersion: SCHEMA_VERSION_V7,
    system: createInitialSkillsProgress(INITIAL_SKILLS),
  };

  return {
    ...candidate,
    objectives: synchronizeObjectives(catalog, candidate.objectives, candidate as unknown as GameState).current,
  };
}

export function migrateGameStateV7(
  state: GameStateV7,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV8(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V8,
      items: createInitialItemsState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV8(
  state: GameStateV8,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV9(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V9,
      lingering: createInitialLingering(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV9(
  state: GameStateV9,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV10(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V10,
      garden: createInitialGardenState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV10(
  state: GameStateV10,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV11(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V11,
      sandbox: {
        ...state.sandbox,
        npcs: createInitialNpcsState(),
      },
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV11(
  state: GameStateV11,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV12(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V12,
      sandbox: {
        ...state.sandbox,
        interactables: createInitialInteractablesState(),
      },
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV12(
  state: GameStateV12,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV13(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V13,
      bonds: createInitialBondsState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV13(
  state: GameStateV13,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV14(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V14,
      registry: createInitialRegistryState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV14(
  state: GameStateV14,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV15(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V15,
      organizations: createInitialOrganizationsState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV15(
  state: GameStateV15,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV16(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V16,
      execution: createInitialExecutionState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV16(
  state: GameStateV16,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV17(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V17,
      party: createInitialPartyState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV17(
  state: GameStateV17,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV18(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V18,
      calendar: createInitialCalendarState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV18(
  state: GameStateV18,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV19(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V19,
      family: createInitialFamilyState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV19(
  state: GameStateV19,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV20(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V20,
      civic: createInitialCivicState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV20(
  state: GameStateV20,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV21(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V21,
      economy: createInitialEconomyState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV21(
  state: GameStateV21,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return migrateGameStateV22(
    {
      ...structuredClone(state),
      schemaVersion: SCHEMA_VERSION_V22,
      settlements: createInitialSettlementsState(),
    },
    context,
    objectiveCatalog,
  );
}

export function migrateGameStateV22(
  state: GameStateV22,
  _context?: SandboxContext,
  _objectiveCatalog?: IndexedObjectives,
): GameState {
  void _context;
  void _objectiveCatalog;
  return {
    ...structuredClone(state),
    schemaVersion: SCHEMA_VERSION,
    politics: createInitialPoliticsState(),
  };
}

function migrateGameStateV5ToV6(
  state: GameStateV5,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV6 {
  const sandbox = inspectSandboxState(state.sandbox, context);
  if (!sandbox.ok) {
    throw new Error(sandbox.reason);
  }

  const resolvedContext = requireContext(context);
  const synchronizedPresences = synchronizeDiscoveredPresences(
    resolvedContext.presences,
    sandbox.value.presences,
    sandbox.value.exploration,
  ).current;

  return {
    schemaVersion: SCHEMA_VERSION_V6,
    status: state.status,
    character: { firstName: state.character.firstName, lastName: state.character.lastName },
    narrativeSession: copyNarrativeSession(state.narrativeSession),
    attributes: { ...state.attributes },
    inventory: state.inventory.map((item) => ({ itemId: item.itemId, quantity: item.quantity })),
    relationships: state.relationships.map((entry) => ({
      characterId: entry.characterId,
      trust: entry.trust,
    })),
    flags: { ...state.flags },
    history: state.history.map((entry) => ({ ...entry })),
    world: { day: state.world.day, period: state.world.period },
    progression: {
      abilityIds: [...state.progression.abilityIds],
      titleIds: [...state.progression.titleIds],
    },
    sandbox: {
      ...sandbox.value,
      presences: reconcileConsumedWorldPresenceResolutions(
        resolvedContext.presences,
        synchronizedPresences,
        state.flags,
      ),
    },
    objectives: createInitialObjectivesState(requireObjectiveCatalog(objectiveCatalog)),
    updatedAt: state.updatedAt,
  };
}

function migrateGameStateV4ToV5(state: GameStateV4, context?: SandboxContext): GameStateV5 {
  const sandbox = inspectSandboxState(state.sandbox, context);
  if (!sandbox.ok) {
    throw new Error(sandbox.reason);
  }

  const resolvedContext = requireContext(context);
  const synchronizedPresences = synchronizeDiscoveredPresences(
    resolvedContext.presences,
    sandbox.value.presences,
    sandbox.value.exploration,
  ).current;

  return {
    schemaVersion: SCHEMA_VERSION_V5,
    status: state.status,
    character: { firstName: state.character.firstName, lastName: state.character.lastName },
    narrativeSession: copyNarrativeSession(state.narrativeSession),
    attributes: { ...state.attributes, sede: INITIAL_NEEDS_SNAPSHOT.sede },
    inventory: state.inventory.map((item) => ({ itemId: item.itemId, quantity: item.quantity })),
    relationships: state.relationships.map((entry) => ({ characterId: entry.characterId, trust: entry.trust })),
    flags: { ...state.flags },
    history: state.history.map((entry) => ({ ...entry })),
    world: { day: state.world.day, period: state.world.period },
    progression: {
      abilityIds: [...state.progression.abilityIds],
      titleIds: [...state.progression.titleIds],
    },
    sandbox: {
      ...sandbox.value,
      presences: reconcileConsumedWorldPresenceResolutions(
        resolvedContext.presences,
        synchronizedPresences,
        state.flags,
      ),
    },
    updatedAt: state.updatedAt,
  };
}

function migrateGameStateV3ToV4(state: GameStateV3, context?: SandboxContext): GameStateV4 {
  const sandbox = inspectLegacySandboxState(state.sandbox, context);
  if (!sandbox.ok) {
    throw new Error(sandbox.reason);
  }

  const resolvedContext = requireContext(context);
  const synced = synchronizeDiscoveredPresences(
    resolvedContext.presences,
    createInitialPresenceState(resolvedContext.presences),
    sandbox.value.exploration,
  );

  return {
    schemaVersion: SCHEMA_VERSION_V4,
    status: state.status,
    character: { firstName: state.character.firstName, lastName: state.character.lastName },
    narrativeSession: copyNarrativeSession(state.narrativeSession),
    attributes: { ...state.attributes },
    inventory: state.inventory.map((item) => ({ itemId: item.itemId, quantity: item.quantity })),
    relationships: state.relationships.map((entry) => ({
      characterId: entry.characterId,
      trust: entry.trust,
    })),
    flags: { ...state.flags },
    history: state.history.map((entry) => ({ ...entry })),
    world: { day: state.world.day, period: state.world.period },
    progression: {
      abilityIds: [...state.progression.abilityIds],
      titleIds: [...state.progression.titleIds],
    },
    sandbox: {
      ...sandbox.value,
      presences: reconcileConsumedWorldPresenceResolutions(
        resolvedContext.presences,
        synced.current,
        state.flags,
      ),
    },
    updatedAt: state.updatedAt,
  };
}

function migrateGameStateV2ToV3(state: GameStateV2, context?: SandboxContext): GameStateV3 {
  const sandbox = inspectLegacySandboxState(state.sandbox, context);
  if (!sandbox.ok) {
    throw new Error(sandbox.reason);
  }

  return {
    schemaVersion: SCHEMA_VERSION_V3,
    status: state.status,
    character: { firstName: state.character.firstName, lastName: state.character.lastName },
    narrativeSession: copySessionFromLegacy(state.status, state.currentEventId),
    attributes: { ...state.attributes },
    inventory: state.inventory.map((item) => ({ itemId: item.itemId, quantity: item.quantity })),
    relationships: state.relationships.map((entry) => ({
      characterId: entry.characterId,
      trust: entry.trust,
    })),
    flags: { ...state.flags },
    history: state.history.map((entry) => ({ ...entry })),
    world: { day: state.world.day, period: state.world.period },
    progression: {
      abilityIds: [...state.progression.abilityIds],
      titleIds: [...state.progression.titleIds],
    },
    sandbox: sandbox.value,
    updatedAt: state.updatedAt,
  };
}

function migrateGameStateV1ToV2(state: GameStateV1, context?: SandboxContext): GameStateV2 {
  const sandbox = createInitialSandboxState(context);
  return {
    schemaVersion: SCHEMA_VERSION_V2,
    status: state.status,
    character: { firstName: state.character.firstName, lastName: state.character.lastName },
    currentEventId: state.currentEventId,
    attributes: { ...state.attributes },
    inventory: state.inventory.map((item) => ({ itemId: item.itemId, quantity: item.quantity })),
    relationships: state.relationships.map((entry) => ({
      characterId: entry.characterId,
      trust: entry.trust,
    })),
    flags: { ...state.flags },
    history: state.history.map((entry) => ({ ...entry })),
    world: { day: state.world.day, period: state.world.period },
    progression: {
      abilityIds: [...state.progression.abilityIds],
      titleIds: [...state.progression.titleIds],
    },
    sandbox,
    updatedAt: state.updatedAt,
  };
}

function copySessionFromLegacy(status: GameStatus, currentEventId: string): NarrativeSession | null {
  if (status === 'completed') {
    return null;
  }

  return {
    campaignId: MIGRATED_CAMPAIGN_ID,
    eventId: currentEventId,
  };
}

function copyNarrativeSession(session: NarrativeSession | null): NarrativeSession | null {
  if (!session) {
    return null;
  }

  return {
    campaignId: session.campaignId,
    eventId: session.eventId,
  };
}

function requireContext(context?: SandboxContext): SandboxContext {
  const inspected = inspectSandboxContext(context ?? createSandboxContext());
  if (!inspected.ok) {
    throw new Error(inspected.reason);
  }

  return inspected.value;
}

function requireObjectiveCatalog(catalog?: IndexedObjectives): IndexedObjectives {
  const resolved = catalog ?? INITIAL_OBJECTIVES;
  createInitialObjectivesState(resolved);
  return resolved;
}

function reconcileConsumedWorldPresenceResolutions(
  catalog: IndexedPresences,
  presences: PresenceState,
  flags: Record<string, boolean>,
): PresenceState {
  if (flags[worldTriggerConsumedFlag('first-priority')] !== true) {
    return presences;
  }

  return resolvePresencesRevealedByDiscovery(catalog, presences, 'first-priority-event');
}

function inspectCurrent(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateInspection {
  if (!isRecord(value)) {
    return fail('O salvamento não contém um objeto válido.');
  }

  if (value.schemaVersion !== SCHEMA_VERSION) {
    return fail('O salvamento está incompleto.');
  }

  const shared = readCurrentShared(value);
  if (!shared.ok) {
    return shared;
  }

  if ('currentEventId' in value) {
    return fail('O salvamento usa o contrato antigo de evento atual.');
  }

  const session = readNarrativeSession(value, shared.value.status);
  if (!session.ok) {
    return session;
  }

  const sandbox = inspectSandboxState(value.sandbox, context);
  if (!sandbox.ok) {
    return fail(sandbox.reason);
  }

  const resolvedContext = requireContext(context);
  const catalog = requireObjectiveCatalog(objectiveCatalog);
  const objectives = inspectObjectivesState(value.objectives, catalog);
  if (!objectives.ok) {
    return fail(objectives.reason);
  }
  const system = inspectSkillsProgress(value.system, INITIAL_SKILLS);
  if (!system.ok) {
    return fail(system.reason);
  }
  const items = inspectItemsAgainstInventory(
    value.items,
    shared.value.inventory,
    resolvedContext.items ?? INITIAL_ITEMS,
    resolvedContext.items !== undefined,
  );
  if (!items.ok) {
    return fail(items.reason);
  }
  const lingering = inspectPersistentConditions(value.lingering);
  if (!lingering.ok) {
    return fail(lingering.reason);
  }
  const garden = inspectGardenState(value.garden);
  if (!garden.ok) {
    return fail(garden.reason);
  }
  const bonds = inspectBondsState(value.bonds, resolvedContext.bonds);
  if (!bonds.ok) {
    return fail(bonds.reason);
  }
  const registry = inspectRegistryState(value.registry, resolvedContext.registry);
  if (!registry.ok) {
    return fail(registry.reason);
  }
  const organizations = inspectOrganizationsState(value.organizations, resolvedContext.organizations);
  if (!organizations.ok) {
    return fail(organizations.reason);
  }
  const execution = inspectExecutionState(value.execution, resolvedContext.execution);
  if (!execution.ok) {
    return fail(execution.reason);
  }
  const party = inspectPartyState(value.party, resolvedContext.party);
  if (!party.ok) {
    return fail(party.reason);
  }
  const calendar = inspectCalendarState(value.calendar);
  if (!calendar.ok) {
    return fail(calendar.reason);
  }
  const family = inspectFamilyState(value.family);
  if (!family.ok) {
    return fail(family.reason);
  }
  const civic = inspectCivicState(value.civic);
  if (!civic.ok) {
    return fail(civic.reason);
  }
  const economy = inspectEconomyState(value.economy, resolvedContext.economy);
  if (!economy.ok) {
    return fail(economy.reason);
  }
  const settlements = inspectSettlementsState(value.settlements, resolvedContext.settlements);
  if (!settlements.ok) {
    return fail(settlements.reason);
  }
  const politics = inspectPoliticsState(value.politics, resolvedContext.politics);
  if (!politics.ok) {
    return fail(politics.reason);
  }
  const npcs = inspectNpcsState(
    isRecord(value.sandbox) ? value.sandbox.npcs : undefined,
    resolvedContext.npcs,
  );
  if (!npcs.ok) {
    return fail(npcs.reason);
  }
  if (!resolvedContext.interactables) {
    return fail('O catálogo de pontos de interesse é inválido.');
  }
  const interactablesInspected = inspectInteractablesState(
    isRecord(value.sandbox) ? value.sandbox.interactables : undefined,
    resolvedContext.interactables,
  );
  if (!interactablesInspected.ok) {
    return fail(interactablesInspected.reason);
  }
  const synchronizedPresences = synchronizeDiscoveredPresences(
    resolvedContext.presences,
    sandbox.value.presences,
    sandbox.value.exploration,
  ).current;
  const synchronizedInteractables = synchronizeDiscoveredInteractables(
    resolvedContext.interactables,
    interactablesInspected.value,
    sandbox.value.exploration,
  ).current;

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION,
      ...shared.value,
      narrativeSession: session.value,
      sandbox: {
        ...sandbox.value,
        presences: reconcileConsumedWorldPresenceResolutions(
          resolvedContext.presences,
          synchronizedPresences,
          shared.value.flags,
        ),
        npcs: npcs.value,
        interactables: synchronizedInteractables,
      },
      objectives: objectives.value,
      system: system.value,
      items: items.value,
      lingering: lingering.value,
      garden: garden.value,
      bonds: bonds.value,
      registry: registry.value,
      organizations: organizations.value,
      execution: execution.value,
      party: party.value,
      calendar: calendar.value,
      family: family.value,
      civic: civic.value,
      economy: economy.value,
      settlements: settlements.value,
      politics: politics.value,
    },
  };
}

function inspectV6(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV6Inspection {
  if (!isRecord(value)) {
    return fail('O salvamento não contém um objeto válido.');
  }

  if (value.schemaVersion !== SCHEMA_VERSION_V6) {
    return fail('O salvamento está incompleto.');
  }

  const shared = readCurrentShared(value);
  if (!shared.ok) {
    return shared;
  }

  if ('currentEventId' in value) {
    return fail('O salvamento usa o contrato antigo de evento atual.');
  }

  if ('system' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 6.');
  }

  const session = readNarrativeSession(value, shared.value.status);
  if (!session.ok) {
    return session;
  }

  const sandbox = inspectSandboxState(value.sandbox, context);
  if (!sandbox.ok) {
    return fail(sandbox.reason);
  }

  const resolvedContext = requireContext(context);
  const catalog = requireObjectiveCatalog(objectiveCatalog);
  const objectives = inspectObjectivesState(value.objectives, catalog);
  if (!objectives.ok) {
    return fail(objectives.reason);
  }
  const synchronizedPresences = synchronizeDiscoveredPresences(
    resolvedContext.presences,
    sandbox.value.presences,
    sandbox.value.exploration,
  ).current;

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION_V6,
      ...shared.value,
      narrativeSession: session.value,
      sandbox: {
        ...sandbox.value,
        presences: reconcileConsumedWorldPresenceResolutions(
          resolvedContext.presences,
          synchronizedPresences,
          shared.value.flags,
        ),
      },
      objectives: objectives.value,
    },
  };
}

function inspectV7(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV7Inspection {
  const base = inspectVersionedSystemState(value, SCHEMA_VERSION_V7, context, objectiveCatalog);
  if (!base.ok) {
    return base;
  }
  if (!isRecord(value) || 'items' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 7.');
  }
  return { ok: true, state: { ...base.state, schemaVersion: SCHEMA_VERSION_V7 } };
}

function inspectV8(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV8Inspection {
  const base = inspectVersionedSystemState(value, SCHEMA_VERSION_V8, context, objectiveCatalog);
  if (!base.ok) {
    return base;
  }
  if (!isRecord(value) || 'lingering' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 8.');
  }
  const resolvedContext = requireContext(context);
  const items = inspectItemsAgainstInventory(
    value.items,
    base.state.inventory,
    resolvedContext.items ?? INITIAL_ITEMS,
    resolvedContext.items !== undefined,
  );
  if (!items.ok) {
    return fail(items.reason);
  }
  return { ok: true, state: { ...base.state, schemaVersion: SCHEMA_VERSION_V8, items: items.value } };
}

function inspectV9(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV9Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V9 || 'garden' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 9.');
  }
  const { lingering: lingeringRaw, ...rest } = value;
  const previous = inspectV8({ ...rest, schemaVersion: SCHEMA_VERSION_V8 }, context, objectiveCatalog);
  if (!previous.ok) {
    return previous;
  }
  const lingering = inspectPersistentConditions(lingeringRaw);
  if (!lingering.ok) {
    return fail(lingering.reason);
  }
  return { ok: true, state: { ...previous.state, schemaVersion: SCHEMA_VERSION_V9, lingering: lingering.value } };
}

function inspectV10(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV10Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V10 || (isRecord(value.sandbox) && 'npcs' in value.sandbox)) {
    return fail('O salvamento usa um contrato incompatível com o schema 10.');
  }
  const { garden: gardenRaw, ...rest } = value;
  const previous = inspectV9({ ...rest, schemaVersion: SCHEMA_VERSION_V9 }, context, objectiveCatalog);
  if (!previous.ok) {
    return previous;
  }
  const garden = inspectGardenState(gardenRaw);
  if (!garden.ok) {
    return fail(garden.reason);
  }
  return { ok: true, state: { ...previous.state, schemaVersion: SCHEMA_VERSION_V10, garden: garden.value } };
}

function inspectV11(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV11Inspection {
  if (
    !isRecord(value) ||
    value.schemaVersion !== SCHEMA_VERSION_V11 ||
    (isRecord(value.sandbox) && 'interactables' in value.sandbox)
  ) {
    return fail('O salvamento usa um contrato incompatível com o schema 11.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      sandbox: isRecord(value.sandbox) ? { ...value.sandbox, interactables: { objects: [] } } : value.sandbox,
      bonds: { edges: [], consumedActionIds: [] },
      registry: createInitialRegistryState(),
      organizations: createInitialOrganizationsState(),
      execution: createInitialExecutionState(),
      party: createInitialPartyState(),
      calendar: createInitialCalendarState(),
      family: createInitialFamilyState(),
      civic: createInitialCivicState(),
      economy: createInitialEconomyState(),
      settlements: createInitialSettlementsState(),
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { interactables: _ignored, ...sandbox } = inspected.state.sandbox;
  const { bonds: _bonds, registry: _registry, organizations: _organizations, execution: _execution, party: _party, calendar: _calendar, family: _family, civic: _civic, economy: _economy, settlements: _settlements, politics: _politics, ...rest } = inspected.state;
  void _ignored;
  void _bonds;
  void _registry;
  void _organizations;
  void _execution;
  void _party;
  void _calendar;
  void _family;
  void _civic;
  void _economy;
  void _settlements;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V11,
      sandbox,
    },
  };
}

function inspectV12(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV12Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V12 || 'bonds' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 12.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      bonds: { edges: [], consumedActionIds: [] },
      registry: createInitialRegistryState(),
      organizations: createInitialOrganizationsState(),
      execution: createInitialExecutionState(),
      party: createInitialPartyState(),
      calendar: createInitialCalendarState(),
      family: createInitialFamilyState(),
      civic: createInitialCivicState(),
      economy: createInitialEconomyState(),
      settlements: createInitialSettlementsState(),
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { bonds: _bonds, registry: _registry, organizations: _organizations, execution: _execution, party: _party, calendar: _calendar, family: _family, civic: _civic, economy: _economy, settlements: _settlements, politics: _politics, ...rest } = inspected.state;
  void _bonds;
  void _registry;
  void _organizations;
  void _execution;
  void _party;
  void _calendar;
  void _family;
  void _civic;
  void _economy;
  void _settlements;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V12,
    },
  };
}

function inspectV13(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV13Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V13 || 'registry' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 13.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      registry: createInitialRegistryState(),
      organizations: createInitialOrganizationsState(),
      execution: createInitialExecutionState(),
      party: createInitialPartyState(),
      calendar: createInitialCalendarState(),
      family: createInitialFamilyState(),
      civic: createInitialCivicState(),
      economy: createInitialEconomyState(),
      settlements: createInitialSettlementsState(),
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { registry: _registry, organizations: _organizations, execution: _execution, party: _party, calendar: _calendar, family: _family, civic: _civic, economy: _economy, settlements: _settlements, politics: _politics, ...rest } = inspected.state;
  void _registry;
  void _organizations;
  void _execution;
  void _party;
  void _calendar;
  void _family;
  void _civic;
  void _economy;
  void _settlements;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V13,
    },
  };
}

function inspectV14(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV14Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V14 || 'organizations' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 14.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      organizations: createInitialOrganizationsState(),
      execution: createInitialExecutionState(),
      party: createInitialPartyState(),
      calendar: createInitialCalendarState(),
      family: createInitialFamilyState(),
      civic: createInitialCivicState(),
      economy: createInitialEconomyState(),
      settlements: createInitialSettlementsState(),
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { organizations: _organizations, execution: _execution, party: _party, calendar: _calendar, family: _family, civic: _civic, economy: _economy, settlements: _settlements, politics: _politics, ...rest } = inspected.state;
  void _organizations;
  void _execution;
  void _party;
  void _calendar;
  void _family;
  void _civic;
  void _economy;
  void _settlements;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V14,
    },
  };
}

function inspectV15(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV15Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V15 || 'execution' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 15.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      execution: createInitialExecutionState(),
      party: createInitialPartyState(),
      calendar: createInitialCalendarState(),
      family: createInitialFamilyState(),
      civic: createInitialCivicState(),
      economy: createInitialEconomyState(),
      settlements: createInitialSettlementsState(),
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { execution: _execution, party: _party, calendar: _calendar, family: _family, civic: _civic, economy: _economy, settlements: _settlements, politics: _politics, ...rest } = inspected.state;
  void _execution;
  void _party;
  void _calendar;
  void _family;
  void _civic;
  void _economy;
  void _settlements;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V15,
    },
  };
}

function inspectV16(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV16Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V16 || 'party' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 16.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      party: createInitialPartyState(),
      calendar: createInitialCalendarState(),
      family: createInitialFamilyState(),
      civic: createInitialCivicState(),
      economy: createInitialEconomyState(),
      settlements: createInitialSettlementsState(),
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { party: _party, calendar: _calendar, family: _family, civic: _civic, economy: _economy, settlements: _settlements, politics: _politics, ...rest } = inspected.state;
  void _party;
  void _calendar;
  void _family;
  void _civic;
  void _economy;
  void _settlements;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V16,
    },
  };
}

function inspectV17(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV17Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V17 || 'calendar' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 17.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      calendar: createInitialCalendarState(),
      family: createInitialFamilyState(),
      civic: createInitialCivicState(),
      economy: createInitialEconomyState(),
      settlements: createInitialSettlementsState(),
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { calendar: _calendar, family: _family, civic: _civic, economy: _economy, settlements: _settlements, politics: _politics, ...rest } = inspected.state;
  void _calendar;
  void _family;
  void _civic;
  void _economy;
  void _settlements;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V17,
    },
  };
}

function inspectV18(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV18Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V18 || 'family' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 18.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      family: createInitialFamilyState(),
      civic: createInitialCivicState(),
      economy: createInitialEconomyState(),
      settlements: createInitialSettlementsState(),
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { family: _family, civic: _civic, economy: _economy, settlements: _settlements, politics: _politics, ...rest } = inspected.state;
  void _family;
  void _civic;
  void _economy;
  void _settlements;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V18,
    },
  };
}

function inspectV19(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV19Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V19 || 'civic' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 19.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      civic: createInitialCivicState(),
      economy: createInitialEconomyState(),
      settlements: createInitialSettlementsState(),
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { civic: _civic, economy: _economy, settlements: _settlements, politics: _politics, ...rest } = inspected.state;
  void _civic;
  void _economy;
  void _settlements;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V19,
    },
  };
}

function inspectV20(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV20Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V20 || 'economy' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 20.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      economy: createInitialEconomyState(),
      settlements: createInitialSettlementsState(),
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { economy: _economy, settlements: _settlements, politics: _politics, ...rest } = inspected.state;
  void _economy;
  void _settlements;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V20,
    },
  };
}

function inspectV21(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV21Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V21 || 'settlements' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 21.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      settlements: createInitialSettlementsState(),
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { settlements: _settlements, politics: _politics, ...rest } = inspected.state;
  void _settlements;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V21,
    },
  };
}

function inspectV22(
  value: unknown,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GameStateV22Inspection {
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION_V22 || 'politics' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 22.');
  }
  const inspected = inspectCurrent(
    {
      ...value,
      schemaVersion: SCHEMA_VERSION,
      politics: createInitialPoliticsState(),
    },
    context,
    objectiveCatalog,
  );
  if (!inspected.ok) {
    return inspected;
  }
  const { politics: _politics, ...rest } = inspected.state;
  void _politics;
  return {
    ok: true,
    state: {
      ...rest,
      schemaVersion: SCHEMA_VERSION_V22,
    },
  };
}

function inspectVersionedSystemState(
  value: unknown,
  schemaVersion: typeof SCHEMA_VERSION_V7 | typeof SCHEMA_VERSION_V8,
  context: SandboxContext | undefined,
  objectiveCatalog: IndexedObjectives | undefined,
): GameStateV7Inspection {
  if (!isRecord(value)) {
    return fail('O salvamento não contém um objeto válido.');
  }
  if (value.schemaVersion !== schemaVersion) {
    return fail('O salvamento está incompleto.');
  }
  const shared = readCurrentShared(value);
  if (!shared.ok) {
    return shared;
  }
  if ('currentEventId' in value) {
    return fail('O salvamento usa o contrato antigo de evento atual.');
  }
  const session = readNarrativeSession(value, shared.value.status);
  if (!session.ok) {
    return session;
  }
  const sandbox = inspectSandboxState(value.sandbox, context);
  if (!sandbox.ok) {
    return fail(sandbox.reason);
  }
  const resolvedContext = requireContext(context);
  const catalog = requireObjectiveCatalog(objectiveCatalog);
  const objectives = inspectObjectivesState(value.objectives, catalog);
  if (!objectives.ok) {
    return fail(objectives.reason);
  }
  const system = inspectSkillsProgress(value.system, INITIAL_SKILLS);
  if (!system.ok) {
    return fail(system.reason);
  }
  const synchronizedPresences = synchronizeDiscoveredPresences(
    resolvedContext.presences,
    sandbox.value.presences,
    sandbox.value.exploration,
  ).current;
  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION_V7,
      ...shared.value,
      narrativeSession: session.value,
      sandbox: {
        ...sandbox.value,
        presences: reconcileConsumedWorldPresenceResolutions(
          resolvedContext.presences,
          synchronizedPresences,
          shared.value.flags,
        ),
      },
      objectives: objectives.value,
      system: system.value,
    },
  };
}

function inspectV1(value: unknown): GameStateV1Inspection {
  if (!isRecord(value)) {
    return fail('O salvamento não contém um objeto válido.');
  }

  if (value.schemaVersion !== SCHEMA_VERSION_V1) {
    return fail('O salvamento está incompleto.');
  }

  const shared = readLegacyShared(value);
  if (!shared.ok) {
    return shared;
  }

  const currentEventId = readCurrentEventId(value);
  if (!currentEventId) {
    return fail('O evento atual é inválido.');
  }

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION_V1,
      ...shared.value,
      currentEventId,
    },
  };
}

function inspectV2(value: unknown, context?: SandboxContext): GameStateV2Inspection {
  if (!isRecord(value)) {
    return fail('O salvamento não contém um objeto válido.');
  }

  if (value.schemaVersion !== SCHEMA_VERSION_V2) {
    return fail('O salvamento está incompleto.');
  }

  const shared = readLegacyShared(value);
  if (!shared.ok) {
    return shared;
  }

  const currentEventId = readCurrentEventId(value);
  if (!currentEventId) {
    return fail('O evento atual é inválido.');
  }

  const sandbox = inspectLegacySandboxState(value.sandbox, context);
  if (!sandbox.ok) {
    return fail(sandbox.reason);
  }

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION_V2,
      ...shared.value,
      currentEventId,
      sandbox: sandbox.value,
    },
  };
}

function inspectV3(value: unknown, context?: SandboxContext): GameStateV3Inspection {
  if (!isRecord(value)) {
    return fail('O salvamento não contém um objeto válido.');
  }

  if (value.schemaVersion !== SCHEMA_VERSION_V3) {
    return fail('O salvamento está incompleto.');
  }

  const shared = readLegacyShared(value);
  if (!shared.ok) {
    return shared;
  }

  if ('currentEventId' in value) {
    return fail('O salvamento usa o contrato antigo de evento atual.');
  }

  const session = readNarrativeSession(value, shared.value.status);
  if (!session.ok) {
    return session;
  }

  const sandbox = inspectLegacySandboxState(value.sandbox, context);
  if (!sandbox.ok) {
    return fail(sandbox.reason);
  }

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION_V3,
      ...shared.value,
      narrativeSession: session.value,
      sandbox: sandbox.value,
    },
  };
}

function inspectV4(value: unknown, context?: SandboxContext): GameStateV4Inspection {
  if (!isRecord(value)) {
    return fail('O salvamento não contém um objeto válido.');
  }

  if (value.schemaVersion !== SCHEMA_VERSION_V4) {
    return fail('O salvamento está incompleto.');
  }

  const shared = readLegacyShared(value);
  if (!shared.ok) {
    return shared;
  }

  if ('currentEventId' in value) {
    return fail('O salvamento usa o contrato antigo de evento atual.');
  }

  const session = readNarrativeSession(value, shared.value.status);
  if (!session.ok) {
    return session;
  }

  const sandbox = inspectSandboxState(value.sandbox, context);
  if (!sandbox.ok) {
    return fail(sandbox.reason);
  }

  const resolvedContext = requireContext(context);
  const synchronizedPresences = synchronizeDiscoveredPresences(
    resolvedContext.presences,
    sandbox.value.presences,
    sandbox.value.exploration,
  ).current;

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION_V4,
      ...shared.value,
      narrativeSession: session.value,
      sandbox: {
        ...sandbox.value,
        presences: reconcileConsumedWorldPresenceResolutions(
          resolvedContext.presences,
          synchronizedPresences,
          shared.value.flags,
        ),
      },
    },
  };
}

function inspectV5(value: unknown, context?: SandboxContext): GameStateV5Inspection {
  if (!isRecord(value)) {
    return fail('O salvamento não contém um objeto válido.');
  }

  if (value.schemaVersion !== SCHEMA_VERSION_V5) {
    return fail('O salvamento está incompleto.');
  }

  const shared = readCurrentShared(value);
  if (!shared.ok) {
    return shared;
  }

  if ('currentEventId' in value || 'objectives' in value) {
    return fail('O salvamento usa um contrato incompatível com o schema 5.');
  }

  const session = readNarrativeSession(value, shared.value.status);
  if (!session.ok) {
    return session;
  }

  const sandbox = inspectSandboxState(value.sandbox, context);
  if (!sandbox.ok) {
    return fail(sandbox.reason);
  }

  const resolvedContext = requireContext(context);
  const synchronizedPresences = synchronizeDiscoveredPresences(
    resolvedContext.presences,
    sandbox.value.presences,
    sandbox.value.exploration,
  ).current;

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION_V5,
      ...shared.value,
      narrativeSession: session.value,
      sandbox: {
        ...sandbox.value,
        presences: reconcileConsumedWorldPresenceResolutions(
          resolvedContext.presences,
          synchronizedPresences,
          shared.value.flags,
        ),
      },
    },
  };
}

type SharedFields = Omit<GameStateV5, 'schemaVersion' | 'sandbox' | 'narrativeSession'>;
type LegacySharedFields = Omit<GameStateV4, 'schemaVersion' | 'sandbox' | 'narrativeSession'>;

type SharedInspection = { ok: true; value: SharedFields } | { ok: false; reason: string };
type LegacySharedInspection = { ok: true; value: LegacySharedFields } | { ok: false; reason: string };

type SessionInspection = { ok: true; value: NarrativeSession | null } | { ok: false; reason: string };

function readCurrentShared(value: Record<string, unknown>): SharedInspection {
  return readShared(value, readAttributes);
}

function readLegacyShared(value: Record<string, unknown>): LegacySharedInspection {
  return readShared(value, readLegacyAttributes);
}

function readShared<TAttributes>(
  value: Record<string, unknown>,
  readAttributesValue: (attributes: unknown) => TAttributes | undefined,
): { ok: true; value: Omit<SharedFields, 'attributes'> & { attributes: TAttributes } } | { ok: false; reason: string } {
  if (value.status !== 'playing' && value.status !== 'completed') {
    return fail('O estado da partida é inválido.');
  }

  if (typeof value.updatedAt !== 'string' || Number.isNaN(Date.parse(value.updatedAt))) {
    return fail('A data de atualização é inválida.');
  }

  const character = readCharacter(value.character);
  if (!character) {
    return fail('A identidade do personagem é inválida.');
  }

  const attributes = readAttributesValue(value.attributes);
  if (!attributes) {
    return fail('Os atributos da partida são inválidos.');
  }

  const inventory = readInventory(value.inventory);
  if (!inventory) {
    return fail('O inventário da partida é inválido.');
  }

  const relationships = readRelationships(value.relationships);
  if (!relationships) {
    return fail('As relações da partida são inválidas.');
  }

  const flags = readFlags(value.flags);
  if (!flags) {
    return fail('As flags narrativas são inválidas.');
  }

  const history = readHistory(value.history);
  if (!history) {
    return fail('O histórico da partida é inválido.');
  }

  const world = readWorld(value.world);
  if (!world) {
    return fail('O período da partida é inválido.');
  }

  const progression = readProgression(value.progression);
  if (!progression) {
    return fail('A progressão da partida é inválida.');
  }

  return {
    ok: true,
    value: {
      status: value.status,
      character,
      attributes,
      inventory,
      relationships,
      flags,
      history,
      world,
      progression,
      updatedAt: value.updatedAt,
    },
  };
}

function readCurrentEventId(value: Record<string, unknown>): string | undefined {
  if (typeof value.currentEventId !== 'string' || value.currentEventId.trim() === '') {
    return undefined;
  }

  return value.currentEventId;
}

function readNarrativeSession(value: Record<string, unknown>, status: GameStatus): SessionInspection {
  if (!('narrativeSession' in value)) {
    return fail('A sessão narrativa está ausente.');
  }

  if (value.narrativeSession === null) {
    return { ok: true, value: null };
  }

  if (!isRecord(value.narrativeSession)) {
    return fail('A sessão narrativa é inválida.');
  }

  const campaignId = value.narrativeSession.campaignId;
  const eventId = value.narrativeSession.eventId;

  if (typeof campaignId !== 'string' || campaignId.trim() === '') {
    return fail('A campanha da sessão narrativa é inválida.');
  }

  if (typeof eventId !== 'string' || eventId.trim() === '') {
    return fail('O evento da sessão narrativa é inválido.');
  }

  if (status === 'completed') {
    return fail('Uma partida concluída não pode ter sessão narrativa ativa.');
  }

  return {
    ok: true,
    value: {
      campaignId,
      eventId,
    },
  };
}

function readCharacter(value: unknown): GameState['character'] | undefined {
  if (!isRecord(value) || typeof value.firstName !== 'string' || typeof value.lastName !== 'string') {
    return undefined;
  }

  if (value.firstName.trim() === '' || value.lastName.trim() === '') {
    return undefined;
  }

  return {
    firstName: value.firstName,
    lastName: value.lastName,
  };
}

function readAttributes(value: unknown): GameState['attributes'] | undefined {
  const attributes = readAttributesByIds(value, ATTRIBUTE_IDS);
  if (!attributes || !Number.isSafeInteger(attributes.sede)) {
    return undefined;
  }

  return attributes as unknown as GameState['attributes'];
}

function readLegacyAttributes(value: unknown): GameStateV4['attributes'] | undefined {
  return readAttributesByIds(value, LEGACY_ATTRIBUTE_IDS) as GameStateV4['attributes'] | undefined;
}

function readAttributesByIds(
  value: unknown,
  attributeIds: readonly string[],
): Record<string, number> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const keys = Object.keys(value);
  if (keys.length !== attributeIds.length || attributeIds.some((id) => !keys.includes(id))) {
    return undefined;
  }

  const attributes: Record<string, number> = {};
  for (const id of attributeIds) {
    if (!isBoundedNumber(value[id], 0, 100)) {
      return undefined;
    }
    attributes[id] = value[id];
  }

  return attributes;
}

function readInventory(value: unknown): GameState['inventory'] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  const items: GameState['inventory'] = [];

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.itemId !== 'string' || entry.itemId.trim() === '') {
      return undefined;
    }

    if (!isPositiveSafeInteger(entry.quantity) || seen.has(entry.itemId)) {
      return undefined;
    }

    seen.add(entry.itemId);
    items.push({ itemId: entry.itemId, quantity: entry.quantity });
  }

  return items;
}

function readRelationships(value: unknown): GameState['relationships'] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  const relationships: GameState['relationships'] = [];

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.characterId !== 'string' || entry.characterId.trim() === '') {
      return undefined;
    }

    if (!isBoundedNumber(entry.trust, 0, 100) || seen.has(entry.characterId)) {
      return undefined;
    }

    seen.add(entry.characterId);
    relationships.push({ characterId: entry.characterId, trust: entry.trust });
  }

  return relationships;
}

function readFlags(value: unknown): Record<string, boolean> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const flags: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(value)) {
    if (key.trim() === '' || typeof flag !== 'boolean') {
      return undefined;
    }
    flags[key] = flag;
  }

  return flags;
}

function readHistory(value: unknown): GameState['history'] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const history: GameState['history'] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      return undefined;
    }

    if (
      typeof entry.eventId !== 'string' ||
      entry.eventId.trim() === '' ||
      typeof entry.eventTitle !== 'string' ||
      typeof entry.choiceId !== 'string' ||
      entry.choiceId.trim() === '' ||
      typeof entry.choiceLabel !== 'string' ||
      typeof entry.notable !== 'boolean'
    ) {
      return undefined;
    }

    history.push({
      eventId: entry.eventId,
      eventTitle: entry.eventTitle,
      choiceId: entry.choiceId,
      choiceLabel: entry.choiceLabel,
      notable: entry.notable,
    });
  }

  return history;
}

function readWorld(value: unknown): GameState['world'] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const inspected = inspectTimeState({
    day: value.day,
    periodId: value.period,
  });

  if (!inspected.ok || !isDayPeriod(inspected.value.periodId)) {
    return undefined;
  }

  return {
    day: inspected.value.day,
    period: inspected.value.periodId,
  };
}

function readProgression(value: unknown): GameState['progression'] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const abilityIds = readUniqueStrings(value.abilityIds);
  const titleIds = readUniqueStrings(value.titleIds);
  if (!abilityIds || !titleIds) {
    return undefined;
  }

  return { abilityIds, titleIds };
}

function readUniqueStrings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim() === '' || seen.has(entry)) {
      return undefined;
    }
    seen.add(entry);
    result.push(entry);
  }

  return result;
}

function isBoundedNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}
