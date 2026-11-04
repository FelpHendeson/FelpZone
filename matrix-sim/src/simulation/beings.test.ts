import { describe, expect, it } from 'vitest';
import { advanceBeings, BEING, beingDefinitions, createBeings, devotion, type BeingDefinition } from './beings';
import { populateWorld } from './creatures';
import { advanceWorld, createWorld, type World } from './world';
import { applyFrame } from './frame';

const at = (world: World, index: number) => ({ x: index % world.size, y: Math.floor(index / world.size) });
const near = (world: World, a: number, b: number) => Math.abs(at(world, a).x - at(world, b).x) + Math.abs(at(world, a).y - at(world, b).y);
/** A being that only knows one act and never runs out of power: isolates each verb. */
function only(verb: 'bless' | 'rain' | 'name', world: World, extra: Partial<BeingDefinition['acts'][number]> = {}) {
  const def: BeingDefinition = { ...beingDefinitions[0], id: 'teste', acts: [{ verb, every: 1, cost: 0, radius: 6, amount: 0.25, ...extra }] };
  return { def, world: { ...world, beings: createBeings(world, [def]) } };
}

describe('seres primordiais: nascimento e poder', () => {
  it('nasce com o mundo na nascente mais forte e é reproduzível', () => {
    const world = createWorld('origem-001');
    const strongest = [...world.essenceSources].sort((a, b) => b.strength - a.strength)[0];
    expect(world.beings).toHaveLength(beingDefinitions.length);
    expect(world.beings[0]).toMatchObject({ id: 'aurenth', home: strongest.index, power: BEING.basePower, named: [] });
    expect(world.beings[0].history[0].text).toContain(strongest.name);
    expect(createWorld('origem-001').beings).toEqual(world.beings);
  });
  it('o poder cresce com a essência do lugar e com a devoção dos Folhins por perto', () => {
    const world = populateWorld(createWorld('origem-001'));
    const quiet = { ...world, day: 1, beings: world.beings.map(b => ({ ...b, power: 0, lastActs: { bless: 1, rain: 1, name: 1 } })) };
    const home = quiet.beings[0].home;
    const crowd = { ...quiet, life: { ...quiet.life, creatures: quiet.life.creatures.map(c => ({ ...c, x: at(quiet, home).x, y: at(quiet, home).y })) } };
    const empty = { ...quiet, life: { ...quiet.life, creatures: [] } };
    const gain = (w: World) => advanceBeings(w).beings[0].power;
    expect(devotion(crowd, crowd.beings[0], beingDefinitions[0]).near).toBe(20);
    expect(gain(crowd)).toBeGreaterThan(gain(empty));
    expect(gain({ ...empty, cells: empty.cells.map((c, i) => i === home ? { ...c, essence: 1 } : c) })).toBeGreaterThan(gain({ ...empty, cells: empty.cells.map((c, i) => i === home ? { ...c, essence: 0 } : c) }));
    expect(advanceBeings({ ...crowd, beings: crowd.beings.map(b => ({ ...b, power: 99.9 })) }).beings[0].power).toBe(BEING.maxPower);
  });
  it('sem poder, não age; com poder, gasta o custo e respeita o intervalo', () => {
    const world = { ...populateWorld(createWorld('origem-001')), day: 10 };
    const asleep = advanceBeings({ ...world, beings: world.beings.map(b => ({ ...b, power: 0 })) });
    expect(asleep.life.events.some(e => e.kind === 'divine')).toBe(false);
    const awake = advanceBeings(world);
    const bless = beingDefinitions[0].acts.find(a => a.verb === 'bless')!;
    expect(awake.beings[0].lastActs.bless).toBe(10);
    expect(awake.life.events.filter(e => e.kind === 'divine')).toHaveLength(1);
    const tomorrow = advanceBeings({ ...awake, day: 11 });
    expect(tomorrow.beings[0].lastActs.bless).toBe(10);
    expect(awake.beings[0].power).toBeLessThan(world.beings[0].power + 5 - bless.cost + 5);
  });
});

