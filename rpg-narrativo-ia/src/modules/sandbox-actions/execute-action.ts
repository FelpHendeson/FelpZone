import { applyEffects } from '../../core/effects';
import { EngineError, startNarrativeSession } from '../../core/engine';
import type { Campaign, GameEffect } from '../../core/events';
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
import { moveToLocation, NavigationError, discoverLocation, unlockLocation, type NavigationState } from '../navigation';
import { addItem, canRemoveItem, removeItem } from '../inventory';
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
import {
  INITIAL_SKILLS,
  SkillError,
  getSkillProficiency,
  increaseSkillProficiency,
  learnSkill,
  type SkillsProgressState,
} from '../skills';
import {
  INITIAL_TRAINING,
  TrainingError,
  applyTrainingPlan,
  copyTrainingPlan,
  planTraining,
} from '../training';
import {
  CombatError,
  INITIAL_COMBAT,
  combatResolutionEffects,
  listAvailableEncounters,
  verifyCombatResolution,
  type CombatResolution,
} from '../combat';
import { INITIAL_MASTERY, MasteryError, applyMastery, type MasteryResult } from '../mastery';
import {
  canAcceptQuantity,
  copyItemsState,
  createInitialItemsState,
  EQUIPMENT_SLOTS,
  INITIAL_ITEMS,
  ItemError,
  type ItemsState,
} from '../items';
import { EquipmentError, buildCombatLoadout, equipItem, unequipSlot } from '../equipment';
import { PreparationError, assignPreparation, clearPreparation, consumePreparedSlot } from '../preparation';
import {
  ConditionError,
  INITIAL_CONDITIONS,
  advanceLingering,
  copyPersistentConditions,
  createInitialLingering,
  type PersistentConditionState,
} from '../conditions';
import {
  GardenError,
  INITIAL_GARDEN,
  applyGardenPlan,
  copyGardenState,
  createInitialGardenState,
  grantCultivationPoints,
  planGardenCultivation,
  type GardenState,
} from '../garden';
import {
  BondError,
  applyBondActionPlan,
  copyBondsState,
  createInitialBondsState,
  planBondAction,
  INITIAL_BONDS,
  type BondActionPlan,
  type BondsState,
} from '../bonds';
import {
  RegistryError,
  applyPatentClaim,
  copyRegistryState,
  createInitialRegistryState,
  planPatentClaim,
  synchronizeRegistry,
  INITIAL_REGISTRY,
  type RegistryState,
} from '../registry';
import {
  OrganizationError,
  applyOrganizationActionPlan,
  copyOrganizationsState,
  createInitialOrganizationsState,
  planOrganizationAction,
  INITIAL_ORGANIZATIONS,
  type OrganizationActionPlan,
  type OrganizationsState,
} from '../organizations';
import {
  PartyError,
  INITIAL_PARTY,
  allySnapshots,
  applyPartyVitals,
  copyPartyState,
  createInitialPartyState,
  planCompanionOrder,
  type PartyState,
} from '../party';
import {
  INITIAL_CALENDAR,
  applyCalendarAdvance,
  copyCalendarState,
  createInitialCalendarState,
  type CalendarState,
} from '../calendar';
import {
  FamilyError,
  INITIAL_FAMILY,
  applyFamilyActionPlan,
  copyFamilyState,
  createInitialFamilyState,
  planFamilyAction,
  synchronizeFamilyStages,
  type FamilyActionPlan,
  type FamilyState,
} from '../family';
import {
  CivicError,
  INITIAL_CIVIC,
  applyCivicActionPlan,
  copyCivicState,
  createInitialCivicState,
  planCivicAction,
  type CivicActionPlan,
  type CivicState,
} from '../civic';
import {
  EconomyError,
  INITIAL_ECONOMY,
  applyEconomyActionPlan,
  copyEconomyState,
  createInitialEconomyState,
  planEconomyAction,
  type EconomyActionPlan,
  type EconomyState,
} from '../economy';
import {
  SettlementError,
  INITIAL_SETTLEMENTS,
  advanceSettlements,
  applySettlementActionPlan,
  copySettlementsState,
  createInitialSettlementsState,
  planSettlementAction,
  type SettlementActionPlan,
  type SettlementsState,
} from '../settlements';
import {
  PoliticsError,
  INITIAL_POLITICS,
  applyPoliticsActionPlan,
  copyPoliticsState,
  createInitialPoliticsState,
  planPoliticsAction,
  type PoliticsActionPlan,
  type PoliticsState,
} from '../politics';
import {
  ExecutionError,
  copyExecutionState,
  createInitialExecutionState,
  inspectExecutionState,
  restoreReserves,
  type ExecutionState,
} from '../execution';
import {
  InteractableError,
  applyInteractablePlan,
  copyInteractablesState,
  createInitialInteractablesState,
  planInteractableAction,
  synchronizeDiscoveredInteractables,
  type InteractableActionPlan,
  type InteractablesState,
} from '../interactables';
import {
  NpcError,
  copyNpcsState,
  createInitialNpcsState,
  rememberNpcFact,
  INITIAL_NPCS,
  type NPCsState,
} from '../npcs';
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
  const objectiveCatalog = options.objectives ?? context.objectives ?? INITIAL_OBJECTIVES;
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
      options.campaign ?? context.campaign,
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
  if (executed.mastery && executed.mastery.grantedCultivationPoints > 0) {
    executed.garden = grantCultivationPoints(executed.garden, executed.mastery.grantedCultivationPoints);
  }

  let navigation = executed.navigation;
  let exploration = executed.exploration;
  let resources = executed.resources;
  let crafting = executed.crafting;
  let presences = executed.presences;
  const inventory = executed.inventory;
  const items = executed.items;
  let lingering = executed.lingering;
  const garden = executed.garden;
  const npcs = executed.npcs;
  let interactables = executed.interactables;

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
  if (clockAdvanced) {
    const lingeringDamage = lingeringWorldDamage(lingering, timeCost.periods);
    lingering = advanceLingering(INITIAL_CONDITIONS, lingering, timeCost.periods);
    if (lingeringDamage > 0) {
      attributes.saude = Math.max(1, attributes.saude - lingeringDamage);
    }
  }

  const conditionSource = buildConditionSource(previous, {
    world,
    inventory,
    sandbox: { navigation, exploration, resources, crafting, presences, npcs, interactables },
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
      sandbox: { navigation, exploration, resources, crafting, presences, npcs, interactables },
      attributes,
      flags: executed.flags,
      relationships: executed.relationships,
      progression: executed.progression,
      status: executed.status,
      narrativeSession: executed.narrativeSession,
    }),
  );

  presences = synchronizeDiscoveredPresences(context.presences, presences, exploration).current;
  const interactableCatalog = context.interactables;
  if (interactableCatalog) {
    interactables = synchronizeDiscoveredInteractables(interactableCatalog, interactables, exploration).current;
  }

  const updatedAt = now();
  const calendarAdvance = applyCalendarAdvance(
    context.calendar ?? INITIAL_CALENDAR,
    previous.world.day,
    world.day,
    previous.calendar ?? createInitialCalendarState(),
    executed.flags,
  );
  const familySync = synchronizeFamilyStages(
    context.calendar ?? INITIAL_CALENDAR,
    executed.family ?? previous.family ?? createInitialFamilyState(),
    world.day,
  );
  let candidate = buildGameState(previous, {
    world,
    inventory,
    sandbox: { navigation, exploration, resources, crafting, presences, npcs, interactables },
    updatedAt,
    attributes,
    flags: { ...calendarAdvance.flags, ...familySync.flags },
    relationships: executed.relationships,
    progression: executed.progression,
    system: executed.system,
    items,
    lingering,
    garden,
    bonds: executed.bonds,
    registry: executed.registry,
    organizations: executed.organizations,
    execution: executed.execution,
    party: executed.party,
    calendar: calendarAdvance.current,
    family: familySync.current,
    civic: executed.civic ?? previous.civic ?? createInitialCivicState(),
    economy: executed.economy ?? previous.economy ?? createInitialEconomyState(),
    settlements: clockAdvanced
      ? advanceSettlements(
          context.settlements ?? INITIAL_SETTLEMENTS,
          executed.settlements ?? previous.settlements ?? createInitialSettlementsState(),
          timeCost.periods,
        )
      : copySettlementsState(executed.settlements ?? previous.settlements ?? createInitialSettlementsState()),
    politics: executed.politics ?? previous.politics ?? createInitialPoliticsState(),
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
  const registryCatalog = context.registry ?? INITIAL_REGISTRY;
  const registry = synchronizeRegistry(
    registryCatalog,
    executed.registry,
    { ...candidate, objectives: objectiveSynchronization.current },
  );
  const current = requireGameState(
    { ...candidate, objectives: objectiveSynchronization.current, registry },
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
    feedback: executed.plan?.feedback ?? executed.interactablePlan?.feedback ?? executed.bondPlan?.feedback ?? executed.organizationPlan?.feedback ?? executed.familyPlan?.feedback ?? executed.civicPlan?.feedback ?? executed.economyPlan?.feedback,
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
    ...(executed.mastery ? { mastery: copyMasteryResult(executed.mastery) } : {}),
  };
}

function copyMasteryResult(result: MasteryResult): MasteryResult {
  return {
    previous: { level: result.previous.level, entries: result.previous.entries.map((entry) => ({ ...entry })) },
    current: { level: result.current.level, entries: result.current.entries.map((entry) => ({ ...entry })) },
    proficiencyGains: result.proficiencyGains.map((gain) => ({ ...gain })),
    reachedMilestoneIds: [...result.reachedMilestoneIds],
    revealedTrainingIds: [...result.revealedTrainingIds],
    grantedCultivationPoints: result.grantedCultivationPoints,
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
  interactablePlan?: InteractableActionPlan;
  bondPlan?: BondActionPlan;
  organizationPlan?: OrganizationActionPlan;
  familyPlan?: FamilyActionPlan;
  civicPlan?: CivicActionPlan;
  economyPlan?: EconomyActionPlan;
  settlementPlan?: SettlementActionPlan;
  politicsPlan?: PoliticsActionPlan;
  navigation: GameState['sandbox']['navigation'];
  exploration: GameState['sandbox']['exploration'];
  resources: GameState['sandbox']['resources'];
  crafting: GameState['sandbox']['crafting'];
  presences: PresenceState;
  inventory: InventoryItem[];
  items: ItemsState;
  lingering: PersistentConditionState;
  garden: GardenState;
  bonds: BondsState;
  registry: RegistryState;
  organizations: OrganizationsState;
  execution: ExecutionState;
  party: PartyState;
  calendar?: CalendarState;
  family: FamilyState;
  civic: CivicState;
  economy: EconomyState;
  settlements: SettlementsState;
  politics: PoliticsState;
  npcs: NPCsState;
  interactables: InteractablesState;
  attributes: Attributes;
  flags: Record<string, boolean>;
  relationships: Relationship[];
  progression: ProgressionState;
  system: SkillsProgressState;
  status: GameState['status'];
  narrativeSession: NarrativeSession | null;
  world: GameState['world'];
  mastery?: MasteryResult;
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
    system: copySystem(state.system),
    items: copyItemsState(state.items ?? createInitialItemsState()),
    lingering: copyPersistentConditions(state.lingering ?? createInitialLingering()),
    garden: copyGardenState(state.garden ?? createInitialGardenState()),
    bonds: copyBondsState(state.bonds ?? createInitialBondsState()),
    registry: copyRegistryState(state.registry ?? createInitialRegistryState()),
    organizations: copyOrganizationsState(state.organizations ?? createInitialOrganizationsState()),
    execution: copyExecutionState(state.execution ?? createInitialExecutionState()),
    party: copyPartyState(state.party ?? createInitialPartyState()),
    family: copyFamilyState(state.family ?? createInitialFamilyState()),
    civic: copyCivicState(state.civic ?? createInitialCivicState()),
    economy: copyEconomyState(state.economy ?? createInitialEconomyState()),
    settlements: copySettlementsState(state.settlements ?? createInitialSettlementsState()),
    politics: copyPoliticsState(state.politics ?? createInitialPoliticsState()),
    npcs: copyNpcsState(state.sandbox.npcs ?? createInitialNpcsState()),
    interactables: copyInteractablesState(state.sandbox.interactables ?? createInitialInteractablesState()),
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
      execution: restoreReserves(unchanged.execution),
      attributes: applyNeedsToAttributes(unchanged.attributes, plan.current),
    };
  }

  if (action.type === 'training.train') {
    const trainingPlan = planTraining(INITIAL_TRAINING, INITIAL_SKILLS, state.system, action.methodId);
    const trainedSystem = applyTrainingPlan(INITIAL_SKILLS, state.system, trainingPlan);
    const mastery = applyMastery(INITIAL_MASTERY, INITIAL_SKILLS, trainedSystem, {
      type: 'training.completed',
      methodId: action.methodId,
    });
    return {
      detail: { type: 'training.train', plan: copyTrainingPlan(trainingPlan) },
      timeCost: { periods: trainingPlan.timeCost.periods },
      navigation,
      exploration,
      resources,
      crafting,
      presences,
      inventory,
      ...unchanged,
      system: copySystem(mastery.current),
      mastery,
    };
  }

  if (action.type === 'combat.resolve') {
    const revealedDiscoveryIds = exploration.locations.find(
      (location) => location.locationId === navigation.currentLocationId,
    )?.revealedDiscoveryIds ?? [];
    const encounter = listAvailableEncounters(
      INITIAL_COMBAT,
      navigation.currentLocationId,
      state.flags,
      revealedDiscoveryIds,
      (state.organizations ?? createInitialOrganizationsState()).entries.map((entry) => entry.id),
    ).find((entry) => entry.id === action.resolution.encounterId);
    if (!encounter) {
      throw new SandboxActionError('O encontro não está disponível neste local.');
    }
    if (state.attributes.saude < 1) {
      throw new SandboxActionError('Você está ferido demais para concluir um confronto.');
    }
    const portrait = buildCombatLoadout(INITIAL_ITEMS, state.items ?? createInitialItemsState());
    const organizationState = state.organizations ?? createInitialOrganizationsState();
    const partyState = state.party ?? createInitialPartyState();
    const allies =
      encounter.requiredOrganizationId === undefined
        ? []
        : allySnapshots(INITIAL_PARTY, INITIAL_ORGANIZATIONS, organizationState, partyState);
    for (const turn of action.resolution.companionOrders ?? []) {
      for (const order of turn) {
        const definition = INITIAL_PARTY.companionOrders.find(
          (entry) => entry.npcId === order.actorId && entry.actionId === order.actionId,
        );
        if (!definition) {
          throw new SandboxActionError('A orientação de companheiro não existe.');
        }
        planCompanionOrder(INITIAL_PARTY, INITIAL_ORGANIZATIONS, organizationState, definition.id, state);
      }
    }
    const resolution = verifyCombatResolution(INITIAL_COMBAT, action.resolution, encounter, {
      playerName: `${state.character.firstName} ${state.character.lastName}`,
      knownSkillIds: state.system.entries.map((entry) => entry.skillId),
      playerMaxHealth: state.attributes.saude,
      loadout: portrait.loadout,
      prepared: portrait.prepared,
      execution: state.execution ?? createInitialExecutionState(),
      allies,
    });
    const afterEffects = applyEffects(state, combatResolutionEffects(resolution, state.attributes.saude));

    let system = afterEffects.system;
    let mastery: MasteryResult | undefined;
    if (resolution.outcome === 'victory') {
      const usedSkillIds = distinctCombatSkills(resolution.playerActionIds);
      mastery = applyMastery(INITIAL_MASTERY, INITIAL_SKILLS, system, {
        type: 'combat.victory',
        encounterId: resolution.encounterId,
        usedSkillIds,
      });
      system = mastery.current;
    }

    let nextInventory = copyInventory(afterEffects.inventory);
    let nextItems = copyItemsState(state.items ?? createInitialItemsState());
    for (const used of resolution.usedPrepared) {
      if (!canRemoveItem(nextInventory, used.itemId, 1)) {
        throw new SandboxActionError('O consumível preparado não pôde ser consumido.');
      }
      nextInventory = removeItem(nextInventory, used.itemId, 1);
      nextItems = consumePreparedSlot(nextItems, used.slot);
    }
    if (resolution.outcome === 'victory' && encounter.reward) {
      if (
        !canAcceptQuantity(
          INITIAL_ITEMS,
          nextInventory,
          encounter.reward.itemId,
          encounter.reward.quantity,
        )
      ) {
        throw new SandboxActionError('A recompensa não cabe no inventário.');
      }
      nextInventory = addItem(nextInventory, encounter.reward.itemId, encounter.reward.quantity);
    }
    let lingering = copyPersistentConditions(state.lingering ?? createInitialLingering());
    if (resolution.outcome === 'defeat') {
      lingering = {
        entries: [{ conditionId: 'lingering-wound', remainingPeriods: 2, potency: 1 }],
      };
    }

    return {
      detail: { type: 'combat.resolve', resolution: copyResolution(resolution) },
      timeCost: { periods: encounter.timeCost.periods },
      navigation,
      exploration,
      resources,
      crafting,
      presences,
      inventory: nextInventory,
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
      system: copySystem(system),
      items: nextItems,
      lingering,
      garden: copyGardenState(state.garden ?? createInitialGardenState()),
      bonds: copyBondsState(afterEffects.bonds ?? state.bonds ?? createInitialBondsState()),
      registry: copyRegistryState(afterEffects.registry ?? state.registry ?? createInitialRegistryState()),
      organizations: copyOrganizationsState(afterEffects.organizations ?? state.organizations ?? createInitialOrganizationsState()),
      execution: copyExecutionState(resolution.remainingExecution),
      party: applyPartyVitals(
        copyPartyState(afterEffects.party ?? state.party ?? createInitialPartyState()),
        resolution.allyVitals.map((entry) => ({ actorId: entry.actorId, health: Math.max(1, entry.health) })),
      ),
      family: copyFamilyState(afterEffects.family ?? state.family ?? createInitialFamilyState()),
      civic: copyCivicState(afterEffects.civic ?? state.civic ?? createInitialCivicState()),
      economy: copyEconomyState(afterEffects.economy ?? state.economy ?? createInitialEconomyState()),
      settlements: copySettlementsState(afterEffects.settlements ?? state.settlements ?? createInitialSettlementsState()),
      politics: copyPoliticsState(afterEffects.politics ?? state.politics ?? createInitialPoliticsState()),
      npcs: copyNpcsState(state.sandbox.npcs ?? createInitialNpcsState()),
      interactables: copyInteractablesState(state.sandbox.interactables ?? createInitialInteractablesState()),
      status: afterEffects.status,
      narrativeSession: copyNarrativeSession(afterEffects.narrativeSession),
      world: { day: afterEffects.world.day, period: afterEffects.world.period },
      mastery,
    };
  }

  if (action.type === 'equipment.equip') {
    const result = equipItem(INITIAL_ITEMS, unchanged.items, inventory, action.itemId);
    return {
      detail: { type: 'equipment.equip', result },
      timeCost: { periods: 0 },
      navigation,
      exploration,
      resources,
      crafting,
      presences,
      inventory,
      ...unchanged,
      items: result.current,
    };
  }

  if (action.type === 'equipment.unequip') {
    const result = unequipSlot(unchanged.items, action.slot);
    return {
      detail: { type: 'equipment.unequip', result },
      timeCost: { periods: 0 },
      navigation,
      exploration,
      resources,
      crafting,
      presences,
      inventory,
      ...unchanged,
      items: result.current,
    };
  }

  if (action.type === 'preparation.assign') {
    const result = assignPreparation(INITIAL_ITEMS, unchanged.items, inventory, action.slot, action.itemId);
    return {
      detail: { type: 'preparation.assign', result },
      timeCost: { periods: 0 },
      navigation,
      exploration,
      resources,
      crafting,
      presences,
      inventory,
      ...unchanged,
      items: result.current,
    };
  }

  if (action.type === 'preparation.clear') {
    const result = clearPreparation(unchanged.items, action.slot);
    return {
      detail: { type: 'preparation.clear', result },
      timeCost: { periods: 0 },
      navigation,
      exploration,
      resources,
      crafting,
      presences,
      inventory,
      ...unchanged,
      items: result.current,
    };
  }

  if (action.type === 'garden.cultivate') {
    const plan = planGardenCultivation(INITIAL_GARDEN, INITIAL_SKILLS, unchanged.system, unchanged.garden, action.recipeId);
    const nextGarden = applyGardenPlan(unchanged.garden, plan);
    let nextSystem = learnSkill(INITIAL_SKILLS, unchanged.system, plan.resultSkillId);
    const currentProficiency = getSkillProficiency(nextSystem, plan.resultSkillId);
    if (plan.initialProficiency > currentProficiency) {
      nextSystem = increaseSkillProficiency(
        INITIAL_SKILLS,
        nextSystem,
        plan.resultSkillId,
        plan.initialProficiency - currentProficiency,
      );
    }
    return {
      detail: { type: 'garden.cultivate', plan },
      timeCost: { periods: plan.cost.timeCost.periods },
      navigation,
      exploration,
      resources,
      crafting,
      presences,
      inventory,
      ...unchanged,
      garden: nextGarden,
      system: copySystem(nextSystem),
    };
  }

  if (action.type === 'interactable.interact') {
    const catalog = context.interactables;
    if (!catalog) {
      throw new SandboxActionError('O ponto de interesse não está disponível.');
    }
    const interactablePlan = planInteractableAction(
      catalog,
      unchanged.interactables,
      action.interactableId,
      action.actionId,
      navigation.currentLocationId,
      state,
    );
    const nextInteractables = applyInteractablePlan(catalog, unchanged.interactables, interactablePlan);
    let nextNavigation = navigation;
    const worldEffects: GameEffect[] = [];
    for (const effect of interactablePlan.effects) {
      if (effect.type === 'navigation.unlock') {
        nextNavigation = unlockLocation(context.map, nextNavigation, effect.locationId);
        continue;
      }
      if (effect.type === 'navigation.discover') {
        nextNavigation = discoverLocation(context.map, nextNavigation, effect.locationId);
        continue;
      }
      if (effect.type === 'interactable.setStage' || effect.type === 'interactable.revealFact') {
        continue;
      }
      worldEffects.push(effect);
    }
    const afterEffects = worldEffects.length > 0 ? applyEffects(state, worldEffects) : state;
    return {
      detail: { type: 'interactable.interact', plan: interactablePlan },
      timeCost: { periods: interactablePlan.timeCost.periods },
      interactablePlan,
      navigation: nextNavigation,
      exploration,
      resources,
      crafting,
      presences,
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
      system: copySystem(state.system),
      items: copyItemsState(state.items ?? createInitialItemsState()),
      lingering: copyPersistentConditions(state.lingering ?? createInitialLingering()),
      garden: copyGardenState(state.garden ?? createInitialGardenState()),
      bonds: copyBondsState(state.bonds ?? createInitialBondsState()),
      registry: copyRegistryState(state.registry ?? createInitialRegistryState()),
      organizations: copyOrganizationsState(state.organizations ?? createInitialOrganizationsState()),
      execution: copyExecutionState(state.execution ?? createInitialExecutionState()),
      party: copyPartyState(state.party ?? createInitialPartyState()),
      family: copyFamilyState(state.family ?? createInitialFamilyState()),
      civic: copyCivicState(state.civic ?? createInitialCivicState()),
    economy: copyEconomyState(state.economy ?? createInitialEconomyState()),
      settlements: copySettlementsState(state.settlements ?? createInitialSettlementsState()),
      politics: copyPoliticsState(state.politics ?? createInitialPoliticsState()),
      npcs: copyNpcsState(state.sandbox.npcs ?? createInitialNpcsState()),
      interactables: nextInteractables,
      status: afterEffects.status,
      narrativeSession: copyNarrativeSession(afterEffects.narrativeSession),
      world: { day: afterEffects.world.day, period: afterEffects.world.period },
    };
  }

  if (action.type === 'registry.claim') {
    const catalog = context.registry ?? INITIAL_REGISTRY;
    const plan = planPatentClaim(catalog, unchanged.registry, state, action.patentId);
    return {
      detail: { type: 'registry.claim', plan },
      timeCost: { periods: 0 },
      navigation,
      exploration,
      resources,
      crafting,
      presences,
      inventory,
      ...unchanged,
      registry: applyPatentClaim(unchanged.registry, plan),
    };
  }

  if (action.type === 'organization.act') {
    const catalog = context.organizations ?? INITIAL_ORGANIZATIONS;
    const organizationPlan = planOrganizationAction(catalog, unchanged.organizations, action.actionId, state);
    const nextOrganizations = applyOrganizationActionPlan(catalog, unchanged.organizations, organizationPlan);
    const worldEffects: GameEffect[] = [];
    for (const effect of organizationPlan.effects) {
      if (effect.type === 'flag.set') {
        worldEffects.push(effect);
      }
    }
    const afterEffects = applyEffects({ ...state, organizations: nextOrganizations }, worldEffects);
    return {
      detail: { type: 'organization.act', plan: organizationPlan },
      timeCost: { periods: organizationPlan.timeCost.periods },
      organizationPlan,
      navigation,
      exploration,
      resources,
      crafting,
      presences,
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
      system: copySystem(state.system),
      items: copyItemsState(state.items ?? createInitialItemsState()),
      lingering: copyPersistentConditions(state.lingering ?? createInitialLingering()),
      garden: copyGardenState(state.garden ?? createInitialGardenState()),
      bonds: copyBondsState(afterEffects.bonds ?? state.bonds ?? createInitialBondsState()),
      registry: copyRegistryState(afterEffects.registry ?? state.registry ?? createInitialRegistryState()),
      organizations: nextOrganizations,
      execution: copyExecutionState(afterEffects.execution ?? unchanged.execution),
      party: copyPartyState(afterEffects.party ?? unchanged.party),
      family: copyFamilyState(afterEffects.family ?? unchanged.family),
      civic: copyCivicState(afterEffects.civic ?? unchanged.civic),
      economy: copyEconomyState(afterEffects.economy ?? unchanged.economy),
      settlements: copySettlementsState(afterEffects.settlements ?? unchanged.settlements),
      politics: copyPoliticsState(afterEffects.politics ?? unchanged.politics),
      npcs: copyNpcsState(state.sandbox.npcs ?? createInitialNpcsState()),
      interactables: copyInteractablesState(state.sandbox.interactables ?? createInitialInteractablesState()),
      status: afterEffects.status,
      narrativeSession: copyNarrativeSession(afterEffects.narrativeSession),
      world: { day: afterEffects.world.day, period: afterEffects.world.period },
    };
  }

  if (action.type === 'family.act') {
    const catalog = context.family ?? INITIAL_FAMILY;
    const familyPlan = planFamilyAction(catalog, unchanged.family, action.actionId, state);
    const nextFamily = applyFamilyActionPlan(catalog, unchanged.family, familyPlan);
    const worldEffects: GameEffect[] = [];
    for (const effect of familyPlan.effects) {
      if (effect.type === 'flag.set') {
        worldEffects.push(effect);
      }
    }
    const afterEffects = applyEffects({ ...state, family: nextFamily }, worldEffects);
    return {
      detail: { type: 'family.act', plan: familyPlan },
      timeCost: { periods: familyPlan.timeCost.periods },
      familyPlan,
      navigation,
      exploration,
      resources,
      crafting,
      presences,
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
      system: copySystem(state.system),
      items: copyItemsState(state.items ?? createInitialItemsState()),
      lingering: copyPersistentConditions(state.lingering ?? createInitialLingering()),
      garden: copyGardenState(state.garden ?? createInitialGardenState()),
      bonds: copyBondsState(afterEffects.bonds ?? state.bonds ?? createInitialBondsState()),
      registry: copyRegistryState(afterEffects.registry ?? state.registry ?? createInitialRegistryState()),
      organizations: copyOrganizationsState(afterEffects.organizations ?? unchanged.organizations),
      execution: copyExecutionState(afterEffects.execution ?? unchanged.execution),
      party: copyPartyState(afterEffects.party ?? unchanged.party),
      family: nextFamily,
      civic: copyCivicState(afterEffects.civic ?? unchanged.civic),
      economy: copyEconomyState(afterEffects.economy ?? unchanged.economy),
      settlements: copySettlementsState(afterEffects.settlements ?? unchanged.settlements),
      politics: copyPoliticsState(afterEffects.politics ?? unchanged.politics),
      npcs: copyNpcsState(state.sandbox.npcs ?? createInitialNpcsState()),
      interactables: copyInteractablesState(state.sandbox.interactables ?? createInitialInteractablesState()),
      status: afterEffects.status,
      narrativeSession: copyNarrativeSession(afterEffects.narrativeSession),
      world: { day: afterEffects.world.day, period: afterEffects.world.period },
    };
  }

  if (action.type === 'civic.act') {
    const catalog = context.civic ?? INITIAL_CIVIC;
    const civicPlan = planCivicAction(catalog, unchanged.civic, action.actionId, state);
    const nextCivic = applyCivicActionPlan(catalog, unchanged.civic, civicPlan);
    const worldEffects: GameEffect[] = [];
    for (const effect of civicPlan.effects) {
      if (effect.type === 'flag.set') {
        worldEffects.push(effect);
      }
    }
    const afterEffects = applyEffects({ ...state, civic: nextCivic }, worldEffects);
    return {
      detail: { type: 'civic.act', plan: civicPlan },
      timeCost: { periods: civicPlan.timeCost.periods },
      civicPlan,
      navigation,
      exploration,
      resources,
      crafting,
      presences,
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
      system: copySystem(state.system),
      items: copyItemsState(state.items ?? createInitialItemsState()),
      lingering: copyPersistentConditions(state.lingering ?? createInitialLingering()),
      garden: copyGardenState(state.garden ?? createInitialGardenState()),
      bonds: copyBondsState(afterEffects.bonds ?? state.bonds ?? createInitialBondsState()),
      registry: copyRegistryState(afterEffects.registry ?? state.registry ?? createInitialRegistryState()),
      organizations: copyOrganizationsState(afterEffects.organizations ?? unchanged.organizations),
      execution: copyExecutionState(afterEffects.execution ?? unchanged.execution),
      party: copyPartyState(afterEffects.party ?? unchanged.party),
      family: copyFamilyState(afterEffects.family ?? unchanged.family),
      civic: nextCivic,
      economy: copyEconomyState(afterEffects.economy ?? unchanged.economy),
      settlements: copySettlementsState(afterEffects.settlements ?? unchanged.settlements),
      politics: copyPoliticsState(afterEffects.politics ?? unchanged.politics),
      npcs: copyNpcsState(state.sandbox.npcs ?? createInitialNpcsState()),
      interactables: copyInteractablesState(state.sandbox.interactables ?? createInitialInteractablesState()),
      status: afterEffects.status,
      narrativeSession: copyNarrativeSession(afterEffects.narrativeSession),
      world: { day: afterEffects.world.day, period: afterEffects.world.period },
    };
  }

  if (action.type === 'economy.act') {
    const catalog = context.economy ?? INITIAL_ECONOMY;
    const economyPlan = planEconomyAction(catalog, unchanged.economy, action.actionId, state);
    const nextEconomy = applyEconomyActionPlan(catalog, unchanged.economy, economyPlan);
    let nextInventory = copyInventory(state.inventory);
    const worldEffects: GameEffect[] = [];
    for (const effect of economyPlan.effects) {
      if (effect.type === 'economy.remove-item') {
        if (!canRemoveItem(nextInventory, effect.itemId, effect.quantity)) {
          throw new SandboxActionError('O inventário não possui o item da oferta.');
        }
        nextInventory = removeItem(nextInventory, effect.itemId, effect.quantity);
        continue;
      }
      if (effect.type === 'economy.add-item') {
        if (!canAcceptQuantity(INITIAL_ITEMS, nextInventory, effect.itemId, effect.quantity)) {
          throw new SandboxActionError('A mercadoria não cabe no inventário.');
        }
        nextInventory = addItem(nextInventory, effect.itemId, effect.quantity);
        continue;
      }
      if (effect.type === 'flag.set') {
        worldEffects.push(effect);
      }
    }
    const afterEffects = applyEffects({ ...state, economy: nextEconomy, inventory: nextInventory }, worldEffects);
    return {
      detail: { type: 'economy.act', plan: economyPlan },
      timeCost: { periods: economyPlan.timeCost.periods },
      economyPlan,
      navigation,
      exploration,
      resources,
      crafting,
      presences,
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
      system: copySystem(state.system),
      items: copyItemsState(state.items ?? createInitialItemsState()),
      lingering: copyPersistentConditions(state.lingering ?? createInitialLingering()),
      garden: copyGardenState(state.garden ?? createInitialGardenState()),
      bonds: copyBondsState(afterEffects.bonds ?? state.bonds ?? createInitialBondsState()),
      registry: copyRegistryState(afterEffects.registry ?? state.registry ?? createInitialRegistryState()),
      organizations: copyOrganizationsState(afterEffects.organizations ?? unchanged.organizations),
      execution: copyExecutionState(afterEffects.execution ?? unchanged.execution),
      party: copyPartyState(afterEffects.party ?? unchanged.party),
      family: copyFamilyState(afterEffects.family ?? unchanged.family),
      civic: copyCivicState(afterEffects.civic ?? unchanged.civic),
      economy: nextEconomy,
      settlements: copySettlementsState(afterEffects.settlements ?? unchanged.settlements),
      politics: copyPoliticsState(afterEffects.politics ?? unchanged.politics),
      npcs: copyNpcsState(state.sandbox.npcs ?? createInitialNpcsState()),
      interactables: copyInteractablesState(state.sandbox.interactables ?? createInitialInteractablesState()),
      status: afterEffects.status,
      narrativeSession: copyNarrativeSession(afterEffects.narrativeSession),
      world: { day: afterEffects.world.day, period: afterEffects.world.period },
    };
  }

  if (action.type === 'settlement.act') {
    const catalog = context.settlements ?? INITIAL_SETTLEMENTS;
    const settlementPlan = planSettlementAction(catalog, unchanged.settlements, action.actionId, state);
    const nextSettlements = applySettlementActionPlan(catalog, unchanged.settlements, settlementPlan);
    let nextInventory = copyInventory(state.inventory);
    const worldEffects: GameEffect[] = [];
    for (const effect of settlementPlan.effects) {
      if (effect.type === 'settlement.supply-project') {
        if (!canRemoveItem(nextInventory, effect.itemId, effect.quantity)) {
          throw new SandboxActionError('O inventário não possui o material da construção.');
        }
        nextInventory = removeItem(nextInventory, effect.itemId, effect.quantity);
        continue;
      }
      if (effect.type === 'settlement.withdraw-item') {
        if (!canAcceptQuantity(INITIAL_ITEMS, nextInventory, effect.itemId, effect.quantity)) {
          throw new SandboxActionError('O item da base não cabe no inventário.');
        }
        nextInventory = addItem(nextInventory, effect.itemId, effect.quantity);
        continue;
      }
      if (effect.type === 'flag.set') {
        worldEffects.push(effect);
      }
    }
    const afterEffects = applyEffects(
      { ...state, settlements: nextSettlements, inventory: nextInventory },
      worldEffects,
    );
    return {
      detail: { type: 'settlement.act', plan: settlementPlan },
      timeCost: { periods: settlementPlan.timeCost.periods },
      settlementPlan,
      navigation,
      exploration,
      resources,
      crafting,
      presences,
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
      system: copySystem(state.system),
      items: copyItemsState(state.items ?? createInitialItemsState()),
      lingering: copyPersistentConditions(state.lingering ?? createInitialLingering()),
      garden: copyGardenState(state.garden ?? createInitialGardenState()),
      bonds: copyBondsState(afterEffects.bonds ?? state.bonds ?? createInitialBondsState()),
      registry: copyRegistryState(afterEffects.registry ?? state.registry ?? createInitialRegistryState()),
      organizations: copyOrganizationsState(afterEffects.organizations ?? unchanged.organizations),
      execution: copyExecutionState(afterEffects.execution ?? unchanged.execution),
      party: copyPartyState(afterEffects.party ?? unchanged.party),
      family: copyFamilyState(afterEffects.family ?? unchanged.family),
      civic: copyCivicState(afterEffects.civic ?? unchanged.civic),
      economy: copyEconomyState(afterEffects.economy ?? unchanged.economy),
      settlements: nextSettlements,
      politics: copyPoliticsState(afterEffects.politics ?? unchanged.politics),
      npcs: copyNpcsState(state.sandbox.npcs ?? createInitialNpcsState()),
      interactables: copyInteractablesState(state.sandbox.interactables ?? createInitialInteractablesState()),
      status: afterEffects.status,
      narrativeSession: copyNarrativeSession(afterEffects.narrativeSession),
      world: { day: afterEffects.world.day, period: afterEffects.world.period },
    };
  }

  if (action.type === 'politics.act') {
    const catalog = context.politics ?? INITIAL_POLITICS;
    const politicsPlan = planPoliticsAction(catalog, unchanged.politics, action.actionId, state);
    const nextPolitics = applyPoliticsActionPlan(catalog, unchanged.politics, politicsPlan);
    const worldEffects: GameEffect[] = [];
    for (const effect of politicsPlan.effects) {
      if (effect.type === 'flag.set') {
        worldEffects.push(effect);
      }
    }
    const afterEffects = applyEffects({ ...state, politics: nextPolitics }, worldEffects);
    return {
      detail: { type: 'politics.act', plan: politicsPlan },
      timeCost: { periods: politicsPlan.timeCost.periods },
      politicsPlan,
      navigation,
      exploration,
      resources,
      crafting,
      presences,
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
      system: copySystem(state.system),
      items: copyItemsState(state.items ?? createInitialItemsState()),
      lingering: copyPersistentConditions(state.lingering ?? createInitialLingering()),
      garden: copyGardenState(state.garden ?? createInitialGardenState()),
      bonds: copyBondsState(afterEffects.bonds ?? state.bonds ?? createInitialBondsState()),
      registry: copyRegistryState(afterEffects.registry ?? state.registry ?? createInitialRegistryState()),
      organizations: copyOrganizationsState(afterEffects.organizations ?? unchanged.organizations),
      execution: copyExecutionState(afterEffects.execution ?? unchanged.execution),
      party: copyPartyState(afterEffects.party ?? unchanged.party),
      family: copyFamilyState(afterEffects.family ?? unchanged.family),
      civic: copyCivicState(afterEffects.civic ?? unchanged.civic),
      economy: copyEconomyState(afterEffects.economy ?? unchanged.economy),
      settlements: copySettlementsState(afterEffects.settlements ?? unchanged.settlements),
      politics: nextPolitics,
      npcs: copyNpcsState(state.sandbox.npcs ?? createInitialNpcsState()),
      interactables: copyInteractablesState(state.sandbox.interactables ?? createInitialInteractablesState()),
      status: afterEffects.status,
      narrativeSession: copyNarrativeSession(afterEffects.narrativeSession),
      world: { day: afterEffects.world.day, period: afterEffects.world.period },
    };
  }

  if (action.type === 'bond.act') {
    const catalog = context.bonds ?? INITIAL_BONDS;
    const bondPlan = planBondAction(catalog, unchanged.bonds, action.actionId, state);
    const nextBonds = applyBondActionPlan(catalog, unchanged.bonds, bondPlan);
    const worldEffects: GameEffect[] = [];
    for (const effect of bondPlan.effects) {
      if (effect.type === 'bond.shift' || effect.type === 'bond.form') {
        continue;
      }
      worldEffects.push(effect);
    }
    const afterEffects = applyEffects({ ...state, bonds: nextBonds }, worldEffects.filter((effect) => effect.type !== 'npc.rememberFact'));
    const npcCatalog = context.npcs ?? INITIAL_NPCS;
    let npcs = copyNpcsState(state.sandbox.npcs ?? createInitialNpcsState());
    for (const effect of bondPlan.effects) {
      if (effect.type === 'npc.rememberFact') {
        npcs = rememberNpcFact(npcCatalog, npcs, effect.npcId, effect.factId);
      }
    }
    return {
      detail: { type: 'bond.act', plan: bondPlan },
      timeCost: { periods: bondPlan.timeCost.periods },
      bondPlan,
      navigation,
      exploration,
      resources,
      crafting,
      presences,
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
      system: copySystem(state.system),
      items: copyItemsState(state.items ?? createInitialItemsState()),
      lingering: copyPersistentConditions(state.lingering ?? createInitialLingering()),
      garden: copyGardenState(state.garden ?? createInitialGardenState()),
      bonds: copyBondsState(afterEffects.bonds ?? nextBonds),
      registry: copyRegistryState(afterEffects.registry ?? state.registry ?? createInitialRegistryState()),
      organizations: copyOrganizationsState(afterEffects.organizations ?? state.organizations ?? createInitialOrganizationsState()),
      execution: copyExecutionState(afterEffects.execution ?? unchanged.execution),
      party: copyPartyState(afterEffects.party ?? unchanged.party),
      family: copyFamilyState(afterEffects.family ?? unchanged.family),
      civic: copyCivicState(afterEffects.civic ?? unchanged.civic),
      economy: copyEconomyState(afterEffects.economy ?? unchanged.economy),
      settlements: copySettlementsState(afterEffects.settlements ?? unchanged.settlements),
      politics: copyPoliticsState(afterEffects.politics ?? unchanged.politics),
      npcs,
      interactables: copyInteractablesState(state.sandbox.interactables ?? createInitialInteractablesState()),
      status: afterEffects.status,
      narrativeSession: copyNarrativeSession(afterEffects.narrativeSession),
      world: { day: afterEffects.world.day, period: afterEffects.world.period },
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

  const interactionEffects = plan.effects;
  const afterEffects = applyEffects(
    state,
    interactionEffects.filter((effect) => effect.type !== 'npc.rememberFact'),
  );
  let nextPresences = copyPresenceState(presences);
  if (plan.resolvesPresence) {
    nextPresences = resolvePresence(context.presences, nextPresences, action.presenceId);
  }

  const npcCatalog = context.npcs ?? INITIAL_NPCS;
  let npcs = copyNpcsState(state.sandbox.npcs ?? createInitialNpcsState());
  for (const effect of interactionEffects) {
    if (effect.type === 'npc.rememberFact') {
      npcs = rememberNpcFact(npcCatalog, npcs, effect.npcId, effect.factId);
    }
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
    system: copySystem(state.system),
    items: copyItemsState(state.items ?? createInitialItemsState()),
    lingering: copyPersistentConditions(state.lingering ?? createInitialLingering()),
      garden: copyGardenState(state.garden ?? createInitialGardenState()),
      bonds: copyBondsState(afterEffects.bonds ?? state.bonds ?? createInitialBondsState()),
      registry: copyRegistryState(afterEffects.registry ?? state.registry ?? createInitialRegistryState()),
      organizations: copyOrganizationsState(afterEffects.organizations ?? state.organizations ?? createInitialOrganizationsState()),
      execution: copyExecutionState(afterEffects.execution ?? unchanged.execution),
      party: copyPartyState(afterEffects.party ?? unchanged.party),
      family: copyFamilyState(afterEffects.family ?? unchanged.family),
      civic: copyCivicState(afterEffects.civic ?? unchanged.civic),
      economy: copyEconomyState(afterEffects.economy ?? unchanged.economy),
      settlements: copySettlementsState(afterEffects.settlements ?? unchanged.settlements),
      politics: copyPoliticsState(afterEffects.politics ?? unchanged.politics),
      npcs,
      interactables: copyInteractablesState(state.sandbox.interactables ?? createInitialInteractablesState()),
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

  if (value.type === 'training.train') {
    if (typeof value.methodId !== 'string' || value.methodId.trim() === '') {
      throw new SandboxActionError('O método de treinamento é inválido.');
    }

    return { type: 'training.train', methodId: value.methodId };
  }

  if (value.type === 'combat.resolve') {
    const resolution = value.resolution;
    if (
      !isRecord(resolution) ||
      typeof resolution.encounterId !== 'string' ||
      resolution.encounterId.trim() === '' ||
      (resolution.outcome !== 'victory' && resolution.outcome !== 'defeat' && resolution.outcome !== 'fled') ||
      !nonNegativeSafeInteger(resolution.turns) ||
      !nonNegativeSafeInteger(resolution.entryHealth) ||
      !nonNegativeSafeInteger(resolution.remainingHealth) ||
      (resolution.remainingHealth as number) > (resolution.entryHealth as number) ||
      !Array.isArray(resolution.playerActionIds) ||
      resolution.playerActionIds.length !== resolution.turns ||
      resolution.playerActionIds.some((actionId) => typeof actionId !== 'string' || actionId.trim() === '')
    ) {
      throw new SandboxActionError('A resolução de combate é inválida.');
    }

    return {
      type: 'combat.resolve',
      resolution: {
        encounterId: resolution.encounterId,
        outcome: resolution.outcome,
        turns: resolution.turns as number,
        entryHealth: resolution.entryHealth as number,
        remainingHealth: resolution.remainingHealth as number,
        playerActionIds: [...resolution.playerActionIds] as string[],
        usedPrepared: Array.isArray(resolution.usedPrepared)
          ? resolution.usedPrepared.map((entry) => {
              if (!isRecord(entry) || typeof entry.slot !== 'number' || typeof entry.itemId !== 'string') {
                throw new SandboxActionError('A resolução de combate é inválida.');
              }
              return { slot: entry.slot, itemId: entry.itemId };
            })
          : [],
        equipment: isRecord(resolution.equipment)
          ? {
              'main-hand': typeof resolution.equipment['main-hand'] === 'string' ? resolution.equipment['main-hand'] : null,
              body: typeof resolution.equipment.body === 'string' ? resolution.equipment.body : null,
              accessory: typeof resolution.equipment.accessory === 'string' ? resolution.equipment.accessory : null,
            }
          : { 'main-hand': null, body: null, accessory: null },
        entryExecution: inspectResolutionExecution(resolution.entryExecution),
        remainingExecution: inspectResolutionExecution(resolution.remainingExecution),
        companionOrders: inspectCompanionOrderLog(resolution.companionOrders),
        allyVitals: inspectAllyVitals(resolution.allyVitals),
      },
    };
  }

  if (value.type === 'equipment.equip') {
    if (typeof value.itemId !== 'string' || value.itemId.trim() === '') {
      throw new SandboxActionError('O equipamento é inválido.');
    }
    return { type: 'equipment.equip', itemId: value.itemId };
  }

  if (value.type === 'equipment.unequip') {
    if (!EQUIPMENT_SLOTS.includes(value.slot as (typeof EQUIPMENT_SLOTS)[number])) {
      throw new SandboxActionError('O espaço de equipamento é inválido.');
    }
    return { type: 'equipment.unequip', slot: value.slot as (typeof EQUIPMENT_SLOTS)[number] };
  }

  if (value.type === 'preparation.assign') {
    if (typeof value.itemId !== 'string' || value.itemId.trim() === '' || !Number.isInteger(value.slot)) {
      throw new SandboxActionError('A preparação é inválida.');
    }
    return { type: 'preparation.assign', slot: value.slot as number, itemId: value.itemId };
  }

  if (value.type === 'preparation.clear') {
    if (!Number.isInteger(value.slot)) {
      throw new SandboxActionError('A preparação é inválida.');
    }
    return { type: 'preparation.clear', slot: value.slot as number };
  }

  if (value.type === 'garden.cultivate') {
    if (typeof value.recipeId !== 'string' || value.recipeId.trim() === '') {
      throw new SandboxActionError('A receita do Jardim é inválida.');
    }
    return { type: 'garden.cultivate', recipeId: value.recipeId };
  }

  if (value.type === 'interactable.interact') {
    if (
      typeof value.interactableId !== 'string' ||
      value.interactableId.trim() === '' ||
      typeof value.actionId !== 'string' ||
      value.actionId.trim() === ''
    ) {
      throw new SandboxActionError('A ação do ponto de interesse é inválida.');
    }
    return { type: 'interactable.interact', interactableId: value.interactableId, actionId: value.actionId };
  }

  if (value.type === 'bond.act') {
    if (typeof value.actionId !== 'string' || value.actionId.trim() === '') {
      throw new SandboxActionError('A ação de relacionamento é inválida.');
    }
    return { type: 'bond.act', actionId: value.actionId };
  }

  if (value.type === 'registry.claim') {
    if (typeof value.patentId !== 'string' || value.patentId.trim() === '') {
      throw new SandboxActionError('A patente do Registro é inválida.');
    }
    return { type: 'registry.claim', patentId: value.patentId };
  }

  if (value.type === 'organization.act') {
    if (typeof value.actionId !== 'string' || value.actionId.trim() === '') {
      throw new SandboxActionError('A ação de organização é inválida.');
    }
    return { type: 'organization.act', actionId: value.actionId };
  }

  if (value.type === 'family.act') {
    if (typeof value.actionId !== 'string' || value.actionId.trim() === '') {
      throw new SandboxActionError('A ação de família é inválida.');
    }
    return { type: 'family.act', actionId: value.actionId };
  }

  if (value.type === 'civic.act') {
    if (typeof value.actionId !== 'string' || value.actionId.trim() === '') {
      throw new SandboxActionError('A ação cívica é inválida.');
    }
    return { type: 'civic.act', actionId: value.actionId };
  }

  if (value.type === 'economy.act') {
    if (typeof value.actionId !== 'string' || value.actionId.trim() === '') {
      throw new SandboxActionError('A ação econômica é inválida.');
    }
    return { type: 'economy.act', actionId: value.actionId };
  }

  if (value.type === 'settlement.act') {
    if (typeof value.actionId !== 'string' || value.actionId.trim() === '') {
      throw new SandboxActionError('A ação de assentamento é inválida.');
    }
    return { type: 'settlement.act', actionId: value.actionId };
  }

  if (value.type === 'politics.act') {
    if (typeof value.actionId !== 'string' || value.actionId.trim() === '') {
      throw new SandboxActionError('A ação política é inválida.');
    }
    return { type: 'politics.act', actionId: value.actionId };
  }

  throw new SandboxActionError('A ação do sandbox é desconhecida.');
}

function inspectResolutionExecution(value: unknown): ExecutionState {
  if (value === undefined) {
    return createInitialExecutionState();
  }
  const inspected = inspectExecutionState(value);
  if (!inspected.ok) {
    throw new SandboxActionError('A resolução de combate é inválida.');
  }
  return inspected.value;
}

function inspectCompanionOrderLog(value: unknown): { actorId: string; actionId: string }[][] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new SandboxActionError('A resolução de combate é inválida.');
  }
  return value.map((turn) => {
    if (!Array.isArray(turn)) {
      throw new SandboxActionError('A resolução de combate é inválida.');
    }
    const seen = new Set<string>();
    return turn.map((entry) => {
      if (!isRecord(entry) || typeof entry.actorId !== 'string' || entry.actorId.trim() === '' || typeof entry.actionId !== 'string' || entry.actionId.trim() === '' || seen.has(entry.actorId)) {
        throw new SandboxActionError('A resolução de combate é inválida.');
      }
      seen.add(entry.actorId);
      return { actorId: entry.actorId, actionId: entry.actionId };
    });
  });
}

function inspectAllyVitals(value: unknown): { actorId: string; health: number }[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new SandboxActionError('A resolução de combate é inválida.');
  }
  const seen = new Set<string>();
  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.actorId !== 'string' || entry.actorId.trim() === '' || seen.has(entry.actorId) || !Number.isSafeInteger(entry.health) || (entry.health as number) < 0) {
      throw new SandboxActionError('A resolução de combate é inválida.');
    }
    seen.add(entry.actorId);
    return { actorId: entry.actorId, health: entry.health as number };
  });
}

