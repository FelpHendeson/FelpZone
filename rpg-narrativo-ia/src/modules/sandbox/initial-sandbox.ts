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
  INITIAL_POPULATIONS,
  INITIAL_RESOURCE_NODES,
  createInitialResources,
  indexResourceDefinitions,
} from '../resources';
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
    const resources = indexResourceDefinitions(INITIAL_RESOURCE_NODES, INITIAL_POPULATIONS, map, exploration);
    const crafting = indexCraftingDefinitions(INITIAL_RECIPES, INITIAL_STRUCTURES);

    return {
      startingLocationId,
      map,
      exploration,
      resources,
      crafting,
    };
  } catch (error) {
    if (error instanceof NavigationError) {
      throw new SandboxError(error.message, { cause: error });
    }

    throw error;
  }
}

export function createInitialSandboxState(context: SandboxContext = createSandboxContext()): SandboxState {
  const startingLocationId = requireStartingLocationId(context);
  return {
    navigation: createInitialNavigation(context.map.root, startingLocationId),
    exploration: createInitialExploration(),
    resources: createInitialResources(context.resources),
    crafting: createInitialCrafting(context.crafting),
  };
}

function requireStartingLocationId(context: SandboxContext): string {
  if (typeof context.startingLocationId !== 'string' || context.startingLocationId.trim() === '') {
    throw new SandboxError('A localização inicial não existe.');
  }

  if (!(context.map?.locations instanceof Map) || !context.map.locations.has(context.startingLocationId)) {
    throw new SandboxError('A localização inicial não existe.');
  }

  return context.startingLocationId;
}
