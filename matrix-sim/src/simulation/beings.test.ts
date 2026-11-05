import { describe, expect, it } from 'vitest';
import { advanceBeings, BEING, beingDefinitions, createBeings, creatorOf, devotion, elementOf, genesisOrder, type BeingDefinition, type Verb } from './beings';
import { populateWorld } from './creatures';
import { advanceWorld, createWorld, type World } from './world';
import { applyFrame } from './frame';

const at = (world: World, index: number) => ({ x: index % world.size, y: Math.floor(index / world.size) });
const near = (world: World, a: number, b: number) => Math.abs(at(world, a).x - at(world, b).x) + Math.abs(at(world, a).y - at(world, b).y);
const defOf = (id: string) => beingDefinitions.find(d => d.id === id)!;
const stateOf = (world: World, id: string) => world.beings.find(b => b.id === id)!;
const resting = { bless: 1, rain: 1, name: 1, enrich: 1, grow: 1 };
/** A being that only knows one act and never runs out of power: isolates each verb. */
function only(verb: Verb, world: World, extra: Partial<BeingDefinition['acts'][number]> = {}) {
  const def: BeingDefinition = { ...defOf('aurenth'), id: 'teste', acts: [{ verb, every: 1, cost: 0, radius: 6, amount: 0.25, ...extra }] };
  return { def, world: { ...world, beings: createBeings(world, [def]) } };
}

describe('seres primordiais: as Regras da Existência', () => {
  it('criam uma entidade suprema por elemento, cada uma com habilidade principal e missão própria', () => {
    expect(beingDefinitions.map(d => d.element).sort()).toEqual(['earth', 'essence', 'forest', 'mountain', 'water']);
    for (const d of beingDefinitions) expect(d.core.name && d.core.description && d.personality && d.genesis && d.acts.length).toBeTruthy();
    expect(beingDefinitions.filter(d => d.creates)).toHaveLength(1);
    expect(new Set(Object.values(elementOf))).toEqual(new Set(['water', 'earth', 'mountain', 'forest']));
  });
  it('cada deus mora no lugar do seu elemento, e tudo é reproduzível', () => {
    const world = createWorld('origem-001');
    const strongest = [...world.essenceSources].sort((a, b) => b.strength - a.strength)[0];
    expect(world.beings).toHaveLength(5);
    expect(stateOf(world, 'aurenth')).toMatchObject({ home: strongest.index, power: BEING.basePower, named: [] });
    expect(stateOf(world, 'aurenth').history[0].text).toContain(strongest.name);
    expect(world.cells[stateOf(world, 'maelis').home].terrain).toBe('water');
    expect(world.cells[stateOf(world, 'verdanthe').home].terrain).toBe('forest');
    expect(world.cells[stateOf(world, 'dhoran').home].fertility).toBe(Math.max(...world.cells.map(c => c.fertility)));
    expect(world.cells[stateOf(world, 'kaltor').home].elevation).toBe(Math.max(...world.cells.filter(c => c.terrain !== 'water').map(c => c.elevation)));
    expect(createWorld('origem-001').beings).toEqual(world.beings);
  });
  it('a ordem da gênese não é fixa pelas regras, mas cada semente tem a sua', () => {
    const orders = ['origem-001', 'essencia-a', 'essencia-b', 'mundo-xyz', 'outro'].map(seed => genesisOrder(createWorld(seed, 32)).map(d => d.id).join(','));
    for (const order of orders) expect(order.split(',').sort()).toEqual(beingDefinitions.map(d => d.id).sort());
    expect(new Set(orders).size).toBeGreaterThan(1);
    expect(genesisOrder(createWorld('origem-001', 32))).toEqual(genesisOrder(createWorld('origem-001', 32)));
  });
  it('a espécie nasce pelas mãos de quem a criou', () => {
    const world = populateWorld(createWorld('origem-001'));
    expect(creatorOf('Folhins')?.id).toBe('verdanthe');
    expect(world.life.events[0].text).toBe('Verdanthe criou 20 Folhins em 4 bandos de origem regional.');
    expect(populateWorld({ ...createWorld('origem-001'), beings: [] }).life.events[0].text).toBe('20 Folhins chegaram em 4 bandos de origem regional.');
  });
});

