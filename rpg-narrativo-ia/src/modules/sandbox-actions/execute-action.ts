import { defaultNow, inspectGameState, type GameState, type InventoryItem } from '../../core/state';
import { craftRecipe, CraftingError, synchronizeKnownRecipes, type CraftingState } from '../crafting';
import { advanceDayCycle, DayCycleError, type DayCycleResult } from '../day-cycle';
import {
  ExplorationError,
  exploreCurrentLocation,
  reevaluateDiscoveries,
  type ExplorationState,
} from '../exploration';
import { moveToLocation, NavigationError, type NavigationState } from '../navigation';
import {
  applyPopulationDayCycle,
  collectResource,
  ResourceError,
  synchronizeResourceRenewal,
  type ResourcesState,
} from '../resources';
import {
  createSandboxContext,
  inspectSandboxContext,
  SandboxError,
  type SandboxContext,
  type SandboxState,
} from '../sandbox';
import type { TimeCost } from '../time';
import { timeStateToWorld, worldToTimeState, WorldError } from '../world';
import { SandboxActionError } from './errors';
import { summarizeSynchronization } from './synchronization';
import type {
  SandboxAction,
  SandboxActionDetail,
  SandboxActionOptions,
  SandboxActionResult,
} from './types';

export function executeSandboxAction(
  state: GameState,
  action: SandboxAction,
  options: SandboxActionOptions = {},
): SandboxActionResult {
  const context = requireContext(options.context);
  const previous = requireGameState(state, context);
  if (previous.status !== 'playing') {
    throw new SandboxActionError('A partida já foi concluída e não aceita novas ações.');
  }

  const currentAction = requireAction(action);

  try {
    return runTransaction(previous, currentAction, context, options.now ?? defaultNow);
  } catch (error) {
    rethrowDomain(error);
  }
}

function runTransaction(
  previous: GameState,
  action: SandboxAction,
  context: SandboxContext,
  now: () => string,
): SandboxActionResult {
  const initialTime = worldToTimeState(previous.world);
  const executed = executePrimary(previous, action, context, initialTime);
  const detail = executed.detail;
  const timeCost = { periods: executed.timeCost.periods };

  let navigation = executed.navigation;
  let exploration = executed.exploration;
  let resources = executed.resources;
  let crafting = executed.crafting;
  const inventory = executed.inventory;

  const dayCycle = advanceDayCycle(initialTime, timeCost);
  const world = timeStateToWorld(dayCycle.time.current);
  const clockAdvanced = timeCost.periods > 0;

  const resourcesBeforeRecovery = copyResources(resources);
  if (clockAdvanced) {
    resources = applyPopulationDayCycle(resources, context.resources, dayCycle.events);
  }
  const resourcesAfterRecovery = copyResources(resources);
  if (clockAdvanced) {
    resources = synchronizeResourceRenewal(context.resources, resources, dayCycle.time.current);
  }
  const resourcesAfterRenewal = copyResources(resources);

  const conditionSource = buildConditionSource(previous, {
    world,
    inventory,
    sandbox: { navigation, exploration, resources, crafting },
  });

  if (context.exploration.byLocation.has(navigation.currentLocationId)) {
    const reevaluated = reevaluateDiscoveries(
      context.map,
      navigation,
      context.exploration,
      exploration,
      conditionSource,
    );
    exploration = reevaluated.current;
    navigation = reevaluated.navigation.current;
  }

  crafting = synchronizeKnownRecipes(
    context.crafting,
    crafting,
    context.map,
    buildConditionSource(previous, {
      world,
      inventory,
      sandbox: { navigation, exploration, resources, crafting },
    }),
  );

  const updatedAt = now();
  const candidate = buildGameState(previous, {
    world,
    inventory,
    sandbox: { navigation, exploration, resources, crafting },
    updatedAt,
  });
  const current = requireGameState(candidate, context);

  return {
    previous,
    current,
    action: copyAction(action),
    timeCost,
    dayCycle: copyDayCycle(dayCycle),
    detail,
    synchronization: summarizeSynchronization({
      previousExploration: previous.sandbox.exploration,
      currentExploration: current.sandbox.exploration,
      previousCrafting: previous.sandbox.crafting,
      currentCrafting: current.sandbox.crafting,
      resourcesBeforeRecovery,
      resourcesAfterRecovery,
      resourcesAfterRenewal,
    }),
  };
}

