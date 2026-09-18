import type { GameState } from '../../core/state/types';
import {
  deriveActorAge,
  INITIAL_CALENDAR,
  type IndexedCalendar,
} from '../calendar';
import { FamilyError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_FAMILY_CATALOG } from './initial-family';
import type {
  FamilyActionDefinition,
  FamilyActionPlan,
  FamilyEffect,
  FamilyInspection,
  FamilyIntent,
  FamilyKnownActionView,
  FamilyMemberView,
  FamilyNpcDecision,
  FamilyRequirement,
  FamilyStageMark,
  FamilyState,
  HouseholdDefinition,
  HouseholdRole,
  HouseholdState,
  IndexedFamily,
  KinshipTie,
  KinshipTypeDefinition,
} from './types';

export { FamilyError } from './errors';
export { INITIAL_FAMILY_CATALOG } from './initial-family';
export type {
  FamilyActionPlan,
  FamilyCatalog,
  FamilyInspection,
  FamilyKnownActionView,
  FamilyMemberView,
  FamilyState,
  IndexedFamily,
} from './types';

export const PLAYER_FAMILY_ACTOR_ID = 'player';

export function inspectFamilyCatalog(value: unknown): FamilyInspection<IndexedFamily> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.kinshipTypes) ||
    value.kinshipTypes.length === 0 ||
    !Array.isArray(value.households) ||
    !Array.isArray(value.npcDecisions) ||
    !Array.isArray(value.actions)
  ) {
    return fail('O catálogo de família é inválido.');
  }

  const kinshipTypes: KinshipTypeDefinition[] = [];
  const kinshipById = new Map<string, KinshipTypeDefinition>();
  for (const entry of value.kinshipTypes) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      kinshipById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      typeof entry.exclusive !== 'boolean' ||
      typeof entry.symmetric !== 'boolean'
    ) {
      return fail('O tipo de parentesco é inválido.');
    }
    const type = {
      id: entry.id,
      name: entry.name,
      exclusive: entry.exclusive,
      symmetric: entry.symmetric,
    };
    kinshipById.set(type.id, type);
    kinshipTypes.push(type);
  }

  const households: HouseholdDefinition[] = [];
  const householdById = new Map<string, HouseholdDefinition>();
  for (const entry of value.households) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      householdById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonEmpty(entry.locationId) ||
      !nonEmpty(entry.description)
    ) {
      return fail('O lar declarado é inválido.');
    }
    const household = {
      id: entry.id,
      name: entry.name,
      locationId: entry.locationId,
      description: entry.description,
    };
    householdById.set(household.id, household);
    households.push(household);
  }

  const npcDecisions: FamilyNpcDecision[] = [];
  for (const entry of value.npcDecisions) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.npcId) ||
      !isIntent(entry.intent) ||
      !Array.isArray(entry.requirements) ||
      !entry.requirements.every(isRequirement)
    ) {
      return fail('A decisão familiar do NPC é inválida.');
    }
    npcDecisions.push({
      npcId: entry.npcId,
      intent: entry.intent,
      requirements: entry.requirements.map((requirement) => ({ ...requirement })),
    });
  }

  const actions: FamilyActionDefinition[] = [];
  const actionById = new Map<string, FamilyActionDefinition>();
  for (const entry of value.actions) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      actionById.has(entry.id) ||
      !nonEmpty(entry.label) ||
      !nonEmpty(entry.hint) ||
      (entry.npcId !== undefined && !nonEmpty(entry.npcId)) ||
      !isRecord(entry.timeCost) ||
      !nonNegativeSafeInteger(entry.timeCost.periods) ||
      typeof entry.once !== 'boolean' ||
      !Array.isArray(entry.requirements) ||
      !entry.requirements.every(isRequirement) ||
      !Array.isArray(entry.effects) ||
      !nonEmpty(entry.feedback)
    ) {
      return fail('A ação de família é inválida.');
    }
    const effects: FamilyEffect[] = [];
    for (const effect of entry.effects) {
      const inspected = inspectEffect(effect, kinshipById, householdById);
      if (!inspected.ok) {
        return inspected;
      }
      effects.push(inspected.value);
    }
    const action: FamilyActionDefinition = {
      id: entry.id,
      label: entry.label,
      hint: entry.hint,
      ...(entry.npcId ? { npcId: entry.npcId } : {}),
      timeCost: { periods: entry.timeCost.periods as number },
      once: entry.once,
      requirements: entry.requirements.map((requirement) => ({ ...requirement })),
      effects: Object.freeze(effects),
      feedback: entry.feedback,
    };
    actionById.set(action.id, action);
    actions.push(action);
  }

  return {
    ok: true,
    value: Object.freeze({
      kinshipTypes: Object.freeze(kinshipTypes),
      households: Object.freeze(households),
      npcDecisions: Object.freeze(npcDecisions),
      actions: Object.freeze(actions),
      kinshipById: new ImmutableIndex(kinshipById),
      householdById: new ImmutableIndex(householdById),
      actionById: new ImmutableIndex(actionById),
    }),
  };
}

