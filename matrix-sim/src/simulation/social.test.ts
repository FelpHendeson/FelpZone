import { describe, expect, it } from 'vitest';
import { advanceLife, populateWorld, type Variant } from './creatures';
import { advanceSocialLife } from './social';
import { createWorld, type World } from './world';

function encounter(sameBand = true, variant: Variant = 'bosque'): World {
  const world = populateWorld(createWorld('social', 16), 2);
  return {
    ...world, day: 30,
    cells: world.cells.map(cell => ({ ...cell, terrain: 'grass', food: 0, vegetation: { grass: 0, shrubs: 0, trees: 0, fruit: 0, litter: 0 } })),
    life: { ...world.life,
      bands: [{ ...world.life.bands[0], id: 1, name: 'Bosque 1', variant: 'bosque', leaderId: 1, origin: 85, home: 85 }, ...(sameBand ? [] : [{ ...world.life.bands[0], id: 2, name: 'Outro bando', variant, leaderId: 2, origin: 86, home: 86 }])],
      creatures: world.life.creatures.map((c, i) => ({ ...c, x: 5, y: 5, age: 40, energy: 50, temperament: i ? 0 : 1, variant: i ? variant : 'bosque', bandId: sameBand || !i ? 1 : 2, lastConflictDay: -100 })),
    },
  };
}
function firstConflict(world: World) {
  // Same encounter across seeded days: verifies that the probabilistic trigger can occur.
  for (let day = 30; day < 230; day++) {
    const next = advanceSocialLife({ ...world, day });
    if (next.life.events.some(e => e.kind === 'conflict')) return next;
  }
  throw new Error('Nenhum confronto foi produzido.');
}

describe('variações e vida social', () => {
  it('atributos coletivos alteram os vencedores dos mesmos encontros', () => {
    const base = encounter(false, 'campina');
    const wins = (attack: number, defense: number) => {
      let total = 0;
      for (let day = 30; day < 230; day++) {
        const world = { ...base, day, life: { ...base.life, bands: base.life.bands.map(b => ({ ...b, updatedDay: day, attack: b.id === 1 ? attack : b.attack, defense: b.id === 2 ? defense : b.defense })) } };
        const result = advanceSocialLife(world);
        if (result.life.creatures.find(c => c.id === 1)?.action === 'disputing') total++;
      }
      return total;
    };
    expect(wins(0.95, 0.5)).toBeGreaterThan(wins(0.1, 0.5));
    expect(wins(0.5, 0.1)).toBeGreaterThan(wins(0.5, 0.95));
  });

  it('distribui quatro bandos entre origens de floresta e campina e preserva a origem ao andar', () => {
    const world = populateWorld(createWorld('origem-001'));
    expect(world.life.bands).toHaveLength(4);
    expect(new Set(world.life.creatures.map(c => c.variant))).toEqual(new Set(['bosque', 'campina']));
    for (const band of world.life.bands) {
      const members = world.life.creatures.filter(c => c.bandId === band.id);
      expect(members).toHaveLength(5);
      expect(members.every(c => c.variant === band.variant)).toBe(true);
      expect(world.cells[band.origin].terrain === 'forest').toBe(band.variant === 'bosque');
      expect(members.some(c => c.id === band.leaderId)).toBe(true);
    }
    expect(advanceLife({ ...world, day: 1 }).life.creatures.map(c => [c.id, c.variant, c.bandId])).toEqual(world.life.creatures.map(c => [c.id, c.variant, c.bandId]));
  });

  it.each([
    [true, 'bosque', 'dentro do bando'],
    [false, 'bosque', 'mesma variação'],
    [false, 'campina', 'entre Bosque e Campina'],
  ] as const)('permite disputa por escassez (mesmo bando: %s; variação: %s)', (sameBand, variant, text) => {
    const world = encounter(sameBand, variant), before = structuredClone(world);
    const next = firstConflict(world);
    expect(next.life.events.find(e => e.kind === 'conflict')?.text).toContain(text);
    expect(next.life.creatures.map(c => c.energy)).toEqual([44, 44]);
    expect(next.life.creatures.map(c => c.action).sort()).toEqual(['disputing', 'fleeing']);
    const loser = next.life.creatures.find(c => c.action === 'fleeing')!;
    expect(loser.relations[0].fear).toBeGreaterThan(0.3);
    expect(loser.relations[0].anger).toBeGreaterThan(0.4);
    expect(next.cells).toEqual(world.cells); // A briga nunca produz alimento ou consome o adversário.
    expect(next.life.deaths).toBe(0);
    expect(world).toEqual(before);
    expect(advanceSocialLife({ ...world, day: next.day })).toEqual(next);
    expect(advanceSocialLife(next).life.events).toEqual(next.life.events); // cooldown
  });

  it('permite desafiar e substituir o líder, mantendo o resultado nos históricos', () => {
    const world = encounter();
    world.life.creatures[0].temperament = 0;
    world.life.creatures[0].energy = 70;
    world.life.creatures[1].temperament = 1;
    world.life.creatures[1].energy = 100;
    const next = firstConflict(world);
    expect(next.life.bands[0].leaderId).toBe(2);
    expect(next.life.events.some(e => e.kind === 'leadership' && e.text.includes('tomou'))).toBe(true);
    expect(next.life.creatures.every(c => c.history.some(e => e.text.includes('pela liderança')))).toBe(true);
  });

  it('origens diferentes convivem sem confronto quando não há motivação', () => {
    const world = encounter(false, 'campina');
    world.life.creatures.forEach(c => { c.energy = 90; c.temperament = 0.5; });
    for (let day = 30; day < 100; day++) expect(advanceSocialLife({ ...world, day }).life.events.some(e => e.kind === 'conflict')).toBe(false);
  });

  it('uma agressão lembrada pode motivar revanche e mantém só seis relações', () => {
    const world = encounter(false, 'campina');
    world.life.creatures.forEach(c => {
      c.energy = 90;
      c.relations = Array.from({ length: 6 }, (_, i) => ({ id: 100 + i, fear: 0, anger: 0.1, lastDay: 1 }));
    });
    world.life.creatures[0].relations[0] = { id: 2, fear: 0.1, anger: 0.8, lastDay: 1 };
    const next = firstConflict(world);
    expect(next.life.events.find(e => e.kind === 'conflict')?.text).toContain('agressão lembrada');
    expect(next.life.creatures.every(c => c.relations.length === 6)).toBe(true);
  });

  it('o medo provoca afastamento no dia seguinte e as emoções diminuem', () => {
    const fought = firstConflict(encounter(false, 'campina'));
    const loser = fought.life.creatures.find(c => c.action === 'fleeing')!;
    const next = advanceLife({ ...fought, day: fought.day + 1 });
    const after = next.life.creatures.find(c => c.id === loser.id)!;
    expect(after.action).toBe('fleeing');
    expect(Math.abs(after.x - loser.x) + Math.abs(after.y - loser.y)).toBe(1);
    expect(after.relations[0].fear).toBeLessThan(loser.relations[0].fear);
    expect(after.relations[0].anger).toBeLessThan(loser.relations[0].anger);
  });

  it('escolhe um sucessor vivo e deixa bando extinto sem líder', () => {
    const world = encounter();
    world.life.creatures = world.life.creatures.filter(c => c.id !== 1);
    const next = advanceSocialLife(world);
    expect(next.life.bands[0].leaderId).toBe(2);
    expect(next.life.events.at(-1)?.kind).toBe('leadership');
    expect(advanceSocialLife({ ...next, life: { ...next.life, creatures: [] } }).life.bands[0].leaderId).toBeNull();
  });
});