function copyResolution(resolution: CombatResolution): CombatResolution {
  return {
    encounterId: resolution.encounterId,
    outcome: resolution.outcome,
    turns: resolution.turns,
    entryHealth: resolution.entryHealth,
    remainingHealth: resolution.remainingHealth,
    playerActionIds: [...resolution.playerActionIds],
    usedPrepared: (resolution.usedPrepared ?? []).map((entry) => ({ ...entry })),
    equipment: {
      'main-hand': resolution.equipment?.['main-hand'] ?? null,
      body: resolution.equipment?.body ?? null,
      accessory: resolution.equipment?.accessory ?? null,
    },
    entryExecution: copyExecutionState(resolution.entryExecution ?? createInitialExecutionState()),
    remainingExecution: copyExecutionState(resolution.remainingExecution ?? createInitialExecutionState()),
    companionOrders: (resolution.companionOrders ?? []).map((turn) => turn.map((entry) => ({ ...entry }))),
    allyVitals: (resolution.allyVitals ?? []).map((entry) => ({ ...entry })),
  };
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
  system?: SkillsProgressState;
  items?: ItemsState;
  lingering?: PersistentConditionState;
  garden?: GardenState;
  bonds?: BondsState;
  registry?: RegistryState;
  organizations?: OrganizationsState;
  execution?: ExecutionState;
  party?: PartyState;
  calendar?: CalendarState;
  family?: FamilyState;
  civic?: CivicState;
  economy?: EconomyState;
  settlements?: SettlementsState;
  politics?: PoliticsState;
  npcs?: NPCsState;
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
      npcs: copyNpcsState(patch.npcs ?? patch.sandbox.npcs ?? base.sandbox.npcs ?? createInitialNpcsState()),
      interactables: copyInteractablesState(
        patch.sandbox.interactables ?? base.sandbox.interactables ?? createInitialInteractablesState(),
      ),
    },
    objectives: {
      entries: base.objectives.entries.map((entry) => ({
        objectiveId: entry.objectiveId,
        completedStepIds: [...entry.completedStepIds],
        completed: entry.completed,
      })),
    },
    system: copySystem(patch.system ?? base.system),
    items: copyItemsState(patch.items ?? base.items ?? createInitialItemsState()),
    lingering: copyPersistentConditions(patch.lingering ?? base.lingering ?? createInitialLingering()),
    garden: copyGardenState(patch.garden ?? base.garden ?? createInitialGardenState()),
    bonds: copyBondsState(patch.bonds ?? base.bonds ?? createInitialBondsState()),
    registry: copyRegistryState(patch.registry ?? base.registry ?? createInitialRegistryState()),
    organizations: copyOrganizationsState(patch.organizations ?? base.organizations ?? createInitialOrganizationsState()),
    execution: copyExecutionState(patch.execution ?? base.execution ?? createInitialExecutionState()),
    party: copyPartyState(patch.party ?? base.party ?? createInitialPartyState()),
    calendar: copyCalendarState(patch.calendar ?? base.calendar ?? createInitialCalendarState()),
    family: copyFamilyState(patch.family ?? base.family ?? createInitialFamilyState()),
    civic: copyCivicState(patch.civic ?? base.civic ?? createInitialCivicState()),
    economy: copyEconomyState(patch.economy ?? base.economy ?? createInitialEconomyState()),
    settlements: copySettlementsState(patch.settlements ?? base.settlements ?? createInitialSettlementsState()),
    politics: copyPoliticsState(patch.politics ?? base.politics ?? createInitialPoliticsState()),
    updatedAt: patch.updatedAt,
  };
}

