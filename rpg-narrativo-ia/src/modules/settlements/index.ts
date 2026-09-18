import type { GameState } from '../../core/state/types';
import { itemQuantity } from '../inventory';
import { SettlementError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_SETTLEMENTS_CATALOG } from './initial-settlements';
import type {
  IndexedSettlements,
  SettlementActionDefinition,
  SettlementActionPlan,
  SettlementAssignment,
  SettlementClaim,
  SettlementEffect,
  SettlementInspection,
  SettlementIntent,
  SettlementItemQuantity,
  SettlementKnownActionView,
  SettlementNpcDecision,
  SettlementProjectDefinition,
  SettlementProjectProgress,
  SettlementRecipeDefinition,
  SettlementRequirement,
  SettlementRoleDefinition,
  SettlementStorageEntry,
  SettlementStructure,
  SettlementStructureTypeDefinition,
  SettlementTerritoryDefinition,
  SettlementView,
  SettlementsState,
} from './types';

export { SettlementError } from './errors';
export { INITIAL_SETTLEMENTS_CATALOG } from './initial-settlements';
export type {
  IndexedSettlements,
  SettlementActionPlan,
  SettlementCatalog,
  SettlementInspection,
  SettlementKnownActionView,
  SettlementsState,
  SettlementView,
} from './types';

export const PLAYER_SETTLEMENT_ACTOR_ID = 'player';
const INTENTS: readonly SettlementIntent[] = ['assign-role'];

export function inspectSettlementsCatalog(value: unknown): SettlementInspection<IndexedSettlements> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.territories) ||
    value.territories.length === 0 ||
    !Array.isArray(value.structureTypes) ||
    value.structureTypes.length === 0 ||
    !Array.isArray(value.projects) ||
    !Array.isArray(value.roles) ||
    !Array.isArray(value.recipes) ||
    !Array.isArray(value.npcDecisions) ||
    !Array.isArray(value.actions)
  ) {
    return fail('O catálogo de assentamentos é inválido.');
  }

  const territories: SettlementTerritoryDefinition[] = [];
  const territoryById = new Map<string, SettlementTerritoryDefinition>();
  for (const entry of value.territories) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      territoryById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonEmpty(entry.locationId) ||
      !nonEmpty(entry.requiredPropertyId) ||
      !nonEmpty(entry.description)
    ) {
      return fail('O território declarado é inválido.');
    }
    const territory = {
      id: entry.id,
      name: entry.name,
      locationId: entry.locationId,
      requiredPropertyId: entry.requiredPropertyId,
      description: entry.description,
    };
    territoryById.set(territory.id, territory);
    territories.push(territory);
  }

  const structureTypes: SettlementStructureTypeDefinition[] = [];
  const structureTypeById = new Map<string, SettlementStructureTypeDefinition>();
  for (const entry of value.structureTypes) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      structureTypeById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonNegativeInt(entry.storageCapacity) ||
      !nonEmpty(entry.description)
    ) {
      return fail('O tipo de estrutura declarado é inválido.');
    }
    const structureType = {
      id: entry.id,
      name: entry.name,
      storageCapacity: entry.storageCapacity,
      description: entry.description,
    };
    structureTypeById.set(structureType.id, structureType);
    structureTypes.push(structureType);
  }

  const projects: SettlementProjectDefinition[] = [];
  const projectById = new Map<string, SettlementProjectDefinition>();
  for (const entry of value.projects) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      projectById.has(entry.id) ||
      !nonEmpty(entry.label) ||
      !nonEmpty(entry.territoryId) ||
      !territoryById.has(entry.territoryId) ||
      !nonEmpty(entry.structureTypeId) ||
      !structureTypeById.has(entry.structureTypeId) ||
      !positiveInt(entry.durationPeriods) ||
      !Array.isArray(entry.costs) ||
      entry.costs.length === 0
    ) {
      return fail('O projeto declarado é inválido.');
    }
    const costs: SettlementItemQuantity[] = [];
    for (const cost of entry.costs) {
      const inspected = inspectItemQuantity(cost);
      if (!inspected.ok) {
        return inspected;
      }
      costs.push(inspected.value);
    }
    const project = {
      id: entry.id,
      label: entry.label,
      territoryId: entry.territoryId,
      structureTypeId: entry.structureTypeId,
      durationPeriods: entry.durationPeriods,
      costs: Object.freeze(costs),
    };
    projectById.set(project.id, project);
    projects.push(project);
  }

  const roles: SettlementRoleDefinition[] = [];
  const roleById = new Map<string, SettlementRoleDefinition>();
  for (const entry of value.roles) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      roleById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      typeof entry.exclusive !== 'boolean'
    ) {
      return fail('A função declarada é inválida.');
    }
    const role = { id: entry.id, name: entry.name, exclusive: entry.exclusive };
    roleById.set(role.id, role);
    roles.push(role);
  }

  const recipes: SettlementRecipeDefinition[] = [];
  const recipeById = new Map<string, SettlementRecipeDefinition>();
  for (const entry of value.recipes) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      recipeById.has(entry.id) ||
      !nonEmpty(entry.structureTypeId) ||
      !structureTypeById.has(entry.structureTypeId) ||
      !nonEmpty(entry.roleId) ||
      !roleById.has(entry.roleId) ||
      !positiveInt(entry.intervalPeriods) ||
      !Array.isArray(entry.inputs) ||
      !Array.isArray(entry.outputs) ||
      entry.outputs.length === 0
    ) {
      return fail('A receita produtiva é inválida.');
    }
    const inputs: SettlementItemQuantity[] = [];
    for (const input of entry.inputs) {
      const inspected = inspectItemQuantity(input);
      if (!inspected.ok) {
        return inspected;
      }
      inputs.push(inspected.value);
    }
    const outputs: SettlementItemQuantity[] = [];
    for (const output of entry.outputs) {
      const inspected = inspectItemQuantity(output);
      if (!inspected.ok) {
        return inspected;
      }
      outputs.push(inspected.value);
    }
    const recipe = {
      id: entry.id,
      structureTypeId: entry.structureTypeId,
      roleId: entry.roleId,
      intervalPeriods: entry.intervalPeriods,
      inputs: Object.freeze(inputs),
      outputs: Object.freeze(outputs),
    };
    recipeById.set(recipe.id, recipe);
    recipes.push(recipe);
  }

  const npcDecisions: SettlementNpcDecision[] = [];
  for (const entry of value.npcDecisions) {
    const inspected = inspectNpcDecision(entry);
    if (!inspected.ok) {
      return inspected;
    }
    npcDecisions.push(inspected.value);
  }

  const actions: SettlementActionDefinition[] = [];
  const actionById = new Map<string, SettlementActionDefinition>();
  for (const entry of value.actions) {
    const inspected = inspectAction(entry, actionById, territoryById, projectById, roleById, npcDecisions);
    if (!inspected.ok) {
      return inspected;
    }
    actionById.set(inspected.value.id, inspected.value);
    actions.push(inspected.value);
  }

  return {
    ok: true,
    value: Object.freeze({
      territories: Object.freeze(territories),
      structureTypes: Object.freeze(structureTypes),
      projects: Object.freeze(projects),
      roles: Object.freeze(roles),
      recipes: Object.freeze(recipes),
      npcDecisions: Object.freeze(npcDecisions),
      actions: Object.freeze(actions),
      territoryById: new ImmutableIndex(territories.map((entry) => [entry.id, entry] as const)),
      structureTypeById: new ImmutableIndex(structureTypes.map((entry) => [entry.id, entry] as const)),
      projectById: new ImmutableIndex(projects.map((entry) => [entry.id, entry] as const)),
      roleById: new ImmutableIndex(roles.map((entry) => [entry.id, entry] as const)),
      recipeById: new ImmutableIndex(recipes.map((entry) => [entry.id, entry] as const)),
      actionById: new ImmutableIndex(actions.map((entry) => [entry.id, entry] as const)),
    }),
  };
}

