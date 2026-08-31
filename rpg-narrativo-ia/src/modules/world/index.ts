import { createInitialTime, formatTime, DEFAULT_PERIODS } from '../time';
import type { DayPeriod, WorldState } from '../../core/state/types';

export type { DayPeriod, WorldState };

export const PERIOD_LABELS: Record<DayPeriod, string> = Object.fromEntries(
  DEFAULT_PERIODS.map((period) => [period.id, period.label]),
) as Record<DayPeriod, string>;

export function createInitialWorld(): WorldState {
  const time = createInitialTime();
  return {
    day: time.day,
    period: time.periodId as DayPeriod,
  };
}

export function setPeriod(world: WorldState, period: DayPeriod): WorldState {
  return {
    ...world,
    period,
  };
}

export function describeWorld(world: WorldState): string {
  return formatTime({
    day: world.day,
    periodId: world.period,
  });
}
