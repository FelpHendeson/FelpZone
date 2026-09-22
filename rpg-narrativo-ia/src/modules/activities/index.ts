import type { GameState } from '../../core/state/types';
import { changeRelationship } from '../relationships';
import { deriveNpcAt, relocateNpc, rememberNpcFact } from '../npcs';
import { unlockGuidanceTopic } from '../guidance';
import type {
  ActivityWorldContext,
  ContextualActivitiesState,
  ContextualActivityApplied,
  ContextualActivityDefinition,
  ContextualActivityEffect,
  ContextualActivityInspection,
  ContextualActivityKnownView,
  ContextualActivityParticipants,
  ContextualActivityPlan,
  ContextualActivityRequirement,
  IndexedActivities,
} from './types';

export class ContextualActivityError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ContextualActivityError';
  }
}

export function inspectContextualActivityCatalog(
  value: unknown,
  world: ActivityWorldContext,
): ContextualActivityInspection<IndexedActivities> {
  if (!isRecord(value) || !Array.isArray(value.activities) || value.activities.length > 256) {
    return fail('O catálogo de atividades é inválido.');
  }

  const activities: ContextualActivityDefinition[] = [];
  const byId = new Map<string, ContextualActivityDefinition>();
  for (const raw of value.activities) {
    const inspected = inspectActivity(raw, world, byId);
    if (!inspected.ok) {
      return inspected;
    }
    byId.set(inspected.value.id, inspected.value);
    activities.push(inspected.value);
  }

  return {
    ok: true,
    value: Object.freeze({
      activities: Object.freeze(activities),
      byId,
    }),
  };
}

export function indexContextualActivityCatalog(
  value: unknown,
  world: ActivityWorldContext,
): IndexedActivities {
  const inspected = inspectContextualActivityCatalog(value, world);
  if (!inspected.ok) {
    throw new ContextualActivityError(inspected.reason);
  }
  return inspected.value;
}

export function createInitialContextualActivitiesState(): ContextualActivitiesState {
  return { consumedActivityIds: [] };
}

export function inspectContextualActivitiesState(
  value: unknown,
  catalog: IndexedActivities,
): ContextualActivityInspection<ContextualActivitiesState> {
  if (!isRecord(value) || !Array.isArray(value.consumedActivityIds)) {
    return fail('O estado de atividades é inválido.');
  }
  const consumedActivityIds: string[] = [];
  const seen = new Set<string>();
  for (const id of value.consumedActivityIds) {
    if (!nonEmpty(id) || seen.has(id) || !catalog.byId.has(id)) {
      return fail('O estado de atividades é inválido.');
    }
    const definition = catalog.byId.get(id);
    if (!definition || definition.repeatable) {
      return fail('Uma atividade repetível não pode ser marcada como consumida.');
    }
    seen.add(id);
    consumedActivityIds.push(id);
  }
  return { ok: true, value: { consumedActivityIds } };
}

export function copyContextualActivitiesState(state: ContextualActivitiesState): ContextualActivitiesState {
  return { consumedActivityIds: [...state.consumedActivityIds] };
}

export function planContextualActivity(
  catalog: IndexedActivities,
  activityState: ContextualActivitiesState,
  gameState: GameState,
  npcs: ActivityWorldContext['npcs'],
  activityId: string,
  optionalParticipantIds: readonly string[],
): ContextualActivityPlan {
  const activity = catalog.byId.get(activityId);
  if (!activity) {
    throw new ContextualActivityError('A atividade não existe.');
  }
  if (!activity.repeatable && activityState.consumedActivityIds.includes(activity.id)) {
    throw new ContextualActivityError('Esta atividade já foi concluída.');
  }
  if (gameState.sandbox.navigation.currentLocationId !== activity.locationId) {
    throw new ContextualActivityError('A atividade não está disponível neste local.');
  }
  if (!activity.requirements.every((requirement) => requirementMet(requirement, gameState, npcs))) {
    throw new ContextualActivityError('Os requisitos desta atividade não foram atendidos.');
  }

  const participants = activity.participants ?? emptyParticipants();
  const optional = validateOptionalParticipants(participants, optionalParticipantIds);
  const participantNpcIds = [...participants.requiredNpcIds, ...optional];
  for (const npcId of participantNpcIds) {
    requireNpcAvailable(npcs, gameState, npcId);
  }

  return {
    activityId: activity.id,
    participantNpcIds,
    timeCost: { periods: activity.timeCost.periods },
    effects: activity.effects.map(copyEffect),
    ...(activity.narrative ? { narrative: { ...activity.narrative } } : {}),
    ...(activity.feedback ? { feedback: activity.feedback } : {}),
  };
}

