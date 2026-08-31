import {
  TimeError,
  advanceTime,
  inspectTimeConfig,
  inspectTimeState,
  DEFAULT_PERIODS,
  type PeriodDefinition,
  type TimeAdvanceResult,
  type TimeCost,
  type TimeState,
} from '../time';
import { DAYLIGHT_PHASES, DEFAULT_PERIOD_PHASES, type DaylightPhase, type PeriodPhaseDefinition } from './phases';

export class DayCycleError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DayCycleError';
  }
}

export type DayCycleEvent =
  | { type: 'period.ended'; day: number; periodId: string }
  | { type: 'period.started'; day: number; periodId: string }
  | { type: 'day.ended'; day: number }
  | { type: 'day.started'; day: number };

export interface DayCycleResult {
  time: TimeAdvanceResult;
  events: DayCycleEvent[];
  phase: DaylightPhase;
}

export type DayCycleInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export function advanceDayCycle(
  state: TimeState,
  cost: TimeCost,
  periods: readonly PeriodDefinition[] = DEFAULT_PERIODS,
  phases: readonly PeriodPhaseDefinition[] = DEFAULT_PERIOD_PHASES,
): DayCycleResult {
  const resolvedPeriods = requirePeriods(periods);
  const resolvedPhases = requirePhases(phases, resolvedPeriods);

  try {
    const time = advanceTime(state, cost, resolvedPeriods);
    return interpretDayCycle(time, resolvedPeriods, resolvedPhases);
  } catch (error) {
    if (error instanceof TimeError) {
      throw new DayCycleError(error.message, { cause: error });
    }

    throw error;
  }
}

export function interpretDayCycle(
  result: TimeAdvanceResult,
  periods: readonly PeriodDefinition[] = DEFAULT_PERIODS,
  phases: readonly PeriodPhaseDefinition[] = DEFAULT_PERIOD_PHASES,
): DayCycleResult {
  const resolvedPeriods = requirePeriods(periods);
  const resolvedPhases = requirePhases(phases, resolvedPeriods);
  const time = copyAdvanceResult(result, resolvedPeriods);
  const firstPeriodId = resolvedPeriods[0].id;
  const events: DayCycleEvent[] = [];
  let day = time.previous.day;
  let periodId = time.previous.periodId;

  for (const nextPeriodId of time.crossedPeriods) {
    events.push({ type: 'period.ended', day, periodId });

    if (nextPeriodId === firstPeriodId) {
      events.push({ type: 'day.ended', day });
      day += 1;
      events.push({ type: 'period.started', day, periodId: nextPeriodId });
      events.push({ type: 'day.started', day });
    } else {
      events.push({ type: 'period.started', day, periodId: nextPeriodId });
    }

    periodId = nextPeriodId;
  }

  return {
    time,
    events,
    phase: lookupPhase(time.current.periodId, resolvedPhases),
  };
}

export function getDaylightPhase(
  periodId: string,
  phases: readonly PeriodPhaseDefinition[] = DEFAULT_PERIOD_PHASES,
): DaylightPhase {
  return lookupPhase(periodId, requirePhases(phases));
}

export function inspectDaylightPhaseConfig(
  config: unknown,
  periods?: readonly PeriodDefinition[],
): DayCycleInspection<PeriodPhaseDefinition[]> {
  if (!Array.isArray(config) || config.length === 0) {
    return fail('A configuração de fases visuais está vazia.');
  }

  const seen = new Set<string>();
  const phaseConfig: PeriodPhaseDefinition[] = [];

  for (const entry of config) {
    if (!isRecord(entry) || typeof entry.periodId !== 'string' || entry.periodId.trim() === '') {
      return fail('A configuração de fases visuais possui identificadores inválidos.');
    }

    if (!isDaylightPhase(entry.phase)) {
      return fail('A configuração de fases visuais possui fases inválidas.');
    }

    if (seen.has(entry.periodId)) {
      return fail('A configuração de fases visuais possui identificadores repetidos.');
    }

    seen.add(entry.periodId);
    phaseConfig.push({ periodId: entry.periodId, phase: entry.phase });
  }

  if (periods !== undefined) {
    const inspectedPeriods = inspectTimeConfig(periods);
    if (!inspectedPeriods.ok) {
      return fail(inspectedPeriods.reason);
    }

    for (const period of inspectedPeriods.value) {
      if (!seen.has(period.id)) {
        return fail('A configuração de fases visuais não cobre todos os períodos.');
      }
    }
  }

  return { ok: true, value: phaseConfig };
}

export { DEFAULT_PERIOD_PHASES, DAYLIGHT_PHASES } from './phases';
export type { DaylightPhase, PeriodPhaseDefinition } from './phases';
export type { TimeAdvanceResult, TimeCost, TimeState } from '../time';

function requirePeriods(config: readonly PeriodDefinition[]): readonly PeriodDefinition[] {
  const inspected = inspectTimeConfig(config);
  if (!inspected.ok) {
    throw new DayCycleError(inspected.reason);
  }

  return inspected.value;
}

function requirePhases(
  config: readonly PeriodPhaseDefinition[],
  periods?: readonly PeriodDefinition[],
): PeriodPhaseDefinition[] {
  const inspected = inspectDaylightPhaseConfig(config, periods);
  if (!inspected.ok) {
    throw new DayCycleError(inspected.reason);
  }

  return inspected.value;
}

function copyAdvanceResult(
  result: TimeAdvanceResult,
  periods: readonly PeriodDefinition[],
): TimeAdvanceResult {
  if (!isRecord(result) || !Array.isArray(result.crossedPeriods) || !isNonNegativeSafeInteger(result.daysAdvanced)) {
    throw new DayCycleError('O resultado de avanço do relógio é inválido.');
  }

  const previous = inspectTimeState(result.previous, periods);
  const current = inspectTimeState(result.current, periods);

  if (!previous.ok) {
    throw new DayCycleError(previous.reason);
  }

  if (!current.ok) {
    throw new DayCycleError(current.reason);
  }

  const crossedPeriods: string[] = [];
  for (const periodId of result.crossedPeriods) {
    if (typeof periodId !== 'string' || periodId.trim() === '') {
      throw new DayCycleError('O resultado de avanço do relógio é inválido.');
    }

    crossedPeriods.push(periodId);
  }

  return {
    previous: previous.value,
    current: current.value,
    crossedPeriods,
    daysAdvanced: result.daysAdvanced,
  };
}

function lookupPhase(periodId: string, phases: readonly PeriodPhaseDefinition[]): DaylightPhase {
  const phase = new Map(phases.map((entry) => [entry.periodId, entry.phase])).get(periodId);
  if (!phase) {
    throw new DayCycleError('O período não possui fase visual.');
  }

  return phase;
}

function isDaylightPhase(value: unknown): value is DaylightPhase {
  return typeof value === 'string' && (DAYLIGHT_PHASES as readonly string[]).includes(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): DayCycleInspection<never> {
  return { ok: false, reason };
}