export function indexSettlementsCatalog(value: unknown = INITIAL_SETTLEMENTS_CATALOG): IndexedSettlements {
  const inspected = inspectSettlementsCatalog(value);
  if (!inspected.ok) {
    throw new SettlementError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_SETTLEMENTS = indexSettlementsCatalog();

export function createInitialSettlementsState(): SettlementsState {
  return {
    claims: [],
    structures: [],
    projects: [],
    storage: [],
    assignments: [],
    consumedActionIds: [],
  };
}

export function inspectSettlementsState(
  value: unknown,
  catalog: IndexedSettlements = INITIAL_SETTLEMENTS,
): SettlementInspection<SettlementsState> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.claims) ||
    !Array.isArray(value.structures) ||
    !Array.isArray(value.projects) ||
    !Array.isArray(value.storage) ||
    !Array.isArray(value.assignments) ||
    !Array.isArray(value.consumedActionIds)
  ) {
    return fail('O estado de assentamentos é inválido.');
  }
  const claims: SettlementClaim[] = [];
  const seenClaims = new Set<string>();
  for (const entry of value.claims) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.territoryId) ||
      !catalog.territoryById.has(entry.territoryId) ||
      seenClaims.has(entry.territoryId) ||
      !nonEmpty(entry.claimantId)
    ) {
      return fail('A reivindicação persistida é inválida.');
    }
    seenClaims.add(entry.territoryId);
    claims.push({ territoryId: entry.territoryId, claimantId: entry.claimantId });
  }
  const structures: SettlementStructure[] = [];
  const seenStructures = new Set<string>();
  for (const entry of value.structures) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.territoryId) ||
      !catalog.territoryById.has(entry.territoryId) ||
      !nonEmpty(entry.structureTypeId) ||
      !catalog.structureTypeById.has(entry.structureTypeId)
    ) {
      return fail('A estrutura persistida é inválida.');
    }
    const key = `${entry.territoryId}:${entry.structureTypeId}`;
    if (seenStructures.has(key)) {
      return fail('A estrutura persistida é inválida.');
    }
    seenStructures.add(key);
    structures.push({ territoryId: entry.territoryId, structureTypeId: entry.structureTypeId });
  }
  const projects: SettlementProjectProgress[] = [];
  const seenProjects = new Set<string>();
  for (const entry of value.projects) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.projectId) ||
      seenProjects.has(entry.projectId) ||
      !nonNegativeInt(entry.remainingPeriods) ||
      !Array.isArray(entry.supplied)
    ) {
      return fail('O projeto persistido é inválido.');
    }
    const definition = catalog.projectById.get(entry.projectId);
    if (!definition || entry.remainingPeriods > definition.durationPeriods) {
      return fail('O projeto persistido é inválido.');
    }
    const supplied: SettlementItemQuantity[] = [];
    for (const cost of entry.supplied) {
      const inspected = inspectItemQuantity(cost);
      if (!inspected.ok) {
        return fail('O projeto persistido é inválido.');
      }
      supplied.push(inspected.value);
    }
    seenProjects.add(entry.projectId);
    projects.push({ projectId: entry.projectId, remainingPeriods: entry.remainingPeriods, supplied });
  }
  const storage: SettlementStorageEntry[] = [];
  const seenStorage = new Set<string>();
  for (const entry of value.storage) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.territoryId) ||
      !catalog.territoryById.has(entry.territoryId) ||
      !nonEmpty(entry.itemId) ||
      !nonNegativeInt(entry.quantity)
    ) {
      return fail('O estoque da base é inválido.');
    }
    const key = `${entry.territoryId}:${entry.itemId}`;
    if (seenStorage.has(key)) {
      return fail('O estoque da base é inválido.');
    }
    seenStorage.add(key);
    storage.push({ territoryId: entry.territoryId, itemId: entry.itemId, quantity: entry.quantity });
  }
  const assignments: SettlementAssignment[] = [];
  const seenAssignments = new Set<string>();
  for (const entry of value.assignments) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.territoryId) ||
      !catalog.territoryById.has(entry.territoryId) ||
      !nonEmpty(entry.npcId) ||
      !nonEmpty(entry.roleId) ||
      !catalog.roleById.has(entry.roleId)
    ) {
      return fail('A atribuição persistida é inválida.');
    }
    const key = `${entry.territoryId}:${entry.npcId}:${entry.roleId}`;
    if (seenAssignments.has(key)) {
      return fail('A atribuição persistida é inválida.');
    }
    seenAssignments.add(key);
    assignments.push({ territoryId: entry.territoryId, npcId: entry.npcId, roleId: entry.roleId });
  }
  const consumedActionIds: string[] = [];
  const seenActions = new Set<string>();
  for (const entry of value.consumedActionIds) {
    if (!nonEmpty(entry) || seenActions.has(entry)) {
      return fail('O estado de assentamentos é inválido.');
    }
    seenActions.add(entry);
    consumedActionIds.push(entry);
  }
  return { ok: true, value: { claims, structures, projects, storage, assignments, consumedActionIds } };
}