export function applyContextualActivityPlan(
  catalog: IndexedActivities,
  activityState: ContextualActivitiesState,
  plan: ContextualActivityPlan,
  gameState: GameState,
  world: Pick<ActivityWorldContext, 'npcs' | 'guidance'>,
): ContextualActivityApplied {
  const activity = catalog.byId.get(plan.activityId);
  if (!activity) {
    throw new ContextualActivityError('A atividade não existe.');
  }

  const activities = copyContextualActivitiesState(activityState);
  if (!activity.repeatable && !activities.consumedActivityIds.includes(activity.id)) {
    activities.consumedActivityIds.push(activity.id);
  }

  let npcs = gameState.sandbox.npcs ?? { entries: [] };
  let flags = { ...gameState.flags };
  let relationships = gameState.relationships.map((entry) => ({ ...entry }));
  let guidance = {
    unlockedTopicIds: [...gameState.guidance.unlockedTopicIds],
    seenTopicIds: [...gameState.guidance.seenTopicIds],
  };

  for (const effect of plan.effects) {
    switch (effect.type) {
      case 'flag.set':
        flags = { ...flags, [effect.flag]: effect.value };
        break;
      case 'relationship.change':
        relationships = changeRelationship(relationships, effect.characterId, effect.amount);
        break;
      case 'npc.rememberFact':
        npcs = rememberNpcFact(world.npcs, npcs, effect.npcId, effect.factId);
        break;
      case 'npc.relocate':
        npcs = relocateNpc(world.npcs, npcs, effect.npcId, effect.locationId);
        break;
      case 'guidance.unlock':
        guidance = unlockGuidanceTopic(world.guidance, guidance, effect.topicId);
        break;
    }
  }

  return { activities, npcs, flags, relationships, guidance };
}

export function listKnownContextualActivities(
  catalog: IndexedActivities,
  activityState: ContextualActivitiesState,
  gameState: GameState,
  npcs: ActivityWorldContext['npcs'],
): ContextualActivityKnownView[] {
  return catalog.activities
    .filter((activity) => activity.locationId === gameState.sandbox.navigation.currentLocationId)
    // Do not expose an activity until its explicitly named NPC is known. Once
    // known, other unmet requirements remain visible as ordinary blockers.
    .filter((activity) => activity.requirements.every((requirement) =>
      requirement.type !== 'npc.known' || requirementMet(requirement, gameState, npcs)))
    .map((activity) => {
      const optionalIds = activity.participants?.optionalNpcIds ?? [];
      const eligibleOptionalNpcIds = optionalIds.filter((npcId) => npcAvailable(npcs, gameState, npcId));
      try {
        const minimum = activity.participants?.minOptional ?? 0;
        planContextualActivity(
          catalog,
          activityState,
          gameState,
          npcs,
          activity.id,
          eligibleOptionalNpcIds.slice(0, minimum),
        );
        return { activity, available: true, eligibleOptionalNpcIds };
      } catch (error) {
        return {
          activity,
          available: false,
          blockedReason:
            error instanceof ContextualActivityError
              ? error.message
              : 'A atividade não está disponível.',
          eligibleOptionalNpcIds,
        };
      }
    });
}

function inspectActivity(
  value: unknown,
  world: ActivityWorldContext,
  byId: ReadonlyMap<string, ContextualActivityDefinition>,
): ContextualActivityInspection<ContextualActivityDefinition> {
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    byId.has(value.id) ||
    !nonEmpty(value.label) ||
    !nonEmpty(value.description) ||
    !nonEmpty(value.locationId) ||
    !world.map.locations.has(value.locationId) ||
    !isRecord(value.timeCost) ||
    !nonNegativeInteger(value.timeCost.periods) ||
    typeof value.repeatable !== 'boolean' ||
    !Array.isArray(value.requirements) ||
    !Array.isArray(value.effects)
  ) {
    return fail('A atividade declarada é inválida.');
  }

  const requirements: ContextualActivityRequirement[] = [];
  for (const raw of value.requirements) {
    const inspected = inspectRequirement(raw, world);
    if (!inspected.ok) return inspected;
    requirements.push(inspected.value);
  }

  const effects: ContextualActivityEffect[] = [];
  for (const raw of value.effects) {
    const inspected = inspectEffect(raw, world);
    if (!inspected.ok) return inspected;
    effects.push(inspected.value);
  }

  let participants: ContextualActivityParticipants | undefined;
  if (value.participants !== undefined) {
    const inspected = inspectParticipants(value.participants, world);
    if (!inspected.ok) return inspected;
    participants = inspected.value;
  }

  let narrative: ContextualActivityDefinition['narrative'];
  if (value.narrative !== undefined) {
    const rawNarrative = value.narrative;
    if (
      !isRecord(rawNarrative) ||
      rawNarrative.campaignId !== world.campaign.id ||
      !nonEmpty(rawNarrative.eventId) ||
      !world.campaign.events.some((event) => event.id === rawNarrative.eventId && event.canStartSession === true)
    ) {
      return fail('A narrativa da atividade é inválida.');
    }
    narrative = { campaignId: rawNarrative.campaignId as string, eventId: rawNarrative.eventId };
  }

  if (value.feedback !== undefined && !nonEmpty(value.feedback)) {
    return fail('O feedback da atividade é inválido.');
  }

  return {
    ok: true,
    value: {
      id: value.id,
      label: value.label,
      description: value.description,
      locationId: value.locationId,
      timeCost: { periods: value.timeCost.periods as number },
      repeatable: value.repeatable,
      requirements,
      ...(participants ? { participants } : {}),
      effects,
      ...(narrative ? { narrative } : {}),
      ...(typeof value.feedback === 'string' ? { feedback: value.feedback } : {}),
    },
  };
}

