import { describe, expect, it } from 'vitest';
import {
  DayCycleError,
  advanceDayCycle,
  getDaylightPhase,
  inspectDaylightPhaseConfig,
  interpretDayCycle,
  DEFAULT_PERIOD_PHASES,
  type DayCycleEvent,
  type DaylightPhase,
  type PeriodPhaseDefinition,
} from '../modules/day-cycle';
import {
  TimeError,
  advanceTime,
  createInitialTime,
  DEFAULT_PERIODS,
  MAX_ADVANCE_PERIODS,
  type PeriodDefinition,
  type TimeAdvanceResult,
  type TimeState,
} from '../modules/time';

const SHORT_DAY: readonly PeriodDefinition[] = [
  { id: 'alvorecer', label: 'Alvorecer' },
  { id: 'noite', label: 'Noite' },
];

const EXPECTED_PHASES: Record<string, DaylightPhase> = {
  alvorecer: 'twilight',
  manha: 'daylight',
  'meio-dia': 'daylight',
  tarde: 'daylight',
  entardecer: 'twilight',
  noite: 'night',
};

function freezeState(state: TimeState): TimeState {
  return Object.freeze({ ...state });
}

function freezeAdvanceResult(result: TimeAdvanceResult): TimeAdvanceResult {
  return Object.freeze({
    previous: freezeState(result.previous),
    current: freezeState(result.current),
    crossedPeriods: Object.freeze([...result.crossedPeriods]) as string[],
    daysAdvanced: result.daysAdvanced,
  });
}

function eventKey(event: DayCycleEvent): string {
  if (event.type === 'day.ended' || event.type === 'day.started') {
    return `${event.type}:${event.day}`;
  }

  return `${event.type}:${event.day}:${event.periodId}`;
}

