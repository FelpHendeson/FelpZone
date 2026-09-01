import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyEffects } from '../core/effects';
import { SCHEMA_VERSION, createInitialState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  TimeError,
  advanceTime,
  createInitialTime,
  formatTime,
  getPeriod,
  inspectTimeConfig,
  inspectTimeCost,
  inspectTimeState,
  DEFAULT_PERIODS,
  MAX_ADVANCE_PERIODS,
  type PeriodDefinition,
  type TimeState,
} from '../modules/time';
import { createInitialWorld, describeWorld } from '../modules/world';

const SHORT_DAY: readonly PeriodDefinition[] = [
  { id: 'alvorecer', label: 'Alvorecer' },
  { id: 'noite', label: 'Noite' },
];

function freezeState(state: TimeState): TimeState {
  return Object.freeze({ ...state });
}

describe('horário e data', () => {
  it('cria o estado inicial no dia 1 ao alvorecer', () => {
    const time = createInitialTime();

    expect(time).toEqual({ day: 1, periodId: 'alvorecer' });
    expect(DEFAULT_PERIODS.map((period) => period.id)).toEqual([
      'alvorecer',
      'manha',
      'meio-dia',
      'tarde',
      'entardecer',
      'noite',
    ]);
    expect(getPeriod(time)).toEqual({ id: 'alvorecer', label: 'Alvorecer' });
  });

  it('avança dentro do mesmo dia', () => {
    const previous = createInitialTime();
    const result = advanceTime(previous, { periods: 2 });

    expect(result.previous).toEqual({ day: 1, periodId: 'alvorecer' });
    expect(result.current).toEqual({ day: 1, periodId: 'meio-dia' });
    expect(result.crossedPeriods).toEqual(['manha', 'meio-dia']);
    expect(result.daysAdvanced).toBe(0);
    expect(getPeriod(result.current)).toEqual({ id: 'meio-dia', label: 'Meio-dia' });
  });

  it('avança da noite para o alvorecer do dia seguinte', () => {
    const night: TimeState = { day: 1, periodId: 'noite' };
    const result = advanceTime(night, { periods: 1 });

    expect(result.previous).toEqual(night);
    expect(result.current).toEqual({ day: 2, periodId: 'alvorecer' });
    expect(result.crossedPeriods).toEqual(['alvorecer']);
    expect(result.daysAdvanced).toBe(1);
  });

  it('avança por vários períodos e informa os atravessados', () => {
    const afternoon: TimeState = { day: 1, periodId: 'tarde' };
    const result = advanceTime(afternoon, { periods: 4 });

    expect(result.current).toEqual({ day: 2, periodId: 'manha' });
    expect(result.crossedPeriods).toEqual(['entardecer', 'noite', 'alvorecer', 'manha']);
    expect(result.daysAdvanced).toBe(1);
  });

  it('avança por vários dias sem perder o período de destino', () => {
    const start = createInitialTime();
    const result = advanceTime(start, { periods: 13 });

    expect(result.current).toEqual({ day: 3, periodId: 'manha' });
    expect(result.daysAdvanced).toBe(2);
    expect(result.crossedPeriods).toHaveLength(13);
    expect(result.crossedPeriods[0]).toBe('manha');
    expect(result.crossedPeriods.at(-1)).toBe('manha');
    expect(result.crossedPeriods.filter((id) => id === 'alvorecer')).toEqual(['alvorecer', 'alvorecer']);
  });

  it('não altera o estado quando o custo é zero', () => {
    const night: TimeState = { day: 4, periodId: 'noite' };
    const result = advanceTime(night, { periods: 0 });

    expect(result.previous).toEqual(night);
    expect(result.current).toEqual(night);
    expect(result.crossedPeriods).toEqual([]);
    expect(result.daysAdvanced).toBe(0);
    expect(result.current).not.toBe(night);
    expect(result.previous).not.toBe(night);
  });

  it('rejeita custo negativo, fracionário ou não finito', () => {
    const time = createInitialTime();

    expect(inspectTimeCost({ periods: -1 }).ok).toBe(false);
    expect(inspectTimeCost({ periods: 1.5 }).ok).toBe(false);
    expect(inspectTimeCost({ periods: Number.NaN }).ok).toBe(false);
    expect(inspectTimeCost({ periods: Number.POSITIVE_INFINITY }).ok).toBe(false);
    expect(inspectTimeCost({ periods: Number.NEGATIVE_INFINITY }).ok).toBe(false);
    expect(inspectTimeCost({ periods: 0 }).ok).toBe(true);

    expect(() => advanceTime(time, { periods: -1 })).toThrow(TimeError);
    expect(() => advanceTime(time, { periods: 2.2 })).toThrow(TimeError);
    expect(() => advanceTime(time, { periods: Number.NaN })).toThrow(TimeError);
    expect(() => advanceTime(time, { periods: Number.POSITIVE_INFINITY })).toThrow(TimeError);
  });

  it('rejeita configuração vazia', () => {
    const inspected = inspectTimeConfig([]);

    expect(inspected.ok).toBe(false);
    expect(() => createInitialTime([])).toThrow(TimeError);
    expect(() => advanceTime(createInitialTime(), { periods: 1 }, [])).toThrow(TimeError);
  });

  it('rejeita identificadores de período repetidos', () => {
    const duplicated: PeriodDefinition[] = [
      { id: 'alvorecer', label: 'Alvorecer' },
      { id: 'alvorecer', label: 'Outro alvorecer' },
    ];

    expect(inspectTimeConfig(duplicated).ok).toBe(false);
    expect(() => createInitialTime(duplicated)).toThrow(TimeError);
  });

  it('rejeita período inexistente no estado', () => {
    const invalid: TimeState = { day: 1, periodId: 'madrugada' };

    expect(inspectTimeState(invalid).ok).toBe(false);
    expect(() => getPeriod(invalid)).toThrow(TimeError);
    expect(() => formatTime(invalid)).toThrow(TimeError);
    expect(() => advanceTime(invalid, { periods: 1 })).toThrow(TimeError);
  });

  it('formata dia e período em português', () => {
    expect(formatTime(createInitialTime())).toBe('Dia 1 · Alvorecer');
    expect(formatTime({ day: 2, periodId: 'manha' })).toBe('Dia 2 · Manhã');
    expect(formatTime({ day: 3, periodId: 'meio-dia' })).toBe('Dia 3 · Meio-dia');
    expect(formatTime({ day: 8, periodId: 'entardecer' })).toBe('Dia 8 · Entardecer');
    expect(describeWorld(createInitialWorld())).toBe('Dia 1 · Alvorecer');
  });

  it('não muta o estado, o custo nem a configuração', () => {
    const state = freezeState({ day: 1, periodId: 'noite' });
    const cost = Object.freeze({ periods: 1 });
    const config = Object.freeze(SHORT_DAY.map((period) => Object.freeze({ ...period })));
    const snapshot = structuredClone(state);

    const result = advanceTime(state, cost, config);

    expect(state).toEqual(snapshot);
    expect(cost.periods).toBe(1);
    expect(config.map((period) => period.id)).toEqual(['alvorecer', 'noite']);
    expect(result.current).toEqual({ day: 2, periodId: 'alvorecer' });
    expect(result.daysAdvanced).toBe(1);
    expect(result.previous).not.toBe(state);
    expect(result.current).not.toBe(state);

    result.current.day = 99;
    result.crossedPeriods.push('alterado');
    expect(state).toEqual(snapshot);
  });

  it('valida persistência do relógio e rejeita estados malformados', () => {
    expect(inspectTimeState({ day: 1, periodId: 'tarde' })).toEqual({
      ok: true,
      value: { day: 1, periodId: 'tarde' },
    });
    expect(inspectTimeState({ day: 1, periodId: 'tarde', periodIndex: 99 })).toEqual({
      ok: true,
      value: { day: 1, periodId: 'tarde' },
    });

    expect(inspectTimeState({ day: 0, periodId: 'alvorecer' }).ok).toBe(false);
    expect(inspectTimeState({ day: -2, periodId: 'alvorecer' }).ok).toBe(false);
    expect(inspectTimeState({ day: 1.4, periodId: 'alvorecer' }).ok).toBe(false);
    expect(inspectTimeState({ day: Number.NaN, periodId: 'alvorecer' }).ok).toBe(false);
    expect(inspectTimeState({ day: 1, periodId: '' }).ok).toBe(false);
    expect(inspectTimeState({ day: 1 }).ok).toBe(false);
    expect(inspectTimeState(null).ok).toBe(false);

    const game = createInitialState(
      { firstName: 'Ana', lastName: 'Cruz' },
      firstDayCampaign,
      () => '2026-08-31T12:00:00.000Z',
    );
    const raw = JSON.parse(serializeGameState(game)) as { schemaVersion: number; world: unknown };

    expect(game.schemaVersion).toBe(SCHEMA_VERSION);
    expect(raw.schemaVersion).toBe(SCHEMA_VERSION);
    expect(raw.world).toEqual({ day: 1, period: 'alvorecer' });
    expect(parseGameState(serializeGameState(game))).toEqual({ status: 'ok', state: game });

    const invalidPeriod = { ...raw, world: { day: 1, period: 'madrugada' } };
    const invalidDay = { ...raw, world: { day: 0, period: 'alvorecer' } };
    expect(parseGameState(JSON.stringify(invalidPeriod)).status).toBe('corrupt');
    expect(parseGameState(JSON.stringify(invalidDay)).status).toBe('corrupt');
  });

  it('reaproveita o mundo persistido sem avançar o dia no efeito administrativo atual', () => {
    const state = createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, () => 't0');
    const next = applyEffects(state, [{ type: 'world.period', period: 'noite' }]);

    expect(createInitialWorld()).toEqual({ day: 1, period: 'alvorecer' });
    expect(state.world).toEqual({ day: 1, period: 'alvorecer' });
    expect(next.world).toEqual({ day: 1, period: 'noite' });
    expect(next.world).not.toBe(state.world);
  });

  it('rejeita dia maior que Number.MAX_SAFE_INTEGER', () => {
    expect(inspectTimeState({ day: Number.MAX_SAFE_INTEGER, periodId: 'alvorecer' }).ok).toBe(true);
    expect(inspectTimeState({ day: Number.MAX_SAFE_INTEGER + 1, periodId: 'alvorecer' }).ok).toBe(false);
  });

  it('rejeita custo maior que Number.MAX_SAFE_INTEGER', () => {
    expect(inspectTimeCost({ periods: Number.MAX_SAFE_INTEGER }).ok).toBe(false);
    expect(inspectTimeCost({ periods: Number.MAX_SAFE_INTEGER + 1 }).ok).toBe(false);
    expect(() => advanceTime(createInitialTime(), { periods: Number.MAX_SAFE_INTEGER })).toThrow(TimeError);
    expect(() => advanceTime(createInitialTime(), { periods: Number.MAX_SAFE_INTEGER + 1 })).toThrow(TimeError);
  });

  it('rejeita custo superior ao limite operacional', () => {
    const inspected = inspectTimeCost({ periods: MAX_ADVANCE_PERIODS + 1 });

    expect(MAX_ADVANCE_PERIODS).toBe(10_000);
    expect(inspected.ok).toBe(false);
    expect(() => advanceTime(createInitialTime(), { periods: MAX_ADVANCE_PERIODS + 1 })).toThrow(TimeError);
  });

  it('aceita e calcula o custo exatamente no limite operacional', () => {
    const start = createInitialTime();
    const snapshot = structuredClone(start);
    const result = advanceTime(start, { periods: MAX_ADVANCE_PERIODS });

    expect(inspectTimeCost({ periods: MAX_ADVANCE_PERIODS }).ok).toBe(true);
    expect(start).toEqual(snapshot);
    expect(result.crossedPeriods).toHaveLength(MAX_ADVANCE_PERIODS);
    expect(result.current).toEqual({ day: 1667, periodId: 'entardecer' });
    expect(result.daysAdvanced).toBe(1666);
    expect(result.crossedPeriods[0]).toBe('manha');
    expect(result.crossedPeriods.at(-1)).toBe('entardecer');
  });

  it('lança TimeError se o dia resultante ultrapassar Number.MAX_SAFE_INTEGER', () => {
    const lastPeriod = DEFAULT_PERIODS[DEFAULT_PERIODS.length - 1];
    const atLastPeriod: TimeState = {
      day: Number.MAX_SAFE_INTEGER,
      periodId: lastPeriod.id,
    };
    const snapshot = structuredClone(atLastPeriod);

    expect(() => advanceTime(atLastPeriod, { periods: 1 })).toThrow(TimeError);
    expect(atLastPeriod).toEqual(snapshot);

    const sameDay = advanceTime({ day: Number.MAX_SAFE_INTEGER, periodId: 'alvorecer' }, { periods: 1 });
    expect(sameDay.current).toEqual({ day: Number.MAX_SAFE_INTEGER, periodId: 'manha' });
    expect(sameDay.daysAdvanced).toBe(0);
  });

  it('valida custos enormes antes de um loop potencialmente enorme', () => {
    const time = freezeState(createInitialTime());
    const hugeCost = Object.freeze({ periods: Number.MAX_SAFE_INTEGER });

    expect(inspectTimeCost(hugeCost).ok).toBe(false);
    expect(() => advanceTime(time, hugeCost)).toThrow(TimeError);
    expect(time).toEqual(createInitialTime());
  });

  it('mantém persistência compatível e rejeita dia inseguro no save', () => {
    const game = createInitialState(
      { firstName: 'Ana', lastName: 'Cruz' },
      firstDayCampaign,
      () => '2026-08-31T12:00:00.000Z',
    );
    const raw = JSON.parse(serializeGameState(game)) as { schemaVersion: number; world: Record<string, unknown> };

    expect(raw.schemaVersion).toBe(SCHEMA_VERSION);
    expect(raw.world).toEqual({ day: 1, period: 'alvorecer' });
    expect(parseGameState(serializeGameState(game))).toEqual({ status: 'ok', state: game });
    expect(
      parseGameState(
        JSON.stringify({
          ...raw,
          world: { day: Number.MAX_SAFE_INTEGER + 1, period: 'alvorecer' },
        }),
      ).status,
    ).toBe('corrupt');
  });
});
