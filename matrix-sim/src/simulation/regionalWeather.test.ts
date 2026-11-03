import { describe, expect, it } from 'vitest';
import { createRegionalWeather } from './regionalWeather';
import { advanceWorld, createWorld } from './world';

describe('Clima regional', () => {
  it('tem chuva localizada e áreas sem precipitação no mesmo dia', () => {
    const world = createWorld('origem-001');
    expect(world.cells.some(c => c.precipitation === 'rain')).toBe(true);
    expect(world.cells.some(c => c.precipitation === 'none')).toBe(true);
    expect(new Set(world.cells.map(c => c.climateZone)).size).toBeGreaterThan(1);
  });
  it('o estado local controla a água recebida e reinicia apenas os contadores das áreas molhadas', () => {
    const original = createWorld('origem-001', 32);
    const world = { ...original, cells: original.cells.map(c => ({ ...c, moisture: 0.4, waterAccess: 0, dryDays: 6 })) };
    const next = advanceWorld(world);
    const wet = next.cells.filter(c => c.terrain !== 'water' && c.precipitation !== 'none');
    const dry = next.cells.filter(c => c.terrain !== 'water' && c.precipitation === 'none');
    expect(wet.length).toBeGreaterThan(0); expect(dry.length).toBeGreaterThan(0);
    for (const cell of wet) { expect(cell.moisture).toBeGreaterThan(0.4); expect(cell.dryDays).toBe(0); }
    for (const cell of dry) { expect(cell.moisture).toBeCloseTo(0.375); expect(cell.dryDays).toBe(7); }
  });
  it('mantém períodos secos longos sem perder a reprodução por semente ou snapshot', () => {
    const original = createWorld('origem-001', 16);
    const next = advanceWorld(original, 72);
    expect(Math.max(...next.cells.filter(c => c.terrain !== 'water').map(c => c.dryDays))).toBeGreaterThanOrEqual(18);
    expect(advanceWorld(original, 72)).toEqual(next);
    expect(advanceWorld(JSON.parse(JSON.stringify(next)), 7)).toEqual(advanceWorld(next, 7));
    expect(next.cells.map(c => c.climateZone)).toEqual(original.cells.map(c => c.climateZone));
  });
  it('chuva vira neve apenas onde a temperatura local permite', () => {
    const field = createRegionalWeather('origem-001', 32, 1);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const warm = field(x, y, 10), cold = field(x, y, -5);
      expect(cold.rainfall).toBe(warm.rainfall);
      expect(cold.precipitation).toBe(warm.precipitation === 'none' ? 'none' : 'snow');
      expect(warm.rainfall).toBeGreaterThanOrEqual(0); expect(warm.rainfall).toBeLessThanOrEqual(1);
    }
  });
  it('frentes vizinhas evoluem gradualmente entre dias consecutivos', () => {
    const one = createRegionalWeather('origem-001', 32, 8), two = createRegionalWeather('origem-001', 32, 9);
    let changed = 0;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (one(x, y, 10).precipitation !== two(x, y, 10).precipitation) changed++;
    expect(changed / 1024).toBeLessThan(0.25);
  });
});
