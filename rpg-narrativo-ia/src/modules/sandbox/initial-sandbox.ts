import { firstDayCampaign } from '../../campaigns/first-day';
import labels from '../../../content/first-day/ui/labels.json' with { type: 'json' };
import { CombatError, INITIAL_COMBAT, validateEncounterDiscoveries } from '../combat';
import { INITIAL_CONDITIONS } from '../conditions';
import { INITIAL_ENERGETICS } from '../energetics';
import { INITIAL_GARDEN } from '../garden';
import { INITIAL_ITEMS } from '../items';
import {
  INITIAL_RECIPES,
  INITIAL_STRUCTURES,
  createInitialCrafting,
  indexCraftingDefinitions,
} from '../crafting';
import {
  INITIAL_EXPLORATION_DEFINITIONS,
  createInitialExploration,
  indexExplorationDefinitions,
} from '../exploration';
import {
  DEFAULT_STARTING_LOCATION_ID,
  INITIAL_WORLD_MAP,
  NavigationError,
  createInitialNavigation,
  indexNavigationMap,
} from '../navigation';
import { INITIAL_BONDS } from '../bonds';
import { INITIAL_ORGANIZATIONS } from '../organizations';
import { INITIAL_CALENDAR } from '../calendar';
import { INITIAL_FAMILY } from '../family';
import { INITIAL_CIVIC } from '../civic';
import { INITIAL_ECONOMY } from '../economy';
import { INITIAL_SETTLEMENTS } from '../settlements';
import { INITIAL_POLITICS } from '../politics';
import { INITIAL_REGISTRY } from '../registry';
import { INITIAL_EXECUTION } from '../execution';
import { INITIAL_PARTY } from '../party';
import {
  INITIAL_INTERACTABLE_CATALOG,
  createInitialInteractablesState,
  indexInteractableCatalog,
} from '../interactables';
import {
  INITIAL_PRESENCE_CATALOG,
  INITIAL_PRESENCE_INTERACTIONS,
  createInitialPresenceState,
  indexPresenceCatalog,
  indexPresenceInteractionCatalog,
} from '../presences';
import { INITIAL_MASTERY, MasteryError, validateMasteryReferences } from '../mastery';
import {
  INITIAL_POPULATIONS,
  INITIAL_RESOURCE_NODES,
  createInitialResources,
  indexResourceDefinitions,
} from '../resources';
import { INITIAL_SKILLS } from '../skills';
import { INITIAL_TRAINING } from '../training';
import { INITIAL_NPCS } from '../npcs';
import { INITIAL_OBJECTIVES } from '../objectives';
import { INITIAL_GUIDANCE } from '../guidance';
import { indexContextualActivityCatalog } from '../activities';
import type { IndexedWorld } from '../content';
import { inspectSandboxContext } from './context-validation';
import { SandboxError, type SandboxContext, type SandboxState } from './types';

export function createSandboxContextFromWorld(
  world: IndexedWorld,
  startingLocationId: string = world.startingLocationId,
): SandboxContext {
  if (typeof startingLocationId !== 'string' || startingLocationId.trim() === '') {
    throw new SandboxError('A localização inicial não existe.');
  }
  if (!world.map.locations.has(startingLocationId)) {
    throw new SandboxError('A localização inicial não existe.');
  }

  return {
    startingLocationId,
    map: world.map,
    exploration: world.exploration,
    resources: world.resources,
    crafting: world.crafting,
    presences: world.presences,
    presenceInteractions: world.presenceInteractions,
    interactables: world.interactables,
    bonds: world.bonds,
    organizations: world.organizations,
    calendar: world.calendar,
    family: world.family,
    civic: world.civic,
    economy: world.economy,
    settlements: world.settlements,
    politics: world.politics,
    registry: world.registry,
    execution: world.execution,
    party: world.party,
    campaign: world.campaign,
    npcs: world.npcs,
    items: world.items,
    skills: world.skills,
    training: world.training,
    mastery: world.mastery,
    combat: world.combat,
    energetics: world.energetics,
    garden: world.garden,
    conditions: world.conditions,
    objectives: world.objectives,
    worldTriggers: world.worldTriggers,
    stationLabels: world.stationLabels,
    guidance: world.guidance,
    activities: world.activities,
  };
}