export function copySettlementsState(state: SettlementsState): SettlementsState {
  return {
    claims: state.claims.map((entry) => ({ ...entry })),
    structures: state.structures.map((entry) => ({ ...entry })),
    projects: state.projects.map((entry) => ({
      ...entry,
      supplied: entry.supplied.map((cost) => ({ ...cost })),
    })),
    storage: state.storage.map((entry) => ({ ...entry })),
    assignments: state.assignments.map((entry) => ({ ...entry })),
    consumedActionIds: [...state.consumedActionIds],
  };
}

export function planSettlementAction(
  catalog: IndexedSettlements,
  state: SettlementsState,
  actionId: string,
  gameState: GameState,
): SettlementActionPlan {
  const action = catalog.actionById.get(actionId);
  if (!action) {
    throw new SettlementError('A ação de assentamento não existe.');
  }
  if (action.once && state.consumedActionIds.includes(action.id)) {
    throw new SettlementError('Esta ação de assentamento já foi usada.');
  }
  if (!action.requirements.every((requirement) => requirementMet(requirement, catalog, state, gameState))) {
    throw new SettlementError('Os requisitos desta ação de assentamento não foram atendidos.');
  }
  if (action.npcId && !npcAllows(catalog, action, state, gameState)) {
    throw new SettlementError('O habitante não consente esta atribuição.');
  }
  assertEffectsExecutable(catalog, state, action.effects, gameState);
  return {
    actionId: action.id,
    timeCost: { periods: action.timeCost.periods },
    feedback: action.feedback,
    effects: action.effects,
  };
}

