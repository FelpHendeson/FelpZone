import { EngineError } from '../../core/engine';
import { inspectGameState, type Attributes, type GameState, type InventoryItem, type NarrativeSession, type ProgressionState, type Relationship } from '../../core/state';
import { CraftingError, type CraftingState } from '../crafting';
import { DayCycleError, type DayCycleResult } from '../day-cycle';
import { ExplorationError, type ExplorationState } from '../exploration';
import { NavigationError, type NavigationState } from '../navigation';
import { ObjectiveError, type IndexedObjectives } from '../objectives';
import { NeedsError, type NeedsConsumptionPlan, type NeedsRestPlan, type NeedsSnapshot } from '../needs';
import { ResourceError, type ResourcesState } from '../resources';
import { createSandboxContext, inspectSandboxContext, SandboxError, type SandboxContext, type SandboxState } from '../sandbox';
import { PresenceError, type PresenceInteractionPlan, type PresenceState } from '../presences';
import { SkillError, type SkillsProgressState } from '../skills';
import { TrainingError } from '../training';
import { CombatError, type CombatResolution, type IndexedCombat } from '../combat';
import { MasteryError, type MasteryResult } from '../mastery';
import { copyItemsState, createInitialItemsState, EQUIPMENT_SLOTS, ItemError, type ItemsState } from '../items';
import { EquipmentError } from '../equipment';
import { PreparationError } from '../preparation';
import { ConditionError, copyPersistentConditions, createInitialLingering, type IndexedConditions, type PersistentConditionState } from '../conditions';
import { GardenError, copyGardenState, createInitialGardenState, type GardenState } from '../garden';
import { BondError, copyBondsState, createInitialBondsState, type BondsState } from '../bonds';
import { RegistryError, copyRegistryState, createInitialRegistryState, type RegistryState } from '../registry';
import { OrganizationError, copyOrganizationsState, createInitialOrganizationsState, type OrganizationsState } from '../organizations';
import { PartyError, copyPartyState, createInitialPartyState, type PartyState } from '../party';
import { copyCalendarState, createInitialCalendarState, type CalendarState } from '../calendar';
import { FamilyError, copyFamilyState, createInitialFamilyState, type FamilyState } from '../family';
import { CivicError, copyCivicState, createInitialCivicState, type CivicState } from '../civic';
import { EconomyError, copyEconomyState, createInitialEconomyState, type EconomyState } from '../economy';
import { SettlementError, copySettlementsState, createInitialSettlementsState, type SettlementsState } from '../settlements';
import { PoliticsError, copyPoliticsState, createInitialPoliticsState, type PoliticsState } from '../politics';
import { ExecutionError, copyExecutionState, createInitialExecutionState, inspectExecutionState, type ExecutionState } from '../execution';
import { InteractableError, copyInteractablesState, createInitialInteractablesState } from '../interactables';
import { NpcError, copyNpcsState, createInitialNpcsState, INITIAL_NPCS, type NPCsState } from '../npcs';
import { ContextualActivityError, copyContextualActivitiesState, createInitialContextualActivitiesState, type ContextualActivitiesState } from '../activities';
import type { GuidanceState } from '../guidance';
import { WorldError } from '../world';
import { SandboxActionError } from './errors';
import type { SandboxAction, SandboxActionResult } from './types';

export function copyMasteryResult(result: MasteryResult): MasteryResult {
  return {
    previous: { level: result.previous.level, entries: result.previous.entries.map((entry) => ({ ...entry })) },
    current: { level: result.current.level, entries: result.current.entries.map((entry) => ({ ...entry })) },
    proficiencyGains: result.proficiencyGains.map((gain) => ({ ...gain })),
    reachedMilestoneIds: [...result.reachedMilestoneIds],
    revealedTrainingIds: [...result.revealedTrainingIds],
    grantedCultivationPoints: result.grantedCultivationPoints,
  };
}

export function requireNpcPresent(context: SandboxContext, state: GameState, npcId: string | undefined): void {
  if (!npcId) {
    return;
  }
  const catalog = context.npcs ?? INITIAL_NPCS;
  const npc = catalog.npcById.get(npcId);
  const npcState = (state.sandbox.npcs ?? createInitialNpcsState()).entries.find((entry) => entry.npcId === npcId);
  const schedule = npc ? catalog.scheduleById.get(npcState?.scheduleOverrideId ?? npc.defaultScheduleId) : undefined;
  const scheduled = schedule?.entries.find((entry) => entry.period === state.world.period)?.locationId;
  const locationId = npcState?.locationOverrideId ?? scheduled ?? schedule?.fallbackLocationId;
  if (!npc || npcState?.status === 'departed' || locationId !== state.sandbox.navigation.currentLocationId) {
    throw new SandboxActionError('O NPC não está disponível neste local agora.');
  }
}