export function createSandboxContext(
  startingLocationId: string = DEFAULT_STARTING_LOCATION_ID,
): SandboxContext {
  if (typeof startingLocationId !== 'string' || startingLocationId.trim() === '') {
    throw new SandboxError('A localização inicial não existe.');
  }

  try {
    const map = indexNavigationMap(INITIAL_WORLD_MAP, startingLocationId);
    const exploration = indexExplorationDefinitions(INITIAL_EXPLORATION_DEFINITIONS, map);
    validateEncounterDiscoveries(INITIAL_COMBAT, new Set(exploration.byDiscovery.keys()));
    validateMasteryReferences(INITIAL_MASTERY, {
      skillIds: new Set(INITIAL_SKILLS.skills.map((skill) => skill.id)),
      trainingMethodIds: new Set(INITIAL_TRAINING.methods.map((method) => method.id)),
      encounterIds: new Set(INITIAL_COMBAT.encounters.map((encounter) => encounter.id)),
    });
    const resources = indexResourceDefinitions(INITIAL_RESOURCE_NODES, INITIAL_POPULATIONS, map, exploration);
    const crafting = indexCraftingDefinitions(INITIAL_RECIPES, INITIAL_STRUCTURES, INITIAL_ITEMS);
    const presences = indexPresenceCatalog(INITIAL_PRESENCE_CATALOG, map, exploration);
    const presenceInteractions = indexPresenceInteractionCatalog(
      INITIAL_PRESENCE_INTERACTIONS,
      presences,
      firstDayCampaign,
    );
    const interactables = indexInteractableCatalog(INITIAL_INTERACTABLE_CATALOG, map, exploration, INITIAL_ITEMS);
    const activities = indexContextualActivityCatalog(
      { activities: [] },
      { map, npcs: INITIAL_NPCS, guidance: INITIAL_GUIDANCE, campaign: firstDayCampaign },
    );

    return {
      startingLocationId,
      map,
      exploration,
      resources,
      crafting,
      presences,
      presenceInteractions,
      interactables,
      bonds: INITIAL_BONDS,
      organizations: INITIAL_ORGANIZATIONS,
      calendar: INITIAL_CALENDAR,
      family: INITIAL_FAMILY,
      civic: INITIAL_CIVIC,
      economy: INITIAL_ECONOMY,
      settlements: INITIAL_SETTLEMENTS,
      politics: INITIAL_POLITICS,
      registry: INITIAL_REGISTRY,
      execution: INITIAL_EXECUTION,
      party: INITIAL_PARTY,
      campaign: firstDayCampaign,
      npcs: INITIAL_NPCS,
      items: INITIAL_ITEMS,
      skills: INITIAL_SKILLS,
      training: INITIAL_TRAINING,
      mastery: INITIAL_MASTERY,
      combat: INITIAL_COMBAT,
      energetics: INITIAL_ENERGETICS,
      garden: INITIAL_GARDEN,
      conditions: INITIAL_CONDITIONS,
      objectives: INITIAL_OBJECTIVES,
      stationLabels: labels.stations,
      guidance: INITIAL_GUIDANCE,
      activities,
    };
  } catch (error) {
    if (error instanceof NavigationError || error instanceof CombatError || error instanceof MasteryError) {
      throw new SandboxError(error.message, { cause: error });
    }

    throw error;
  }
}

export function createInitialSandboxState(context: SandboxContext = createSandboxContext()): SandboxState {
  const inspected = inspectSandboxContext(context);
  if (!inspected.ok) {
    throw new SandboxError(inspected.reason);
  }

  const current = inspected.value;
  return {
    navigation: createInitialNavigation(current.map.root, current.startingLocationId),
    exploration: createInitialExploration(),
    resources: createInitialResources(current.resources),
    crafting: createInitialCrafting(current.crafting),
    presences: createInitialPresenceState(current.presences),
    interactables: createInitialInteractablesState(),
  };
}
