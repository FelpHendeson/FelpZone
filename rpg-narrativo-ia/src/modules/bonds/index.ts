import { evaluateCondition } from '../../core/events/conditions';
import type { GameCondition, GameEffect } from '../../core/events';
import { BondError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_BOND_CATALOG } from './initial-bonds';
import type {
  BondActionDefinition,
  BondActionEffect,
  BondActionPlan,
  BondActionRequirement,
  BondDefinition,
  BondDimensionChange,
  BondDimensionDefinition,
  BondEdgeState,
  BondInspection,
  BondRequirement,
  BondTransitionPlan,
  BondsState,
  IndexedBonds,
  KnownBondAction,
  VisibleBondDimension,
  VisibleNamedBond,
} from './types';
import type { GameState } from '../../core/state/types';

export { BondError } from './errors';
export { INITIAL_BOND_CATALOG } from './initial-bonds';
export type {
  BondActionDefinition,
  BondActionEffect,
  BondActionPlan,
  BondCatalog,
  BondDefinition,
  BondDimensionChange,
  BondDimensionDefinition,
  BondEdgeState,
  BondInspection,
  BondRequirement,
  BondTransitionPlan,
  BondsState,
  IndexedBonds,
  KnownBondAction,
  VisibleBondDimension,
  VisibleNamedBond,
} from './types';

export const PLAYER_ACTOR_ID = 'player';
const UNAVAILABLE_REASON = 'A ação de relacionamento não está disponível.';

export function inspectBondCatalog(value: unknown): BondInspection<IndexedBonds> {
  if (!isRecord(value) || !Array.isArray(value.dimensions) || !Array.isArray(value.bonds)) {
    return fail('O catálogo de relacionamentos é inválido.');
  }
  const dimensions: BondDimensionDefinition[] = [];
  const dimensionById = new Map<string, BondDimensionDefinition>();
  for (const entry of value.dimensions) {
    const minimum = entry.minimum;
    const maximum = entry.maximum;
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      dimensionById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      typeof minimum !== 'number' ||
      typeof maximum !== 'number' ||
      !Number.isInteger(minimum) ||
      !Number.isInteger(maximum) ||
      minimum >= maximum
    ) {
      return fail('A dimensão de relacionamento é inválida.');
    }
    const dimension = { id: entry.id, name: entry.name, minimum, maximum };
    dimensionById.set(dimension.id, dimension);
    dimensions.push(dimension);
  }
  const bonds: BondDefinition[] = [];
  const bondById = new Map<string, BondDefinition>();
  for (const entry of value.bonds) {
    const inspected = inspectBond(entry, bondById, dimensionById);
    if (!inspected.ok) {
      return inspected;
    }
    bondById.set(inspected.value.id, inspected.value);
    bonds.push(inspected.value);
  }
  const actions: BondActionDefinition[] = [];
  const actionById = new Map<string, BondActionDefinition>();
  const rawActions = Array.isArray(value.actions) ? value.actions : [];
  for (const entry of rawActions) {
    const inspected = inspectAction(entry, actionById, dimensionById, bondById);
    if (!inspected.ok) {
      return inspected;
    }
    actionById.set(inspected.value.id, inspected.value);
    actions.push(inspected.value);
  }
  return {
    ok: true,
    value: Object.freeze({
      dimensions: Object.freeze(dimensions),
      bonds: Object.freeze(bonds),
      actions: Object.freeze(actions),
      dimensionById: new ImmutableIndex(dimensions.map((dimension) => [dimension.id, dimension] as const)),
      bondById: new ImmutableIndex(bonds.map((bond) => [bond.id, freezeBond(bond)] as const)),
      actionById: new ImmutableIndex(actions.map((action) => [action.id, freezeAction(action)] as const)),
    }),
  };
}