describe('ciclo diário', () => {
  it('emite encerramento e início na transição simples entre períodos', () => {
    const result = advanceDayCycle(createInitialTime(), { periods: 1 });

    expect(result.time.previous).toEqual({ day: 1, periodId: 'alvorecer' });
    expect(result.time.current).toEqual({ day: 1, periodId: 'manha' });
    expect(result.time.crossedPeriods).toEqual(['manha']);
    expect(result.events).toEqual([
      { type: 'period.ended', day: 1, periodId: 'alvorecer' },
      { type: 'period.started', day: 1, periodId: 'manha' },
    ]);
    expect(result.phase).toBe('daylight');
  });

  it('emite a ordem exata dos eventos na virada do dia', () => {
    const night: TimeState = { day: 1, periodId: 'noite' };
    const result = advanceDayCycle(night, { periods: 1 });

    expect(result.time.current).toEqual({ day: 2, periodId: 'alvorecer' });
    expect(result.time.daysAdvanced).toBe(1);
    expect(result.events).toEqual([
      { type: 'period.ended', day: 1, periodId: 'noite' },
      { type: 'day.ended', day: 1 },
      { type: 'period.started', day: 2, periodId: 'alvorecer' },
      { type: 'day.started', day: 2 },
    ]);
    expect(result.phase).toBe('twilight');
  });

  it('emite a sequência cronológica ao atravessar vários períodos', () => {
    const afternoon: TimeState = { day: 1, periodId: 'tarde' };
    const time = advanceTime(afternoon, { periods: 4 });
    const result = interpretDayCycle(time);

    expect(result.time.current).toEqual({ day: 2, periodId: 'manha' });
    expect(result.events).toEqual([
      { type: 'period.ended', day: 1, periodId: 'tarde' },
      { type: 'period.started', day: 1, periodId: 'entardecer' },
      { type: 'period.ended', day: 1, periodId: 'entardecer' },
      { type: 'period.started', day: 1, periodId: 'noite' },
      { type: 'period.ended', day: 1, periodId: 'noite' },
      { type: 'day.ended', day: 1 },
      { type: 'period.started', day: 2, periodId: 'alvorecer' },
      { type: 'day.started', day: 2 },
      { type: 'period.ended', day: 2, periodId: 'alvorecer' },
      { type: 'period.started', day: 2, periodId: 'manha' },
    ]);
    expect(advanceDayCycle(afternoon, { periods: 4 }).events).toEqual(result.events);
  });

  it('emite a sequência completa ao atravessar vários dias', () => {
    const result = advanceDayCycle(createInitialTime(), { periods: 13 });
    const started = result.events.filter((event) => event.type === 'period.started');
    const ended = result.events.filter((event) => event.type === 'period.ended');
    const daysEnded = result.events.filter((event) => event.type === 'day.ended');
    const daysStarted = result.events.filter((event) => event.type === 'day.started');

    expect(result.time.current).toEqual({ day: 3, periodId: 'manha' });
    expect(result.time.daysAdvanced).toBe(2);
    expect(result.time.crossedPeriods).toHaveLength(13);
    expect(ended).toHaveLength(13);
    expect(started).toHaveLength(13);
    expect(started.map((event) => event.periodId)).toEqual(result.time.crossedPeriods);
    expect(daysEnded).toEqual([
      { type: 'day.ended', day: 1 },
      { type: 'day.ended', day: 2 },
    ]);
    expect(daysStarted).toEqual([
      { type: 'day.started', day: 2 },
      { type: 'day.started', day: 3 },
    ]);
    expect(result.events[0]).toEqual({ type: 'period.ended', day: 1, periodId: 'alvorecer' });
    expect(result.events.at(-1)).toEqual({ type: 'period.started', day: 3, periodId: 'manha' });
    expect(result.phase).toBe('daylight');
  });

  it('não emite eventos quando o custo é zero', () => {
    const night: TimeState = { day: 4, periodId: 'noite' };
    const result = advanceDayCycle(night, { periods: 0 });

    expect(result.time.previous).toEqual(night);
    expect(result.time.current).toEqual(night);
    expect(result.time.crossedPeriods).toEqual([]);
    expect(result.events).toEqual([]);
    expect(result.phase).toBe('night');
  });

  it('associa a fase visual correta a cada um dos seis períodos', () => {
    expect(DEFAULT_PERIODS.map((period) => period.id)).toEqual([
      'alvorecer',
      'manha',
      'meio-dia',
      'tarde',
      'entardecer',
      'noite',
    ]);
    expect(DEFAULT_PERIOD_PHASES.map((entry) => [entry.periodId, entry.phase])).toEqual([
      ['alvorecer', 'twilight'],
      ['manha', 'daylight'],
      ['meio-dia', 'daylight'],
      ['tarde', 'daylight'],
      ['entardecer', 'twilight'],
      ['noite', 'night'],
    ]);

    for (const period of DEFAULT_PERIODS) {
      expect(getDaylightPhase(period.id)).toBe(EXPECTED_PHASES[period.id]);
    }
  });

  it('devolve a fase correspondente ao período final do avanço', () => {
    expect(advanceDayCycle(createInitialTime(), { periods: 0 }).phase).toBe('twilight');
    expect(advanceDayCycle({ day: 1, periodId: 'manha' }, { periods: 1 }).phase).toBe('daylight');
    expect(advanceDayCycle({ day: 1, periodId: 'tarde' }, { periods: 1 }).phase).toBe('twilight');
    expect(advanceDayCycle({ day: 1, periodId: 'entardecer' }, { periods: 1 }).phase).toBe('night');
    expect(advanceDayCycle({ day: 1, periodId: 'noite' }, { periods: 1 }).phase).toBe('twilight');
    expect(interpretDayCycle(advanceTime({ day: 2, periodId: 'meio-dia' }, { periods: 1 })).phase).toBe('daylight');
  });

  it('produz os mesmos eventos e a mesma fase para os mesmos dados', () => {
    const state = createInitialTime();
    const cost = { periods: 8 };
    const first = advanceDayCycle(state, cost);
    const second = advanceDayCycle(state, cost);
    const interpreted = interpretDayCycle(advanceTime(state, cost));

    expect(first).toEqual(second);
    expect(first).toEqual(interpreted);
    expect(interpretDayCycle(first.time)).toEqual(first);
  });

  it('não duplica fronteiras atravessadas', () => {
    const result = advanceDayCycle(createInitialTime(), { periods: 13 });
    const keys = result.events.map(eventKey);

    expect(new Set(keys).size).toBe(result.events.length);
    expect(result.events.filter((event) => event.type === 'period.ended')).toHaveLength(result.time.crossedPeriods.length);
    expect(result.events.filter((event) => event.type === 'period.started')).toHaveLength(result.time.crossedPeriods.length);
    expect(result.events.filter((event) => event.type === 'day.ended')).toHaveLength(result.time.daysAdvanced);
    expect(result.events.filter((event) => event.type === 'day.started')).toHaveLength(result.time.daysAdvanced);
  });

  it('não omite períodos intermediários', () => {
    const result = advanceDayCycle(createInitialTime(), { periods: 3 });
    const started = result.events.filter((event) => event.type === 'period.started');
    const ended = result.events.filter((event) => event.type === 'period.ended');

    expect(result.time.crossedPeriods).toEqual(['manha', 'meio-dia', 'tarde']);
    expect(ended.map((event) => event.periodId)).toEqual(['alvorecer', 'manha', 'meio-dia']);
    expect(started.map((event) => event.periodId)).toEqual(['manha', 'meio-dia', 'tarde']);
    expect(result.events).toEqual([
      { type: 'period.ended', day: 1, periodId: 'alvorecer' },
      { type: 'period.started', day: 1, periodId: 'manha' },
      { type: 'period.ended', day: 1, periodId: 'manha' },
      { type: 'period.started', day: 1, periodId: 'meio-dia' },
      { type: 'period.ended', day: 1, periodId: 'meio-dia' },
      { type: 'period.started', day: 1, periodId: 'tarde' },
    ]);
  });

  it('não muta estado, custo, configuração, fases nem o resultado do relógio', () => {
    const state = freezeState({ day: 1, periodId: 'noite' });
    const cost = Object.freeze({ periods: 1 });
    const periods = Object.freeze(SHORT_DAY.map((period) => Object.freeze({ ...period })));
    const phases = Object.freeze(DEFAULT_PERIOD_PHASES.map((entry) => Object.freeze({ ...entry })));
    const snapshot = structuredClone(state);
    const time = freezeAdvanceResult(advanceTime(state, cost, periods));
    const timeSnapshot = structuredClone(time);

    const advanced = advanceDayCycle(state, cost, periods, phases);
    const interpreted = interpretDayCycle(time, periods, phases);

    expect(state).toEqual(snapshot);
    expect(cost.periods).toBe(1);
    expect(periods.map((period) => period.id)).toEqual(['alvorecer', 'noite']);
    expect(phases).toEqual(DEFAULT_PERIOD_PHASES);
    expect(time).toEqual(timeSnapshot);
    expect(advanced.events).toEqual(interpreted.events);
    expect(advanced.time).not.toBe(time);
    expect(interpreted.time.crossedPeriods).not.toBe(time.crossedPeriods);

    advanced.events.push({ type: 'day.started', day: 99 });
    advanced.time.crossedPeriods.push('alterado');
    interpreted.time.current.day = 99;
    expect(state).toEqual(snapshot);
    expect(time).toEqual(timeSnapshot);
  });

  it('rejeita configuração de fase inválida', () => {
    const duplicated: PeriodPhaseDefinition[] = [
      { periodId: 'alvorecer', phase: 'twilight' },
      { periodId: 'alvorecer', phase: 'night' },
    ];
    const incomplete: PeriodPhaseDefinition[] = [{ periodId: 'alvorecer', phase: 'twilight' }];

    expect(inspectDaylightPhaseConfig([]).ok).toBe(false);
    expect(inspectDaylightPhaseConfig([{ periodId: '', phase: 'night' }]).ok).toBe(false);
    expect(inspectDaylightPhaseConfig([{ periodId: 'alvorecer', phase: 'dusk' }]).ok).toBe(false);
    expect(inspectDaylightPhaseConfig(duplicated).ok).toBe(false);
    expect(inspectDaylightPhaseConfig(incomplete, DEFAULT_PERIODS).ok).toBe(false);
    expect(inspectDaylightPhaseConfig(DEFAULT_PERIOD_PHASES, DEFAULT_PERIODS).ok).toBe(true);

    expect(() => getDaylightPhase('alvorecer', [])).toThrow(DayCycleError);
    expect(() => getDaylightPhase('madrugada')).toThrow(DayCycleError);
    expect(() => advanceDayCycle(createInitialTime(), { periods: 1 }, DEFAULT_PERIODS, incomplete)).toThrow(
      DayCycleError,
    );
    expect(() => interpretDayCycle(advanceTime(createInitialTime(), { periods: 1 }), DEFAULT_PERIODS, duplicated)).toThrow(
      DayCycleError,
    );
  });

  it('usa o limite operacional do relógio existente', () => {
    const start = createInitialTime();
    const snapshot = structuredClone(start);
    const result = advanceDayCycle(start, { periods: MAX_ADVANCE_PERIODS });
    const started = result.events.filter((event) => event.type === 'period.started');

    expect(MAX_ADVANCE_PERIODS).toBe(10_000);
    expect(start).toEqual(snapshot);
    expect(result.time.crossedPeriods).toHaveLength(MAX_ADVANCE_PERIODS);
    expect(result.time.current).toEqual({ day: 1667, periodId: 'entardecer' });
    expect(result.time.daysAdvanced).toBe(1666);
    expect(started).toHaveLength(MAX_ADVANCE_PERIODS);
    expect(started[0]).toEqual({ type: 'period.started', day: 1, periodId: 'manha' });
    expect(started.at(-1)).toEqual({ type: 'period.started', day: 1667, periodId: 'entardecer' });
    expect(result.events.filter((event) => event.type === 'day.ended')).toHaveLength(1666);
    expect(result.phase).toBe('twilight');
    expect(() => advanceDayCycle(start, { periods: MAX_ADVANCE_PERIODS + 1 })).toThrow(DayCycleError);
  });

  it('propaga de forma controlada os erros de advanceTime', () => {
    const time = freezeState(createInitialTime());
    const invalidCost = Object.freeze({ periods: -1 });
    const overflow: TimeState = {
      day: Number.MAX_SAFE_INTEGER,
      periodId: DEFAULT_PERIODS[DEFAULT_PERIODS.length - 1].id,
    };

    expect(() => advanceDayCycle(time, invalidCost)).toThrow(DayCycleError);
    expect(() => advanceDayCycle(time, { periods: 1.5 })).toThrow(DayCycleError);
    expect(() => advanceDayCycle(time, { periods: MAX_ADVANCE_PERIODS + 1 })).toThrow(DayCycleError);
    expect(() => advanceDayCycle({ day: 1, periodId: 'madrugada' }, { periods: 1 })).toThrow(DayCycleError);
    expect(() => advanceDayCycle(overflow, { periods: 1 })).toThrow(DayCycleError);
    expect(time).toEqual(createInitialTime());

    try {
      advanceDayCycle(time, { periods: MAX_ADVANCE_PERIODS + 1 });
      expect.unreachable('deveria rejeitar o custo acima do limite');
    } catch (error) {
      expect(error).toBeInstanceOf(DayCycleError);
      expect(error).toMatchObject({ cause: expect.any(TimeError) });
      expect((error as DayCycleError).message).toBe(
        `O custo de tempo excede o limite operacional de ${MAX_ADVANCE_PERIODS} períodos.`,
      );
    }
  });
});
