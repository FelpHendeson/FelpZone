import { inspectCraftingDefinitions, inspectCraftingState } from '../crafting';
import { inspectExplorationDefinitions, inspectExplorationState } from '../exploration';
import { inspectNavigationState } from '../navigation';
import { inspectResourceDefinitions, inspectResourcesState } from '../resources';
import { createSandboxContext } from './initial-sandbox';
import type { SandboxContext, SandboxContextInspection, SandboxInspection, SandboxState } from './types';

export function inspectSandboxContext(value: unknown): SandboxContextInspection {
  if (!isRecord(value)) {
    return failContext('O contexto do sandbox é inválido.');
  }

  if (typeof value.startingLocationId !== 'string' || value.startingLocationId.trim() === '') {
    return failContext('A localização inicial não existe.');
  }

  if (!isIndexedMap(value.map)) {
    return failContext('O mapa indexado é inválido.');
  }

  if (!value.map.locations.has(value.startingLocationId)) {
    return failContext('A localização inicial não existe.');
  }

  if (!isIndexedExploration(value.exploration)) {
    return failContext('As definições de exploração são inválidas.');
  }

  const exploration = inspectExplorationDefinitions(value.exploration.definitions, value.map);
  if (!exploration.ok) {
    return failContext(exploration.reason);
  }

  if (!isIndexedResources(value.resources)) {
    return failContext('As definições de recursos são inválidas.');
  }

  const resources = inspectResourceDefinitions(
    value.resources.nodes,
    value.resources.populations,
    value.map,
    value.exploration,
  );
  if (!resources.ok) {
    return failContext(resources.reason);
  }

  if (!isIndexedCrafting(value.crafting)) {
    return failContext('As definições de crafting são inválidas.');
  }

  const crafting = inspectCraftingDefinitions(value.crafting.recipes, value.crafting.structures);
  if (!crafting.ok) {
    return failContext(crafting.reason);
  }

  return {
    ok: true,
    value: {
      startingLocationId: value.startingLocationId,
      map: value.map,
      exploration: value.exploration,
      resources: value.resources,
      crafting: value.crafting,
    },
  };
}

export function inspectSandboxState(value: unknown, context?: SandboxContext): SandboxInspection {
  const inspectedContext = inspectSandboxContext(context ?? createSandboxContext());
  if (!inspectedContext.ok) {
    return fail(inspectedContext.reason);
  }

  if (!isRecord(value)) {
    return fail('O estado integrado do sandbox é inválido.');
  }

  const navigation = inspectNavigationState(value.navigation, inspectedContext.value.map);
  if (!navigation.ok) {
    return fail(navigation.reason);
  }

  const exploration = inspectExplorationState(
    value.exploration,
    inspectedContext.value.exploration,
    inspectedContext.value.map,
  );
  if (!exploration.ok) {
    return fail(exploration.reason);
  }

  const resources = inspectResourcesState(value.resources, inspectedContext.value.resources);
  if (!resources.ok) {
    return fail(resources.reason);
  }

  const crafting = inspectCraftingState(
    value.crafting,
    inspectedContext.value.crafting,
    inspectedContext.value.map,
  );
  if (!crafting.ok) {
    return fail(crafting.reason);
  }

  const state: SandboxState = {
    navigation: navigation.value,
    exploration: exploration.value,
    resources: resources.value,
    crafting: crafting.value,
  };

  return { ok: true, value: state };
}

function isIndexedMap(value: unknown): value is SandboxContext['map'] {
  return (
    isRecord(value) &&
    isRecord(value.root) &&
    value.locations instanceof Map &&
    value.parents instanceof Map &&
    value.children instanceof Map
  );
}

function isIndexedExploration(value: unknown): value is SandboxContext['exploration'] {
  return (
    isRecord(value) &&
    Array.isArray(value.definitions) &&
    value.byLocation instanceof Map &&
    value.byDiscovery instanceof Map &&
    value.locationByDiscovery instanceof Map
  );
}

function isIndexedResources(value: unknown): value is SandboxContext['resources'] {
  return (
    isRecord(value) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.populations) &&
    value.byNode instanceof Map &&
    value.byPopulation instanceof Map &&
    value.nodesByPopulation instanceof Map
  );
}

function isIndexedCrafting(value: unknown): value is SandboxContext['crafting'] {
  return (
    isRecord(value) &&
    Array.isArray(value.recipes) &&
    Array.isArray(value.structures) &&
    value.byRecipe instanceof Map &&
    value.byStructure instanceof Map
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): SandboxInspection {
  return { ok: false, reason };
}

function failContext(reason: string): SandboxContextInspection {
  return { ok: false, reason };
}
