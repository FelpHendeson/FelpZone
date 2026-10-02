import type { DayPeriod } from '../../core/state';
import { DEFAULT_PERIODS } from '../../modules/time';

/**
 * Relógio só de exibição (decisão do autor): o motor continua contando períodos; cada período
 * ganha uma faixa de horário canônica e a interface mostra horas e duração das ações.
 */
export type ClockFormat = '24h' | '12h';

const DAY_MINUTES = 24 * 60;

/** Início de cada período, em minutos desde 00:00. A Noite vai até 04:59 do dia seguinte. */
export const PERIOD_START_MINUTES: Readonly<Record<DayPeriod, number>> = {
  alvorecer: 5 * 60,
  manha: 7 * 60,
  'meio-dia': 11 * 60,
  tarde: 14 * 60,
  entardecer: 17 * 60,
  noite: 19 * 60,
};

const ORDER: readonly DayPeriod[] = ['alvorecer', 'manha', 'meio-dia', 'tarde', 'entardecer', 'noite'];

export function periodLengthMinutes(period: DayPeriod): number {
  const index = ORDER.indexOf(period);
  const next = ORDER[(index + 1) % ORDER.length]!;
  return (PERIOD_START_MINUTES[next] - PERIOD_START_MINUTES[period] + DAY_MINUTES) % DAY_MINUTES;
}

export function formatClock(minutes: number, format: ClockFormat): string {
  const normalized = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const hours = Math.floor(normalized / 60);
  const mins = String(normalized % 60).padStart(2, '0');
  if (format === '24h') return `${String(hours).padStart(2, '0')}:${mins}`;
  const suffix = hours < 12 ? 'AM' : 'PM';
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelve}:${mins} ${suffix}`;
}

/** Duração de um custo em períodos a partir do período atual (do início dele ao início do período de chegada). */
export function durationOf(periods: number, from: DayPeriod): { minutes: number; arrivesAt: number } {
  let minutes = 0;
  let index = ORDER.indexOf(from);
  for (let step = 0; step < periods; step += 1) {
    minutes += periodLengthMinutes(ORDER[index]!);
    index = (index + 1) % ORDER.length;
  }
  return { minutes, arrivesAt: PERIOD_START_MINUTES[from] + minutes };
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'alguns minutos';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function describeCost(periods: number, from: DayPeriod, format: ClockFormat): string {
  if (periods <= 0) return 'alguns minutos';
  const { minutes, arrivesAt } = durationOf(periods, from);
  return `${formatDuration(minutes)} · até ${formatClock(arrivesAt, format)}`;
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

let current: { period: DayPeriod | null; format: ClockFormat } = { period: null, format: '24h' };

/** Definido pela tela de jogo a cada renderização, antes dos filhos, para os rótulos de custo. */
export function setClockContext(period: DayPeriod | null, format: ClockFormat): void {
  current = { period, format };
}

export function getClockContext(): { period: DayPeriod | null; format: ClockFormat } {
  return current;
}

/** "Dia 3 · 07:00 · Manhã" — o horário é o início da faixa do período atual. */
export function describeWorldClock(world: { day: number; period: DayPeriod }, format: ClockFormat = current.format): string {
  const label = DEFAULT_PERIODS.find((entry) => entry.id === world.period)?.label ?? world.period;
  return `Dia ${world.day} · ${formatClock(PERIOD_START_MINUTES[world.period], format)} · ${label}`;
}
