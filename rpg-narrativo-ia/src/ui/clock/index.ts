import type { WorldState } from '../../core/state';
import {
  DEFAULT_PERIODS,
  MINUTES_PER_DAY,
  PERIOD_START_MINUTES,
  resolveCostMinutes,
  type TimeCost,
} from '../../modules/time';
import { worldMinute } from '../../modules/world';

/**
 * Exibição do relógio canônico do motor (minuto do dia). A preferência 24h/12h é do aparelho;
 * o motor nunca depende dela.
 */
export type ClockFormat = '24h' | '12h';

export function formatClock(minutes: number, format: ClockFormat): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const mins = String(normalized % 60).padStart(2, '0');
  if (format === '24h') return `${String(hours).padStart(2, '0')}:${mins}`;
  const suffix = hours < 12 ? 'AM' : 'PM';
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${mins} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'instantâneo';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** Duração concreta do custo a partir do horário do mundo, e o minuto absoluto do dia de chegada. */
export function durationFrom(cost: TimeCost, world: WorldState): { minutes: number; arrivesAt: number } {
  const start = worldMinute(world);
  const minutes = resolveCostMinutes(cost, { day: world.day, minute: start });
  return { minutes, arrivesAt: start + minutes };
}

/** "30 min · até 07:30" — com o horário de chegada; "instantâneo" quando não consome tempo. */
export function describeCost(cost: TimeCost, world: WorldState, format: ClockFormat): string {
  const { minutes, arrivesAt } = durationFrom(cost, world);
  if (minutes <= 0) return 'instantâneo';
  const night = crossesNightfall(worldMinute(world), minutes) ? ' · entra na noite' : '';
  return `${formatDuration(minutes)} · até ${formatClock(arrivesAt, format)}${night}`;
}

/** A ação começa antes das 19:00 e termina depois dela (avisa antes de o jogador escurecer o dia). */
export function crossesNightfall(startMinute: number, minutes: number): boolean {
  const nightfall = PERIOD_START_MINUTES.noite;
  const untilNightfall = startMinute < nightfall ? nightfall - startMinute : MINUTES_PER_DAY - startMinute + nightfall;
  const startsAtNight = startMinute >= nightfall || startMinute < PERIOD_START_MINUTES.alvorecer;
  return !startsAtNight && minutes >= untilNightfall;
}

// --- Preferência e contexto de exibição -------------------------------------------------------

const STORAGE_KEY = 'reset.clock.format';

export function readClockFormat(): ClockFormat {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === '12h' ? '12h' : '24h';
  } catch {
    return '24h';
  }
}

export function writeClockFormat(format: ClockFormat): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, format);
  } catch {
    // Preferência só de conforto: sem armazenamento, vale o padrão 24h.
  }
}

let current: { world: WorldState | null; format: ClockFormat } = { world: null, format: '24h' };

/** Definido pela tela de jogo a cada renderização, antes dos filhos, para os rótulos de custo. */
export function setClockContext(world: WorldState | null, format: ClockFormat): void {
  current = { world, format };
}

export function getClockContext(): { world: WorldState | null; format: ClockFormat } {
  return current;
}

export function periodLabel(world: WorldState): string {
  return DEFAULT_PERIODS.find((entry) => entry.id === world.period)?.label ?? world.period;
}

/** "Dia 3 · 07:40 · Manhã". */
export function describeWorldClock(world: WorldState, format: ClockFormat = current.format): string {
  return `Dia ${world.day} · ${formatClock(worldMinute(world), format)} · ${periodLabel(world)}`;
}
