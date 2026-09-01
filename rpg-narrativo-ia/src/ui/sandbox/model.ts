import type { Campaign } from '../../core/events';
import type { GameState, InventoryItem } from '../../core/state';
import { findAbility } from '../../campaigns/first-day';
import { fullName } from '../../modules/character';
import {
  MAX_EXPLORATION_PROGRESS,
  canExploreLocation,
  getLocationExploration,
} from '../../modules/exploration';
import {
  getCurrentLocation,
  listVisibleDestinations,
  type LocationRelation,
} from '../../modules/navigation';
import {
  getCollectionCost,
  getPopulationStatus,
  inspectResourceAccess,
} from '../../modules/resources';
import { inspectRecipeAccess } from '../../modules/crafting';
import type { SandboxContext } from '../../modules/sandbox';
import { describeWorld } from '../../modules/world';
import { sandboxItemName, sandboxStationName } from './labels';

export interface DestinationView {
  locationId: string;
  name: string;
  relation?: LocationRelation;
  relationLabel?: string;
  costPeriods: number;
  accessible: boolean;
  blockedReason?: string;
}

export interface ResourceView {
  nodeId: string;
  name: string;
  availableUnits: number;
  maxCollectable: number;
  yields: Array<{ itemId: string; name: string; quantityPerUnit: number }>;
  costPeriods: number;
  collectable: boolean;
  blockedReason?: string;
}

export interface RecipeView {
  recipeId: string;
  name: string;
  ingredients: Array<{ itemId: string; name: string; quantity: number }>;
  products: Array<{ itemId: string; name: string; quantity: number }>;
  structureName?: string;
  stationTags: string[];
  costPeriods: number;
  craftable: boolean;
  blockedReason?: string;
}

export interface InventoryViewItem {
  itemId: string;
  name: string;
  quantity: number;
}

export interface ExplorationView {
  characterName: string;
  worldLabel: string;
  abilityName: string;
  location: {
    id: string;
    name: string;
    description: string;
    imageLabel: string;
    progress: number;
    canExplore: boolean;
    exploreDisabledReason?: string;
    exploreCostPeriods: number;
  };
  destinations: DestinationView[];
  resources: ResourceView[];
  recipes: RecipeView[];
  inventory: InventoryViewItem[];
}

const RELATION_LABELS: Record<LocationRelation, string> = {
  parent: 'Região',
  sibling: 'Próximo',
  child: 'Interior',
};

export function buildExplorationView(
  state: GameState,
  campaign: Campaign,
  context: SandboxContext,
): ExplorationView {
  const location = getCurrentLocation(context.map, state.sandbox.navigation);
  const exploration = getLocationExploration(state.sandbox.exploration, location.id);
  const definition = context.exploration.byLocation.get(location.id);
  const hasDefinition = canExploreLocation(
    context.map,
    state.sandbox.navigation,
    context.exploration,
    location.id,
  );
  const complete = exploration.progress >= MAX_EXPLORATION_PROGRESS;
  const abilityId = state.progression.abilityIds[0];
  const ability = abilityId ? findAbility(campaign, abilityId) : undefined;

  return {
    characterName: fullName(state.character),
    worldLabel: describeWorld(state.world),
    abilityName: ability?.name ?? 'Nenhuma',
    location: {
      id: location.id,
      name: location.name,
      description: location.description ?? '',
      imageLabel: location.image?.label ?? location.name,
      progress: exploration.progress,
      canExplore: hasDefinition && !complete,
      exploreDisabledReason: exploreDisabledReason(hasDefinition, complete),
      exploreCostPeriods: definition?.timeCost.periods ?? 0,
    },
    destinations: listVisibleDestinations(context.map, state.sandbox.navigation, state).map((destination) => ({
      locationId: destination.location.id,
      name: destination.location.name,
      relation: destination.relation,
      relationLabel: RELATION_LABELS[destination.relation],
      costPeriods: destination.travelCost.periods,
      accessible: destination.accessible,
      blockedReason: destination.blockedReason,
    })),
    resources: visibleResources(state, context, location.id),
    recipes: visibleRecipes(state, context),
    inventory: copyInventory(state.inventory),
  };
}