export function applySettlementActionPlan(
  catalog: IndexedSettlements,
  state: SettlementsState,
  plan: SettlementActionPlan,
): SettlementsState {
  let current = copySettlementsState(state);
  const action = catalog.actionById.get(plan.actionId);
  if (action?.once && !current.consumedActionIds.includes(action.id)) {
    current.consumedActionIds.push(action.id);
  }
  for (const effect of plan.effects) {
    current = applySettlementEffect(catalog, current, effect);
  }
  return current;
}

export function advanceSettlements(
  catalog: IndexedSettlements,
  state: SettlementsState,
  periods: number,
): SettlementsState {
  if (!Number.isSafeInteger(periods) || periods <= 0) {
    return copySettlementsState(state);
  }
  let current = copySettlementsState(state);
  for (let step = 0; step < periods; step += 1) {
    current = tickConstruction(catalog, current);
    current = runProduction(catalog, current);
  }
  return current;
}

export function listKnownSettlementActions(
  catalog: IndexedSettlements,
  state: SettlementsState,
  gameState: GameState,
  npcId?: string,
): SettlementKnownActionView[] {
  return catalog.actions
    .filter((action) => !npcId || action.npcId === npcId)
    .map((action) => {
      try {
        planSettlementAction(catalog, state, action.id, gameState);
        return { action, available: true };
      } catch (error) {
        return {
          action,
          available: false,
          blockedReason: error instanceof SettlementError ? error.message : 'A ação de assentamento não está disponível.',
        };
      }
    });
}

export function listSettlementViews(catalog: IndexedSettlements, state: SettlementsState): SettlementView {
  return {
    claims: state.claims.map((claim) => ({
      territoryId: claim.territoryId,
      name: catalog.territoryById.get(claim.territoryId)?.name ?? claim.territoryId,
    })),
    structures: state.structures.map((structure) => ({
      structureTypeId: structure.structureTypeId,
      name: catalog.structureTypeById.get(structure.structureTypeId)?.name ?? structure.structureTypeId,
      territoryName: catalog.territoryById.get(structure.territoryId)?.name ?? structure.territoryId,
    })),
    projects: state.projects.map((project) => {
      const definition = catalog.projectById.get(project.projectId);
      return {
        projectId: project.projectId,
        label: definition?.label ?? project.projectId,
        remainingPeriods: project.remainingPeriods,
        supplied: project.supplied.map((entry) => ({ ...entry })),
      };
    }),
    storage: state.storage.map((entry) => ({
      territoryId: entry.territoryId,
      itemId: entry.itemId,
      quantity: entry.quantity,
      capacity: storageCapacity(catalog, state, entry.territoryId),
    })),
    assignments: state.assignments.map((assignment) => ({
      npcId: assignment.npcId,
      roleName: catalog.roleById.get(assignment.roleId)?.name ?? assignment.roleId,
      territoryName: catalog.territoryById.get(assignment.territoryId)?.name ?? assignment.territoryId,
    })),
  };
}

