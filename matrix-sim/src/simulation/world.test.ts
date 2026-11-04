import { describe, expect, it } from 'vitest';
import { advanceWorld, climateAt, createWorld, foodFrom } from './world';

describe('Geração do mundo', () => {
  it('reproduz o mesmo mundo e muda com outra semente', () => {
    const a = createWorld('origem');
    expect(createWorld('origem')).toEqual(a);
    expect(createWorld('outra').cells).not.toEqual(a.cells);
  });
  it('mantém coordenadas, valores e recursos válidos', () => {
    const world = createWorld('origem');
    expect(world.cells).toHaveLength(96 * 96);
    expect(world.cells.every((cell, index) => cell.x === index % world.size && cell.y === Math.floor(index / world.size)), 'coordenadas').toBe(true);
    expect(world.cells.every(cell => cell.elevation >= 0 && cell.elevation <= 1), 'altitude').toBe(true);
    expect(world.cells.every(cell => cell.moisture >= 0 && cell.moisture <= 1), 'umidade').toBe(true);
    expect(world.cells.every(cell => cell.food >= 0 && (!['water', 'sand', 'mountain'].includes(cell.terrain) || cell.food === 0)), 'alimento').toBe(true);
  });
  it('aumenta a área coberta por água sem alterar o relevo', () => {
    const low = createWorld('origem', 32, 0.2), high = createWorld('origem', 32, 0.65);
    expect(high.cells.filter(c => c.terrain === 'water').length).toBeGreaterThan(low.cells.filter(c => c.terrain === 'water').length);
    expect(high.cells.map(c => c.elevation)).toEqual(low.cells.map(c => c.elevation));
  });
  it('gera um mundo inicial com terra, água e alimento', () => {
    const world = createWorld('origem-001');
    expect(world.cells.some(c => c.terrain === 'water')).toBe(true);
    expect(world.cells.some(c => c.terrain === 'grass')).toBe(true);
    expect(world.cells.reduce((sum, c) => sum + c.food, 0)).toBeGreaterThan(0);
  });
  it('rejeita configurações inválidas', () => {
    expect(() => createWorld('')).toThrow();
    expect(() => createWorld('a', 0)).toThrow();
    expect(() => createWorld('a', 8.5)).toThrow();
    expect(() => createWorld('a', 96, NaN)).toThrow();
  });
});

describe('Ciclos ambientais', () => {
  it('reproduz o clima e troca de estação e ano nos limites definidos', () => {
    expect(climateAt('a', 0).season).toBe('Primavera');
    expect(climateAt('a', 90).season).toBe('Verão');
    expect(climateAt('a', 180).season).toBe('Outono');
    expect(climateAt('a', 270).season).toBe('Inverno');
    expect(climateAt('a', 360)).toEqual({ ...climateAt('a', 360), season: 'Primavera', year: 2 });
    expect(climateAt('a', 71)).toEqual(climateAt('a', 71));
  });
  it('avança sem modificar o original e independe do agrupamento dos dias', () => {
    const world = createWorld('origem', 16), original = JSON.stringify(world);
    const batch = advanceWorld(world, 20);
    let daily = world;
    for (let i = 0; i < 20; i++) daily = advanceWorld(daily);
    expect(batch).toEqual(daily);
    expect(batch.day).toBe(20);
    expect(JSON.stringify(world)).toBe(original);
    expect(advanceWorld(JSON.parse(JSON.stringify(batch)))).toEqual(advanceWorld(batch));
  });
  it('mantém recursos limitados durante um ano e deriva alimento da vegetação', () => {
    const world = advanceWorld(createWorld('origem-001', 16), 360);
    for (const cell of world.cells) {
      expect(cell.moisture).toBeGreaterThanOrEqual(0);
      expect(cell.moisture).toBeLessThanOrEqual(1);
      expect(cell.fertility).toBeGreaterThanOrEqual(0);
      expect(cell.fertility).toBeLessThanOrEqual(1);
      expect(cell.food).toBe(foodFrom(cell.vegetation));
      for (const amount of Object.values(cell.vegetation)) {
        expect(Number.isFinite(amount)).toBe(true);
        expect(amount).toBeGreaterThanOrEqual(0);
      }
      expect(cell.vegetation.grass).toBeLessThanOrEqual(100);
      expect(cell.vegetation.shrubs).toBeLessThanOrEqual(55);
      expect(cell.vegetation.trees).toBeLessThanOrEqual(120);
      expect(cell.vegetation.fruit).toBeLessThanOrEqual(60);
      if (['water', 'sand', 'mountain'].includes(cell.terrain)) expect(cell.food).toBe(0);
    }
  }, 30000);
  it('transforma matéria orgânica em fertilidade e reduz o crescimento na seca', () => {
    const world = createWorld('ecologia', 16);
    const index = world.cells.findIndex(c => c.terrain === 'grass' || c.terrain === 'forest');
    expect(index).toBeGreaterThanOrEqual(0);
    const prepare = (moisture: number, litter: number) => ({ ...world, cells: world.cells.map((c, i) => i === index ? { ...c, moisture, waterAccess: 0, fertility: 0.5, vegetation: { grass: 10, shrubs: 0, trees: 0, fruit: 0, litter } } : c) });
    const dry = advanceWorld(prepare(0, 0), 14).cells[index];
    const wet = advanceWorld(prepare(1, 0), 14).cells[index];
    const compost = advanceWorld(prepare(1, 20), 14).cells[index];
    expect(wet.vegetation.grass).toBeGreaterThan(dry.vegetation.grass);
    expect(compost.fertility).toBeGreaterThan(wet.fertility);
    expect(compost.vegetation.litter).toBeLessThan(20);
  });
  it('mantém vegetação e frutos estáveis entre os ciclos semanais', () => {
    const world = createWorld('origem-001', 16);
    expect(advanceWorld(world, 6).cells.map(c => c.vegetation)).toEqual(world.cells.map(c => c.vegetation));
    const weekly = advanceWorld(world, 7);
    expect(weekly.summary.grown).toBeGreaterThan(0);
    expect(weekly.summary.fruitChanged).toBeGreaterThan(0);
    expect(weekly.summary.recycled).toBe(0);
  });
  it('preserva a vegetação por 13 dias de frio intenso e só perde biomassa no ciclo seguinte', () => {
    const world = createWorld('origem-001', 16);
    const index = world.cells.findIndex(c => c.terrain === 'grass');
    const cold = { ...world, day: 280, cells: world.cells.map((c, i) => i === index ? { ...c, elevation: 1, stressDays: 0 } : c) };
    const before = cold.cells[index].vegetation;
    const protectedWorld = advanceWorld(cold, 13);
    expect(protectedWorld.cells[index].vegetation.grass).toBe(before.grass);
    expect(protectedWorld.cells[index].vegetation.trees).toBe(before.trees);
    const stressed = advanceWorld(protectedWorld);
    expect(stressed.cells[index].stressDays).toBe(14);
    expect(stressed.cells[index].vegetation.grass).toBeLessThan(before.grass);
    expect(stressed.summary.declined).toBeGreaterThan(0);
  });
  it('rejeita avanços fracionados, negativos e excessivos', () => {
    const world = createWorld('a', 8);
    for (const days of [0, -1, 1.5, 361, NaN]) expect(() => advanceWorld(world, days)).toThrow();
  });
});
