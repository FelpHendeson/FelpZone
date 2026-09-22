import { applyEffects } from '../../core/effects';
import type { GameEffect } from '../../core/events';
import { type Attributes, type GameState, type InventoryItem, type NarrativeSession, type ProgressionState, type Relationship } from '../../core/state';
import { craftRecipe } from '../crafting';
import { exploreCurrentLocation } from '../exploration';
import { moveToLocation, discoverLocation, unlockLocation } from '../navigation';
import { addItem, canRemoveItem, removeItem } from '../inventory';
import { planNeedsConsumption, planNeedsRest } from '../needs';
import { collectResource } from '../resources';
import { type SandboxContext } from '../sandbox';
import { planPresenceInteraction, resolvePresence, type PresenceInteractionPlan, type PresenceState } from '../presences';
import { getSkillProficiency, increaseSkillProficiency, learnSkill, type SkillsProgressState } from '../skills';
import { applyTrainingPlan, copyTrainingPlan, planTraining } from '../training';
import { combatResolutionEffects, listAvailableEncounters, verifyCombatResolution } from '../combat';
import { applyMastery, type MasteryResult } from '../mastery';
import { canAcceptQuantity, copyItemsState, createInitialItemsState, type ItemsState } from '../items';
import { buildCombatLoadout, equipItem, unequipSlot } from '../equipment';
import { assignPreparation, clearPreparation, consumePreparedSlot } from '../preparation';
import { copyPersistentConditions, createInitialLingering, type PersistentConditionState } from '../conditions';
import { applyGardenPlan, copyGardenState, createInitialGardenState, planGardenCultivation, type GardenState } from '../garden';
import { applyBondActionPlan, copyBondsState, createInitialBondsState, planBondAction, INITIAL_BONDS, type BondActionPlan, type BondsState } from '../bonds';
import { applyPatentClaim, copyRegistryState, createInitialRegistryState, planPatentClaim, INITIAL_REGISTRY, type RegistryState } from '../registry';
import { applyOrganizationActionPlan, copyOrganizationsState, createInitialOrganizationsState, planOrganizationAction, INITIAL_ORGANIZATIONS, type OrganizationActionPlan, type OrganizationsState } from '../organizations';
import { INITIAL_PARTY, allySnapshots, applyPartyVitals, copyPartyState, createInitialPartyState, planCompanionOrder, type PartyState } from '../party';
import { type CalendarState } from '../calendar';
import { INITIAL_FAMILY, applyFamilyActionPlan, copyFamilyState, createInitialFamilyState, planFamilyAction, type FamilyActionPlan, type FamilyState } from '../family';
import { INITIAL_CIVIC, applyCivicActionPlan, copyCivicState, createInitialCivicState, planCivicAction, type CivicActionPlan, type CivicState } from '../civic';
import { INITIAL_ECONOMY, applyEconomyActionPlan, copyEconomyState, createInitialEconomyState, planEconomyAction, type EconomyActionPlan, type EconomyState } from '../economy';
import { INITIAL_SETTLEMENTS, applySettlementActionPlan, copySettlementsState, createInitialSettlementsState, planSettlementAction, type SettlementActionPlan, type SettlementsState } from '../settlements';
import { INITIAL_POLITICS, applyPoliticsActionPlan, copyPoliticsState, createInitialPoliticsState, planPoliticsAction, type PoliticsActionPlan, type PoliticsState } from '../politics';
import { copyExecutionState, createInitialExecutionState, restoreReserves, type ExecutionState } from '../execution';
import { applyInteractablePlan, copyInteractablesState, createInitialInteractablesState, planInteractableAction, type InteractableActionPlan, type InteractablesState } from '../interactables';
import { copyNpcsState, createInitialNpcsState, rememberNpcFact, INITIAL_NPCS, type NPCsState } from '../npcs';
import { applyContextualActivityPlan, copyContextualActivitiesState, createInitialContextualActivitiesState, planContextualActivity, type ContextualActivitiesState, type ContextualActivityPlan } from '../activities';
import type { GuidanceState } from '../guidance';
import type { TimeCost } from '../time';
import { worldToTimeState } from '../world';
import { SandboxActionError } from './errors';
import type { SandboxAction, SandboxActionDetail } from './types';
import { activeCatalogs, applyNeedsToAttributes, attributesToNeeds, copyConsumptionPlan, copyCrafting, copyExploration, copyInventory, copyNarrativeSession, copyNavigation, copyPresenceState, copyResolution, copyResources, copyRestPlan, copySystem, createInteractionPlanCopy, distinctCombatSkills, hasActiveCampfire, requireActiveCatalog, requireNpcPresent } from './action-helpers';