function inspectNpcDecision(value: unknown): SettlementInspection<SettlementNpcDecision> {
  if (!isRecord(value) || !nonEmpty(value.npcId) || !isIntent(value.intent) || !Array.isArray(value.requirements)) {
    return fail('A decisão de assentamento do NPC é inválida.');
  }
  const requirements: SettlementRequirement[] = [];
  for (const entry of value.requirements) {
    const inspected = inspectRequirement(entry);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  return { ok: true, value: { npcId: value.npcId, intent: value.intent, requirements: Object.freeze(requirements) } };
}

function inspectAction(
  value: unknown,
  seen: Map<string, SettlementActionDefinition>,
  territoryById: Map<string, SettlementTerritoryDefinition>,
  projectById: Map<string, SettlementProjectDefinition>,
  roleById: Map<string, SettlementRoleDefinition>,
  npcDecisions: readonly SettlementNpcDecision[],
): SettlementInspection<SettlementActionDefinition> {
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    seen.has(value.id) ||
    !nonEmpty(value.label) ||
    !nonEmpty(value.hint) ||
    !isRecord(value.timeCost) ||
    typeof value.timeCost.periods !== 'number' ||
    !Number.isSafeInteger(value.timeCost.periods) ||
    value.timeCost.periods < 0 ||
    typeof value.once !== 'boolean' ||
    !Array.isArray(value.requirements) ||
    !Array.isArray(value.effects) ||
    value.effects.length === 0 ||
    !nonEmpty(value.feedback)
  ) {
    return fail('A ação de assentamento é inválida.');
  }
  if (value.npcId !== undefined && !nonEmpty(value.npcId)) {
    return fail('A ação de assentamento é inválida.');
  }
  const requirements: SettlementRequirement[] = [];
  for (const entry of value.requirements) {
    const inspected = inspectRequirement(entry);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  const effects: SettlementEffect[] = [];
  for (const entry of value.effects) {
    const inspected = inspectEffect(entry, territoryById, projectById, roleById);
    if (!inspected.ok) {
      return inspected;
    }
    effects.push(inspected.value);
  }
  if (value.npcId) {
    const intent = inferIntent(effects);
    if (!intent || !npcDecisions.some((decision) => decision.npcId === value.npcId && decision.intent === intent)) {
      return fail('A ação de assentamento referencia uma decisão de NPC inexistente.');
    }
  }
  return {
    ok: true,
    value: {
      id: value.id,
      label: value.label,
      hint: value.hint,
      ...(value.npcId ? { npcId: value.npcId } : {}),
      timeCost: { periods: value.timeCost.periods },
      once: value.once,
      requirements: Object.freeze(requirements),
      effects: Object.freeze(effects),
      feedback: value.feedback,
    },
  };
}

function inspectRequirement(value: unknown): SettlementInspection<SettlementRequirement> {
  if (!isRecord(value) || !nonEmpty(value.type)) {
    return fail('O requisito de assentamento é inválido.');
  }
  if (value.type === 'flag.is') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O requisito de assentamento é inválido.');
    }
    return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
  }
  if (value.type === 'location.is') {
    if (!nonEmpty(value.locationId)) {
      return fail('O requisito de assentamento é inválido.');
    }
    return { ok: true, value: { type: 'location.is', locationId: value.locationId } };
  }
  if (value.type === 'settlement.owns-property') {
    if (!nonEmpty(value.propertyId)) {
      return fail('O requisito de assentamento é inválido.');
    }
    return { ok: true, value: { type: 'settlement.owns-property', propertyId: value.propertyId } };
  }
  if (value.type === 'settlement.has-authority') {
    if (!nonEmpty(value.territoryId)) {
      return fail('O requisito de assentamento é inválido.');
    }
    return { ok: true, value: { type: 'settlement.has-authority', territoryId: value.territoryId } };
  }
  if (value.type === 'settlement.has-item') {
    if (!nonEmpty(value.itemId) || !positiveInt(value.quantity)) {
      return fail('O requisito de assentamento é inválido.');
    }
    return { ok: true, value: { type: 'settlement.has-item', itemId: value.itemId, quantity: value.quantity } };
  }
  if (value.type === 'settlement.project-active') {
    if (!nonEmpty(value.projectId)) {
      return fail('O requisito de assentamento é inválido.');
    }
    return { ok: true, value: { type: 'settlement.project-active', projectId: value.projectId } };
  }
  if (value.type === 'settlement.structure-complete') {
    if (!nonEmpty(value.territoryId) || !nonEmpty(value.structureTypeId)) {
      return fail('O requisito de assentamento é inválido.');
    }
    return {
      ok: true,
      value: { type: 'settlement.structure-complete', territoryId: value.territoryId, structureTypeId: value.structureTypeId },
    };
  }
  if (value.type === 'settlement.storage-has') {
    if (!nonEmpty(value.territoryId) || !nonEmpty(value.itemId) || !positiveInt(value.quantity)) {
      return fail('O requisito de assentamento é inválido.');
    }
    return {
      ok: true,
      value: {
        type: 'settlement.storage-has',
        territoryId: value.territoryId,
        itemId: value.itemId,
        quantity: value.quantity,
      },
    };
  }
  return fail('O requisito de assentamento é inválido.');
}

function inspectEffect(
  value: unknown,
  territoryById: Map<string, SettlementTerritoryDefinition>,
  projectById: Map<string, SettlementProjectDefinition>,
  roleById: Map<string, SettlementRoleDefinition>,
): SettlementInspection<SettlementEffect> {
  if (!isRecord(value) || !nonEmpty(value.type)) {
    return fail('O efeito de assentamento é inválido.');
  }
  if (value.type === 'flag.set') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O efeito de assentamento é inválido.');
    }
    return { ok: true, value: { type: 'flag.set', flag: value.flag, value: value.value } };
  }
  if (value.type === 'settlement.claim') {
    if (!nonEmpty(value.territoryId) || !territoryById.has(value.territoryId) || !nonEmpty(value.claimantId)) {
      return fail('O efeito de reivindicação é inválido.');
    }
    return { ok: true, value: { type: 'settlement.claim', territoryId: value.territoryId, claimantId: value.claimantId } };
  }
  if (value.type === 'settlement.start-project') {
    if (!nonEmpty(value.projectId) || !projectById.has(value.projectId)) {
      return fail('O efeito de projeto é inválido.');
    }
    return { ok: true, value: { type: 'settlement.start-project', projectId: value.projectId } };
  }
  if (value.type === 'settlement.supply-project') {
    if (!nonEmpty(value.projectId) || !projectById.has(value.projectId) || !nonEmpty(value.itemId) || !positiveInt(value.quantity)) {
      return fail('O efeito de entrega é inválido.');
    }
    return {
      ok: true,
      value: { type: 'settlement.supply-project', projectId: value.projectId, itemId: value.itemId, quantity: value.quantity },
    };
  }
  if (value.type === 'settlement.cancel-project') {
    if (!nonEmpty(value.projectId) || !projectById.has(value.projectId)) {
      return fail('O efeito de cancelamento é inválido.');
    }
    return { ok: true, value: { type: 'settlement.cancel-project', projectId: value.projectId } };
  }
  if (value.type === 'settlement.assign-role') {
    if (
      !nonEmpty(value.territoryId) ||
      !territoryById.has(value.territoryId) ||
      !nonEmpty(value.npcId) ||
      !nonEmpty(value.roleId) ||
      !roleById.has(value.roleId)
    ) {
      return fail('O efeito de atribuição é inválido.');
    }
    return {
      ok: true,
      value: { type: 'settlement.assign-role', territoryId: value.territoryId, npcId: value.npcId, roleId: value.roleId },
    };
  }
  if (value.type === 'settlement.withdraw-item') {
    if (!nonEmpty(value.territoryId) || !territoryById.has(value.territoryId) || !nonEmpty(value.itemId) || !positiveInt(value.quantity)) {
      return fail('O efeito de retirada é inválido.');
    }
    return {
      ok: true,
      value: {
        type: 'settlement.withdraw-item',
        territoryId: value.territoryId,
        itemId: value.itemId,
        quantity: value.quantity,
      },
    };
  }
  return fail('O efeito de assentamento é inválido.');
}

