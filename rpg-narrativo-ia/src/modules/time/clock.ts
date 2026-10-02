import { DEFAULT_PERIODS, type DefaultPeriodId } from './periods';

/**
 * Relógio canônico em minutos. O mundo guarda o minuto do dia; o período é a faixa
 * em que esse minuto cai. O dia vira à meia-noite, como um relógio comum.
 */
export const MINUTES_PER_DAY = 24 * 60;

/** Limite operacional de um único avanço (30 dias), para rejeitar custos absurdos. */
export const MAX_ADVANCE_MINUTES = 30 * MINUTES_PER_DAY;

/** Minutos que um custo legado de 1 período representa para efeitos proporcionais (desgaste). */
export const NOMINAL_PERIOD_MINUTES = 240;

export const PERIOD_START_MINUTES: Readonly<Record<DefaultPeriodId, number>> = Object.freeze({
  madrugada: 0,
  alvorecer: 5 * 60,
  manha: 7 * 60,
  'meio-dia': 11 * 60,
  tarde: 14 * 60,
  entardecer: 17 * 60,
  noite: 19 * 60,
});

export const DAWN_MINUTE = PERIOD_START_MINUTES.alvorecer;

const ORDERED: readonly { id: DefaultPeriodId; start: number }[] = DEFAULT_PERIODS.map((period) => ({
  id: period.id,
  start: PERIOD_START_MINUTES[period.id],
}));

export interface ClockTime {
  day: number;
  minute: number;
}

export interface ClockAdvance {
  previous: ClockTime;
  current: ClockTime;
  minutes: number;
  /** Períodos iniciados durante o avanço, em ordem (um por fronteira cruzada). */
  crossedPeriods: DefaultPeriodId[];
  daysAdvanced: number;
}

export function isMinuteOfDay(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < MINUTES_PER_DAY;
}

export function periodAtMinute(minute: number): DefaultPeriodId {
  let found: DefaultPeriodId = ORDERED[0]!.id;
  for (const entry of ORDERED) {
    if (minute >= entry.start) found = entry.id;
  }
  return found;
}

export function periodStartMinute(periodId: string): number {
  const start = (PERIOD_START_MINUTES as Record<string, number>)[periodId];
  if (start === undefined) throw new Error('O período informado não existe.');
  return start;
}

/** Minuto em que o período termina (início do seguinte; 1440 para a Noite). */
export function periodEndMinute(periodId: string): number {
  const index = ORDERED.findIndex((entry) => entry.id === periodId);
  if (index < 0) throw new Error('O período informado não existe.');
  return ORDERED[index + 1]?.start ?? MINUTES_PER_DAY;
}

/** Minutos absolutos desde 00:00 do Dia 1. */
export function absoluteMinute(time: ClockTime): number {
  return (time.day - 1) * MINUTES_PER_DAY + time.minute;
}

export function fromAbsoluteMinute(absolute: number): ClockTime {
  return { day: Math.floor(absolute / MINUTES_PER_DAY) + 1, minute: absolute % MINUTES_PER_DAY };
}

export function advanceClock(time: ClockTime, minutes: number): ClockAdvance {
  if (!Number.isSafeInteger(minutes) || minutes < 0 || minutes > MAX_ADVANCE_MINUTES) {
    throw new Error('A duração da ação precisa ser um inteiro de minutos dentro do limite.');
  }
  const totalMinute = time.minute + minutes;
  const daysAdvanced = Math.floor(totalMinute / MINUTES_PER_DAY);
  if (daysAdvanced > Number.MAX_SAFE_INTEGER - time.day) {
    throw new Error('O avanço ultrapassa o dia máximo permitido.');
  }
  // Fronteiras contadas em minutos relativos ao início do dia atual, sem aritmética absoluta.
  const crossedPeriods: DefaultPeriodId[] = [];
  for (let dayOffset = 0; dayOffset <= daysAdvanced; dayOffset += 1) {
    for (const entry of ORDERED) {
      const boundary = dayOffset * MINUTES_PER_DAY + entry.start;
      if (boundary > time.minute && boundary <= totalMinute) crossedPeriods.push(entry.id);
    }
  }
  return {
    previous: { day: time.day, minute: time.minute },
    current: { day: time.day + daysAdvanced, minute: totalMinute % MINUTES_PER_DAY },
    minutes,
    crossedPeriods,
    daysAdvanced,
  };
}

/** Minutos até o início do `count`-ésimo período seguinte (semântica dos custos legados em períodos). */
export function minutesUntilPeriodBoundary(time: ClockTime, count: number): number {
  if (count <= 0) return 0;
  const perDay = ORDERED.length;
  const startIndex = ORDERED.findIndex((entry, index) => {
    const next = ORDERED[index + 1]?.start ?? MINUTES_PER_DAY;
    return time.minute >= entry.start && time.minute < next;
  });
  // O índice do período de chegada, contado a partir do período atual.
  const target = startIndex + count;
  const dayOffset = Math.floor(target / perDay);
  const boundary = dayOffset * MINUTES_PER_DAY + ORDERED[target % perDay]!.start;
  return boundary - time.minute;
}

/** Minutos até o próximo amanhecer (05:00). */
export function minutesUntilDawn(minute: number): number {
  return minute < DAWN_MINUTE ? DAWN_MINUTE - minute : MINUTES_PER_DAY - minute + DAWN_MINUTE;
}
