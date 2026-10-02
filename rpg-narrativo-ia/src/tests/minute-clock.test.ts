import { describe, expect, it } from 'vitest';
import { inspectGameState, type GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { consumePortions } from '../modules/inventory';
import { shareOf } from '../modules/needs';
import { executeSandboxAction, SandboxActionError } from '../modules/sandbox-actions';
import { advanceClock, minutesUntilPeriodBoundary, periodAtMinute, resolveCostMinutes } from '../modules/time';
import { advanceWorld } from '../modules/world';
import { freshState } from './helpers';

const STAMP = '2026-10-02T12:00:00.000Z';

function valid(state: GameState): GameState {
  const inspected = inspectGameState(state);
  expect(inspected.ok, inspected.ok ? '' : inspected.reason).toBe(true);
  if (!inspected.ok) throw new Error(inspected.reason);
  return inspected.state;
}

function run(state: GameState, action: Parameters<typeof executeSandboxAction>[1]) {
  return executeSandboxAction(state, action, { now: () => STAMP });
}

describe('Relógio do mundo em minutos', () => {
  it('o período é a faixa do minuto do dia, com a madrugada antes do alvorecer', () => {
    expect(periodAtMinute(0)).toBe('madrugada');
    expect(periodAtMinute(4 * 60 + 59)).toBe('madrugada');
    expect(periodAtMinute(5 * 60)).toBe('alvorecer');
    expect(periodAtMinute(7 * 60)).toBe('manha');
    expect(periodAtMinute(11 * 60)).toBe('meio-dia');
    expect(periodAtMinute(14 * 60)).toBe('tarde');
    expect(periodAtMinute(17 * 60)).toBe('entardecer');
    expect(periodAtMinute(23 * 60 + 59)).toBe('noite');
  });

  it('o dia vira à meia-noite e cada fronteira cruzada é informada uma vez', () => {
    const advance = advanceClock({ day: 1, minute: 22 * 60 }, 8 * 60);
    expect(advance.current).toEqual({ day: 2, minute: 6 * 60 });
    expect(advance.daysAdvanced).toBe(1);
    expect(advance.crossedPeriods).toEqual(['madrugada', 'alvorecer']);
    expect(advanceClock({ day: 1, minute: 7 * 60 }, 30).crossedPeriods).toEqual([]);
    expect(() => advanceClock({ day: 1, minute: 0 }, -1)).toThrow();
  });

  it('custos legados em períodos andam até o início do período seguinte', () => {
    expect(minutesUntilPeriodBoundary({ day: 1, minute: 7 * 60 + 30 }, 1)).toBe(3 * 60 + 30);
    expect(minutesUntilPeriodBoundary({ day: 1, minute: 20 * 60 }, 1)).toBe(4 * 60);
    expect(resolveCostMinutes({ periods: 0, minutes: 25 }, { day: 1, minute: 0 })).toBe(25);
  });

  it('cada ação move o relógio pela própria duração e o mundo guarda o minuto', () => {
    const state = freshState();
    expect(state.world).toEqual({ day: 1, period: 'alvorecer', minute: 5 * 60 });
    const explored = run(state, { type: 'exploration.explore' });
    expect(explored.timeCost).toEqual({ periods: 0, minutes: 60 });
    expect(explored.current.world).toEqual({ day: 1, period: 'alvorecer', minute: 6 * 60 });
    const equipped = advanceWorld(explored.current.world, 2).world;
    expect(equipped).toEqual({ day: 1, period: 'alvorecer', minute: 6 * 60 + 2 });
  });

  it('salvar e carregar preserva o minuto; saves antigos sem minuto continuam válidos', () => {
    const explored = run(freshState(), { type: 'exploration.explore' }).current;
    const loaded = parseGameState(serializeGameState(explored));
    expect(loaded).toEqual({ status: 'ok', state: explored });
    const legacy = JSON.parse(serializeGameState(explored)) as { world: Record<string, unknown> };
    delete legacy.world.minute;
    const reloaded = parseGameState(JSON.stringify(legacy));
    expect(reloaded.status).toBe('ok');
    if (reloaded.status === 'ok') expect(reloaded.state.world).toEqual({ day: 1, period: 'alvorecer' });
  });
});

describe('Ações parciais', () => {
  it('explorar só parte do tempo rende progresso proporcional e é retomável', () => {
    const start = freshState();
    const short = run(start, { type: 'exploration.explore', minutes: 30 });
    const clearing = (state: GameState) =>
      state.sandbox.exploration.locations.find((entry) => entry.locationId === 'awakening-clearing');
    expect(short.timeCost).toEqual({ periods: 0, minutes: 30 });
    expect(clearing(short.current)?.progress).toBe(5);
    const resumed = run(short.current, { type: 'exploration.explore', minutes: 30 });
    expect(clearing(resumed.current)?.progress).toBe(10);
    const full = run(start, { type: 'exploration.explore' });
    expect(clearing(full.current)?.progress).toBe(10);
    expect(() => run(start, { type: 'exploration.explore', minutes: 5 })).toThrow(SandboxActionError);
  });

  it('beber um gole consome uma porção, deixa a unidade aberta e somar os goles dá a água inteira', () => {
    const thirsty = valid({
      ...freshState(),
      attributes: { ...freshState().attributes, sede: 90 },
      inventory: [{ itemId: 'raw-water', quantity: 2 }],
    });
    const sip = run(thirsty, { type: 'needs.consume', itemId: 'raw-water', portions: 1 });
    expect(sip.timeCost).toEqual({ periods: 0, minutes: 2 });
    expect(sip.current.inventory).toEqual([{ itemId: 'raw-water', quantity: 2, openPortions: 2 }]);
    expect(sip.current.attributes.sede).toBe(90 - 15);

    const finish = run(sip.current, { type: 'needs.consume', itemId: 'raw-water' });
    expect(finish.timeCost).toEqual({ periods: 0, minutes: 4 });
    expect(finish.current.inventory).toEqual([{ itemId: 'raw-water', quantity: 1 }]);
    expect(finish.current.attributes.sede).toBe(90 - 45);

    expect(() => run(sip.current, { type: 'needs.consume', itemId: 'raw-water', portions: 3 })).toThrow(SandboxActionError);
    const reloaded = parseGameState(serializeGameState(sip.current));
    expect(reloaded).toEqual({ status: 'ok', state: sip.current });
  });

  it('a divisão em porções é exata e consumir porções fecha unidades em ordem', () => {
    expect([0, 1, 2].map((index) => shareOf(45, { from: index, to: index + 1, of: 3 }))).toEqual([15, 15, 15]);
    expect([0, 1].map((index) => shareOf(-36, { from: index, to: index + 1, of: 2 }))).toEqual([-18, -18]);
    expect(shareOf(7, { from: 0, to: 1, of: 3 }) + shareOf(7, { from: 1, to: 3, of: 3 })).toBe(7);
    expect(consumePortions([{ itemId: 'x', quantity: 1, openPortions: 1 }], 'x', 1, 3)).toEqual([]);
    expect(consumePortions([{ itemId: 'x', quantity: 2 }], 'x', 4, 3)).toEqual([{ itemId: 'x', quantity: 1, openPortions: 2 }]);
  });
});