function inspectItemQuantity(value: unknown): SettlementInspection<SettlementItemQuantity> {
  if (!isRecord(value) || !nonEmpty(value.itemId) || !positiveInt(value.quantity)) {
    return fail('A quantidade declarada é inválida.');
  }
  return { ok: true, value: { itemId: value.itemId, quantity: value.quantity } };
}

function assertEffectsExecutable(
  catalog: IndexedSettlements,
  state: SettlementsState,
  effects: readonly SettlementEffect[],
  gameState: GameState,
): void {
  let current = copySettlementsState(state);
  const inventoryQty = new Map<string, number>();
  for (const item of gameState.inventory) {
    inventoryQty.set(item.itemId, item.quantity);
  }
  for (const effect of effects) {
    if (effect.type === 'settlement.claim' && current.claims.some((entry) => entry.territoryId === effect.territoryId)) {
      throw new SettlementError('Este território já foi reivindicado.');
    }
    if (effect.type === 'settlement.start-project') {
      const definition = catalog.projectById.get(effect.projectId);
      if (!definition) {
        throw new SettlementError('O projeto não existe.');
      }
      if (!hasAuthority(current, definition.territoryId, PLAYER_SETTLEMENT_ACTOR_ID)) {
        throw new SettlementError('Falta autoridade para administrar este território.');
      }
      if (current.projects.some((entry) => entry.projectId === effect.projectId)) {
        throw new SettlementError('Este projeto já está em andamento.');
      }
      if (
        current.structures.some(
          (entry) => entry.territoryId === definition.territoryId && entry.structureTypeId === definition.structureTypeId,
        )
      ) {
        throw new SettlementError('Esta estrutura já existe neste território.');
      }
    }
    if (effect.type === 'settlement.supply-project') {
      const progress = current.projects.find((entry) => entry.projectId === effect.projectId);
      const definition = catalog.projectById.get(effect.projectId);
      if (!progress || !definition) {
        throw new SettlementError('Não há projeto ativo para receber material.');
      }
      if (!hasAuthority(current, definition.territoryId, PLAYER_SETTLEMENT_ACTOR_ID)) {
        throw new SettlementError('Falta autoridade para administrar este território.');
      }
      const remaining = remainingCost(definition, progress, effect.itemId);
      if (remaining < effect.quantity) {
        throw new SettlementError('Este projeto não precisa desse material agora.');
      }
      const available = inventoryQty.get(effect.itemId) ?? 0;
      if (available < effect.quantity) {
        throw new SettlementError('O inventário não possui o material da construção.');
      }
      inventoryQty.set(effect.itemId, available - effect.quantity);
    }
    if (effect.type === 'settlement.cancel-project') {
      const definition = catalog.projectById.get(effect.projectId);
      if (!current.projects.some((entry) => entry.projectId === effect.projectId) || !definition) {
        throw new SettlementError('Não há projeto ativo para cancelar.');
      }
      if (!hasAuthority(current, definition.territoryId, PLAYER_SETTLEMENT_ACTOR_ID)) {
        throw new SettlementError('Falta autoridade para administrar este território.');
      }
    }
    if (effect.type === 'settlement.assign-role') {
      if (!hasAuthority(current, effect.territoryId, PLAYER_SETTLEMENT_ACTOR_ID)) {
        throw new SettlementError('Falta autoridade para administrar este território.');
      }
      const role = catalog.roleById.get(effect.roleId);
      if (!role) {
        throw new SettlementError('A função não existe.');
      }
      if (current.assignments.some((entry) => entry.npcId === effect.npcId && role.exclusive)) {
        throw new SettlementError('Este habitante já ocupa uma função exclusiva.');
      }
      if (current.assignments.some((entry) => entry.territoryId === effect.territoryId && entry.roleId === effect.roleId && role.exclusive)) {
        throw new SettlementError('Esta função exclusiva já está ocupada.');
      }
    }
    if (effect.type === 'settlement.withdraw-item') {
      if (!hasAuthority(current, effect.territoryId, PLAYER_SETTLEMENT_ACTOR_ID)) {
        throw new SettlementError('Falta autoridade para administrar este território.');
      }
      if (storageQuantity(current, effect.territoryId, effect.itemId) < effect.quantity) {
        throw new SettlementError('O estoque da base não possui esse item.');
      }
    }
    current = applySettlementEffect(catalog, current, effect);
  }
}