function inspectParticipants(
  value: unknown,
  world: ActivityWorldContext,
): ContextualActivityInspection<ContextualActivityParticipants> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.requiredNpcIds) ||
    !Array.isArray(value.optionalNpcIds) ||
    !nonNegativeInteger(value.minOptional) ||
    !nonNegativeInteger(value.maxOptional) ||
    (value.minOptional as number) > (value.maxOptional as number) ||
    (value.maxOptional as number) > value.optionalNpcIds.length
  ) {
    return fail('Os participantes da atividade são inválidos.');
  }
  const required = readNpcIds(value.requiredNpcIds, world);
  const optional = readNpcIds(value.optionalNpcIds, world);
  if (!required || !optional || required.some((id) => optional.includes(id))) {
    return fail('Os participantes da atividade são inválidos.');
  }
  return {
    ok: true,
    value: {
      requiredNpcIds: required,
      optionalNpcIds: optional,
      minOptional: value.minOptional as number,
      maxOptional: value.maxOptional as number,
    },
  };
}

function inspectRequirement(
  value: unknown,
  world: ActivityWorldContext,
): ContextualActivityInspection<ContextualActivityRequirement> {
  if (!isRecord(value) || !nonEmpty(value.type)) return fail('O requisito da atividade é inválido.');
  switch (value.type) {
    case 'flag.is':
      return nonEmpty(value.flag) && typeof value.value === 'boolean'
        ? { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } }
        : fail('O requisito da atividade é inválido.');
    case 'inventory.has':
      return nonEmpty(value.itemId) && (value.quantity === undefined || positiveInteger(value.quantity))
        ? {
            ok: true,
            value:
              value.quantity === undefined
                ? { type: 'inventory.has', itemId: value.itemId }
                : { type: 'inventory.has', itemId: value.itemId, quantity: value.quantity as number },
          }
        : fail('O requisito da atividade é inválido.');
    case 'relationship.min':
      return nonEmpty(value.characterId) && finite(value.amount)
        ? { ok: true, value: { type: 'relationship.min', characterId: value.characterId, amount: value.amount as number } }
        : fail('O requisito da atividade é inválido.');
    case 'location.is':
      return nonEmpty(value.locationId) && world.map.locations.has(value.locationId)
        ? { ok: true, value: { type: 'location.is', locationId: value.locationId } }
        : fail('O requisito da atividade é inválido.');
    case 'world.day.min':
      return positiveInteger(value.day)
        ? { ok: true, value: { type: 'world.day.min', day: value.day as number } }
        : fail('O requisito da atividade é inválido.');
    case 'npc.known':
    case 'npc.present':
    case 'npc.available':
      return nonEmpty(value.npcId) && world.npcs.npcById.has(value.npcId)
        ? { ok: true, value: { type: value.type, npcId: value.npcId } }
        : fail('O requisito da atividade é inválido.');
    default:
      return fail('O requisito da atividade é inválido.');
  }
}