export function indexBondCatalog(value: unknown = INITIAL_BOND_CATALOG): IndexedBonds {
  const inspected = inspectBondCatalog(value);
  if (!inspected.ok) {
    throw new BondError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_BONDS = indexBondCatalog();

export function createInitialBondsState(): BondsState {
  return { edges: [], consumedActionIds: [] };
}

export function inspectBondsState(value: unknown, catalog: IndexedBonds = INITIAL_BONDS): BondInspection<BondsState> {
  if (!isRecord(value) || !Array.isArray(value.edges) || !Array.isArray(value.consumedActionIds)) {
    return fail('O estado de relacionamentos é inválido.');
  }
  const edges: BondEdgeState[] = [];
  const seen = new Set<string>();
  for (const entry of value.edges) {
    if (!isRecord(entry) || !nonEmpty(entry.fromId) || !nonEmpty(entry.toId) || entry.fromId === entry.toId) {
      return fail('O estado de relacionamentos é inválido.');
    }
    const key = edgeKey(entry.fromId, entry.toId);
    if (seen.has(key)) {
      return fail('O estado de relacionamentos possui pares duplicados.');
    }
    seen.add(key);
    const values = inspectValues(entry.values, catalog);
    if (!values.ok) {
      return values;
    }
    const bondIds = inspectIdList(entry.bondIds, (id) => catalog.bondById.has(id));
    if (!bondIds.ok) {
      return bondIds;
    }
    const consumed = inspectIdList(entry.consumedMilestoneIds, () => true);
    if (!consumed.ok) {
      return consumed;
    }
    edges.push({
      fromId: entry.fromId,
      toId: entry.toId,
      values: values.value,
      bondIds: bondIds.value,
      consumedMilestoneIds: consumed.value,
    });
  }
  const consumedActionIds = inspectIdList(value.consumedActionIds, (id) => catalog.actionById.has(id));
  if (!consumedActionIds.ok) {
    return consumedActionIds;
  }
  return { ok: true, value: { edges, consumedActionIds: consumedActionIds.value } };
}

export function copyBondsState(state: BondsState): BondsState {
  return {
    edges: state.edges.map((edge) => ({
      fromId: edge.fromId,
      toId: edge.toId,
      values: { ...edge.values },
      bondIds: [...edge.bondIds],
      consumedMilestoneIds: [...edge.consumedMilestoneIds],
    })),
    consumedActionIds: [...state.consumedActionIds],
  };
}

export function getDimensionValue(
  catalog: IndexedBonds,
  state: BondsState,
  fromId: string,
  toId: string,
  dimensionId: string,
): number {
  const dimension = catalog.dimensionById.get(dimensionId);
  if (!dimension) {
    throw new BondError('A dimensão de relacionamento não existe.');
  }
  const edge = state.edges.find((entry) => entry.fromId === fromId && entry.toId === toId);
  return edge?.values[dimensionId] ?? dimension.minimum;
}

export function applyDimensionChange(
  catalog: IndexedBonds,
  state: BondsState,
  change: BondDimensionChange,
): BondsState {
  const dimension = catalog.dimensionById.get(change.dimensionId);
  if (!dimension || change.fromId === change.toId || !Number.isInteger(change.delta)) {
    throw new BondError('A mudança de relacionamento é inválida.');
  }
  const current = copyBondsState(state);
  let edge = current.edges.find((entry) => entry.fromId === change.fromId && entry.toId === change.toId);
  if (!edge) {
    edge = {
      fromId: change.fromId,
      toId: change.toId,
      values: {},
      bondIds: [],
      consumedMilestoneIds: [],
    };
    current.edges.push(edge);
  }
  const previous = edge.values[change.dimensionId] ?? dimension.minimum;
  edge.values[change.dimensionId] = clamp(previous + change.delta, dimension.minimum, dimension.maximum);
  return current;
}

export function listKnownBonds(catalog: IndexedBonds, state: BondsState, fromId: string, toId: string): BondDefinition[] {
  const edge = state.edges.find((entry) => entry.fromId === fromId && entry.toId === toId);
  if (!edge) {
    return [];
  }
  return edge.bondIds.flatMap((id) => {
    const bond = catalog.bondById.get(id);
    return bond ? [freezeBond(bond)] : [];
  });
}

export function listRevealedDimensions(
  catalog: IndexedBonds,
  state: BondsState,
  fromId: string,
  toId: string,
): VisibleBondDimension[] {
  const edge = state.edges.find((entry) => entry.fromId === fromId && entry.toId === toId);
  if (!edge) {
    return [];
  }
  return Object.keys(edge.values).flatMap((dimensionId) => {
    const dimension = catalog.dimensionById.get(dimensionId);
    if (!dimension) {
      return [];
    }
    return [{ dimensionId, name: dimension.name, value: edge.values[dimensionId] }];
  });
}

export function listRevealedNamedBonds(
  catalog: IndexedBonds,
  state: BondsState,
  fromId: string,
  toId: string,
): VisibleNamedBond[] {
  return listKnownBonds(catalog, state, fromId, toId).map((bond) => ({
    bondId: bond.id,
    name: bond.name,
    description: bond.description,
  }));
}

export function hasNamedBond(state: BondsState, fromId: string, toId: string, bondId: string): boolean {
  return state.edges.some((edge) => edge.fromId === fromId && edge.toId === toId && edge.bondIds.includes(bondId));
}

export function planBondFormation(
  catalog: IndexedBonds,
  state: BondsState,
  gameState: GameState,
  bondId: string,
  fromId: string,
  toId: string,
): BondTransitionPlan {
  const bond = catalog.bondById.get(bondId);
  if (!bond) {
    throw new BondError('O vínculo não existe.');
  }
  const edge = state.edges.find((entry) => entry.fromId === fromId && entry.toId === toId);
  if (edge?.bondIds.includes(bondId)) {
    throw new BondError('Este vínculo já existe.');
  }
  if (!bond.requirements.every((requirement) => requirementMet(requirement, catalog, state, gameState, fromId, toId))) {
    throw new BondError('Os requisitos deste vínculo não foram atendidos.');
  }
  return { bondId, fromId, toId };
}

export function applyBondFormation(state: BondsState, plan: BondTransitionPlan): BondsState {
  const current = copyBondsState(state);
  let edge = current.edges.find((entry) => entry.fromId === plan.fromId && entry.toId === plan.toId);
  if (!edge) {
    edge = { fromId: plan.fromId, toId: plan.toId, values: {}, bondIds: [], consumedMilestoneIds: [] };
    current.edges.push(edge);
  }
  if (!edge.bondIds.includes(plan.bondId)) {
    edge.bondIds.push(plan.bondId);
  }
  return current;
}

export function planBondAction(
  catalog: IndexedBonds,
  state: BondsState,
  actionId: string,
  gameState: GameState,
): BondActionPlan {
  const action = catalog.actionById.get(actionId);
  if (!action) {
    throw new BondError(UNAVAILABLE_REASON);
  }
  if (action.once && state.consumedActionIds.includes(action.id)) {
    throw new BondError('Esta ação de relacionamento já foi usada.');
  }
  const blocked = actionBlock(action, catalog, state, gameState);
  if (blocked) {
    throw new BondError(blocked);
  }
  return {
    actionId: action.id,
    npcId: action.npcId,
    timeCost: { periods: action.timeCost.periods },
    effects: action.effects.map(copyEffect),
    feedback: action.feedback,
  };
}

export function applyBondActionPlan(catalog: IndexedBonds, state: BondsState, plan: BondActionPlan): BondsState {
  const action = catalog.actionById.get(plan.actionId);
  if (!action) {
    throw new BondError(UNAVAILABLE_REASON);
  }
  let current = copyBondsState(state);
  for (const effect of plan.effects) {
    if (effect.type === 'bond.shift') {
      current = applyDimensionChange(catalog, current, {
        fromId: resolveActorId(effect.fromId),
        toId: resolveActorId(effect.toId),
        dimensionId: effect.dimensionId,
        delta: effect.delta,
      });
      continue;
    }
    if (effect.type === 'bond.form') {
      current = applyBondFormation(current, {
        bondId: effect.bondId,
        fromId: resolveActorId(effect.fromId),
        toId: resolveActorId(effect.toId),
      });
    }
  }
  if (action.once && !current.consumedActionIds.includes(action.id)) {
    current.consumedActionIds.push(action.id);
  }
  return current;
}

export function applyBondDomainEffects(
  catalog: IndexedBonds,
  state: BondsState,
  gameState: GameState,
  effects: readonly BondActionEffect[],
): BondsState {
  let current = copyBondsState(state);
  for (const effect of effects) {
    if (effect.type === 'bond.shift') {
      current = applyDimensionChange(catalog, current, {
        fromId: resolveActorId(effect.fromId),
        toId: resolveActorId(effect.toId),
        dimensionId: effect.dimensionId,
        delta: effect.delta,
      });
      continue;
    }
    if (effect.type === 'bond.form') {
      const plan = planBondFormation(
        catalog,
        current,
        gameState,
        effect.bondId,
        resolveActorId(effect.fromId),
        resolveActorId(effect.toId),
      );
      current = applyBondFormation(current, plan);
    }
  }
  return current;
}

export function listKnownBondActions(
  catalog: IndexedBonds,
  state: BondsState,
  gameState: GameState,
  npcId: string,
): KnownBondAction[] {
  return catalog.actions
    .filter((action) => action.npcId === npcId)
    .flatMap((action) => {
      const known = describeAction(action, catalog, state, gameState);
      if (!known) {
        return [];
      }
      return [known];
    });
}

function describeAction(
  action: BondActionDefinition,
  catalog: IndexedBonds,
  state: BondsState,
  gameState: GameState,
): KnownBondAction | null {
  if (action.once && state.consumedActionIds.includes(action.id)) {
    return null;
  }
  if (action.effects.some((effect) => effect.type === 'bond.form')) {
    try {
      planBondAction(catalog, state, action.id, gameState);
    } catch {
      return null;
    }
  }
  const blocked = actionBlock(action, catalog, state, gameState);
  if (blocked && !action.effects.some((effect) => effect.type === 'bond.form') && !requirementsVisible(action, gameState)) {
    return null;
  }
  return {
    action: freezeAction(action),
    available: blocked === undefined,
    ...(blocked ? { blockedReason: blocked } : {}),
  };
}

function requirementsVisible(action: BondActionDefinition, gameState: GameState): boolean {
  return (action.requirements ?? []).some((requirement) => {
    if (requirement.type === 'flag.is' && requirement.flag.startsWith('mira.promise') && requirement.value === true) {
      return (gameState.flags[requirement.flag] ?? false) === true;
    }
    return false;
  });
}

function actionBlock(
  action: BondActionDefinition,
  catalog: IndexedBonds,
  state: BondsState,
  gameState: GameState,
): string | undefined {
  for (const requirement of action.requirements ?? []) {
    if (!actionRequirementMet(requirement, catalog, state, gameState, PLAYER_ACTOR_ID, action.npcId)) {
      return UNAVAILABLE_REASON;
    }
  }
  for (const effect of action.effects) {
    if (effect.type === 'bond.form') {
      try {
        planBondFormation(
          catalog,
          state,
          gameState,
          effect.bondId,
          resolveActorId(effect.fromId),
          resolveActorId(effect.toId),
        );
      } catch (error) {
        return error instanceof BondError ? error.message : UNAVAILABLE_REASON;
      }
    }
    if (effect.type === 'bond.shift' && !catalog.dimensionById.has(effect.dimensionId)) {
      return 'A dimensão de relacionamento não existe.';
    }
  }
  return undefined;
}

function inspectBond(
  value: unknown,
  bondById: ReadonlyMap<string, BondDefinition>,
  dimensions: ReadonlyMap<string, BondDimensionDefinition>,
): BondInspection<BondDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || bondById.has(value.id) || !nonEmpty(value.name) || !nonEmpty(value.description) || !Array.isArray(value.requirements)) {
    return fail('O vínculo declarado é inválido.');
  }
  const requirements: BondRequirement[] = [];
  for (const entry of value.requirements) {
    const inspected = inspectBondRequirement(entry, dimensions);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  return { ok: true, value: { id: value.id, name: value.name, description: value.description, requirements } };
}

function inspectAction(
  value: unknown,
  actionById: ReadonlyMap<string, BondActionDefinition>,
  dimensions: ReadonlyMap<string, BondDimensionDefinition>,
  bonds: ReadonlyMap<string, BondDefinition>,
): BondInspection<BondActionDefinition> {
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    actionById.has(value.id) ||
    !nonEmpty(value.npcId) ||
    !nonEmpty(value.label) ||
    !isRecord(value.timeCost) ||
    !Number.isInteger(value.timeCost.periods) ||
    (value.timeCost.periods as number) < 0 ||
    !Array.isArray(value.effects) ||
    value.effects.length === 0
  ) {
    return fail('A ação de relacionamento é inválida.');
  }
  const requirements: BondActionRequirement[] = [];
  for (const entry of Array.isArray(value.requirements) ? value.requirements : []) {
    const inspected = inspectActionRequirement(entry, dimensions);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  const effects: BondActionEffect[] = [];
  for (const entry of value.effects) {
    const inspected = inspectActionEffect(entry, dimensions, bonds);
    if (!inspected.ok) {
      return inspected;
    }
    effects.push(inspected.value);
  }
  return {
    ok: true,
    value: {
      id: value.id,
      npcId: value.npcId,
      label: value.label,
      ...(nonEmpty(value.hint) ? { hint: value.hint } : {}),
      timeCost: { periods: value.timeCost.periods as number },
      ...(value.once === true ? { once: true } : {}),
      ...(requirements.length > 0 ? { requirements } : {}),
      effects,
      ...(nonEmpty(value.feedback) ? { feedback: value.feedback } : {}),
    },
  };
}

function inspectBondRequirement(
  value: unknown,
  dimensions: ReadonlyMap<string, BondDimensionDefinition>,
): BondInspection<BondRequirement> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('O requisito do vínculo é inválido.');
  }
  if (value.type === 'dimension.min') {
    if (!nonEmpty(value.actorId) || !nonEmpty(value.targetId) || !dimensions.has(value.dimensionId as string) || !Number.isInteger(value.amount)) {
      return fail('O requisito do vínculo é inválido.');
    }
    return {
      ok: true,
      value: {
        type: 'dimension.min',
        actorId: value.actorId,
        targetId: value.targetId,
        dimensionId: value.dimensionId as string,
        amount: value.amount as number,
      },
    };
  }
  if (value.type === 'flag.is') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O requisito do vínculo é inválido.');
    }
    return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
  }
  return fail('O requisito do vínculo é inválido.');
}

