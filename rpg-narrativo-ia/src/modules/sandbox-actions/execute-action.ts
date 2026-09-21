import { startNarrativeSession } from '../../core/engine';
import type { Campaign } from '../../core/events';
import { defaultNow, type GameState } from '../../core/state';
import { synchronizeKnownRecipes } from '../crafting';
import { advanceDayCycle } from '../day-cycle';
import { reevaluateDiscoveries } from '../exploration';
import { INITIAL_OBJECTIVES, synchronizeObjectives, type IndexedObjectives } from '../objectives';
import { applyNeedsWear } from '../needs';
import { applyPopulationDayCycle, synchronizeResourceRenewal } from '../resources';
import { type SandboxContext } from '../sandbox';
import { synchronizeDiscoveredPresences } from '../presences';
import { advanceLingering } from '../conditions';
import { grantCultivationPoints } from '../garden';
import { synchronizeRegistry, INITIAL_REGISTRY } from '../registry';
import { INITIAL_CALENDAR, applyCalendarAdvance, createInitialCalendarState } from '../calendar';
import { createInitialFamilyState, synchronizeFamilyStages } from '../family';
import { createInitialCivicState } from '../civic';
import { createInitialEconomyState } from '../economy';
import { INITIAL_SETTLEMENTS, advanceSettlements, copySettlementsState, createInitialSettlementsState } from '../settlements';
import { createInitialPoliticsState } from '../politics';
import { synchronizeDiscoveredInteractables } from '../interactables';
import { timeStateToWorld, worldToTimeState } from '../world';
import { SandboxActionError } from './errors';
import { summarizeSynchronization } from './synchronization';
import type { SandboxAction, SandboxActionOptions, SandboxActionResult } from './types';
import { executePrimary } from './primary-actions';
import { activeCatalogs, applyNeedsToAttributes, attributesToNeeds, buildConditionSource, buildGameState, copyAction, copyDayCycle, copyMasteryResult, copyNeedsWearSummary, copyResources, lingeringWorldDamage, requireAction, requireActiveCatalog, requireContext, requireGameState, rethrowDomain } from './action-helpers';

export { resolveNarrativeSessionPatch } from './action-helpers';

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
  const catalogs = activeCatalogs(context);
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
  if (clockAdvanced && lingering.entries.length > 0) {
    const conditions = requireActiveCatalog(catalogs.conditions, 'condições');
    const lingeringDamage = lingeringWorldDamage(lingering, timeCost.periods, conditions);
    lingering = advanceLingering(conditions, lingering, timeCost.periods);
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
    feedback:
      executed.plan?.feedback ??
      executed.interactablePlan?.feedback ??
      executed.bondPlan?.feedback ??
      executed.organizationPlan?.feedback ??
      executed.familyPlan?.feedback ??
      executed.civicPlan?.feedback ??
      executed.economyPlan?.feedback ??
      executed.settlementPlan?.feedback ??
      executed.politicsPlan?.feedback,
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
