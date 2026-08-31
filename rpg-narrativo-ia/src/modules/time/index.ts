import { DEFAULT_PERIODS, type PeriodDefinition } from './periods';

export const MAX_ADVANCE_PERIODS = 10_000;

export class TimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeError';
  }
}

export interface TimeState {
  day: number;
  periodId: string;
}

export interface TimeCost {
  periods: number;
}

export interface TimeAdvanceResult {
  previous: TimeState;
  current: TimeState;
  crossedPeriods: string[];
  daysAdvanced: number;
}

export type TimeInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export function createInitialTime(config: readonly PeriodDefinition[] = DEFAULT_PERIODS): TimeState {
  const periods = requireConfig(config);
  return {
    day: 1,
    periodId: periods[0].id,
  };
}

export function getPeriod(
  state: TimeState,
  config: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): PeriodDefinition {
  const periods = requireConfig(config);
  const current = requireState(state, periods);
  return findPeriod(periods, current.periodId);
}

export function formatTime(
  state: TimeState,
  config: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): string {
  const period = getPeriod(state, config);
  return `Dia ${state.day} · ${period.label}`;
}

export function advanceTime(
  state: TimeState,
  cost: TimeCost,
  config: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): TimeAdvanceResult {
  const periods = requireConfig(config);
  const previous = requireState(state, periods);
  const steps = requireCost(cost);
  const index = periodIndex(periods, previous.periodId);
  const daysAdvanced = Math.floor((index + steps) / periods.length);

  if (daysAdvanced > Number.MAX_SAFE_INTEGER - previous.day) {
    throw new TimeError('O avanço ultrapassa o dia máximo permitido.');
  }

  const crossedPeriods: string[] = [];
  let day = previous.day;
  let nextIndex = index;

  for (let step = 0; step < steps; step += 1) {
    nextIndex += 1;
    if (nextIndex >= periods.length) {
      nextIndex = 0;
      day += 1;
    }
    crossedPeriods.push(periods[nextIndex].id);
  }

  return {
    previous,
    current: {
      day,
      periodId: periods[nextIndex].id,
    },
    crossedPeriods,
    daysAdvanced,
  };
}

export function inspectTimeConfig(config: unknown): TimeInspection<PeriodDefinition[]> {
  if (!Array.isArray(config) || config.length === 0) {
    return fail('A configuração de períodos está vazia.');
  }

  const seen = new Set<string>();
  const periods: PeriodDefinition[] = [];

  for (const entry of config) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || entry.id.trim() === '') {
      return fail('A configuração de períodos possui identificadores inválidos.');
    }

    if (typeof entry.label !== 'string') {
      return fail('A configuração de períodos é inválida.');
    }

    if (seen.has(entry.id)) {
      return fail('A configuração de períodos possui identificadores repetidos.');
    }

    seen.add(entry.id);
    periods.push({ id: entry.id, label: entry.label });
  }

  return { ok: true, value: periods };
}

export function inspectTimeState(
  state: unknown,
  config: readonly PeriodDefinition[] = DEFAULT_PERIODS,
): TimeInspection<TimeState> {
  const inspectedConfig = inspectTimeConfig(config);
  if (!inspectedConfig.ok) {
    return inspectedConfig;
  }

  if (!isRecord(state)) {
    return fail('O estado de horário é inválido.');
  }

  if (!isPositiveSafeInteger(state.day)) {
    return fail('O dia precisa ser um inteiro positivo.');
  }

  if (typeof state.periodId !== 'string' || state.periodId.trim() === '') {
    return fail('O período da partida é inválido.');
  }

  if (!inspectedConfig.value.some((period) => period.id === state.periodId)) {
    return fail('O período da partida é inválido.');
  }

  return {
    ok: true,
    value: {
      day: state.day,
      periodId: state.periodId,
    },
  };
}

export function inspectTimeCost(cost: unknown): TimeInspection<TimeCost> {
  if (!isRecord(cost) || !isNonNegativeSafeInteger(cost.periods)) {
    return fail('O custo de tempo precisa ser um inteiro não negativo.');
  }

  if (cost.periods > MAX_ADVANCE_PERIODS) {
    return fail(`O custo de tempo excede o limite operacional de ${MAX_ADVANCE_PERIODS} períodos.`);
  }

  return {
    ok: true,
    value: { periods: cost.periods },
  };
}

export { DEFAULT_PERIODS } from './periods';
export type { DefaultPeriodId, PeriodDefinition } from './periods';

function requireConfig(config: readonly PeriodDefinition[]): readonly PeriodDefinition[] {
  const inspected = inspectTimeConfig(config);
  if (!inspected.ok) {
    throw new TimeError(inspected.reason);
  }

  return inspected.value;
}

function requireState(state: TimeState, config: readonly PeriodDefinition[]): TimeState {
  const inspected = inspectTimeState(state, config);
  if (!inspected.ok) {
    throw new TimeError(inspected.reason);
  }

  return inspected.value;
}

function requireCost(cost: TimeCost): number {
  const inspected = inspectTimeCost(cost);
  if (!inspected.ok) {
    throw new TimeError(inspected.reason);
  }

  return inspected.value.periods;
}

function findPeriod(config: readonly PeriodDefinition[], periodId: string): PeriodDefinition {
  const period = config.find((entry) => entry.id === periodId);
  if (!period) {
    throw new TimeError('O período da partida é inválido.');
  }

  return period;
}

function periodIndex(config: readonly PeriodDefinition[], periodId: string): number {
  const index = config.findIndex((entry) => entry.id === periodId);
  if (index < 0) {
    throw new TimeError('O período da partida é inválido.');
  }

  return index;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): TimeInspection<never> {
  return { ok: false, reason };
}
