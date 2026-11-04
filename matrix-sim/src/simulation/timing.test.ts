import { describe, expect, it } from 'vitest';
import { advanceTicks, advanceWorld, createWorld, type Cell } from './world';
import { populateWorld } from './creatures';
import { TICKS_PER_DAY } from './dayClock';
import { applyFrame } from './frame';

describe('ritmos independentes', () => {
  it('move habitantes antes da virada do dia sem envelhecê-los a cada passo', () => {
    const world = populateWorld(createWorld('origem-001', 24));
    const next = advanceTicks(world, 5);
    expect(next.day).toBe(0);
    expect(next.tick).toBe(5);
    expect(next.life.creatures.some(c => {
      const before = world.life.creatures.find(b => b.id === c.id)!;
      return before.x !== c.x || before.y !== c.y;
    })).toBe(true);
    expect(next.life.creatures.every(c => c.age === 0)).toBe(true);
    expect(advanceTicks(next, 15).life.creatures.every(c => c.age === 1)).toBe(true);
  });

  it('mantém a perda diária de energia e não multiplica a fome por vinte', () => {
    let world = populateWorld(createWorld('energia', 16), 1);
    world = { ...world, cells: world.cells.map(c => ({ ...c, food: 0, vegetation: { ...c.vegetation, grass: 0, shrubs: 0, fruit: 0 } })),
      life: { ...world.life, creatures: world.life.creatures.map(c => ({ ...c, energy: 100, curiosity: 0 })) } };
    const original = world.life.creatures[0];
    const next = advanceTicks(world, TICKS_PER_DAY).life.creatures[0];
    expect(next.energy).toBeCloseTo(100 - 2.8 * original.appetite);
    expect(next.age).toBe(1);
  });

  it('espalha crescimento e apodrecimento entre regiões durante o dia', () => {
    const start = advanceWorld(createWorld('origem-001', 24), 6);
    const partial = advanceTicks(start, 5);
    const completed = advanceTicks(partial, 15);
    const fertile = start.cells.filter(c => c.terrain === 'grass' || c.terrain === 'forest').length;
    const changes = partial.cells.filter((c, i) => c.vegetation !== start.cells[i].vegetation).length;
    expect(partial.day).toBe(6);
    expect(changes).toBeGreaterThan(0);
    expect(changes).toBeLessThan(fertile);
    expect(completed.cells.filter((c, i) => c.vegetation !== start.cells[i].vegetation)).toHaveLength(fertile);
    expect(completed.day).toBe(7);
    expect(completed.tick).toBe(0);
  });

  it('reproduz passos agrupados, snapshots no meio do dia e mensagens parciais', () => {
    const start = populateWorld(createWorld('snapshot', 16));
    const saved = advanceTicks(start, 7);
    expect(advanceTicks(JSON.parse(JSON.stringify(saved)), 53)).toEqual(advanceWorld(start, 3));
    const next = advanceTicks(saved, 4);
    const before = JSON.stringify(saved);
    const changes: [number, Cell][] = next.cells.flatMap((cell, index) => cell === saved.cells[index] ? [] : [[index, cell] as [number, Cell]]);
    const frame = structuredClone({ day: next.day, tick: next.tick, life: next.life, summary: next.summary, beings: next.beings, changes });
    expect(applyFrame(saved, frame)).toEqual(next);
    expect(JSON.stringify(saved)).toBe(before);
    expect(changes.length).toBeLessThan(saved.cells.length);
    expect(advanceTicks(next, 9)).toEqual(advanceTicks(saved, 13));
  });

  it('rejeita passos inválidos', () => {
    const world = createWorld('limites', 8);
    for (const ticks of [0, -1, 1.2, NaN, 7201]) expect(() => advanceTicks(world, ticks)).toThrow();
  });
});
