import { applyEffects } from '../../core/effects';
import { EngineError, startNarrativeSession } from '../../core/engine';
import type { Campaign } from '../../core/events';
import {
  defaultNow,
  inspectGameState,
  type Attributes,
  type GameState,
  type InventoryItem,
  type NarrativeSession,
  type ProgressionState,
  type Relationship,
} from '../../core/state';
import { craftRecipe, CraftingError, synchronizeKnownRecipes, type CraftingState } from '../crafting';
import { advanceDayCycle, DayCycleError, type DayCycleResult } from '../day-cycle';
import {
  ExplorationError,
  exploreCurrentLocation,
  reevaluateDiscoveries,
  type ExplorationState,
} from '../exploration';
import { moveToLocation, NavigationError, type NavigationState } from '../navigation';
import { canRemoveItem, removeItem } from '../inventory';
import {
  INITIAL_OBJECTIVES,
  ObjectiveError,
  synchronizeObjectives,
  type IndexedObjectives,
} from '../objectives';
import {
  applyNeedsWear,
  NeedsError,
  planNeedsConsumption,
  planNeedsRest,
  type NeedsConsumptionPlan,
  type NeedsRestPlan,
  type NeedsSnapshot,
} from '../needs';
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
import {
  PresenceError,
  planPresenceInteraction,
  resolvePresence,
  synchronizeDiscoveredPresences,
  type PresenceInteractionPlan,
  type PresenceState,
} from '../presences';
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
  const objectiveCatalog = options.objectives ?? INITIAL_OBJECTIVES;
  const previous = requireGameState(state, context, objectiveCatalog);
  if (previous.status !== 'playing') {
    throw new SandboxActionError('A partida já foi concluída e não aceita novas ações.');
  }

  const currentAction = requireAction(action);

  try {
    return runTransaction(
      previous,
      currentAction,
      context,
      objectiveCatalog,
      options.now ?? defaultNow,
      options.campaign,
    );
  } catch (error) {
    rethrowDomain(error);
  }
}

