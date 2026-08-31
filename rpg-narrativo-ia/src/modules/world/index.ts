import type { DayPeriod, WorldState } from '../../core/state/types';

export type { DayPeriod, WorldState };

export const PERIOD_LABELS: Record<DayPeriod, string> = {
  alvorecer: 'Alvorecer',
  manha: 'Manhã',
  'meio-dia': 'Meio-dia',
  tarde: 'Tarde',
  entardecer: 'Entardecer',
  noite: 'Noite',
};

export function createInitialWorld(): WorldState {
  return {
    day: 1,
    period: 'alvorecer',
  };
}

export function setPeriod(world: WorldState, period: DayPeriod): WorldState {
  return {
    ...world,
    period,
  };
}

export function describeWorld(world: WorldState): string {
  return `Dia ${world.day} · ${PERIOD_LABELS[world.period]}`;
}
