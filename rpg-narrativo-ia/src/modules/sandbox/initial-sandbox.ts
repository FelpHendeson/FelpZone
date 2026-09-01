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
  createInitialNavigation,
  indexNavigationMap,
} from '../navigation';
import {
  INITIAL_POPULATIONS,
  INITIAL_RESOURCE_NODES,
  createInitialResources,
  indexResourceDefinitions,
} from '../resources';
import type { SandboxContext, SandboxState } from './types';

export function createSandboxContext(): SandboxContext {
  const map = indexNavigationMap(INITIAL_WORLD_MAP, DEFAULT_STARTING_LOCATION_ID);
  const exploration = indexExplorationDefinitions(INITIAL_EXPLORATION_DEFINITIONS, map);
  const resources = indexResourceDefinitions(INITIAL_RESOURCE_NODES, INITIAL_POPULATIONS, map, exploration);
  const crafting = indexCraftingDefinitions(INITIAL_RECIPES, INITIAL_STRUCTURES);

  return {
    map,
    exploration,
    resources,
    crafting,
  };
}

export function createInitialSandboxState(context: SandboxContext = createSandboxContext()): SandboxState {
  return {
    navigation: createInitialNavigation(context.map.root, DEFAULT_STARTING_LOCATION_ID),
    exploration: createInitialExploration(),
    resources: createInitialResources(context.resources),
    crafting: createInitialCrafting(context.crafting),
  };
}