export function indexFamilyCatalog(value: unknown): IndexedFamily {
  const inspected = inspectFamilyCatalog(value);
  if (!inspected.ok) {
    throw new FamilyError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_FAMILY = indexFamilyCatalog(INITIAL_FAMILY_CATALOG);

export function createInitialFamilyState(): FamilyState {
  return { ties: [], households: [], stageMarks: [], consumedActionIds: [] };
}

export function inspectFamilyState(value: unknown): FamilyInspection<FamilyState> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.ties) ||
    !Array.isArray(value.households) ||
    !Array.isArray(value.stageMarks) ||
    !Array.isArray(value.consumedActionIds)
  ) {
    return fail('O estado de família é inválido.');
  }
  const ties: KinshipTie[] = [];
  const seenTies = new Set<string>();
  for (const entry of value.ties) {
    if (!isRecord(entry) || !nonEmpty(entry.fromId) || !nonEmpty(entry.toId) || !nonEmpty(entry.kinshipTypeId) || entry.fromId === entry.toId) {
      return fail('O parentesco persistido é inválido.');
    }
    const key = `${entry.fromId}:${entry.toId}:${entry.kinshipTypeId}`;
    if (seenTies.has(key)) {
      return fail('O parentesco persistido é inválido.');
    }
    seenTies.add(key);
    ties.push({ fromId: entry.fromId, toId: entry.toId, kinshipTypeId: entry.kinshipTypeId });
  }

  const households: HouseholdState[] = [];
  const seenHouseholds = new Set<string>();
  for (const entry of value.households) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || seenHouseholds.has(entry.id) || !Array.isArray(entry.residentIds) || !Array.isArray(entry.responsibleIds)) {
      return fail('O lar persistido é inválido.');
    }
    if (entry.residentIds.some((id) => !nonEmpty(id)) || new Set(entry.residentIds).size !== entry.residentIds.length) {
      return fail('O lar persistido é inválido.');
    }
    if (entry.responsibleIds.some((id) => !nonEmpty(id)) || new Set(entry.responsibleIds).size !== entry.responsibleIds.length) {
      return fail('O lar persistido é inválido.');
    }
    seenHouseholds.add(entry.id);
    households.push({
      id: entry.id,
      residentIds: [...entry.residentIds],
      responsibleIds: [...entry.responsibleIds],
    });
  }

  const stageMarks: FamilyStageMark[] = [];
  const seenMarks = new Set<string>();
  for (const entry of value.stageMarks) {
    if (!isRecord(entry) || !nonEmpty(entry.actorId) || !nonEmpty(entry.stageId)) {
      return fail('O marco familiar é inválido.');
    }
    const key = `${entry.actorId}:${entry.stageId}`;
    if (seenMarks.has(key)) {
      return fail('O marco familiar é inválido.');
    }
    seenMarks.add(key);
    stageMarks.push({ actorId: entry.actorId, stageId: entry.stageId });
  }

  const consumedActionIds: string[] = [];
  const seenActions = new Set<string>();
  for (const entry of value.consumedActionIds) {
    if (!nonEmpty(entry) || seenActions.has(entry)) {
      return fail('O estado de família é inválido.');
    }
    seenActions.add(entry);
    consumedActionIds.push(entry);
  }

  return { ok: true, value: { ties, households, stageMarks, consumedActionIds } };
}