function applySettlementEffect(
  catalog: IndexedSettlements,
  state: SettlementsState,
  effect: SettlementEffect,
): SettlementsState {
  if (effect.type === 'flag.set') {
    return state;
  }
  const current = copySettlementsState(state);
  if (effect.type === 'settlement.claim') {
    current.claims.push({ territoryId: effect.territoryId, claimantId: effect.claimantId });
    return current;
  }
  if (effect.type === 'settlement.start-project') {
    const definition = catalog.projectById.get(effect.projectId);
    if (!definition) {
      throw new SettlementError('O projeto não existe.');
    }
    current.projects.push({
      projectId: definition.id,
      remainingPeriods: definition.durationPeriods,
      supplied: [],
    });
    return current;
  }
  if (effect.type === 'settlement.supply-project') {
    const progress = current.projects.find((entry) => entry.projectId === effect.projectId);
    if (!progress) {
      throw new SettlementError('Não há projeto ativo para receber material.');
    }
    const existing = progress.supplied.find((entry) => entry.itemId === effect.itemId);
    if (existing) {
      existing.quantity += effect.quantity;
    } else {
      progress.supplied.push({ itemId: effect.itemId, quantity: effect.quantity });
    }
    return current;
  }
  if (effect.type === 'settlement.cancel-project') {
    current.projects = current.projects.filter((entry) => entry.projectId !== effect.projectId);
    return current;
  }
  if (effect.type === 'settlement.assign-role') {
    current.assignments.push({ territoryId: effect.territoryId, npcId: effect.npcId, roleId: effect.roleId });
    return current;
  }
  const stored = current.storage.find((entry) => entry.territoryId === effect.territoryId && entry.itemId === effect.itemId);
  if (!stored || stored.quantity < effect.quantity) {
    throw new SettlementError('O estoque da base não possui esse item.');
  }
  stored.quantity -= effect.quantity;
  if (stored.quantity === 0) {
    current.storage = current.storage.filter((entry) => entry !== stored);
  }
  return current;
}

function tickConstruction(catalog: IndexedSettlements, state: SettlementsState): SettlementsState {
  const current = copySettlementsState(state);
  const remaining: SettlementProjectProgress[] = [];
  for (const project of current.projects) {
    const definition = catalog.projectById.get(project.projectId);
    if (!definition || !isFullySupplied(definition, project)) {
      remaining.push(project);
      continue;
    }
    const nextRemaining = Math.max(0, project.remainingPeriods - 1);
    if (nextRemaining === 0) {
      if (
        !current.structures.some(
          (entry) => entry.territoryId === definition.territoryId && entry.structureTypeId === definition.structureTypeId,
        )
      ) {
        current.structures.push({ territoryId: definition.territoryId, structureTypeId: definition.structureTypeId });
      }
      continue;
    }
    remaining.push({ ...project, remainingPeriods: nextRemaining });
  }
  current.projects = remaining;
  return current;
}

function runProduction(catalog: IndexedSettlements, state: SettlementsState): SettlementsState {
  let current = copySettlementsState(state);
  for (const recipe of catalog.recipes) {
    current = applyRecipeOnce(catalog, current, recipe);
  }
  return current;
}

function applyRecipeOnce(
  catalog: IndexedSettlements,
  state: SettlementsState,
  recipe: SettlementRecipeDefinition,
): SettlementsState {
  const territories = new Set(state.structures.filter((entry) => entry.structureTypeId === recipe.structureTypeId).map((entry) => entry.territoryId));
  let current = copySettlementsState(state);
  for (const territoryId of territories) {
    if (!current.assignments.some((entry) => entry.territoryId === territoryId && entry.roleId === recipe.roleId)) {
      continue;
    }
    if (recipe.inputs.some((input) => storageQuantity(current, territoryId, input.itemId) < input.quantity)) {
      continue;
    }
    const added = recipe.outputs.reduce((sum, output) => sum + output.quantity, 0);
    if (storageUsed(current, territoryId) + added > storageCapacity(catalog, current, territoryId)) {
      continue;
    }
    for (const input of recipe.inputs) {
      current = removeStorage(current, territoryId, input.itemId, input.quantity);
    }
    for (const output of recipe.outputs) {
      current = addStorage(current, territoryId, output.itemId, output.quantity);
    }
  }
  return current;
}

