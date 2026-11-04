import type { Cell, World } from './world';
import type { Creature, LifeEvent } from './creatures';

/**
 * Primordial beings are declared here, like skills. A definition says where the being lives, how it gathers power
 * and which acts it performs. Acts use a small vocabulary of engine verbs, so a new being needs no engine code:
 * add a block to `beingDefinitions`.
 */
export type Verb = 'bless' | 'rain' | 'name';
export type Act = {
  verb: Verb; every: number; cost: number; radius: number;
  /** bless: essence added at the center; rain: moisture added; name: essence given to the named Folhim. */
  amount: number;
  /** rain only: the driest region must have gone this many days without precipitation. */
  drought?: number;
};
export type BeingDefinition = {
  id: string; name: string; epithet: string; domain: string; lore: string; color: string; glyph: string;
  /** Where the being dwells, chosen once when the world is born. */
  dwells: 'strongest-source' | 'highest-peak';
  /** Folhins within this many regions of its home are its devotees. */
  reach: number;
  acts: Act[];
};
export type BeingState = { id: string; home: number; power: number; lastActs: Partial<Record<Verb, number>>; named: number[]; history: { day: number; text: string }[] };

export const beingDefinitions: BeingDefinition[] = [{
  id: 'aurenth', name: 'Aurenth', epithet: 'Guardião das Nascentes', domain: 'Essência e chuva',
  lore: 'Dizem que Aurenth é a primeira gota de essência que decidiu ficar. Habita a nascente mais forte do mundo, rega as terras secas ao redor e dá nome aos Folhins que o escutam.',
  color: '#f0d58a', glyph: '✺', dwells: 'strongest-source', reach: 12,
  acts: [
    { verb: 'bless', every: 7, cost: 8, radius: 6, amount: 0.25 },
    { verb: 'rain', every: 10, cost: 15, radius: 14, amount: 0.3, drought: 18 },
    { verb: 'name', every: 30, cost: 35, radius: 10, amount: 20 },
  ],
}];
export const verbNames: Record<Verb, string> = { bless: 'Abençoar', rain: 'Fazer chover', name: 'Nomear' };
export const BEING = { maxPower: 100, basePower: 30, namedLife: 60, namedAffinity: 0.1 } as const;
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const distance = (size: number, a: number, x: number, y: number) => Math.abs(a % size - x) + Math.abs(Math.floor(a / size) - y);
const definitionOf = (id: string, definitions: BeingDefinition[]) => definitions.find(d => d.id === id);

function chooseHome(world: World, def: BeingDefinition) {
  if (def.dwells === 'strongest-source' && world.essenceSources.length) return [...world.essenceSources].sort((a, b) => b.strength - a.strength || a.index - b.index)[0].index;
  return world.cells.reduce((best, cell, index) => cell.terrain !== 'water' && cell.elevation > world.cells[best].elevation ? index : best, 0);
}
export function createBeings(world: World, definitions = beingDefinitions): BeingState[] {
  return definitions.map(def => ({ id: def.id, home: chooseHome(world, def), power: BEING.basePower, lastActs: {}, named: [], history: [{ day: world.day, text: `Despertou junto a ${world.essenceSources.find(s => s.index === chooseHome(world, def))?.name ?? 'um pico'}.` }] }));
}

const syllables = ['ae', 'lu', 'ven', 'ka', 'mir', 'ta', 'so', 'ri', 'ul', 'na', 'eth', 'or', 'phe', 'zi', 'lan', 'do'];
function trueName(seed: string, id: number) {
  let state = 0;
  for (const char of `${seed}:${id}:nome`) state = (Math.imul(state, 31) + char.charCodeAt(0)) >>> 0;
  const pick = () => { state = (Math.imul(state, 1103515245) + 12345) >>> 0; return syllables[state % syllables.length]; };
  const word = pick() + pick() + (state % 3 === 0 ? pick() : '');
  return word[0].toUpperCase() + word.slice(1);
}

/** Devotees are living Folhins within reach; named ones count three times. */
export function devotion(world: World, state: BeingState, def: BeingDefinition) {
  const x = state.home % world.size, y = Math.floor(state.home / world.size);
  const near = world.life.creatures.filter(c => Math.abs(c.x - x) + Math.abs(c.y - y) <= def.reach).length;
  const named = world.life.creatures.filter(c => state.named.includes(c.id)).length;
  return { near, named };
}

