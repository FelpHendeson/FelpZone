import { isEnergyKind, type EnergyKind } from '../energetics';
import { ExecutionError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_EXECUTION_CATALOG } from './initial-execution';
import {
  EXECUTION_MODIFIER_FIELDS,
  type ActionCost,
  type ActionPhases,
  type CooldownEntry,
  type ExecutionInspection,
  type ExecutionModifierField,
  type ExecutionModifiers,
  type ExecutionState,
  type IndexedExecution,
  type PhaseLimits,
  type ReserveAmount,
  type ReserveDefinition,
  type ResolvedActionTiming,
  type SkillExecutionModifier,
} from './types';

export { ExecutionError } from './errors';
export { INITIAL_EXECUTION_CATALOG } from './initial-execution';
export type {
  ActionCost,
  ActionPhases,
  CooldownEntry,
  ExecutionCatalog,
  ExecutionInspection,
  ExecutionModifiers,
  ExecutionState,
  IndexedExecution,
  PhaseLimits,
  ReserveAmount,
  ReserveDefinition,
  ResolvedActionTiming,
  SkillExecutionModifier,
} from './types';

export const EMPTY_EXECUTION_MODIFIERS: ExecutionModifiers = {
  prepare: 0,
  execute: 0,
  recover: 0,
  cost: 0,
  cooldown: 0,
  speed: 0,
};

export const DEFAULT_ACTION_PHASES: ActionPhases = {
  prepare: 0,
  execute: 1,
  recover: 0,
};

export function inspectExecutionCatalog(value: unknown): ExecutionInspection<IndexedExecution> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.reserves) ||
    !isRecord(value.limits) ||
    !Array.isArray(value.modifierFields) ||
    !Array.isArray(value.skillModifiers)
  ) {
    return fail('O catálogo de execução é inválido.');
  }

  const fields = inspectModifierFields(value.modifierFields);
  if (!fields.ok) {
    return fields;
  }

  const limits = inspectLimits(value.limits);
  if (!limits.ok) {
    return limits;
  }

  const reserves: ReserveDefinition[] = [];
  const reserveByEnergyId = new Map<EnergyKind, ReserveDefinition>();
  for (const entry of value.reserves) {
    const inspected = inspectReserve(entry, reserveByEnergyId);
    if (!inspected.ok) {
      return inspected;
    }
    reserveByEnergyId.set(inspected.value.energyId, inspected.value);
    reserves.push(inspected.value);
  }
  if (reserves.length === 0) {
    return fail('O catálogo de execução precisa declarar ao menos uma reserva.');
  }

  const skillModifiers: SkillExecutionModifier[] = [];
  const skillModifierBySkillId = new Map<string, SkillExecutionModifier>();
  for (const entry of value.skillModifiers) {
    const inspected = inspectSkillModifier(entry, skillModifierBySkillId, fields.value);
    if (!inspected.ok) {
      return inspected;
    }
    skillModifierBySkillId.set(inspected.value.skillId, inspected.value);
    skillModifiers.push(inspected.value);
  }

  return {
    ok: true,
    value: Object.freeze({
      reserves: Object.freeze(reserves.map((entry) => Object.freeze({ ...entry }))),
      limits: Object.freeze({ ...limits.value }),
      modifierFields: Object.freeze([...fields.value]),
      skillModifiers: Object.freeze(skillModifiers.map((entry) => Object.freeze({ ...entry }))),
      reserveByEnergyId: new ImmutableIndex(reserveByEnergyId),
      skillModifierBySkillId: new ImmutableIndex(skillModifierBySkillId),
    }),
  };
}

export function indexExecutionCatalog(value: unknown = INITIAL_EXECUTION_CATALOG): IndexedExecution {
  const inspected = inspectExecutionCatalog(value);
  if (!inspected.ok) {
    throw new ExecutionError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_EXECUTION = indexExecutionCatalog();

export function validateExecutionReferences(
  catalog: IndexedExecution,
  skillIds: ReadonlySet<string>,
): void {
  for (const modifier of catalog.skillModifiers) {
    if (!skillIds.has(modifier.skillId)) {
      throw new ExecutionError(`O modificador de execução referencia a habilidade inexistente: ${modifier.skillId}.`);
    }
  }
}

export function createInitialExecutionState(catalog: IndexedExecution = INITIAL_EXECUTION): ExecutionState {
  return {
    reserves: catalog.reserves.map((entry) => ({ energyId: entry.energyId, current: entry.max })),
    cooldowns: [],
  };
}

export function inspectExecutionState(
  value: unknown,
  catalog: IndexedExecution = INITIAL_EXECUTION,
): ExecutionInspection<ExecutionState> {
  if (!isRecord(value) || !Array.isArray(value.reserves) || !Array.isArray(value.cooldowns)) {
    return fail('O estado de execução é inválido.');
  }

  const reserves: ReserveAmount[] = [];
  const seenEnergy = new Set<EnergyKind>();
  for (const entry of value.reserves) {
    if (!isRecord(entry) || !isEnergyKind(entry.energyId) || seenEnergy.has(entry.energyId)) {
      return fail('A reserva persistida é inválida.');
    }
    const definition = catalog.reserveByEnergyId.get(entry.energyId);
    if (!definition || !nonNegativeSafeInteger(entry.current) || entry.current > definition.max) {
      return fail('A reserva persistida é inválida.');
    }
    seenEnergy.add(entry.energyId);
    reserves.push({ energyId: entry.energyId, current: entry.current });
  }
  for (const definition of catalog.reserves) {
    if (!seenEnergy.has(definition.energyId)) {
      return fail('O estado de execução omite uma reserva declarada.');
    }
  }

  const cooldowns: CooldownEntry[] = [];
  const seenActions = new Set<string>();
  for (const entry of value.cooldowns) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.actionId) ||
      seenActions.has(entry.actionId) ||
      !nonNegativeSafeInteger(entry.remaining)
    ) {
      return fail('A recarga persistida é inválida.');
    }
    seenActions.add(entry.actionId);
    cooldowns.push({ actionId: entry.actionId, remaining: entry.remaining });
  }

  return { ok: true, value: { reserves, cooldowns } };
}