function runTransaction(
  previous: GameState,
  action: SandboxAction,
  context: SandboxContext,
  objectiveCatalog: IndexedObjectives,
  now: () => string,
  campaign: Campaign | undefined,
): SandboxActionResult {
  const initialTime = worldToTimeState(previous.world);
  const executed = executePrimary(previous, action, context, initialTime);
  const detail = executed.detail;
  const timeCost = { periods: executed.timeCost.periods };

  let navigation = executed.navigation;
  let exploration = executed.exploration;
  let resources = executed.resources;
  let crafting = executed.crafting;
  let presences = executed.presences;
  const inventory = executed.inventory;

  // Efeitos declarativos da ação são aplicados antes do custo temporal dela.
  const dayCycle = advanceDayCycle(worldToTimeState(executed.world), timeCost);
  const world = timeStateToWorld(dayCycle.time.current);
  const clockAdvanced = timeCost.periods > 0;
  const needsWear = applyNeedsWear(attributesToNeeds(executed.attributes), timeCost.periods);
  const attributes = applyNeedsToAttributes(executed.attributes, needsWear.current);

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
    sandbox: { navigation, exploration, resources, crafting, presences },
    attributes,
    flags: executed.flags,
    relationships: executed.relationships,
    progression: executed.progression,
    status: executed.status,
    narrativeSession: executed.narrativeSession,
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
      sandbox: { navigation, exploration, resources, crafting, presences },
      attributes,
      flags: executed.flags,
      relationships: executed.relationships,
      progression: executed.progression,
      status: executed.status,
      narrativeSession: executed.narrativeSession,
    }),
  );

  presences = synchronizeDiscoveredPresences(context.presences, presences, exploration).current;

  const updatedAt = now();
  let candidate = buildGameState(previous, {
    world,
    inventory,
    sandbox: { navigation, exploration, resources, crafting, presences },
    updatedAt,
    attributes,
    flags: executed.flags,
    relationships: executed.relationships,
    progression: executed.progression,
    status: executed.status,
    narrativeSession: executed.narrativeSession,
  });

  if (action.type === 'presence.interact' && executed.plan?.narrative) {
    const narrative = executed.plan.narrative;
    if (!campaign || campaign.id !== narrative.campaignId) {
      throw new SandboxActionError('A campanha da interação não existe.');
    }

    candidate = startNarrativeSession(candidate, campaign, narrative.eventId);
  }

  const objectiveSynchronization = synchronizeObjectives(
    objectiveCatalog,
    candidate.objectives,
    candidate,
  );
  const current = requireGameState(
    { ...candidate, objectives: objectiveSynchronization.current },
    context,
    objectiveCatalog,
  );

  return {
    previous,
    current,
    action: copyAction(action),
    timeCost,
    dayCycle: copyDayCycle(dayCycle),
    needsWear: copyNeedsWearSummary(needsWear.summary),
    detail,
    feedback: executed.plan?.feedback,
    synchronization: summarizeSynchronization({
      previousExploration: previous.sandbox.exploration,
      currentExploration: current.sandbox.exploration,
      previousCrafting: previous.sandbox.crafting,
      currentCrafting: current.sandbox.crafting,
      resourcesBeforeRecovery,
      resourcesAfterRecovery,
      resourcesAfterRenewal,
    }),
    objectives: objectiveSynchronization,
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
  plan?: PresenceInteractionPlan;
  navigation: GameState['sandbox']['navigation'];
  exploration: GameState['sandbox']['exploration'];
  resources: GameState['sandbox']['resources'];
  crafting: GameState['sandbox']['crafting'];
  presences: PresenceState;
  inventory: InventoryItem[];
  attributes: Attributes;
  flags: Record<string, boolean>;
  relationships: Relationship[];
  progression: ProgressionState;
  status: GameState['status'];
  narrativeSession: NarrativeSession | null;
  world: GameState['world'];
} {
  const navigation = copyNavigation(state.sandbox.navigation);
  const exploration = copyExploration(state.sandbox.exploration);
  const resources = copyResources(state.sandbox.resources);
  const crafting = copyCrafting(state.sandbox.crafting);
  const presences = copyPresenceState(state.sandbox.presences);
  const inventory = copyInventory(state.inventory);
  const unchanged = {
    attributes: { ...state.attributes },
    flags: { ...state.flags },
    relationships: state.relationships.map((entry) => ({ characterId: entry.characterId, trust: entry.trust })),
    progression: {
      abilityIds: [...state.progression.abilityIds],
      titleIds: [...state.progression.titleIds],
    },
    status: state.status,
    narrativeSession: copyNarrativeSession(state.narrativeSession),
    world: { day: state.world.day, period: state.world.period },
  };

  if (action.type === 'navigation.move') {
    const result = moveToLocation(context.map, navigation, action.locationId, state);
    return {
      detail: { type: 'navigation.move', result },
      timeCost: result.travelCost,
      navigation: result.current,
      exploration,
      resources,
      crafting,
      presences,
      inventory,
      ...unchanged,
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
      presences,
      inventory,
      ...unchanged,
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
      presences,
      inventory: result.inventory.current,
      ...unchanged,
    };
  }

  if (action.type === 'crafting.craft') {
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
      presences,
      inventory: result.inventory.current,
      ...unchanged,
    };
  }

  if (action.type === 'needs.consume') {
    const plan = planNeedsConsumption(attributesToNeeds(state.attributes), action.itemId);
    if (!canRemoveItem(inventory, plan.itemId, plan.quantity)) {
      throw new SandboxActionError('O item consumível não está disponível no inventário.');
    }

    return {
      detail: { type: 'needs.consume', plan: copyConsumptionPlan(plan) },
      timeCost: { periods: plan.timeCost.periods },
      navigation,
      exploration,
      resources,
      crafting,
      presences,
      inventory: removeItem(inventory, plan.itemId, plan.quantity),
      ...unchanged,
      attributes: applyNeedsToAttributes(unchanged.attributes, plan.current),
    };
  }

  if (action.type === 'needs.rest') {
    if (action.mode === 'campfire' && !hasActiveCampfire(crafting, navigation.currentLocationId)) {
      throw new SandboxActionError('É necessária uma fogueira ativa neste local para esse repouso.');
    }

    const plan = planNeedsRest(attributesToNeeds(state.attributes), action.mode);
    return {
      detail: { type: 'needs.rest', plan: copyRestPlan(plan) },
      timeCost: { periods: plan.timeCost.periods },
      navigation,
      exploration,
      resources,
      crafting,
      presences,
      inventory,
      ...unchanged,
      attributes: applyNeedsToAttributes(unchanged.attributes, plan.current),
    };
  }

  const plan = planPresenceInteraction(
    context.presences,
    context.presenceInteractions,
    presences,
    action.presenceId,
    action.interactionId,
    navigation.currentLocationId,
    state,
  );

  const afterEffects = applyEffects(state, plan.effects);
  let nextPresences = copyPresenceState(presences);
  if (plan.resolvesPresence) {
    nextPresences = resolvePresence(context.presences, nextPresences, action.presenceId);
  }

  return {
    detail: { type: 'presence.interact', plan: createInteractionPlanCopy(plan) },
    timeCost: { periods: plan.timeCost.periods },
    plan,
    navigation,
    exploration,
    resources,
    crafting,
    presences: nextPresences,
    inventory: copyInventory(afterEffects.inventory),
    attributes: { ...afterEffects.attributes },
    flags: { ...afterEffects.flags },
    relationships: afterEffects.relationships.map((entry) => ({
      characterId: entry.characterId,
      trust: entry.trust,
    })),
    progression: {
      abilityIds: [...afterEffects.progression.abilityIds],
      titleIds: [...afterEffects.progression.titleIds],
    },
    status: afterEffects.status,
    narrativeSession: copyNarrativeSession(afterEffects.narrativeSession),
    world: { day: afterEffects.world.day, period: afterEffects.world.period },
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

function requireGameState(
  value: unknown,
  context: SandboxContext,
  objectiveCatalog: IndexedObjectives,
): GameState {
  const inspected = inspectGameState(value, context, objectiveCatalog);
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

  if (value.type === 'presence.interact') {
    if (typeof value.presenceId !== 'string' || value.presenceId.trim() === '') {
      throw new SandboxActionError('A presença é inválida.');
    }

    if (typeof value.interactionId !== 'string' || value.interactionId.trim() === '') {
      throw new SandboxActionError('A interação é inválida.');
    }

    return { type: 'presence.interact', presenceId: value.presenceId, interactionId: value.interactionId };
  }

  if (value.type === 'needs.consume') {
    if (typeof value.itemId !== 'string' || value.itemId.trim() === '') {
      throw new SandboxActionError('O item consumível é inválido.');
    }

    return { type: 'needs.consume', itemId: value.itemId };
  }

  if (value.type === 'needs.rest') {
    if (value.mode !== 'simple' && value.mode !== 'campfire') {
      throw new SandboxActionError('A modalidade de repouso é inválida.');
    }

    return { type: 'needs.rest', mode: value.mode };
  }

  throw new SandboxActionError('A ação do sandbox é desconhecida.');
}

function buildConditionSource(
  base: GameState,
  patch: GameStatePatch,
): GameState {
  return buildGameState(base, { ...patch, updatedAt: base.updatedAt });
}

interface GameStatePatch {
  world: GameState['world'];
  inventory: InventoryItem[];
  sandbox: SandboxState;
  attributes?: Attributes;
  flags?: Record<string, boolean>;
  relationships?: Relationship[];
  progression?: ProgressionState;
  status?: GameState['status'];
  narrativeSession?: NarrativeSession | null;
  updatedAt?: string;
}

function buildGameState(base: GameState, patch: GameStatePatch & { updatedAt: string }): GameState {
  return {
    schemaVersion: base.schemaVersion,
    status: patch.status ?? base.status,
    character: { firstName: base.character.firstName, lastName: base.character.lastName },
    narrativeSession: copyNarrativeSession(patch.narrativeSession ?? base.narrativeSession),
    attributes: { ...(patch.attributes ?? base.attributes) },
    inventory: copyInventory(patch.inventory),
    relationships: (patch.relationships ?? base.relationships).map((entry) => ({
      characterId: entry.characterId,
      trust: entry.trust,
    })),
    flags: { ...(patch.flags ?? base.flags) },
    history: base.history.map((entry) => ({ ...entry })),
    world: { day: patch.world.day, period: patch.world.period },
    progression: {
      abilityIds: [...(patch.progression ?? base.progression).abilityIds],
      titleIds: [...(patch.progression ?? base.progression).titleIds],
    },
    sandbox: {
      navigation: copyNavigation(patch.sandbox.navigation),
      exploration: copyExploration(patch.sandbox.exploration),
      resources: copyResources(patch.sandbox.resources),
      crafting: copyCrafting(patch.sandbox.crafting),
      presences: copyPresenceState(patch.sandbox.presences),
    },
    objectives: {
      entries: base.objectives.entries.map((entry) => ({
        objectiveId: entry.objectiveId,
        completedStepIds: [...entry.completedStepIds],
        completed: entry.completed,
      })),
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

  if (action.type === 'crafting.craft') {
    return { type: 'crafting.craft', recipeId: action.recipeId };
  }

  if (action.type === 'needs.consume') {
    return { type: 'needs.consume', itemId: action.itemId };
  }

  if (action.type === 'needs.rest') {
    return { type: 'needs.rest', mode: action.mode };
  }

  return { type: 'presence.interact', presenceId: action.presenceId, interactionId: action.interactionId };
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

function copyPresenceState(state: PresenceState): PresenceState {
  return {
    discoveredPresenceIds: [...state.discoveredPresenceIds],
    resolvedPresenceIds: [...state.resolvedPresenceIds],
  };
}

function createInteractionPlanCopy(plan: PresenceInteractionPlan): PresenceInteractionPlan {
  const copied: PresenceInteractionPlan = {
    interactionId: plan.interactionId,
    presenceId: plan.presenceId,
    timeCost: { periods: plan.timeCost.periods },
    effects: plan.effects.map((effect) => ({ ...effect })),
    resolvesPresence: plan.resolvesPresence,
  };

  if (plan.feedback !== undefined) {
    copied.feedback = plan.feedback;
  }

  if (plan.narrative) {
    copied.narrative = { campaignId: plan.narrative.campaignId, eventId: plan.narrative.eventId };
  }

  return copied;
}

function copyConsumptionPlan(plan: NeedsConsumptionPlan): NeedsConsumptionPlan {
  return {
    previous: { ...plan.previous },
    current: { ...plan.current },
    itemId: plan.itemId,
    quantity: 1,
    effects: plan.effects.map((effect) => ({ ...effect })),
    appliedEffects: plan.appliedEffects.map((effect) => ({ ...effect })),
    timeCost: { periods: plan.timeCost.periods },
  };
}

function copyRestPlan(plan: NeedsRestPlan): NeedsRestPlan {
  return {
    previous: { ...plan.previous },
    current: { ...plan.current },
    mode: plan.mode,
    effects: plan.effects.map((effect) => ({ ...effect })),
    appliedEffects: plan.appliedEffects.map((effect) => ({ ...effect })),
    timeCost: { periods: plan.timeCost.periods },
  };
}

function copyNeedsWearSummary(summary: SandboxActionResult['needsWear']): SandboxActionResult['needsWear'] {
  return {
    periodsApplied: summary.periodsApplied,
    changes: { ...summary.changes },
    criticalPeriods: { ...summary.criticalPeriods },
    requestedHealthDamage: summary.requestedHealthDamage,
    appliedHealthDamage: summary.appliedHealthDamage,
  };
}

function attributesToNeeds(attributes: Attributes): NeedsSnapshot {
  return {
    saude: attributes.saude,
    energia: attributes.energia,
    fome: attributes.fome,
    sede: attributes.sede,
  };
}

function applyNeedsToAttributes(attributes: Attributes, needs: NeedsSnapshot): Attributes {
  return {
    saude: needs.saude,
    energia: needs.energia,
    fome: needs.fome,
    sede: needs.sede,
    humanidade: attributes.humanidade,
    cautela: attributes.cautela,
  };
}

function hasActiveCampfire(crafting: CraftingState, locationId: string): boolean {
  return crafting.structures.some(
    (structure) =>
      structure.structureId === 'campfire' && structure.locationId === locationId && structure.active,
  );
}

function copyInventory(items: readonly InventoryItem[]): InventoryItem[] {
  return items.map((item) => ({ itemId: item.itemId, quantity: item.quantity }));
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
    error instanceof SandboxError ||
    error instanceof PresenceError ||
    error instanceof NeedsError ||
    error instanceof ObjectiveError ||
    error instanceof EngineError
  ) {
    throw new SandboxActionError(error.message, { cause: error });
  }

  throw error;
}