function exploreDisabledReason(hasDefinition: boolean, complete: boolean): string | undefined {
  if (!hasDefinition) {
    return 'Não há o que explorar neste local.';
  }

  if (complete) {
    return 'Este local já foi completamente explorado.';
  }

  return undefined;
}

function visibleResources(state: GameState, context: SandboxContext, locationId: string): ResourceView[] {
  const exploration = getLocationExploration(state.sandbox.exploration, locationId);
  const views: ResourceView[] = [];

  for (const node of context.resources.nodes) {
    if (node.locationId !== locationId) {
      continue;
    }

    if (!exploration.revealedDiscoveryIds.includes(node.discoveryId)) {
      continue;
    }

    const access = inspectResourceAccess(
      context.map,
      state.sandbox.navigation,
      context.exploration,
      state.sandbox.exploration,
      context.resources,
      state.sandbox.resources,
      node.id,
      state,
    );
    const populationId =
      node.renewal.type === 'population' ? node.renewal.populationId : undefined;
    const pressure =
      populationId !== undefined
        ? getPopulationStatus(context.resources, state.sandbox.resources, populationId)
        : undefined;

    views.push({
      nodeId: node.id,
      name: node.name,
      availableUnits: access.availableUnits,
      maxCollectable: access.maxCollectable,
      yields: node.yields.map((entry) => ({
        itemId: entry.itemId,
        name: sandboxItemName(entry.itemId),
        quantityPerUnit: entry.quantityPerUnit,
      })),
      costPeriods: getCollectionCost(context.resources, node.id).periods,
      collectable: access.collectable,
      blockedReason: resourceBlockedReason(access.blockedReason, pressure),
    });
  }

  return views;
}

function resourceBlockedReason(
  reason: string | undefined,
  pressure: ReturnType<typeof getPopulationStatus> | undefined,
): string | undefined {
  if (reason) {
    return reason;
  }

  if (pressure === 'declining') {
    return 'A população local está sob pressão.';
  }

  if (pressure === 'threatened') {
    return 'A população local está ameaçada.';
  }

  return undefined;
}

function visibleRecipes(state: GameState, context: SandboxContext): RecipeView[] {
  const views: RecipeView[] = [];

  for (const recipeId of state.sandbox.crafting.knownRecipeIds) {
    const recipe = context.crafting.byRecipe.get(recipeId);
    if (!recipe) {
      continue;
    }

    const access = inspectRecipeAccess(
      context.map,
      state.sandbox.navigation,
      context.crafting,
      state.sandbox.crafting,
      state.inventory,
      recipe.id,
      state,
    );
    const structure = recipe.createsStructureId
      ? context.crafting.byStructure.get(recipe.createsStructureId)
      : undefined;

    views.push({
      recipeId: recipe.id,
      name: recipe.name,
      ingredients: recipe.inputs.map((entry) => ({
        itemId: entry.itemId,
        name: sandboxItemName(entry.itemId),
        quantity: entry.quantity,
      })),
      products: (recipe.outputs ?? []).map((entry) => ({
        itemId: entry.itemId,
        name: sandboxItemName(entry.itemId),
        quantity: entry.quantity,
      })),
      structureName: structure?.name,
      stationTags: (recipe.requiredStationTags ?? []).map(sandboxStationName),
      costPeriods: access.timeCost.periods,
      craftable: access.craftable,
      blockedReason: access.blockedReason,
    });
  }

  return views;
}

function copyInventory(items: readonly InventoryItem[]): InventoryViewItem[] {
  return items.map((item) => ({
    itemId: item.itemId,
    name: sandboxItemName(item.itemId),
    quantity: item.quantity,
  }));
}