function executePrimary(
  state: GameState,
  action: SandboxAction,
  context: SandboxContext,
  initialTime: ReturnType<typeof worldToTimeState>,
): {
  detail: SandboxActionDetail;
  timeCost: TimeCost;
  navigation: NavigationState;
  exploration: ExplorationState;
  resources: ResourcesState;
  crafting: CraftingState;
  inventory: InventoryItem[];
} {
  const navigation = copyNavigation(state.sandbox.navigation);
  const exploration = copyExploration(state.sandbox.exploration);
  const resources = copyResources(state.sandbox.resources);
  const crafting = copyCrafting(state.sandbox.crafting);
  const inventory = copyInventory(state.inventory);

  if (action.type === 'navigation.move') {
    const result = moveToLocation(context.map, navigation, action.locationId, state);
    return {
      detail: { type: 'navigation.move', result },
      timeCost: result.travelCost,
      navigation: result.current,
      exploration,
      resources,
      crafting,
      inventory,
    };
  }

  if (action.type === 'exploration.explore') {
    const result = exploreCurrentLocation(
      context.map,
      navigation,
      context.exploration,
      exploration,
      state,
    );
    return {
      detail: { type: 'exploration.explore', result },
      timeCost: result.timeCost,
      navigation: result.navigation.current,
      exploration: result.current,
      resources,
      crafting,
      inventory,
    };
  }

  if (action.type === 'resource.collect') {
    const result = collectResource(
      context.map,
      navigation,
      context.exploration,
      exploration,
      context.resources,
      resources,
      inventory,
      action.nodeId,
      action.units,
      initialTime,
      state,
    );
    return {
      detail: { type: 'resource.collect', result },
      timeCost: result.timeCost,
      navigation,
      exploration,
      resources: result.current,
      crafting,
      inventory: result.inventory.current,
    };
  }

  const result = craftRecipe(
    context.map,
    navigation,
    context.crafting,
    crafting,
    inventory,
    action.recipeId,
    state,
  );
  return {
    detail: { type: 'crafting.craft', result },
    timeCost: result.timeCost,
    navigation,
    exploration,
    resources,
    crafting: result.current,
    inventory: result.inventory.current,
  };
}

function requireContext(value: SandboxContext | undefined): SandboxContext {
  try {
    const inspected = inspectSandboxContext(value ?? createSandboxContext());
    if (!inspected.ok) {
      throw new SandboxActionError(inspected.reason);
    }

    return inspected.value;
  } catch (error) {
    rethrowDomain(error);
  }
}

function requireGameState(value: unknown, context: SandboxContext): GameState {
  const inspected = inspectGameState(value, context);
  if (!inspected.ok) {
    throw new SandboxActionError(inspected.reason);
  }

  return inspected.state;
}

function requireAction(value: unknown): SandboxAction {
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new SandboxActionError('A ação do sandbox é inválida.');
  }

  if (value.type === 'navigation.move') {
    if (typeof value.locationId !== 'string' || value.locationId.trim() === '') {
      throw new SandboxActionError('O destino é inválido.');
    }

    return { type: 'navigation.move', locationId: value.locationId };
  }

  if (value.type === 'exploration.explore') {
    return { type: 'exploration.explore' };
  }

  if (value.type === 'resource.collect') {
    if (typeof value.nodeId !== 'string' || value.nodeId.trim() === '') {
      throw new SandboxActionError('O ponto de recurso é inválido.');
    }

    if (typeof value.units !== 'number' || !Number.isSafeInteger(value.units) || value.units <= 0) {
      throw new SandboxActionError('A quantidade solicitada precisa ser um inteiro positivo.');
    }

    return { type: 'resource.collect', nodeId: value.nodeId, units: value.units };
  }

  if (value.type === 'crafting.craft') {
    if (typeof value.recipeId !== 'string' || value.recipeId.trim() === '') {
      throw new SandboxActionError('A receita é inválida.');
    }

    return { type: 'crafting.craft', recipeId: value.recipeId };
  }

  throw new SandboxActionError('A ação do sandbox é desconhecida.');
}