function inspectActionRequirement(
  value: unknown,
  dimensions: ReadonlyMap<string, BondDimensionDefinition>,
): BondInspection<BondActionRequirement> {
  const bondRequirement = inspectBondRequirement(value, dimensions);
  if (bondRequirement.ok) {
    return bondRequirement;
  }
  if (!isRecord(value) || value.type !== 'flag.is') {
    return fail('O requisito da ação de relacionamento é inválido.');
  }
  return fail('O requisito da ação de relacionamento é inválido.');
}

function inspectActionEffect(
  value: unknown,
  dimensions: ReadonlyMap<string, BondDimensionDefinition>,
  bonds: ReadonlyMap<string, BondDefinition>,
): BondInspection<BondActionEffect> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('O efeito de relacionamento é inválido.');
  }
  if (value.type === 'bond.shift') {
    if (
      !nonEmpty(value.fromId) ||
      !nonEmpty(value.toId) ||
      value.fromId === value.toId ||
      !dimensions.has(value.dimensionId as string) ||
      !Number.isInteger(value.delta)
    ) {
      return fail('O efeito de relacionamento é inválido.');
    }
    return {
      ok: true,
      value: {
        type: 'bond.shift',
        fromId: value.fromId,
        toId: value.toId,
        dimensionId: value.dimensionId as string,
        delta: value.delta as number,
      },
    };
  }
  if (value.type === 'bond.form') {
    if (!nonEmpty(value.bondId) || !bonds.has(value.bondId) || !nonEmpty(value.fromId) || !nonEmpty(value.toId) || value.fromId === value.toId) {
      return fail('O efeito de relacionamento é inválido.');
    }
    return {
      ok: true,
      value: { type: 'bond.form', bondId: value.bondId, fromId: value.fromId, toId: value.toId },
    };
  }
  return inspectGameEffect(value);
}