export function copyFamilyState(state: FamilyState): FamilyState {
  return {
    ties: state.ties.map((tie) => ({ ...tie })),
    households: state.households.map((household) => ({
      id: household.id,
      residentIds: [...household.residentIds],
      responsibleIds: [...household.responsibleIds],
    })),
    stageMarks: state.stageMarks.map((mark) => ({ ...mark })),
    consumedActionIds: [...state.consumedActionIds],
  };
}

export function planFamilyAction(
  catalog: IndexedFamily,
  state: FamilyState,
  actionId: string,
  gameState: GameState,
): FamilyActionPlan {
  const action = catalog.actionById.get(actionId);
  if (!action) {
    throw new FamilyError('A ação de família não existe.');
  }
  if (action.once && state.consumedActionIds.includes(action.id)) {
    throw new FamilyError('Esta ação de família já foi usada.');
  }
  if (!action.requirements.every((requirement) => requirementMet(requirement, gameState))) {
    throw new FamilyError('Os requisitos desta ação de família não foram atendidos.');
  }
  if (action.npcId && !npcAllows(catalog, action, gameState)) {
    throw new FamilyError('O NPC não consente esta transição familiar.');
  }
  assertEffectsExecutable(catalog, state, action.effects);
  return {
    actionId: action.id,
    timeCost: { periods: action.timeCost.periods },
    feedback: action.feedback,
    effects: action.effects,
  };
}

export function applyFamilyActionPlan(catalog: IndexedFamily, state: FamilyState, plan: FamilyActionPlan): FamilyState {
  let current = copyFamilyState(state);
  const action = catalog.actionById.get(plan.actionId);
  if (action?.once && !current.consumedActionIds.includes(action.id)) {
    current.consumedActionIds.push(action.id);
  }
  for (const effect of plan.effects) {
    current = applyFamilyEffect(catalog, current, effect);
  }
  return current;
}

export function listKnownFamilyActions(
  catalog: IndexedFamily,
  state: FamilyState,
  gameState: GameState,
  npcId?: string,
): FamilyKnownActionView[] {
  return catalog.actions
    .filter((action) => !npcId || action.npcId === npcId)
    .map((action) => {
      try {
        planFamilyAction(catalog, state, action.id, gameState);
        return { action, available: true };
      } catch (error) {
        return {
          action,
          available: false,
          blockedReason: error instanceof FamilyError ? error.message : 'A ação de família não está disponível.',
        };
      }
    });
}

export function listFamilyViews(
  catalog: IndexedFamily,
  state: FamilyState,
  calendar: IndexedCalendar = INITIAL_CALENDAR,
  worldDay = 1,
  nameOf: (actorId: string) => string = defaultNameOf,
): FamilyMemberView[] {
  const actors = new Set<string>([PLAYER_FAMILY_ACTOR_ID]);
  for (const tie of state.ties) {
    actors.add(tie.fromId);
    actors.add(tie.toId);
  }
  for (const household of state.households) {
    for (const actorId of household.residentIds) {
      actors.add(actorId);
    }
  }
  return [...actors].map((actorId) => {
    const outgoing = state.ties.find((tie) => tie.fromId === PLAYER_FAMILY_ACTOR_ID && tie.toId === actorId);
    const household = state.households.find((entry) => entry.residentIds.includes(actorId));
    const life = calendar.originByActorId.has(actorId) ? deriveActorAge(calendar, actorId, worldDay) : undefined;
    return {
      actorId,
      name: nameOf(actorId),
      ...(outgoing ? { kinshipName: catalog.kinshipById.get(outgoing.kinshipTypeId)?.name } : {}),
      ...(household ? { householdName: catalog.householdById.get(household.id)?.name } : {}),
      ...(life ? { ageYears: life.ageYears, stageName: life.stageName } : {}),
      isPlayer: actorId === PLAYER_FAMILY_ACTOR_ID,
    };
  });
}