describe('seres primordiais: poder', () => {
  it('o poder cresce com a essência do lugar e com a devoção dos Folhins por perto', () => {
    const world = populateWorld(createWorld('origem-001'));
    const quiet = { ...world, day: 1, beings: world.beings.map(b => ({ ...b, power: 0, lastActs: resting })) };
    const home = stateOf(quiet, 'aurenth').home;
    const crowd = { ...quiet, life: { ...quiet.life, creatures: quiet.life.creatures.map(c => ({ ...c, x: at(quiet, home).x, y: at(quiet, home).y })) } };
    const empty = { ...quiet, life: { ...quiet.life, creatures: [] } };
    const gain = (w: World) => stateOf(advanceBeings(w), 'aurenth').power;
    expect(devotion(crowd, stateOf(crowd, 'aurenth'), defOf('aurenth')).near).toBe(20);
    expect(gain(crowd)).toBeGreaterThan(gain(empty));
    expect(gain({ ...empty, cells: empty.cells.map((c, i) => i === home ? { ...c, essence: 1 } : c) })).toBeGreaterThan(gain({ ...empty, cells: empty.cells.map((c, i) => i === home ? { ...c, essence: 0 } : c) }));
    expect(stateOf(advanceBeings({ ...crowd, beings: crowd.beings.map(b => ({ ...b, power: 99.9 })) }), 'aurenth').power).toBe(BEING.maxPower);
  });
  it('sem poder, não age; com poder, gasta o custo e respeita o intervalo', () => {
    const world = { ...populateWorld(createWorld('origem-001')), day: 10 };
    const asleep = advanceBeings({ ...world, beings: world.beings.map(b => ({ ...b, power: 0 })) });
    expect(asleep.life.events.some(e => e.kind === 'divine')).toBe(false);
    const awake = advanceBeings(world);
    expect(stateOf(awake, 'kaltor').lastActs.bless).toBe(10);
    expect(awake.life.events.filter(e => e.kind === 'divine' && e.text.startsWith('Kaltor'))).toHaveLength(1);
    expect(stateOf(advanceBeings({ ...awake, day: 11 }), 'kaltor').lastActs.bless).toBe(10);
    const bless = defOf('kaltor').acts[0];
    expect(stateOf(awake, 'kaltor').power).toBeLessThan(BEING.basePower + 5 - bless.cost);
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
  it('fertilizar só toca solo de planície e floresta dentro do alcance', () => {
    const { def, world } = only('enrich', { ...createWorld('origem-001'), day: 5 }, { radius: 6, amount: 0.12 });
    const after = advanceBeings(world, [def]), home = world.beings[0].home;
    const changed = after.cells.flatMap((c, i) => c.fertility !== world.cells[i].fertility ? [i] : []);
    expect(changed.length).toBeGreaterThan(0);
    for (const i of changed) {
      expect(near(world, i, home)).toBeLessThanOrEqual(6);
      expect(['grass', 'forest']).toContain(world.cells[i].terrain);
      expect(after.cells[i].fertility).toBeGreaterThan(world.cells[i].fertility);
    }
  });
  it('florescer acelera a vegetação sem passar da capacidade natural', () => {
    const { def, world } = only('grow', { ...createWorld('origem-001'), day: 5 }, { radius: 6, amount: 0.12 });
    let w = world;
    for (let day = 5; day < 60; day++) w = advanceBeings({ ...w, day }, [def]);
    const home = world.beings[0].home;
    const touched = w.cells.flatMap((c, i) => c.vegetation !== world.cells[i].vegetation ? [i] : []);
    expect(touched.some(i => w.cells[i].food > world.cells[i].food)).toBe(true);
    for (const i of touched) {
      const v = w.cells[i].vegetation;
      expect(near(world, i, home)).toBeLessThanOrEqual(6);
      expect(v.grass).toBeLessThanOrEqual(w.cells[i].terrain === 'grass' ? 100 : 40);
      expect(v.shrubs).toBeLessThanOrEqual(55);
      expect(v.fruit).toBeLessThanOrEqual(60);
    }
  });
});

describe('seres primordiais: motor', () => {
  it('um ser novo, declarado só aqui, funciona sem mudar o motor', () => {
    const custom: BeingDefinition = { id: 'vel', name: 'Vel', epithet: 'a Senhora dos Picos', element: 'mountain', personality: '', lore: '', color: '#9ad', glyph: '▲', dwells: 'highest-peak', reach: 5, core: { name: 'Vento', description: '' }, genesis: '', acts: [{ verb: 'bless', every: 3, cost: 1, radius: 3, amount: 0.5 }] };
    const world = createWorld('origem-001');
    const [vel] = createBeings(world, [custom]);
    expect(world.cells[vel.home].elevation).toBe(Math.max(...world.cells.filter(c => c.terrain !== 'water').map(c => c.elevation)));
    const after = advanceBeings({ ...world, day: 3, beings: [vel] }, [custom]);
    expect(after.life.events.at(-1)?.text).toBe('Vel abençoou as terras ao redor de sua morada.');
  });
  it('age uma vez por dia durante a simulação, viaja no frame e é reproduzível', () => {
    const world = populateWorld(createWorld('origem-001', 32));
    const later = advanceWorld(world, 20);
    expect(later.beings.find(b => b.id === 'kaltor')!.lastActs.bless).toBeGreaterThan(0);
    expect(advanceWorld(JSON.parse(JSON.stringify(advanceWorld(world, 10))), 10)).toEqual(later);
    const frame = { day: later.day, tick: later.tick, summary: later.summary, life: later.life, beings: later.beings, changes: [] };
    expect(applyFrame(world, frame).beings).toEqual(later.beings);
  }, 60000);
});