function inspectGameEffect(value: Record<string, unknown>): BondInspection<GameEffect> {
  if (value.type === 'flag.set') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O efeito de relacionamento é inválido.');
    }
    return { ok: true, value: { type: 'flag.set', flag: value.flag, value: value.value } };
  }
  if (value.type === 'npc.rememberFact') {
    if (!nonEmpty(value.npcId) || !nonEmpty(value.factId)) {
      return fail('O efeito de relacionamento é inválido.');
    }
    return { ok: true, value: { type: 'npc.rememberFact', npcId: value.npcId, factId: value.factId } };
  }
  return fail('O efeito de relacionamento é inválido.');
}

function inspectValues(value: unknown, catalog: IndexedBonds): BondInspection<Record<string, number>> {
  if (!isRecord(value)) {
    return fail('O estado de relacionamentos é inválido.');
  }
  const values: Record<string, number> = {};
  for (const [key, amount] of Object.entries(value)) {
    const dimension = catalog.dimensionById.get(key);
    if (!dimension || typeof amount !== 'number' || !Number.isInteger(amount) || amount < dimension.minimum || amount > dimension.maximum) {
      return fail('O save referencia uma dimensão de relacionamento inexistente.');
    }
    values[key] = amount;
  }
  return { ok: true, value: values };
}