export function copyExecutionState(state: ExecutionState): ExecutionState {
  return {
    reserves: state.reserves.map((entry) => ({ ...entry })),
    cooldowns: state.cooldowns.map((entry) => ({ ...entry })),
  };
}

export function emptyExecutionModifiers(): ExecutionModifiers {
  return { ...EMPTY_EXECUTION_MODIFIERS };
}

export function collectExecutionModifiers(
  catalog: IndexedExecution,
  skillIds: readonly string[],
  extra: Partial<ExecutionModifiers> = {},
): ExecutionModifiers {
  const total = emptyExecutionModifiers();
  for (const skillId of skillIds) {
    const modifier = catalog.skillModifierBySkillId.get(skillId);
    if (!modifier) {
      continue;
    }
    total.prepare += modifier.prepare ?? 0;
    total.execute += modifier.execute ?? 0;
    total.recover += modifier.recover ?? 0;
    total.cost += modifier.cost ?? 0;
    total.cooldown += modifier.cooldown ?? 0;
    total.speed += modifier.speed ?? 0;
  }
  total.prepare += extra.prepare ?? 0;
  total.execute += extra.execute ?? 0;
  total.recover += extra.recover ?? 0;
  total.cost += extra.cost ?? 0;
  total.cooldown += extra.cooldown ?? 0;
  total.speed += extra.speed ?? 0;
  return total;
}

export function clampPhases(
  declared: ActionPhases,
  modifiers: ExecutionModifiers,
  limits: PhaseLimits,
): ActionPhases {
  const prepare = Math.max(limits.minPrepare, declared.prepare + modifiers.prepare);
  let execute = Math.max(limits.minExecute, declared.execute + modifiers.execute);
  const recover = Math.max(limits.minRecover, declared.recover + modifiers.recover);
  const total = prepare + execute + recover;
  if (total < limits.minTotal) {
    execute += limits.minTotal - total;
  }
  return { prepare, execute, recover };
}

export function resolveActionTiming(
  declared: { phases: ActionPhases; speed: number; cost?: ActionCost; cooldown?: number },
  modifiers: ExecutionModifiers,
  limits: PhaseLimits,
): ResolvedActionTiming {
  const phases = clampPhases(declared.phases, modifiers, limits);
  const speed = Math.max(1, declared.speed + modifiers.speed);
  const cooldown = Math.max(0, (declared.cooldown ?? 0) + modifiers.cooldown);
  const cost = declared.cost
    ? { energyId: declared.cost.energyId, amount: Math.max(0, declared.cost.amount + modifiers.cost) }
    : undefined;
  return {
    phases,
    readyTick: phases.prepare,
    speed,
    ...(cost && cost.amount > 0 ? { cost } : {}),
    cooldown,
  };
}

export function currentReserve(state: ExecutionState, energyId: EnergyKind): number {
  return state.reserves.find((entry) => entry.energyId === energyId)?.current ?? 0;
}

export function canPayCost(state: ExecutionState, cost: ActionCost | undefined): boolean {
  if (!cost || cost.amount === 0) {
    return true;
  }
  return currentReserve(state, cost.energyId) >= cost.amount;
}

export function payCost(state: ExecutionState, cost: ActionCost | undefined): ExecutionState {
  if (!cost || cost.amount === 0) {
    return copyExecutionState(state);
  }
  if (!canPayCost(state, cost)) {
    throw new ExecutionError('A reserva energética é insuficiente.');
  }
  return {
    reserves: state.reserves.map((entry) =>
      entry.energyId === cost.energyId ? { ...entry, current: entry.current - cost.amount } : { ...entry },
    ),
    cooldowns: state.cooldowns.map((entry) => ({ ...entry })),
  };
}