describe('seres primordiais: verbos', () => {
  it('abençoar aumenta a essência só dentro do alcance, mais forte no centro', () => {
    const { def, world } = only('bless', { ...createWorld('origem-001'), day: 5 });
    const after = advanceBeings(world, [def]), home = world.beings[0].home;
    const gain = (i: number) => after.cells[i].essence - world.cells[i].essence;
    const ring = world.cells.findIndex((_, i) => near(world, i, home) === 5);
    const outside = world.cells.findIndex((_, i) => near(world, i, home) === 9);
    expect(gain(home)).toBeGreaterThan(gain(ring));
    expect(gain(ring)).toBeGreaterThan(0);
    expect(gain(outside)).toBe(0);
    expect(after.cells.every(c => c.essence <= 1)).toBe(true);
  });
  it('fazer chover só acontece sobre seca real e zera os dias secos ao redor', () => {
    const { def, world } = only('rain', { ...createWorld('origem-001'), day: 5 }, { radius: 14, amount: 0.3, drought: 18 });
    const home = world.beings[0].home, target = world.cells.findIndex((c, i) => c.terrain !== 'water' && near(world, i, home) === 8);
    expect(advanceBeings(world, [def]).life.events.some(e => e.kind === 'divine')).toBe(false);
    const dry = { ...world, cells: world.cells.map((c, i) => i === target ? { ...c, dryDays: 30 } : c) };
    const rained = advanceBeings(dry, [def]);
    expect(rained.cells[target]).toMatchObject({ dryDays: 0, precipitation: 'rain' });
    expect(rained.cells[target].moisture).toBeGreaterThan(dry.cells[target].moisture);
    expect(rained.life.events.at(-1)?.text).toContain(`(${at(world, target).x}, ${at(world, target).y})`);
  });
  it('nomear escolhe o desperto mais forte do alcance, uma única vez, e o eleva', () => {
    const base = populateWorld(createWorld('origem-001'));
    const { def, world } = only('name', { ...base, day: 5 }, { radius: 10, amount: 20 });
    const home = at(world, world.beings[0].home);
    const placed = { ...world, life: { ...world.life, creatures: world.life.creatures.map((c, i) => ({ ...c, x: home.x, y: home.y, awakenedDay: i < 3 ? 1 : null, essence: 50 + i })) } };
    const strongest = placed.life.creatures[2];
    const first = advanceBeings(placed, [def]);
    const named = first.life.creatures.find(c => c.id === strongest.id)!;
    expect(named.trueName).toMatch(/^[A-Z][a-z]+$/);
    expect(named).toMatchObject({ patron: 'teste', essence: strongest.essence + 20, lifespan: strongest.lifespan + BEING.namedLife });
    expect(first.beings[0].named).toEqual([strongest.id]);
    expect(first.life.events.at(-1)).toMatchObject({ kind: 'divine', creatureId: strongest.id });
    const second = advanceBeings({ ...first, day: 6 }, [def]);
    expect(second.beings[0].named).toHaveLength(2);
    expect(second.beings[0].named).not.toContain(placed.life.creatures[5].id);
    const third = advanceBeings({ ...second, day: 7 }, [def]);
    expect(advanceBeings({ ...third, day: 8 }, [def]).beings[0].named).toHaveLength(3);
  });
});

describe('seres primordiais: motor', () => {
  it('um ser novo, declarado só aqui, funciona sem mudar o motor', () => {
    const custom: BeingDefinition = { id: 'vel', name: 'Vel', epithet: 'Senhora dos Picos', domain: 'Montanha', lore: '', color: '#9ad', glyph: '▲', dwells: 'highest-peak', reach: 5, acts: [{ verb: 'bless', every: 3, cost: 1, radius: 3, amount: 0.5 }] };
    const world = createWorld('origem-001');
    const [vel] = createBeings(world, [custom]);
    expect(world.cells[vel.home].elevation).toBe(Math.max(...world.cells.filter(c => c.terrain !== 'water').map(c => c.elevation)));
    const after = advanceBeings({ ...world, day: 3, beings: [vel] }, [custom]);
    expect(after.life.events.at(-1)?.text).toBe('Vel abençoou as terras ao redor de sua morada.');
  });
  it('age uma vez por dia durante a simulação, viaja no frame e é reproduzível', () => {
    const world = populateWorld(createWorld('origem-001', 32));
    const later = advanceWorld(world, 20);
    expect(later.beings[0].lastActs.bless).toBeGreaterThan(0);
    expect(advanceWorld(JSON.parse(JSON.stringify(advanceWorld(world, 10))), 10)).toEqual(later);
    const frame = { day: later.day, tick: later.tick, summary: later.summary, life: later.life, beings: later.beings, changes: [] };
    expect(applyFrame(world, frame).beings).toEqual(later.beings);
  }, 60000);
});