function inspectIdList(value: unknown, exists: (id: string) => boolean): BondInspection<string[]> {
  if (!Array.isArray(value)) {
    return fail('O estado de relacionamentos é inválido.');
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!nonEmpty(entry) || seen.has(entry) || !exists(entry)) {
      return fail('O estado de relacionamentos é inválido.');
    }
    seen.add(entry);
    ids.push(entry);
  }
  return { ok: true, value: ids };
}

function requirementMet(
  requirement: BondRequirement,
  catalog: IndexedBonds,
  state: BondsState,
  gameState: GameState,
  fromId: string,
  toId: string,
): boolean {
  if (requirement.type === 'flag.is') {
    return (gameState.flags[requirement.flag] ?? false) === requirement.value;
  }
  const actorId = resolveActorId(requirement.actorId === 'player' ? PLAYER_ACTOR_ID : requirement.actorId);
  const targetId = requirement.targetId === 'player'
    ? PLAYER_ACTOR_ID
    : requirement.targetId === 'target'
      ? toId
      : requirement.targetId;
  void fromId;
  return getDimensionValue(catalog, state, actorId, targetId, requirement.dimensionId) >= requirement.amount;
}

function actionRequirementMet(
  requirement: BondActionRequirement,
  catalog: IndexedBonds,
  state: BondsState,
  gameState: GameState,
  fromId: string,
  toId: string,
): boolean {
  if (requirement.type === 'dimension.min' || requirement.type === 'flag.is') {
    if ('actorId' in requirement || requirement.type === 'flag.is') {
      return requirementMet(requirement as BondRequirement, catalog, state, gameState, fromId, toId);
    }
  }
  return evaluateCondition(requirement as GameCondition, gameState);
}

