import {
  advanceClock,
  formatTime,
  inspectTimeState,
  isMinuteOfDay,
  periodAtMinute,
  periodEndMinute,
  periodStartMinute,
  DEFAULT_PERIODS,
  type ClockAdvance,
  type TimeState,
} from '../time';
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

/** A partida começa no Alvorecer do Dia 1. */
export function createInitialWorld(): WorldState {
  return { day: 1, period: 'alvorecer', minute: periodStartMinute('alvorecer') };
}

/** Minuto do dia efetivo: o declarado ou, em estados antigos, o início do período. */
export function worldMinute(world: WorldState): number {
  return world.minute ?? periodStartMinute(world.period);
}

/** Copia o mundo preservando o minuto quando ele existe. */
export function copyWorld(world: WorldState): WorldState {
  return world.minute === undefined
    ? { day: world.day, period: world.period }
    : { day: world.day, period: world.period, minute: world.minute };
}

/** O minuto, quando presente, precisa cair dentro do período declarado. */
export function isWorldClockConsistent(world: { period: string; minute?: unknown }): boolean {
  if (world.minute === undefined) return true;
  return isMinuteOfDay(world.minute) && periodAtMinute(world.minute) === world.period;
}

export function advanceWorld(world: WorldState, minutes: number): { world: WorldState; advance: ClockAdvance } {
  let advance: ClockAdvance;
  try {
    advance = advanceClock({ day: world.day, minute: worldMinute(world) }, minutes);
  } catch (error) {
    throw new WorldError(error instanceof Error ? error.message : 'O avanço do relógio é inválido.', { cause: error });
  }
  const period = periodAtMinute(advance.current.minute);
  return { world: { day: advance.current.day, period, minute: advance.current.minute }, advance };
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
    minute: periodStartMinute(inspected.value.periodId),
  };
}

export function setPeriod(world: WorldState, period: DayPeriod): WorldState {
  return timeStateToWorld({
    day: worldToTimeState(world).day,
    periodId: period,
  });
}

/** Minuto em que o período atual termina (útil para avisos de "vai até a noite"). */
export function minutesLeftInPeriod(world: WorldState): number {
  return periodEndMinute(world.period) - worldMinute(world);
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

  if (targetIndex <= currentIndex) return copyWorld(world);
  return timeStateToWorld({ day: current.day, periodId: period });
}

export function describeWorld(world: WorldState): string {
  return formatTime(worldToTimeState(world));
}
