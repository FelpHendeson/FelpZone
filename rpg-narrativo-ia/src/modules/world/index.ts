import { createInitialTime, formatTime, inspectTimeState, DEFAULT_PERIODS, type TimeState } from '../time';
import { isDayPeriod, type DayPeriod, type WorldState } from '../../core/state/types';

export type { DayPeriod, WorldState };

export class WorldError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'WorldError';
  }
}

export const PERIOD_LABELS: Record<DayPeriod, string> = Object.fromEntries(
  DEFAULT_PERIODS.map((period) => [period.id, period.label]),
) as Record<DayPeriod, string>;

export function createInitialWorld(): WorldState {
  return timeStateToWorld(createInitialTime());
}

export function worldToTimeState(world: WorldState): TimeState {
  const inspected = inspectTimeState({
    day: world.day,
    periodId: world.period,
  });

  if (!inspected.ok || !isDayPeriod(inspected.value.periodId)) {
    throw new WorldError(inspected.ok ? 'O período da partida é inválido.' : inspected.reason);
  }

  return {
    day: inspected.value.day,
    periodId: inspected.value.periodId,
  };
}

export function timeStateToWorld(time: TimeState): WorldState {
  const inspected = inspectTimeState(time);
  if (!inspected.ok || !isDayPeriod(inspected.value.periodId)) {
    throw new WorldError(inspected.ok ? 'O período da partida é inválido.' : inspected.reason);
  }

  return {
    day: inspected.value.day,
    period: inspected.value.periodId,
  };
}

export function setPeriod(world: WorldState, period: DayPeriod): WorldState {
  return timeStateToWorld({
    day: worldToTimeState(world).day,
    periodId: period,
  });
}

export function describeWorld(world: WorldState): string {
  return formatTime(worldToTimeState(world));
}
