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

/**
 * Avança até um período posterior do mesmo dia sem permitir que conteúdo
 * narrativo faça o relógio retroceder. Alvos iguais ou anteriores mantêm o
 * horário atual; a passagem de dia continua sendo responsabilidade do ciclo.
 */
export function advancePeriodTo(world: WorldState, period: DayPeriod): WorldState {
  const current = worldToTimeState(world);
  const currentIndex = DEFAULT_PERIODS.findIndex((entry) => entry.id === current.periodId);
  const targetIndex = DEFAULT_PERIODS.findIndex((entry) => entry.id === period);

  return timeStateToWorld({
    day: current.day,
    periodId: targetIndex > currentIndex ? period : current.periodId,
  });
}

export function describeWorld(world: WorldState): string {
  return formatTime(worldToTimeState(world));
}
