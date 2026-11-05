import type { Cell, Terrain, World } from './world';
import type { Creature, LifeEvent } from './creatures';
import { foodFrom } from './food';

/**
 * The Rules of Existence create one supreme being for each element of the world. Each carries a core skill, the
 * nucleus of its power, and the same mission: shape the world, create life and death, keep the balance and let it
 * evolve. Beings are declared here; their acts use a small vocabulary of engine verbs, so a new god needs no engine
 * code: add a block to `beingDefinitions`.
 */
export type Verb = 'bless' | 'rain' | 'name' | 'enrich' | 'grow';
export type Element = 'water' | 'earth' | 'mountain' | 'forest' | 'essence';
export type Act = {
  verb: Verb; every: number; cost: number; radius: number;
  /** bless: essence at the center; rain: moisture; name: essence given; enrich: fertility; grow: share of capacity. */
  amount: number;
  /** rain only: the driest region must have gone this many days without precipitation. */
  drought?: number;
};
export type BeingDefinition = {
  id: string; name: string; epithet: string; element: Element; personality: string; lore: string; color: string; glyph: string;
  /** The nucleus of its power: shown as its core skill, performed through its first act. */
  core: { name: string; description: string };
  /** Where the being dwells, chosen once when the world is born. */
  dwells: 'strongest-source' | 'highest-peak' | 'densest-forest' | 'most-fertile' | 'busiest-shore';
  /** Folhins within this many regions of its home are its devotees. */
  reach: number;
  /** What the Voice says when it gives form to its element during the genesis. */
  genesis: string;
  /** The species this being creates at the end of the genesis, if any. */
  creates?: string;
  acts: Act[];
};
export type BeingState = { id: string; home: number; power: number; lastActs: Partial<Record<Verb, number>>; named: number[]; history: { day: number; text: string }[] };

export const beingDefinitions: BeingDefinition[] = [
  { id: 'maelis', name: 'Maelis', epithet: 'a Que Corre', element: 'water', personality: 'Inquieta e generosa; nunca fica no mesmo lugar por muito tempo, mas sempre volta para quem tem sede.',
    lore: 'Primeiro foi o rumor das ondas. Maelis encheu as bacias do mundo e decidiu que nenhuma terra ficaria seca para sempre.',
    color: '#6fc3e8', glyph: '≈', dwells: 'busiest-shore', reach: 12,
    core: { name: 'Maré', description: 'Faz chover sobre a região mais seca ao seu alcance.' },
    genesis: 'Maelis, a Que Corre, encheu as bacias e deu forma às águas.',
    acts: [{ verb: 'rain', every: 10, cost: 15, radius: 16, amount: 0.3, drought: 18 }] },
  { id: 'dhoran', name: 'Dhoran', epithet: 'o Que Sustenta', element: 'earth', personality: 'Paciente e silencioso; prefere preparar o chão a ser lembrado por ele.',
    lore: 'Dhoran deitou-se sob o mundo para que tudo tivesse onde pisar. Seu cansaço vira solo fértil.',
    color: '#c9a66b', glyph: '▤', dwells: 'most-fertile', reach: 12,
    core: { name: 'Seiva da Terra', description: 'Devolve fertilidade ao solo ao redor de sua morada.' },
    genesis: 'Dhoran, o Que Sustenta, estendeu as planícies e as margens de areia.',
    acts: [{ verb: 'enrich', every: 14, cost: 12, radius: 8, amount: 0.12 }] },
  { id: 'kaltor', name: 'Kaltor', epithet: 'o Imóvel', element: 'mountain', personality: 'Orgulhoso e solitário; mede o tempo em eras e fala pouco.',
    lore: 'Kaltor ergueu os picos para ver o mundo de cima. Do alto, a essência ecoa nas rochas e desce pelas encostas.',
    color: '#b8bcc8', glyph: '▲', dwells: 'highest-peak', reach: 10,
    core: { name: 'Eco das Rochas', description: 'Espalha essência a partir do pico onde vive.' },
    genesis: 'Kaltor, o Imóvel, ergueu os picos e firmou as montanhas.',
    acts: [{ verb: 'bless', every: 7, cost: 8, radius: 7, amount: 0.25 }] },
  { id: 'verdanthe', name: 'Verdanthe', epithet: 'a Que Brota', element: 'forest', personality: 'Curiosa e maternal; quis ver algo comer suas folhas e por isso inventou a primeira espécie.',
    lore: 'Onde Verdanthe pisa, algo nasce. Ela vestiu o mundo de verde e moldou os Folhins com folhas e sementes.',
    color: '#8fd16a', glyph: '❦', dwells: 'densest-forest', reach: 12, creates: 'Folhins',
    core: { name: 'Florescer', description: 'Faz a vegetação e os frutos crescerem ao redor de sua morada.' },
    genesis: 'Verdanthe, a Que Brota, vestiu o mundo de florestas.',
    acts: [{ verb: 'grow', every: 10, cost: 12, radius: 7, amount: 0.12 }] },
  { id: 'aurenth', name: 'Aurenth', epithet: 'o Guardião das Nascentes', element: 'essence', personality: 'Sábio e distante; observa muito antes de agir e escolhe a quem dar um nome.',
    lore: 'Aurenth é a primeira gota de essência que decidiu ficar. Habita a nascente mais forte e eleva os Folhins que o escutam.',
    color: '#c9b6ff', glyph: '✺', dwells: 'strongest-source', reach: 12,
    core: { name: 'Nomear', description: 'Dá um nome verdadeiro ao Folhim desperto mais forte ao seu alcance.' },
    genesis: 'Aurenth, o Guardião das Nascentes, abriu as nascentes de essência.',
    acts: [{ verb: 'name', every: 30, cost: 35, radius: 10, amount: 20 }] },
];
export const verbNames: Record<Verb, string> = { bless: 'Abençoar', rain: 'Fazer chover', name: 'Nomear', enrich: 'Fertilizar', grow: 'Florescer' };
export const elementNames: Record<Element, string> = { water: 'Água', earth: 'Terra', mountain: 'Montanha', forest: 'Floresta', essence: 'Essência' };
/** Which god gives form to each terrain during the genesis. Essence has no terrain: its god reveals the sources. */
export const elementOf: Record<Terrain, Element> = { water: 'water', sand: 'earth', grass: 'earth', mountain: 'mountain', forest: 'forest' };
export const BEING = { maxPower: 100, basePower: 30, namedLife: 60, namedAffinity: 0.1 } as const;
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const distance = (size: number, a: number, x: number, y: number) => Math.abs(a % size - x) + Math.abs(Math.floor(a / size) - y);
const definitionOf = (id: string, definitions: BeingDefinition[]) => definitions.find(d => d.id === id);