function copyEffect(effect: BondActionEffect): BondActionEffect {
  if (effect.type === 'bond.shift') {
    return { type: 'bond.shift', fromId: effect.fromId, toId: effect.toId, dimensionId: effect.dimensionId, delta: effect.delta };
  }
  if (effect.type === 'bond.form') {
    return { type: 'bond.form', bondId: effect.bondId, fromId: effect.fromId, toId: effect.toId };
  }
  if (effect.type === 'flag.set') {
    return { type: 'flag.set', flag: effect.flag, value: effect.value };
  }
  if (effect.type === 'npc.rememberFact') {
    return { type: 'npc.rememberFact', npcId: effect.npcId, factId: effect.factId };
  }
  return { ...effect };
}

function freezeBond(bond: BondDefinition): BondDefinition {
  return Object.freeze({
    ...bond,
    requirements: Object.freeze(bond.requirements.map((requirement) => ({ ...requirement }))),
  });
}

function freezeAction(action: BondActionDefinition): BondActionDefinition {
  return Object.freeze({
    ...action,
    timeCost: Object.freeze({ periods: action.timeCost.periods }),
    ...(action.requirements ? { requirements: Object.freeze(action.requirements.map((requirement) => ({ ...requirement }))) } : {}),
    effects: Object.freeze(action.effects.map(copyEffect)),
  });
}

function resolveActorId(actorId: string): string {
  return actorId === 'player' ? PLAYER_ACTOR_ID : actorId;
}

function edgeKey(fromId: string, toId: string): string {
  return `${fromId}->${toId}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): BondInspection<never> {
  return { ok: false, reason };
}