function buildConditionSource(
  base: GameState,
  patch: {
    world: GameState['world'];
    inventory: InventoryItem[];
    sandbox: SandboxState;
  },
): GameState {
  return buildGameState(base, { ...patch, updatedAt: base.updatedAt });
}

function buildGameState(
  base: GameState,
  patch: {
    world: GameState['world'];
    inventory: InventoryItem[];
    sandbox: SandboxState;
    updatedAt: string;
  },
): GameState {
  return {
    schemaVersion: base.schemaVersion,
    status: base.status,
    character: { firstName: base.character.firstName, lastName: base.character.lastName },
    currentEventId: base.currentEventId,
    attributes: { ...base.attributes },
    inventory: copyInventory(patch.inventory),
    relationships: base.relationships.map((entry) => ({
      characterId: entry.characterId,
      trust: entry.trust,
    })),
    flags: { ...base.flags },
    history: base.history.map((entry) => ({ ...entry })),
    world: { day: patch.world.day, period: patch.world.period },
    progression: {
      abilityIds: [...base.progression.abilityIds],
      titleIds: [...base.progression.titleIds],
    },
    sandbox: {
      navigation: copyNavigation(patch.sandbox.navigation),
      exploration: copyExploration(patch.sandbox.exploration),
      resources: copyResources(patch.sandbox.resources),
      crafting: copyCrafting(patch.sandbox.crafting),
    },
    updatedAt: patch.updatedAt,
  };
}

function copyAction(action: SandboxAction): SandboxAction {
  if (action.type === 'navigation.move') {
    return { type: 'navigation.move', locationId: action.locationId };
  }

  if (action.type === 'exploration.explore') {
    return { type: 'exploration.explore' };
  }

  if (action.type === 'resource.collect') {
    return { type: 'resource.collect', nodeId: action.nodeId, units: action.units };
  }

  return { type: 'crafting.craft', recipeId: action.recipeId };
}

function copyDayCycle(result: DayCycleResult): DayCycleResult {
  return {
    time: {
      previous: { ...result.time.previous },
      current: { ...result.time.current },
      crossedPeriods: [...result.time.crossedPeriods],
      daysAdvanced: result.time.daysAdvanced,
    },
    events: result.events.map((event) => ({ ...event })),
    phase: result.phase,
  };
}

function copyNavigation(state: NavigationState): NavigationState {
  return {
    currentLocationId: state.currentLocationId,
    discoveredLocationIds: [...state.discoveredLocationIds],
    unlockedLocationIds: [...state.unlockedLocationIds],
    visitedLocationIds: [...state.visitedLocationIds],
  };
}

function copyExploration(state: ExplorationState): ExplorationState {
  return {
    locations: state.locations.map((location) => ({
      locationId: location.locationId,
      progress: location.progress,
      revealedDiscoveryIds: [...location.revealedDiscoveryIds],
      explorationCount: location.explorationCount,
    })),
  };
}

function copyResources(state: ResourcesState): ResourcesState {
  return {
    nodes: state.nodes.map((node) => ({
      ...node,
      lastCollectedAt: node.lastCollectedAt ? { ...node.lastCollectedAt } : undefined,
      nextRenewalAt: node.nextRenewalAt ? { ...node.nextRenewalAt } : undefined,
    })),
    populations: state.populations.map((population) => ({ ...population })),
  };
}

function copyCrafting(state: CraftingState): CraftingState {
  return {
    knownRecipeIds: [...state.knownRecipeIds],
    structures: state.structures.map((structure) => ({ ...structure })),
  };
}

function copyInventory(items: readonly InventoryItem[]): InventoryItem[] {
  return items.map((item) => ({ itemId: item.itemId, quantity: item.quantity }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rethrowDomain(error: unknown): never {
  if (error instanceof SandboxActionError) {
    throw error;
  }

  if (
    error instanceof NavigationError ||
    error instanceof ExplorationError ||
    error instanceof ResourceError ||
    error instanceof CraftingError ||
    error instanceof DayCycleError ||
    error instanceof WorldError ||
    error instanceof SandboxError
  ) {
    throw new SandboxActionError(error.message, { cause: error });
  }

  throw error;
}