type Outcome = { cells: Cell[]; creatures: Creature[]; text: string; creatureId: number } | null;
const verbs: Record<Verb, (world: World, state: BeingState, def: BeingDefinition, act: Act, cells: Cell[], creatures: Creature[]) => Outcome> = {
  bless(world, state, def, act, cells) {
    const hx = state.home % world.size, hy = Math.floor(state.home / world.size);
    for (let i = 0; i < cells.length; i++) {
      const d = distance(world.size, i, hx, hy);
      if (d <= act.radius) cells[i] = { ...cells[i], essence: clamp(cells[i].essence + act.amount * (1 - d / (act.radius + 1))) };
    }
    return { cells, creatures: world.life.creatures, text: `${def.name} abençoou as terras ao redor de sua morada.`, creatureId: 0 };
  },
  rain(world, state, def, act, cells) {
    const hx = state.home % world.size, hy = Math.floor(state.home / world.size);
    let driest = -1;
    for (let i = 0; i < cells.length; i++) if (cells[i].terrain !== 'water' && distance(world.size, i, hx, hy) <= act.radius && (driest < 0 || cells[i].dryDays > cells[driest].dryDays)) driest = i;
    if (driest < 0 || cells[driest].dryDays < (act.drought ?? 0)) return null;
    const cx = driest % world.size, cy = Math.floor(driest / world.size);
    for (let i = 0; i < cells.length; i++) {
      const d = distance(world.size, i, cx, cy);
      if (d <= 4 && cells[i].terrain !== 'water') cells[i] = { ...cells[i], moisture: clamp(cells[i].moisture + act.amount * (1 - d / 5)), dryDays: 0, precipitation: 'rain' };
    }
    return { cells, creatures: world.life.creatures, text: `${def.name} fez chover sobre a seca em (${cx}, ${cy}).`, creatureId: 0 };
  },
  name(world, state, def, act, cells, creatures) {
    const hx = state.home % world.size, hy = Math.floor(state.home / world.size);
    const candidate = creatures.filter(c => c.awakenedDay !== null && !c.trueName && Math.abs(c.x - hx) + Math.abs(c.y - hy) <= act.radius)
      .sort((a, b) => b.essence - a.essence || a.id - b.id)[0];
    if (!candidate) return null;
    const name = trueName(world.seed, candidate.id);
    const named: Creature = { ...candidate, trueName: name, patron: def.id, essence: Math.min(100, candidate.essence + act.amount), lifespan: candidate.lifespan + BEING.namedLife, affinity: Math.min(1, candidate.affinity + BEING.namedAffinity),
      history: [...candidate.history, { day: world.day, text: `Recebeu de ${def.name} o nome ${name}.` }].slice(-8) };
    state.named = [...state.named, candidate.id];
    return { cells, creatures: creatures.map(c => c.id === candidate.id ? named : c), text: `${def.name} deu o nome ${name} ao Folhim #${candidate.id}.`, creatureId: candidate.id };
  },
};

/** Once per day: each being gathers power and performs the first due act it can afford. */
export function advanceBeings(world: World, definitions = beingDefinitions): World {
  if (!world.beings.length) return world;
  let cells = world.cells, creatures = world.life.creatures;
  const events: LifeEvent[] = [...world.life.events];
  const beings = world.beings.map(original => {
    const def = definitionOf(original.id, definitions);
    if (!def) return original;
    const state: BeingState = { ...original, lastActs: { ...original.lastActs }, history: [...original.history] };
    const faith = devotion({ ...world, life: { ...world.life, creatures } }, state, def);
    state.power = Math.min(BEING.maxPower, state.power + 0.4 + cells[state.home].essence * 0.6 + faith.near * 0.05 + faith.named * 0.3);
    for (const act of def.acts) {
      if (world.day - (state.lastActs[act.verb] ?? -Infinity) < act.every || state.power < act.cost) continue;
      const outcome = verbs[act.verb]({ ...world, cells, life: { ...world.life, creatures } }, state, def, act, cells.slice(), creatures);
      if (!outcome) continue;
      cells = outcome.cells; creatures = outcome.creatures;
      state.power -= act.cost; state.lastActs[act.verb] = world.day;
      state.history = [...state.history, { day: world.day, text: outcome.text }].slice(-8);
      events.push({ day: world.day, kind: 'divine', creatureId: outcome.creatureId, text: outcome.text });
      break; // One act per day keeps the beings legible.
    }
    return state;
  });
  return { ...world, cells, beings, life: { ...world.life, creatures, events: events.slice(-40) } };
}