export function cooldownRemaining(state: ExecutionState, actionId: string): number {
  return state.cooldowns.find((entry) => entry.actionId === actionId)?.remaining ?? 0;
}

export function setCooldown(state: ExecutionState, actionId: string, remaining: number): ExecutionState {
  const next = copyExecutionState(state);
  const existing = next.cooldowns.find((entry) => entry.actionId === actionId);
  if (remaining <= 0) {
    next.cooldowns = next.cooldowns.filter((entry) => entry.actionId !== actionId);
    return next;
  }
  if (existing) {
    existing.remaining = remaining;
    return next;
  }
  next.cooldowns.push({ actionId, remaining });
  return next;
}

export function tickCooldowns(state: ExecutionState, exceptActionIds: readonly string[] = []): ExecutionState {
  const skipped = new Set(exceptActionIds);
  return {
    reserves: state.reserves.map((entry) => ({ ...entry })),
    cooldowns: state.cooldowns
      .map((entry) => ({ ...entry, remaining: skipped.has(entry.actionId) ? entry.remaining : Math.max(0, entry.remaining - 1) }))
      .filter((entry) => entry.remaining > 0),
  };
}

export function restoreReserves(state: ExecutionState, catalog: IndexedExecution = INITIAL_EXECUTION): ExecutionState {
  return {
    reserves: catalog.reserves.map((entry) => ({ energyId: entry.energyId, current: entry.max })),
    cooldowns: state.cooldowns.map((entry) => ({ ...entry })),
  };
}

function inspectReserve(
  value: unknown,
  existing: ReadonlyMap<EnergyKind, ReserveDefinition>,
): ExecutionInspection<ReserveDefinition> {
  if (
    !isRecord(value) ||
    !isEnergyKind(value.energyId) ||
    existing.has(value.energyId) ||
    !nonEmpty(value.name) ||
    !nonEmpty(value.description) ||
    !positiveSafeInteger(value.max)
  ) {
    return fail('A reserva de execução é inválida.');
  }
  return {
    ok: true,
    value: {
      energyId: value.energyId,
      max: value.max,
      name: value.name,
      description: value.description,
    },
  };
}

function inspectLimits(value: Record<string, unknown>): ExecutionInspection<PhaseLimits> {
  if (
    !nonNegativeSafeInteger(value.minPrepare) ||
    !positiveSafeInteger(value.minExecute) ||
    !nonNegativeSafeInteger(value.minRecover) ||
    !positiveSafeInteger(value.minTotal)
  ) {
    return fail('Os limites de fase da execução são inválidos.');
  }
  if (value.minTotal < value.minExecute) {
    return fail('Os limites de fase da execução são inválidos.');
  }
  return {
    ok: true,
    value: {
      minPrepare: value.minPrepare,
      minExecute: value.minExecute,
      minRecover: value.minRecover,
      minTotal: value.minTotal,
    },
  };
}

function inspectModifierFields(value: unknown[]): ExecutionInspection<ExecutionModifierField[]> {
  const fields: ExecutionModifierField[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string' || seen.has(entry) || !includes(EXECUTION_MODIFIER_FIELDS, entry)) {
      return fail('O campo de modificador de execução é inválido.');
    }
    seen.add(entry);
    fields.push(entry);
  }
  if (fields.length !== EXECUTION_MODIFIER_FIELDS.length) {
    return fail('O catálogo de execução precisa declarar todos os campos de modificador.');
  }
  return { ok: true, value: fields };
}

function inspectSkillModifier(
  value: unknown,
  existing: ReadonlyMap<string, SkillExecutionModifier>,
  fields: readonly ExecutionModifierField[],
): ExecutionInspection<SkillExecutionModifier> {
  if (!isRecord(value) || !nonEmpty(value.skillId) || existing.has(value.skillId)) {
    return fail('O modificador de habilidade da execução é inválido.');
  }
  const allowed = new Set(fields);
  const modifier: SkillExecutionModifier = { skillId: value.skillId };
  const keys: Array<[keyof Omit<SkillExecutionModifier, 'skillId'>, ExecutionModifierField]> = [
    ['prepare', 'phases.prepare'],
    ['execute', 'phases.execute'],
    ['recover', 'phases.recover'],
    ['cost', 'cost.amount'],
    ['cooldown', 'cooldown'],
    ['speed', 'speed'],
  ];
  for (const [key, field] of keys) {
    if (value[key] === undefined) {
      continue;
    }
    if (!allowed.has(field) || !safeInteger(value[key])) {
      return fail('O modificador de habilidade da execução é inválido.');
    }
    modifier[key] = value[key];
  }
  return { ok: true, value: modifier };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return safeInteger(value) && value >= 0;
}

function positiveSafeInteger(value: unknown): value is number {
  return safeInteger(value) && value > 0;
}

function includes<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function fail<T>(reason: string): ExecutionInspection<T> {
  return { ok: false, reason };
}