/** The cell with the best score among those that pass `allowed`; ties go to the lowest index, so homes are stable. */
function best(world: World, allowed: (c: Cell) => boolean, score: (c: Cell, i: number) => number) {
  let found = -1, top = -Infinity;
  world.cells.forEach((c, i) => { if (!allowed(c)) return; const s = score(c, i); if (s > top) { top = s; found = i; } });
  return Math.max(0, found);
}
function around(world: World, i: number, r: number, test: (c: Cell) => boolean) {
  const x = i % world.size, y = Math.floor(i / world.size);
  let count = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < world.size && ny < world.size && Math.abs(dx) + Math.abs(dy) <= r && test(world.cells[ny * world.size + nx])) count++;
  }
  return count;
}
function chooseHome(world: World, def: BeingDefinition) {
  const land = (c: Cell) => c.terrain !== 'water';
  switch (def.dwells) {
    case 'strongest-source': if (world.essenceSources.length) return [...world.essenceSources].sort((a, b) => b.strength - a.strength || a.index - b.index)[0].index; break;
    case 'densest-forest': if (world.cells.some(c => c.terrain === 'forest')) return best(world, c => c.terrain === 'forest', (_, i) => around(world, i, 4, c => c.terrain === 'forest')); break;
    case 'most-fertile': if (world.cells.some(c => c.fertility > 0)) return best(world, c => c.fertility > 0, c => c.fertility); break;
    case 'busiest-shore': {
      // Water touching land: the more land within reach, the more there is to rain on.
      const shore = (c: Cell) => c.terrain === 'water' && around(world, c.y * world.size + c.x, 1, land) > 0;
      if (world.cells.some(shore)) return best(world, shore, (_, i) => around(world, i, 8, land));
      break;
    }
  }
  return best(world, land, c => c.elevation);
}
const placeName = (world: World, home: number) => world.essenceSources.find(s => s.index === home)?.name ?? `(${home % world.size}, ${Math.floor(home / world.size)})`;
export function createBeings(world: World, definitions = beingDefinitions): BeingState[] {
  return definitions.map(def => {
    const home = chooseHome(world, def);
    return { id: def.id, home, power: BEING.basePower, lastActs: {}, named: [], history: [{ day: world.day, text: `Fez morada em ${placeName(world, home)}.` }] };
  });
}

/** The order in which the beings were released into this world: unspecified by the Rules, fixed by the seed. */
export function genesisOrder(world: World, definitions = beingDefinitions): BeingDefinition[] {
  const weight = (id: string) => { let h = 2166136261; for (const ch of `${world.seed}:gênese:${id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
  return definitions.filter(d => world.beings.some(b => b.id === d.id)).sort((a, b) => weight(a.id) - weight(b.id));
}
export const creatorOf = (species: string, definitions = beingDefinitions) => definitions.find(d => d.creates === species);

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
  enrich(world, state, def, act, cells) {
    const hx = state.home % world.size, hy = Math.floor(state.home / world.size);
    for (let i = 0; i < cells.length; i++) {
      const d = distance(world.size, i, hx, hy);
      if (d <= act.radius && (cells[i].terrain === 'grass' || cells[i].terrain === 'forest')) cells[i] = { ...cells[i], fertility: clamp(cells[i].fertility + act.amount * (1 - d / (act.radius + 1))) };
    }
    return { cells, creatures: world.life.creatures, text: `${def.name} devolveu fertilidade ao solo ao redor de sua morada.`, creatureId: 0 };
  },
  grow(world, state, def, act, cells) {
    const hx = state.home % world.size, hy = Math.floor(state.home / world.size);
    for (let i = 0; i < cells.length; i++) {
      const d = distance(world.size, i, hx, hy), cell = cells[i];
      if (d > act.radius || (cell.terrain !== 'grass' && cell.terrain !== 'forest')) continue;
      // Same capacities as natural growth: a god speeds the forest up, it does not overfill it.
      const share = act.amount * (1 - d / (act.radius + 1)), v = { ...cell.vegetation };
      v.grass = Math.min(cell.terrain === 'grass' ? 100 : 40, v.grass + share * 100);
      v.shrubs = Math.min(55, v.shrubs + share * 55);
      v.fruit = Math.min(60, v.fruit + share * 20);
      cells[i] = { ...cell, vegetation: v, food: foodFrom(v) };
    }
    return { cells, creatures: world.life.creatures, text: `${def.name} fez a vegetação florescer ao redor de sua morada.`, creatureId: 0 };
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