export function synchronizeFamilyStages(
  calendar: IndexedCalendar,
  state: FamilyState,
  worldDay: number,
): { current: FamilyState; flags: Record<string, boolean> } {
  const current = copyFamilyState(state);
  const flags: Record<string, boolean> = {};
  const actors = new Set<string>([PLAYER_FAMILY_ACTOR_ID]);
  for (const tie of current.ties) {
    actors.add(tie.fromId);
    actors.add(tie.toId);
  }
  for (const household of current.households) {
    for (const actorId of household.residentIds) {
      actors.add(actorId);
    }
  }
  for (const actorId of actors) {
    if (!calendar.originByActorId.has(actorId)) {
      continue;
    }
    const life = deriveActorAge(calendar, actorId, worldDay);
    const already = current.stageMarks.some((mark) => mark.actorId === actorId && mark.stageId === life.stageId);
    if (already) {
      continue;
    }
    const hadAny = current.stageMarks.some((mark) => mark.actorId === actorId);
    current.stageMarks.push({ actorId, stageId: life.stageId });
    if (hadAny) {
      flags[`family.stage.${actorId}.${life.stageId}`] = true;
    }
  }
  return { current, flags };
}

function inspectEffect(
  value: unknown,
  kinshipById: Map<string, KinshipTypeDefinition>,
  householdById: Map<string, HouseholdDefinition>,
): FamilyInspection<FamilyEffect> {
  if (!isRecord(value) || !nonEmpty(value.type)) {
    return fail('O efeito de família é inválido.');
  }
  if (value.type === 'flag.set') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O efeito de família é inválido.');
    }
    return { ok: true, value: { type: 'flag.set', flag: value.flag, value: value.value } };
  }
  if (value.type === 'kinship.form') {
    if (!nonEmpty(value.fromId) || !nonEmpty(value.toId) || value.fromId === value.toId || !nonEmpty(value.kinshipTypeId) || !kinshipById.has(value.kinshipTypeId)) {
      return fail('O efeito de parentesco é inválido.');
    }
    return {
      ok: true,
      value: { type: 'kinship.form', fromId: value.fromId, toId: value.toId, kinshipTypeId: value.kinshipTypeId },
    };
  }
  if (value.type === 'household.found') {
    if (!nonEmpty(value.householdId) || !householdById.has(value.householdId) || !Array.isArray(value.residentIds) || value.residentIds.length === 0) {
      return fail('O efeito de lar é inválido.');
    }
    if (value.residentIds.some((id) => !nonEmpty(id)) || new Set(value.residentIds).size !== value.residentIds.length) {
      return fail('O efeito de lar é inválido.');
    }
    return {
      ok: true,
      value: { type: 'household.found', householdId: value.householdId, residentIds: Object.freeze([...value.residentIds]) },
    };
  }
  if (value.type === 'household.assign') {
    if (!nonEmpty(value.householdId) || !householdById.has(value.householdId) || !nonEmpty(value.actorId) || !isHouseholdRole(value.role)) {
      return fail('O efeito de lar é inválido.');
    }
    return {
      ok: true,
      value: { type: 'household.assign', householdId: value.householdId, actorId: value.actorId, role: value.role },
    };
  }
  return fail('O efeito de família é inválido.');
}

function assertEffectsExecutable(catalog: IndexedFamily, state: FamilyState, effects: readonly FamilyEffect[]): void {
  let current = copyFamilyState(state);
  for (const effect of effects) {
    current = applyFamilyEffect(catalog, current, effect);
  }
}

