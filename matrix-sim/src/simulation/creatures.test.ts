import { describe, expect, it } from 'vitest';
import { advanceLife, graze, populateWorld, POPULATION_LIMIT, walkable } from './creatures';
import { edibleFood } from './food';
import { advanceTicks, advanceWorld, createWorld } from './world';

describe('Folhins', () => {
  it('introduz 20 indivíduos em terra conectada e reproduzível, sem alterar o original', () => {
    const world = createWorld('origem-001');
    const populated = populateWorld(world);
    expect(world.life.creatures).toHaveLength(0);
    expect(populated.life.creatures).toHaveLength(20);
    expect(populateWorld(world)).toEqual(populated);
    for (const c of populated.life.creatures) { expect(walkable(world.cells[c.y * world.size + c.x])).toBe(true); expect(c.species).toBe('folhim'); }
    expect(new Set(populated.life.creatures.map(c => c.id)).size).toBe(20);
  });
  it('consome matéria vegetal real e não come árvores diretamente nem cria energia sem alimento', () => {
    const world = createWorld('origem-001', 16);
    const original = world.cells.find(c => c.terrain === 'grass')!;
    const before = structuredClone(original);
    const meal = graze(original, 2);
    expect(meal.consumed).toBeCloseTo(2);
    expect(edibleFood(original.vegetation) - edibleFood(meal.cell.vegetation)).toBeCloseTo(2);
    expect(meal.cell.vegetation.trees).toBe(original.vegetation.trees);
    expect(original).toEqual(before);
    const bare = { ...original, vegetation: { grass: 0, shrubs: 0, trees: 100, fruit: 0, litter: 0 } };
    expect(graze(bare, 2).consumed).toBe(0);
  });
  it('usa passos seguros, conserva snapshots e independe do agrupamento dos dias', () => {
    const world = populateWorld(createWorld('origem-001', 32));
    const original = JSON.stringify(world);
    let daily = world;
    for (let tick = 0; tick < 80; tick++) {
      const next = advanceTicks(daily);
      for (const c of next.life.creatures) {
        const previous = daily.life.creatures.find(p => p.id === c.id);
        if (previous) expect(Math.abs(c.x - previous.x) + Math.abs(c.y - previous.y)).toBeLessThanOrEqual(1);
        expect(walkable(next.cells[c.y * next.size + c.x])).toBe(true);
        expect(c.energy).toBeGreaterThan(0); expect(c.energy).toBeLessThanOrEqual(100);
      }
      daily = next;
    }
    expect(daily).toEqual(advanceWorld(world, 4));
    expect(JSON.stringify(world)).toBe(original);
    expect(advanceWorld(JSON.parse(JSON.stringify(daily)))).toEqual(advanceWorld(daily));
    expect(daily.life.creatures.length).toBeLessThanOrEqual(POPULATION_LIMIT);
  });
  it('registra morte por fome e preserva o histórico recente do indivíduo', () => {
    let world = populateWorld(createWorld('origem-001', 16), 1);
    world = { ...world, day: 1, cells: world.cells.map(c => ({ ...c, food: 0, vegetation: { ...c.vegetation, grass: 0, shrubs: 0, fruit: 0 } })), life: { ...world.life, creatures: world.life.creatures.map(c => ({ ...c, energy: 0.1 })) } };
    const next = advanceLife(world);
    expect(next.life.creatures).toHaveLength(0);
    expect(next.life.deaths).toBe(1);
    expect(next.life.departed[0].history.at(-1)?.text).toContain('falta de alimento');
  });
  it('dois adultos próximos e bem alimentados geram um filhote com identidade e pais', () => {
    const original = populateWorld(createWorld('origem-001', 16), 2);
    const first = original.life.creatures[0];
    const world = { ...original, day: 40, life: { ...original.life, creatures: original.life.creatures.map(c => ({ ...c, x: first.x, y: first.y, age: 40, energy: 100, lastBirthDay: 0, curiosity: 0 })) } };
    const next = advanceLife(world);
    expect(next.life.births).toBe(1);
    expect(next.life.creatures).toHaveLength(3);
    expect(next.life.creatures.at(-1)?.parents).toEqual([1, 2]);
    expect(next.life.creatures.at(-1)?.generation).toBe(2);
    expect(next.life.creatures.at(-1)?.bandId).toBe(first.bandId);
    expect(next.life.creatures.at(-1)?.variant).toBe(first.variant);
    expect(next.life.nextId).toBe(4);
  });
  it('não introduz criaturas em um mundo sem alimento ou em quantidade inválida', () => {
    const world = createWorld('origem-001', 8);
    const bare = { ...world, cells: world.cells.map(c => ({ ...c, vegetation: { grass: 0, shrubs: 0, trees: 0, fruit: 0, litter: 0 } })) };
    expect(populateWorld(bare).life.creatures).toHaveLength(0);
    expect(() => populateWorld(world, -1)).toThrow();
  });
  // 120 days now execute 2,400 fine steps, including every inhabitant's decisions.
  it('mantém população, recursos e memórias consistentes durante 120 dias', () => {
    const world = advanceWorld(populateWorld(createWorld('origem-001', 24)), 120);
    expect(world.life.creatures.length).toBe(20 + world.life.births - world.life.deaths);
    expect(world.life.creatures.length).toBeLessThanOrEqual(POPULATION_LIMIT);
    expect(world.life.events.length).toBeLessThanOrEqual(40);
    expect(world.life.departed.length).toBeLessThanOrEqual(20);
    expect(world.life.creatures.every(c => c.history.length <= 8 && c.recentCells.length <= 8)).toBe(true);
    expect(world.life.creatures.every(c => c.relations.length <= 6 && c.relations.every(r => r.fear >= 0 && r.fear <= 1 && r.anger >= 0 && r.anger <= 1))).toBe(true);
    expect(world.life.bands.every(b => b.leaderId === null ? !world.life.creatures.some(c => c.bandId === b.id) : world.life.creatures.some(c => c.id === b.leaderId && c.bandId === b.id))).toBe(true);
    expect(world.cells.every(c => Object.values(c.vegetation).every(amount => Number.isFinite(amount) && amount >= 0))).toBe(true);
    expect(new Set(world.life.creatures.map(c => c.id)).size).toBe(world.life.creatures.length);
  }, 30_000);
});