function requirementMet(
  requirement: SettlementRequirement,
  _catalog: IndexedSettlements,
  state: SettlementsState,
  gameState: GameState,
): boolean {
  void _catalog;
  if (requirement.type === 'flag.is') {
    return gameState.flags[requirement.flag] === requirement.value;
  }
  if (requirement.type === 'location.is') {
    return gameState.sandbox.navigation.currentLocationId === requirement.locationId;
  }
  if (requirement.type === 'settlement.owns-property') {
    return gameState.economy.properties.some(
      (entry) => entry.propertyId === requirement.propertyId && entry.ownerId === PLAYER_SETTLEMENT_ACTOR_ID,
    );
  }
  if (requirement.type === 'settlement.has-authority') {
    return hasAuthority(state, requirement.territoryId, PLAYER_SETTLEMENT_ACTOR_ID);
  }
  if (requirement.type === 'settlement.has-item') {
    return itemQuantity(gameState.inventory, requirement.itemId) >= requirement.quantity;
  }
  if (requirement.type === 'settlement.project-active') {
    return state.projects.some((entry) => entry.projectId === requirement.projectId);
  }
  if (requirement.type === 'settlement.structure-complete') {
    return state.structures.some(
      (entry) => entry.territoryId === requirement.territoryId && entry.structureTypeId === requirement.structureTypeId,
    );
  }
  return storageQuantity(state, requirement.territoryId, requirement.itemId) >= requirement.quantity;
}

function npcAllows(
  catalog: IndexedSettlements,
  action: SettlementActionDefinition,
  state: SettlementsState,
  gameState: GameState,
): boolean {
  const intent = inferIntent(action.effects);
  const decision = catalog.npcDecisions.find((entry) => entry.npcId === action.npcId && entry.intent === intent);
  if (!decision) {
    return false;
  }
  return decision.requirements.every((requirement) => requirementMet(requirement, catalog, state, gameState));
}

function inferIntent(effects: readonly SettlementEffect[]): SettlementIntent | undefined {
  return effects.some((effect) => effect.type === 'settlement.assign-role') ? 'assign-role' : undefined;
}

function hasAuthority(state: SettlementsState, territoryId: string, actorId: string): boolean {
  return state.claims.some((entry) => entry.territoryId === territoryId && entry.claimantId === actorId);
}

function remainingCost(definition: SettlementProjectDefinition, progress: SettlementProjectProgress, itemId: string): number {
  const needed = definition.costs.find((entry) => entry.itemId === itemId)?.quantity ?? 0;
  const supplied = progress.supplied.find((entry) => entry.itemId === itemId)?.quantity ?? 0;
  return Math.max(0, needed - supplied);
}

function isFullySupplied(definition: SettlementProjectDefinition, progress: SettlementProjectProgress): boolean {
  return definition.costs.every((cost) => (progress.supplied.find((entry) => entry.itemId === cost.itemId)?.quantity ?? 0) >= cost.quantity);
}

function storageQuantity(state: SettlementsState, territoryId: string, itemId: string): number {
  return state.storage.find((entry) => entry.territoryId === territoryId && entry.itemId === itemId)?.quantity ?? 0;
}

function storageUsed(state: SettlementsState, territoryId: string): number {
  return state.storage.filter((entry) => entry.territoryId === territoryId).reduce((sum, entry) => sum + entry.quantity, 0);
}

function storageCapacity(catalog: IndexedSettlements, state: SettlementsState, territoryId: string): number {
  return state.structures
    .filter((entry) => entry.territoryId === territoryId)
    .reduce((sum, entry) => sum + (catalog.structureTypeById.get(entry.structureTypeId)?.storageCapacity ?? 0), 0);
}

function addStorage(state: SettlementsState, territoryId: string, itemId: string, quantity: number): SettlementsState {
  const current = copySettlementsState(state);
  const existing = current.storage.find((entry) => entry.territoryId === territoryId && entry.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    current.storage.push({ territoryId, itemId, quantity });
  }
  return current;
}

function removeStorage(state: SettlementsState, territoryId: string, itemId: string, quantity: number): SettlementsState {
  const current = copySettlementsState(state);
  const existing = current.storage.find((entry) => entry.territoryId === territoryId && entry.itemId === itemId);
  if (!existing || existing.quantity < quantity) {
    throw new SettlementError('O estoque da base não possui esse item.');
  }
  existing.quantity -= quantity;
  if (existing.quantity === 0) {
    current.storage = current.storage.filter((entry) => entry !== existing);
  }
  return current;
}

function isIntent(value: unknown): value is SettlementIntent {
  return typeof value === 'string' && INTENTS.includes(value as SettlementIntent);
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

function positiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
