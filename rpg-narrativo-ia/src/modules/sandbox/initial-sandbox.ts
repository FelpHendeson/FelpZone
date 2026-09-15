import { firstDayCampaign } from '../../campaigns/first-day';
import { CombatError, INITIAL_COMBAT, validateEncounterDiscoveries } from '../combat';
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
import {
  INITIAL_PRESENCE_CATALOG,
  INITIAL_PRESENCE_INTERACTIONS,
  createInitialPresenceState,
  indexPresenceCatalog,
  indexPresenceInteractionCatalog,
} from '../presences';
import {
  INITIAL_POPULATIONS,
  INITIAL_RESOURCE_NODES,
  createInitialResources,
  indexResourceDefinitions,
} from '../resources';
import { inspectSandboxContext } from './context-validation';
import { SandboxError, type SandboxContext, type SandboxState } from './types';

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
    const resources = indexResourceDefinitions(INITIAL_RESOURCE_NODES, INITIAL_POPULATIONS, map, exploration);
    const crafting = indexCraftingDefinitions(INITIAL_RECIPES, INITIAL_STRUCTURES);
    const presences = indexPresenceCatalog(INITIAL_PRESENCE_CATALOG, map, exploration);
    const presenceInteractions = indexPresenceInteractionCatalog(
      INITIAL_PRESENCE_INTERACTIONS,
      presences,
      firstDayCampaign,
    );

    return {
      startingLocationId,
      map,
      exploration,
      resources,
      crafting,
      presences,
      presenceInteractions,
    };
  } catch (error) {
    if (error instanceof NavigationError || error instanceof CombatError) {
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
  };
}