function inspectEffect(
  value: unknown,
  world: ActivityWorldContext,
): ContextualActivityInspection<ContextualActivityEffect> {
  if (!isRecord(value) || !nonEmpty(value.type)) return fail('O efeito da atividade é inválido.');
  switch (value.type) {
    case 'flag.set':
      return nonEmpty(value.flag) && typeof value.value === 'boolean'
        ? { ok: true, value: { type: 'flag.set', flag: value.flag, value: value.value } }
        : fail('O efeito da atividade é inválido.');
    case 'relationship.change':
      return nonEmpty(value.characterId) && finite(value.amount)
        ? { ok: true, value: { type: 'relationship.change', characterId: value.characterId, amount: value.amount as number } }
        : fail('O efeito da atividade é inválido.');
    case 'npc.rememberFact': {
      if (!nonEmpty(value.npcId) || !nonEmpty(value.factId)) return fail('O efeito da atividade é inválido.');
      const fact = world.npcs.factById.get(value.factId);
      return fact?.npcId === value.npcId
        ? { ok: true, value: { type: 'npc.rememberFact', npcId: value.npcId, factId: value.factId } }
        : fail('O efeito da atividade é inválido.');
    }
    case 'npc.relocate':
      return nonEmpty(value.npcId) && world.npcs.npcById.has(value.npcId) && nonEmpty(value.locationId) && world.map.locations.has(value.locationId)
        ? { ok: true, value: { type: 'npc.relocate', npcId: value.npcId, locationId: value.locationId } }
        : fail('O efeito da atividade é inválido.');
    case 'guidance.unlock':
      return nonEmpty(value.topicId) && world.guidance.byId.has(value.topicId)
        ? { ok: true, value: { type: 'guidance.unlock', topicId: value.topicId } }
        : fail('O efeito da atividade é inválido.');
    default:
      return fail('O efeito da atividade é inválido.');
  }
}

function requirementMet(
  requirement: ContextualActivityRequirement,
  state: GameState,
  npcs: ActivityWorldContext['npcs'],
): boolean {
  switch (requirement.type) {
    case 'flag.is':
      return state.flags[requirement.flag] === requirement.value;
    case 'inventory.has':
      return (state.inventory.find((entry) => entry.itemId === requirement.itemId)?.quantity ?? 0) >= (requirement.quantity ?? 1);
    case 'relationship.min':
      return (state.relationships.find((entry) => entry.characterId === requirement.characterId)?.trust ?? 0) >= requirement.amount;
    case 'location.is':
      return state.sandbox.navigation.currentLocationId === requirement.locationId;
    case 'world.day.min':
      return state.world.day >= requirement.day;
    case 'npc.known':
      return (state.sandbox.npcs?.entries ?? []).some((entry) => entry.npcId === requirement.npcId && entry.known);
    case 'npc.present': {
      const view = npcView(npcs, state, requirement.npcId);
      return view?.locationId === state.sandbox.navigation.currentLocationId && view.presence !== 'departed';
    }
    case 'npc.available':
      return npcAvailable(npcs, state, requirement.npcId);
  }
}

function validateOptionalParticipants(
  participants: ContextualActivityParticipants,
  ids: readonly string[],
): string[] {
  const unique = [...new Set(ids)];
  if (
    unique.length !== ids.length ||
    unique.length < participants.minOptional ||
    unique.length > participants.maxOptional ||
    unique.some((id) => !participants.optionalNpcIds.includes(id))
  ) {
    throw new ContextualActivityError('A seleção de participantes da atividade é inválida.');
  }
  return unique;
}

function requireNpcAvailable(npcs: ActivityWorldContext['npcs'], state: GameState, npcId: string): void {
  if (!npcAvailable(npcs, state, npcId)) {
    throw new ContextualActivityError('Um participante da atividade não está disponível neste local.');
  }
}

function npcAvailable(npcs: ActivityWorldContext['npcs'], state: GameState, npcId: string): boolean {
  const view = npcView(npcs, state, npcId);
  return (
    view?.presence === 'present-available' &&
    view.locationId === state.sandbox.navigation.currentLocationId
  );
}

function npcView(npcs: ActivityWorldContext['npcs'], state: GameState, npcId: string) {
  try {
    return deriveNpcAt(
      npcs,
      state.sandbox.npcs ?? { entries: [] },
      npcId,
      state.world.period,
      (locationId) => state.sandbox.navigation.discoveredLocationIds.includes(locationId),
    );
  } catch {
    return null;
  }
}

function readNpcIds(value: unknown[], world: ActivityWorldContext): string[] | undefined {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!nonEmpty(entry) || seen.has(entry) || !world.npcs.npcById.has(entry)) return undefined;
    seen.add(entry);
    ids.push(entry);
  }
  return ids;
}

function emptyParticipants(): ContextualActivityParticipants {
  return { requiredNpcIds: [], optionalNpcIds: [], minOptional: 0, maxOptional: 0 };
}

function copyEffect(effect: ContextualActivityEffect): ContextualActivityEffect {
  return { ...effect };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function nonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function fail<T>(reason: string): ContextualActivityInspection<T> {
  return { ok: false, reason };
}

export type {
  ContextualActivitiesState,
  ContextualActivityDefinition,
  ContextualActivityEffect,
  ContextualActivityKnownView,
  ContextualActivityPlan,
  ContextualActivityRequirement,
  IndexedActivities,
} from './types';