function copySystem(state: SkillsProgressState): SkillsProgressState {
  return {
    level: state.level,
    entries: state.entries.map((entry) => ({ skillId: entry.skillId, proficiency: entry.proficiency })),
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

  if (action.type === 'training.train') {
    return { type: 'training.train', methodId: action.methodId };
  }

  if (action.type === 'combat.resolve') {
    return { type: 'combat.resolve', resolution: copyResolution(action.resolution) };
  }

  if (action.type === 'equipment.equip') {
    return { type: 'equipment.equip', itemId: action.itemId };
  }

  if (action.type === 'equipment.unequip') {
    return { type: 'equipment.unequip', slot: action.slot };
  }

  if (action.type === 'preparation.assign') {
    return { type: 'preparation.assign', slot: action.slot, itemId: action.itemId };
  }

  if (action.type === 'preparation.clear') {
    return { type: 'preparation.clear', slot: action.slot };
  }

  if (action.type === 'garden.cultivate') {
    return { type: 'garden.cultivate', recipeId: action.recipeId };
  }

  if (action.type === 'interactable.interact') {
    return { type: 'interactable.interact', interactableId: action.interactableId, actionId: action.actionId };
  }

  if (action.type === 'bond.act') {
    return { type: 'bond.act', actionId: action.actionId };
  }

  if (action.type === 'registry.claim') {
    return { type: 'registry.claim', patentId: action.patentId };
  }

  if (action.type === 'organization.act') {
    return { type: 'organization.act', actionId: action.actionId };
  }

  if (action.type === 'family.act') {
    return { type: 'family.act', actionId: action.actionId };
  }

  if (action.type === 'civic.act') {
    return { type: 'civic.act', actionId: action.actionId };
  }

  if (action.type === 'economy.act') {
    return { type: 'economy.act', actionId: action.actionId };
  }
  if (action.type === 'settlement.act') {
    return { type: 'settlement.act', actionId: action.actionId };
  }
  if (action.type === 'politics.act') {
    return { type: 'politics.act', actionId: action.actionId };
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

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function lingeringWorldDamage(state: PersistentConditionState, periods: number): number {
  if (!Number.isSafeInteger(periods) || periods <= 0) {
    return 0;
  }
  let damage = 0;
  for (const entry of state.entries) {
    const definition = INITIAL_CONDITIONS.conditionById.get(entry.conditionId);
    if (!definition?.lingering) {
      continue;
    }
    const ticks = Math.min(periods, entry.remainingPeriods);
    for (const effect of definition.effects) {
      if (effect.type === 'damage') {
        damage += effect.amount * Math.max(1, entry.potency) * ticks;
      }
    }
  }
  return damage;
}

function distinctCombatSkills(actionIds: readonly string[]): string[] {
  const skills: string[] = [];
  const seen = new Set<string>();
  for (const id of actionIds) {
    const skillId = INITIAL_COMBAT.actionById.get(id)?.skillId;
    if (skillId && !seen.has(skillId)) {
      seen.add(skillId);
      skills.push(skillId);
    }
  }
  return skills;
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
    error instanceof TrainingError ||
    error instanceof SkillError ||
    error instanceof CombatError ||
    error instanceof MasteryError ||
    error instanceof ItemError ||
    error instanceof EquipmentError ||
    error instanceof PreparationError ||
    error instanceof ConditionError ||
    error instanceof GardenError ||
    error instanceof NpcError ||
    error instanceof InteractableError ||
    error instanceof BondError ||
    error instanceof RegistryError ||
    error instanceof OrganizationError ||
    error instanceof FamilyError ||
    error instanceof CivicError ||
    error instanceof EconomyError ||
    error instanceof SettlementError ||
    error instanceof PoliticsError ||
    error instanceof PartyError ||
    error instanceof ExecutionError ||
    error instanceof EngineError
  ) {
    throw new SandboxActionError(error.message, { cause: error });
  }

  throw error;
}