export function executePrimary(
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
  activityPlan?: ContextualActivityPlan;
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
  activities: ContextualActivitiesState;
  guidance: GuidanceState;
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
  const catalogs = activeCatalogs(context);
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
    activities: copyContextualActivitiesState(state.activities ?? createInitialContextualActivitiesState()),
    guidance: {
      unlockedTopicIds: [...state.guidance.unlockedTopicIds],
      seenTopicIds: [...state.guidance.seenTopicIds],
    },
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
    const training = requireActiveCatalog(catalogs.training, 'treinamentos');
    const skills = requireActiveCatalog(catalogs.skills, 'habilidades');
    const masteryCatalog = requireActiveCatalog(catalogs.mastery, 'maestria');
    const trainingPlan = planTraining(training, skills, state.system, action.methodId);
    const trainedSystem = applyTrainingPlan(skills, state.system, trainingPlan);
    const mastery = applyMastery(masteryCatalog, skills, trainedSystem, {
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
      requireActiveCatalog(catalogs.combat, 'combate'),
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
    const items = requireActiveCatalog(catalogs.items, 'itens');
    const portrait = buildCombatLoadout(items, state.items ?? createInitialItemsState());
    const organizationState = state.organizations ?? createInitialOrganizationsState();
    const partyState = state.party ?? createInitialPartyState();
    const allies =
      encounter.requiredOrganizationId === undefined
        ? []
        : allySnapshots(
            context.party ?? INITIAL_PARTY,
            context.organizations ?? INITIAL_ORGANIZATIONS,
            organizationState,
            partyState,
          );
    for (const turn of action.resolution.companionOrders ?? []) {
      for (const order of turn) {
        const definition = (context.party ?? INITIAL_PARTY).companionOrders.find(
          (entry) => entry.npcId === order.actorId && entry.actionId === order.actionId,
        );
        if (!definition) {
          throw new SandboxActionError('A orientação de companheiro não existe.');
        }
        planCompanionOrder(
          context.party ?? INITIAL_PARTY,
          context.organizations ?? INITIAL_ORGANIZATIONS,
          organizationState,
          definition.id,
          state,
        );
      }
    }
    const resolution = verifyCombatResolution(requireActiveCatalog(catalogs.combat, 'combate'), action.resolution, encounter, {
      playerName: `${state.character.firstName} ${state.character.lastName}`,
      knownSkillIds: state.system.entries.map((entry) => entry.skillId),
      playerMaxHealth: state.attributes.saude,
      loadout: portrait.loadout,
      prepared: portrait.prepared,
      execution: state.execution ?? createInitialExecutionState(),
      allies,
      runtime: { conditions: catalogs.conditions, execution: context.execution },
    });
    const afterEffects = applyEffects(state, combatResolutionEffects(resolution, state.attributes.saude), context.bonds);

    let system = afterEffects.system;
    let mastery: MasteryResult | undefined;
    if (resolution.outcome === 'victory') {
      const usedSkillIds = distinctCombatSkills(requireActiveCatalog(catalogs.combat, 'combate'), resolution.playerActionIds);
      mastery = applyMastery(
        requireActiveCatalog(catalogs.mastery, 'maestria'),
        requireActiveCatalog(catalogs.skills, 'habilidades'),
        system,
        {
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
          requireActiveCatalog(catalogs.items, 'itens'),
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
    const result = equipItem(requireActiveCatalog(catalogs.items, 'itens'), unchanged.items, inventory, action.itemId);
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
    const result = assignPreparation(requireActiveCatalog(catalogs.items, 'itens'), unchanged.items, inventory, action.slot, action.itemId);
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
    const garden = requireActiveCatalog(catalogs.garden, 'Jardim');
    const skills = requireActiveCatalog(catalogs.skills, 'habilidades');
    const plan = planGardenCultivation(garden, skills, unchanged.system, unchanged.garden, action.recipeId);
    const nextGarden = applyGardenPlan(unchanged.garden, plan);
    let nextSystem = learnSkill(skills, unchanged.system, plan.resultSkillId);
    const currentProficiency = getSkillProficiency(nextSystem, plan.resultSkillId);
    if (plan.initialProficiency > currentProficiency) {
      nextSystem = increaseSkillProficiency(
        skills,
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
    const afterEffects = worldEffects.length > 0 ? applyEffects(state, worldEffects, context.bonds) : state;
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
    requireNpcPresent(context, state, catalog.actionById.get(action.actionId)?.npcId);
    const organizationPlan = planOrganizationAction(catalog, unchanged.organizations, action.actionId, state);
    const nextOrganizations = applyOrganizationActionPlan(catalog, unchanged.organizations, organizationPlan);
    const worldEffects: GameEffect[] = [];
    for (const effect of organizationPlan.effects) {
      if (effect.type === 'flag.set') {
        worldEffects.push(effect);
      }
    }
    const afterEffects = applyEffects({ ...state, organizations: nextOrganizations }, worldEffects, context.bonds);
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
    requireNpcPresent(context, state, catalog.actionById.get(action.actionId)?.npcId);
    const familyPlan = planFamilyAction(catalog, unchanged.family, action.actionId, state);
    const nextFamily = applyFamilyActionPlan(catalog, unchanged.family, familyPlan);
    const worldEffects: GameEffect[] = [];
    for (const effect of familyPlan.effects) {
      if (effect.type === 'flag.set') {
        worldEffects.push(effect);
      }
    }
    const afterEffects = applyEffects({ ...state, family: nextFamily }, worldEffects, context.bonds);
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
    requireNpcPresent(context, state, catalog.actionById.get(action.actionId)?.npcId);
    const civicPlan = planCivicAction(catalog, unchanged.civic, action.actionId, state);
    const nextCivic = applyCivicActionPlan(catalog, unchanged.civic, civicPlan);
    const worldEffects: GameEffect[] = [];
    for (const effect of civicPlan.effects) {
      if (effect.type === 'flag.set') {
        worldEffects.push(effect);
      }
    }
    const afterEffects = applyEffects({ ...state, civic: nextCivic }, worldEffects, context.bonds);
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
    requireNpcPresent(context, state, catalog.actionById.get(action.actionId)?.npcId);
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
        if (!canAcceptQuantity(requireActiveCatalog(catalogs.items, 'itens'), nextInventory, effect.itemId, effect.quantity)) {
          throw new SandboxActionError('A mercadoria não cabe no inventário.');
        }
        nextInventory = addItem(nextInventory, effect.itemId, effect.quantity);
        continue;
      }
      if (effect.type === 'flag.set') {
        worldEffects.push(effect);
      }
    }
    const afterEffects = applyEffects(
      { ...state, economy: nextEconomy, inventory: nextInventory },
      worldEffects,
      context.bonds,
    );
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
    requireNpcPresent(context, state, catalog.actionById.get(action.actionId)?.npcId);
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
        if (!canAcceptQuantity(requireActiveCatalog(catalogs.items, 'itens'), nextInventory, effect.itemId, effect.quantity)) {
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
      context.bonds,
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
    requireNpcPresent(context, state, catalog.actionById.get(action.actionId)?.npcId);
    const politicsPlan = planPoliticsAction(catalog, unchanged.politics, action.actionId, state);
    const nextPolitics = applyPoliticsActionPlan(catalog, unchanged.politics, politicsPlan);
    const worldEffects: GameEffect[] = [];
    for (const effect of politicsPlan.effects) {
      if (effect.type === 'flag.set') {
        worldEffects.push(effect);
      }
    }
    const afterEffects = applyEffects({ ...state, politics: nextPolitics }, worldEffects, context.bonds);
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
    requireNpcPresent(context, state, catalog.actionById.get(action.actionId)?.npcId);
    const bondPlan = planBondAction(catalog, unchanged.bonds, action.actionId, state);
    const nextBonds = applyBondActionPlan(catalog, unchanged.bonds, bondPlan);
    const worldEffects: GameEffect[] = [];
    for (const effect of bondPlan.effects) {
      if (effect.type === 'bond.shift' || effect.type === 'bond.form') {
        continue;
      }
      worldEffects.push(effect);
    }
    const afterEffects = applyEffects(
      { ...state, bonds: nextBonds },
      worldEffects.filter((effect) => effect.type !== 'npc.rememberFact'),
      context.bonds,
    );
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

  if (action.type === 'activity.perform') {
    if (!context.activities || !context.npcs || !context.guidance) {
      throw new SandboxActionError('O catálogo de atividades do pack ativo não está disponível.');
    }
    const activityPlan = planContextualActivity(
      context.activities,
      unchanged.activities,
      state,
      context.npcs,
      action.activityId,
      action.optionalParticipantIds,
    );
    const applied = applyContextualActivityPlan(
      context.activities,
      unchanged.activities,
      activityPlan,
      state,
      { npcs: context.npcs, guidance: context.guidance },
    );
    return {
      detail: { type: 'activity.perform', plan: activityPlan },
      timeCost: { periods: activityPlan.timeCost.periods },
      activityPlan,
      navigation,
      exploration,
      resources,
      crafting,
      presences,
      inventory,
      ...unchanged,
      activities: applied.activities,
      npcs: applied.npcs,
      flags: applied.flags,
      relationships: applied.relationships,
      guidance: applied.guidance,
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
    context.bonds,
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