function applyFamilyEffect(catalog: IndexedFamily, state: FamilyState, effect: FamilyEffect): FamilyState {
  if (effect.type === 'flag.set') {
    return state;
  }
  const current = copyFamilyState(state);
  if (effect.type === 'kinship.form') {
    const type = catalog.kinshipById.get(effect.kinshipTypeId);
    if (!type) {
      throw new FamilyError('O tipo de parentesco não existe.');
    }
    addTie(current, type, effect.fromId, effect.toId);
    if (type.symmetric) {
      addTie(current, type, effect.toId, effect.fromId);
    }
    assertNoParentCycle(current);
    return current;
  }
  if (effect.type === 'household.found') {
    if (current.households.some((entry) => entry.id === effect.householdId)) {
      throw new FamilyError('Este lar já foi fundado.');
    }
    current.households.push({
      id: effect.householdId,
      residentIds: [...effect.residentIds],
      responsibleIds: [...effect.residentIds],
    });
    return current;
  }
  const household = current.households.find((entry) => entry.id === effect.householdId);
  if (!household) {
    throw new FamilyError('O lar não existe.');
  }
  if (!household.residentIds.includes(effect.actorId)) {
    household.residentIds.push(effect.actorId);
  }
  if (effect.role === 'responsible' && !household.responsibleIds.includes(effect.actorId)) {
    household.responsibleIds.push(effect.actorId);
  }
  return current;
}

function addTie(state: FamilyState, type: KinshipTypeDefinition, fromId: string, toId: string): void {
  if (state.ties.some((tie) => tie.fromId === fromId && tie.toId === toId && tie.kinshipTypeId === type.id)) {
    throw new FamilyError('Este parentesco já existe.');
  }
  if (type.exclusive && state.ties.some((tie) => tie.fromId === fromId && tie.kinshipTypeId === type.id)) {
    throw new FamilyError('Este parentesco exclusivo já está ocupado.');
  }
  state.ties.push({ fromId, toId, kinshipTypeId: type.id });
}

function assertNoParentCycle(state: FamilyState): void {
  const children = new Map<string, string[]>();
  for (const tie of state.ties) {
    if (tie.kinshipTypeId !== 'parent') {
      continue;
    }
    const list = children.get(tie.fromId) ?? [];
    list.push(tie.toId);
    children.set(tie.fromId, list);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (actorId: string): void => {
    if (visiting.has(actorId)) {
      throw new FamilyError('O parentesco forma um ciclo impossível.');
    }
    if (visited.has(actorId)) {
      return;
    }
    visiting.add(actorId);
    for (const child of children.get(actorId) ?? []) {
      visit(child);
    }
    visiting.delete(actorId);
    visited.add(actorId);
  };
  for (const actorId of children.keys()) {
    visit(actorId);
  }
}

function npcAllows(catalog: IndexedFamily, action: FamilyActionDefinition, gameState: GameState): boolean {
  const intent = inferIntent(action);
  const decision = catalog.npcDecisions.find((entry) => entry.npcId === action.npcId && entry.intent === intent);
  if (!decision) {
    return false;
  }
  return decision.requirements.every((requirement) => requirementMet(requirement, gameState));
}

function inferIntent(action: FamilyActionDefinition): FamilyIntent {
  if (action.effects.some((effect) => effect.type === 'kinship.form' && effect.kinshipTypeId === 'partner')) {
    return 'partner';
  }
  if (action.effects.some((effect) => effect.type === 'household.found')) {
    return 'household';
  }
  return 'ward';
}

function requirementMet(requirement: FamilyRequirement, gameState: GameState): boolean {
  return gameState.flags[requirement.flag] === requirement.value;
}

function defaultNameOf(actorId: string): string {
  return actorId === PLAYER_FAMILY_ACTOR_ID ? 'Você' : actorId;
}

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isSafeInteger(value) && value >= 0;
}

function isIntent(value: unknown): value is FamilyIntent {
  return value === 'partner' || value === 'household' || value === 'ward';
}

function isHouseholdRole(value: unknown): value is HouseholdRole {
  return value === 'resident' || value === 'responsible';
}

function isRequirement(value: unknown): value is FamilyRequirement {
  return isRecord(value) && value.type === 'flag.is' && nonEmpty(value.flag) && typeof value.value === 'boolean';
}