export function activeCatalogs(context: SandboxContext) {
  return {
    skills: context.skills,
    training: context.training,
    mastery: context.mastery,
    combat: context.combat,
    garden: context.garden,
    conditions: context.conditions,
    items: context.items,
  };
}

export function requireActiveCatalog<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new SandboxActionError(`O catálogo de ${label} do pack ativo não está disponível.`);
  }
  return value;
}

export function requireContext(value: SandboxContext | undefined): SandboxContext {
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

export function requireGameState(
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

export function requireAction(value: unknown): SandboxAction {
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

  if (value.type === 'activity.perform') {
    if (
      typeof value.activityId !== 'string' ||
      value.activityId.trim() === '' ||
      !Array.isArray(value.optionalParticipantIds) ||
      value.optionalParticipantIds.some((id) => typeof id !== 'string' || id.trim() === '')
    ) {
      throw new SandboxActionError('A atividade é inválida.');
    }
    return {
      type: 'activity.perform',
      activityId: value.activityId,
      optionalParticipantIds: [...value.optionalParticipantIds] as string[],
    };
  }

  throw new SandboxActionError('A ação do sandbox é desconhecida.');
}

export function inspectResolutionExecution(value: unknown): ExecutionState {
  if (value === undefined) {
    return createInitialExecutionState();
  }
  const inspected = inspectExecutionState(value);
  if (!inspected.ok) {
    throw new SandboxActionError('A resolução de combate é inválida.');
  }
  return inspected.value;
}

export function inspectCompanionOrderLog(value: unknown): { actorId: string; actionId: string }[][] {
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

export function inspectAllyVitals(value: unknown): { actorId: string; health: number }[] {
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

export function copyResolution(resolution: CombatResolution): CombatResolution {
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

export function buildConditionSource(
  base: GameState,
  patch: GameStatePatch,
): GameState {
  return buildGameState(base, { ...patch, updatedAt: base.updatedAt });
}

export interface GameStatePatch {
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
  activities?: ContextualActivitiesState;
  guidance?: GuidanceState;
  npcs?: NPCsState;
  status?: GameState['status'];
  narrativeSession?: NarrativeSession | null;
  updatedAt?: string;
}

export function buildGameState(base: GameState, patch: GameStatePatch & { updatedAt: string }): GameState {
  return {
    schemaVersion: base.schemaVersion,
    status: patch.status ?? base.status,
    character: { firstName: base.character.firstName, lastName: base.character.lastName, sex: base.character.sex },
    narrativeSession: resolveNarrativeSessionPatch(patch.narrativeSession, base.narrativeSession),
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
    guidance: {
      unlockedTopicIds: [...(patch.guidance ?? base.guidance).unlockedTopicIds],
      seenTopicIds: [...(patch.guidance ?? base.guidance).seenTopicIds],
    },
    activities: copyContextualActivitiesState(
      patch.activities ?? base.activities ?? createInitialContextualActivitiesState(),
    ),
    updatedAt: patch.updatedAt,
  };
}

export function copySystem(state: SkillsProgressState): SkillsProgressState {
  return {
    level: state.level,
    entries: state.entries.map((entry) => ({ skillId: entry.skillId, proficiency: entry.proficiency })),
  };
}

export function copyAction(action: SandboxAction): SandboxAction {
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
  if (action.type === 'activity.perform') {
    return {
      type: 'activity.perform',
      activityId: action.activityId,
      optionalParticipantIds: [...action.optionalParticipantIds],
    };
  }

  return { type: 'presence.interact', presenceId: action.presenceId, interactionId: action.interactionId };
}

export function copyDayCycle(result: DayCycleResult): DayCycleResult {
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

export function copyNavigation(state: NavigationState): NavigationState {
  return {
    currentLocationId: state.currentLocationId,
    discoveredLocationIds: [...state.discoveredLocationIds],
    unlockedLocationIds: [...state.unlockedLocationIds],
    visitedLocationIds: [...state.visitedLocationIds],
  };
}

export function copyExploration(state: ExplorationState): ExplorationState {
  return {
    locations: state.locations.map((location) => ({
      locationId: location.locationId,
      progress: location.progress,
      revealedDiscoveryIds: [...location.revealedDiscoveryIds],
      explorationCount: location.explorationCount,
    })),
  };
}

export function copyResources(state: ResourcesState): ResourcesState {
  return {
    nodes: state.nodes.map((node) => ({
      ...node,
      lastCollectedAt: node.lastCollectedAt ? { ...node.lastCollectedAt } : undefined,
      nextRenewalAt: node.nextRenewalAt ? { ...node.nextRenewalAt } : undefined,
    })),
    populations: state.populations.map((population) => ({ ...population })),
  };
}

export function copyCrafting(state: CraftingState): CraftingState {
  return {
    knownRecipeIds: [...state.knownRecipeIds],
    structures: state.structures.map((structure) => ({ ...structure })),
  };
}

export function copyPresenceState(state: PresenceState): PresenceState {
  return {
    discoveredPresenceIds: [...state.discoveredPresenceIds],
    resolvedPresenceIds: [...state.resolvedPresenceIds],
  };
}

export function createInteractionPlanCopy(plan: PresenceInteractionPlan): PresenceInteractionPlan {
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

export function copyConsumptionPlan(plan: NeedsConsumptionPlan): NeedsConsumptionPlan {
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

export function copyRestPlan(plan: NeedsRestPlan): NeedsRestPlan {
  return {
    previous: { ...plan.previous },
    current: { ...plan.current },
    mode: plan.mode,
    effects: plan.effects.map((effect) => ({ ...effect })),
    appliedEffects: plan.appliedEffects.map((effect) => ({ ...effect })),
    timeCost: { periods: plan.timeCost.periods },
  };
}

export function copyNeedsWearSummary(summary: SandboxActionResult['needsWear']): SandboxActionResult['needsWear'] {
  return {
    periodsApplied: summary.periodsApplied,
    changes: { ...summary.changes },
    criticalPeriods: { ...summary.criticalPeriods },
    requestedHealthDamage: summary.requestedHealthDamage,
    appliedHealthDamage: summary.appliedHealthDamage,
  };
}

export function attributesToNeeds(attributes: Attributes): NeedsSnapshot {
  return {
    saude: attributes.saude,
    energia: attributes.energia,
    fome: attributes.fome,
    sede: attributes.sede,
  };
}

export function applyNeedsToAttributes(attributes: Attributes, needs: NeedsSnapshot): Attributes {
  return {
    saude: needs.saude,
    energia: needs.energia,
    fome: needs.fome,
    sede: needs.sede,
    humanidade: attributes.humanidade,
    cautela: attributes.cautela,
  };
}

export function hasActiveCampfire(crafting: CraftingState, locationId: string): boolean {
  return crafting.structures.some(
    (structure) =>
      structure.structureId === 'campfire' && structure.locationId === locationId && structure.active,
  );
}

export function resolveNarrativeSessionPatch(
  patch: NarrativeSession | null | undefined,
  current: NarrativeSession | null,
): NarrativeSession | null {
  return copyNarrativeSession(patch !== undefined ? patch : current);
}

export function copyInventory(items: readonly InventoryItem[]): InventoryItem[] {
  return items.map((item) => ({ itemId: item.itemId, quantity: item.quantity }));
}

export function copyNarrativeSession(session: NarrativeSession | null): NarrativeSession | null {
  if (!session) {
    return null;
  }

  return {
    campaignId: session.campaignId,
    eventId: session.eventId,
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function lingeringWorldDamage(
  state: PersistentConditionState,
  periods: number,
  conditions: IndexedConditions,
): number {
  if (!Number.isSafeInteger(periods) || periods <= 0) {
    return 0;
  }
  let damage = 0;
  for (const entry of state.entries) {
    const definition = conditions.conditionById.get(entry.conditionId);
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

export function distinctCombatSkills(combat: IndexedCombat, actionIds: readonly string[]): string[] {
  const skills: string[] = [];
  const seen = new Set<string>();
  for (const id of actionIds) {
    const skillId = combat.actionById.get(id)?.skillId;
    if (skillId && !seen.has(skillId)) {
      seen.add(skillId);
      skills.push(skillId);
    }
  }
  return skills;
}

export function rethrowDomain(error: unknown): never {
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
    error instanceof ContextualActivityError ||
    error instanceof PartyError ||
    error instanceof ExecutionError ||
    error instanceof EngineError
  ) {
    throw new SandboxActionError(error.message, { cause: error });
  }

  throw error;
}
