import { describe, expect, it } from 'vitest';
import { absorbEssence, deathResidue, ESSENCE, flowEssence } from './essence';
import { advanceLife, populateWorld } from './creatures';
import { advanceWorld, createWorld, type World } from './world';

const distance = (world: World, a: number, b: number) => Math.hypot(world.cells[a].x - world.cells[b].x, world.cells[a].y - world.cells[b].y);

describe('essência: geração', () => {
  it('cria de 3 a 5 nascentes nomeadas em terra, afastadas e reproduzíveis', () => {
    for (const seed of ['origem-001', 'essencia-a', 'essencia-b', 'mundo-xyz']) {
      const world = createWorld(seed);
      expect(world.essenceSources.length).toBeGreaterThanOrEqual(3);
      expect(world.essenceSources.length).toBeLessThanOrEqual(5);
      for (const s of world.essenceSources) {
        expect(['water', 'sand']).not.toContain(world.cells[s.index].terrain);
        expect(s.name).toMatch(/^(Nascente|Poço|Fonte|Olho|Veio) de [A-Z][a-z]+$/);
      }
      for (const a of world.essenceSources) for (const b of world.essenceSources) if (a !== b) expect(distance(world, a.index, b.index)).toBeGreaterThanOrEqual(world.size / 4);
      expect(createWorld(seed)).toEqual(world);
    }
  });
  it('concentra essência perto das nascentes e mantém tudo entre 0 e 1', () => {
    const world = createWorld('origem-001');
    const near = (i: number) => world.essenceSources.some(s => distance(world, s.index, i) <= 3);
    const far = (i: number) => world.essenceSources.every(s => distance(world, s.index, i) >= 20);
    const average = (pick: (i: number) => boolean) => { const values = world.cells.filter((_, i) => pick(i)).map(c => c.essenceBase); return values.reduce((a, b) => a + b, 0) / values.length; };
    expect(average(near)).toBeGreaterThan(average(far) + 0.3);
    expect(world.cells.every(c => c.essenceBase >= 0 && c.essenceBase <= 0.95 && c.essence === c.essenceBase)).toBe(true);
  });
  it('não altera o terreno de sementes existentes', () => {
    const world = createWorld('origem-001');
    const counts = world.cells.reduce((all, c) => { all[c.terrain]++; return all; }, { water: 0, sand: 0, grass: 0, forest: 0, mountain: 0 });
    // Snapshot of the terrain before essence existed: the essence stream is separate from the terrain stream.
    expect(counts).toEqual({ water: 1691, sand: 301, grass: 2337, forest: 3304, mountain: 1583 });
    expect(world.cells.reduce((s, c) => s + c.elevation + c.moisture + c.fertility + c.food, 0)).toBeCloseTo(78089.292096, 4);
  });
});

describe('essência: dinâmica', () => {
  it('recupera em direção ao nível natural e se espalha só nos dias semanais', () => {
    const world = createWorld('essencia-a', 16);
    const cells = world.cells.map(c => ({ ...c, essence: 0.2, essenceBase: 0.2 }));
    cells[5 * 16 + 5] = { ...cells[5 * 16 + 5], essence: 0, essenceBase: 0.6 };
    const recovered = flowEssence(cells, 5 * 16 + 5, 16, 1);
    expect(recovered).toBeCloseTo(0.6 * ESSENCE.regeneration);
    cells[5 * 16 + 6] = { ...cells[5 * 16 + 6], essence: 1 };
    expect(flowEssence(cells, 5 * 16 + 5, 16, 7)).toBeGreaterThan(flowEssence(cells, 5 * 16 + 5, 16, 6));
  });
  it('a morte deixa um pulso e uma marca duradoura no lugar', () => {
    const cell = { ...createWorld('essencia-a', 16).cells[0], essence: 0.1, essenceBase: 0.1 };
    const marked = deathResidue(cell, 60);
    expect(marked.essence).toBeCloseTo(0.1 + ESSENCE.deathPulse + 60 / ESSENCE.pointsPerUnit * 0.4);
    expect(marked.essenceBase).toBeCloseTo(0.1 + ESSENCE.deathMemory);
    expect(deathResidue({ ...cell, essence: 0.99, essenceBase: 0.95 }, 100)).toMatchObject({ essence: 1, essenceBase: 0.95 });
  });
});

describe('essência: Folhins', () => {
  it('o que a criatura absorve sai exatamente do chão', () => {
    const cell = { ...createWorld('essencia-a', 16).cells[0], essence: 0.5 };
    const { cell: after, points } = absorbEssence(cell, 0.8, 1);
    expect((cell.essence - after.essence) * ESSENCE.pointsPerUnit).toBeCloseTo(points);
    expect(absorbEssence({ ...cell, essence: 0 }, 1, 1).cell).toEqual({ ...cell, essence: 0 });
  });
  it('acumula essência, desperta uma única vez e registra o acontecimento', () => {
    let world = populateWorld(createWorld('origem-001'));
    const id = world.life.creatures[0].id;
    world = { ...world, life: { ...world.life, creatures: world.life.creatures.map(c => c.id === id ? { ...c, essence: ESSENCE.awakening - 0.0001, affinity: 1 } : c) } };
    world = { ...world, cells: world.cells.map(c => ({ ...c, essence: 0.9 })) };
    const awake = advanceLife(world, 1 / 20);
    const creature = awake.life.creatures.find(c => c.id === id)!;
    expect(creature.awakenedDay).toBe(world.day);
    expect(awake.life.events.filter(e => e.kind === 'essence' && e.creatureId === id)).toHaveLength(1);
    const again = advanceLife(awake, 1 / 20);
    expect(again.life.events.filter(e => e.kind === 'essence' && e.creatureId === id)).toHaveLength(1);
  });
  it('em 60 dias os Folhins acumulam essência e o mundo continua reproduzível', () => {
    const world = populateWorld(createWorld('origem-001'));
    const later = advanceWorld(world, 60);
    expect(later.life.creatures.some(c => c.essence > 5)).toBe(true);
    expect(later.life.creatures.every(c => c.essence >= 0 && c.essence <= 100 && c.affinity >= 0.3 && c.affinity <= 1)).toBe(true);
    expect(advanceWorld(JSON.parse(JSON.stringify(advanceWorld(world, 30))), 30)).toEqual(later);
  }, 60000);
});
