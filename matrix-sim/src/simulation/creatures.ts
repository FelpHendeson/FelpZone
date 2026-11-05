import type { Cell, World } from './world';
import { edibleFood, foodFrom } from './food';
import { advanceSocialLife } from './social';
import { TICKS_PER_DAY } from './dayClock';
import { createBand, type Band } from './bands';
import { absorbEssence, deathResidue, ESSENCE } from './essence';
import { emptyDeeds, EVOLUTION, evolutionFor, forms, learnSkills, modifiers, type Deeds, type Form } from './skills';
import { creatorOf } from './beings';
export type { Band } from './bands';

export type Variant = 'bosque' | 'campina';
export const variantNames: Record<Variant, string> = { bosque: 'Bosque', campina: 'Campina' };
export type Relation = { id: number; fear: number; anger: number; lastDay: number };
export type Action = 'grazing' | 'seeking' | 'exploring' | 'resting' | 'disputing' | 'fleeing' | 'dead';
export const actionNames: Record<Action, string> = { grazing: 'Comendo', seeking: 'Procurando alimento', exploring: 'Explorando', resting: 'Descansando', disputing: 'Disputando', fleeing: 'Recuando', dead: 'Morto' };
export type Creature = {
  id: number; species: 'folhim'; x: number; y: number; age: number; energy: number;
  vision: number; curiosity: number; appetite: number; lifespan: number; generation: number;
  parents: number[]; lastBirthDay: number; action: Action; recentCells: number[];
  foodMemory: { cell: number; day: number } | null;
  history: { day: number; text: string }[];
  variant: Variant; bandId: number; temperament: number; lastConflictDay: number; relations: Relation[];
  moving: boolean; facing: 'left' | 'right';
  /** Essence points (0–100), how readily the ground's essence is drawn, and the day it crossed the awakening threshold. */
  essence: number; affinity: number; awakenedDay: number | null;
  /** Lived experience, earned skill ids and the evolved form (see skills.ts). */
  deeds: Deeds; skills: string[]; form: Form; evolvedDay: number | null;
  /** A name given by a primordial being, and which being gave it (see beings.ts). */
  trueName: string | null; patron: string | null;
};
export type LifeEvent = { day: number; kind: 'arrival' | 'birth' | 'death' | 'conflict' | 'leadership' | 'culture' | 'essence' | 'skill' | 'evolution' | 'divine'; creatureId: number; text: string };
export type Life = { creatures: Creature[]; departed: Creature[]; bands: Band[]; nextId: number; births: number; deaths: number; events: LifeEvent[] };
export const POPULATION_LIMIT = 200;
export const emptyLife = (): Life => ({ creatures: [], departed: [], bands: [], nextId: 1, births: 0, deaths: 0, events: [] });

export function random(seed: string, id: number, day: number, salt: number) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  hash ^= Math.imul(id + salt * 97, 374761393) ^ Math.imul(day + salt * 31, 668265263);
  hash = Math.imul(hash ^ hash >>> 13, 1274126177);
  return ((hash ^ hash >>> 16) >>> 0) / 4294967296;
}
export const walkable = (cell: Cell) => cell.terrain !== 'water' && cell.terrain !== 'mountain';
function neighbors(index: number, size: number) {
  const x = index % size, y = Math.floor(index / size);
  return [x > 0 ? index - 1 : -1, x + 1 < size ? index + 1 : -1, y > 0 ? index - size : -1, y + 1 < size ? index + size : -1].filter(i => i >= 0);
}
export function remember(creature: Creature, day: number, text: string) {
  if (creature.history.at(-1)?.text === text) return;
  creature.history = [...creature.history, { day, text }].slice(-8);
}
function makeCreature(world: World, id: number, cell: Cell, generation = 1, parents: number[] = []): Creature {
  return {
    id, species: 'folhim', x: cell.x, y: cell.y, age: 0, energy: parents.length ? 62 : 85 + random(world.seed, id, world.day, 14) * 10,
    vision: 3 + Math.floor(random(world.seed, id, world.day, 1) * 3),
    curiosity: 0.2 + random(world.seed, id, world.day, 2) * 0.7,
    appetite: 0.9 + random(world.seed, id, world.day, 3) * 0.25,
    lifespan: 180 + Math.floor(random(world.seed, id, world.day, 4) * 100), generation, parents,
    lastBirthDay: world.day, action: 'exploring', recentCells: [], foodMemory: null,
    variant: cell.terrain === 'forest' ? 'bosque' : 'campina', bandId: 1,
    moving: false, facing: 'right',
    essence: 0, affinity: 0.3 + random(world.seed, id, world.day, 30) * 0.7, awakenedDay: null,
    deeds: emptyDeeds(), skills: [], form: 'folhim', evolvedDay: null, trueName: null, patron: null,
    temperament: random(world.seed, id, world.day, 12), lastConflictDay: world.day - 12, relations: [],
    history: [{ day: world.day, text: parents.length ? `Nasceu de #${parents[0]} e #${parents[1]}.` : 'Chegou ao mundo.' }],
  };
}

/** Introduces small bands near distinct food-bearing origins, preferring both biomes. */
export function populateWorld(world: World, count = 20): World {
  if (!Number.isInteger(count) || count < 0 || count > POPULATION_LIMIT) throw new Error('População inicial inválida.');
  if (world.life.creatures.length || count === 0) return world;
  const eligible = world.cells.map((cell, index) => walkable(cell) && edibleFood(cell.vegetation) > 5 ? index : -1).filter(i => i >= 0);
  if (!eligible.length) return world;
  const creatures: Creature[] = [], bands: Band[] = [], used = new Set<number>();
  for (let b = 0; creatures.length < count && used.size < eligible.length; b++) {
    const preferred = eligible.filter(i => !used.has(i) && (world.cells[i].terrain === 'forest') === (b % 2 === 0));
    const candidates = preferred.length ? preferred : eligible.filter(i => !used.has(i));
    // Seeded starting point, then nearby origins: groups can eventually meet on foot.
    const reference = bands.length ? bands[0].origin : candidates[Math.floor(random(world.seed, 0, world.day, 5) * candidates.length)];
    const distance = (a: number, z: number) => Math.abs(a % world.size - z % world.size) + Math.abs(Math.floor(a / world.size) - Math.floor(z / world.size));
    const root = candidates.reduce((best, i) => {
      const score = (n: number) => Math.abs(distance(n, reference) - (b ? 8 + b * 2 : 0)) + bands.reduce((sum, band) => sum + Math.max(0, 6 - distance(n, band.origin)) * 3, 0);
      return score(i) < score(best) ? i : best;
    });
    const variant: Variant = world.cells[root].terrain === 'forest' ? 'bosque' : 'campina';
    const band = createBand(world, b + 1, `${variantNames[variant]} ${bands.filter(g => g.variant === variant).length + 1}`, variant, root);
    const queue = [root], visited = new Set(queue);
    for (let head = 0, members = 0; head < queue.length && members < 5 && creatures.length < count; head++) {
      const index = queue[head];
      if (!used.has(index) && edibleFood(world.cells[index].vegetation) > 5) {
        const c = makeCreature(world, world.life.nextId + creatures.length, world.cells[index]);
        c.variant = variant; c.bandId = band.id;
        remember(c, world.day, `Chegou com o bando ${band.name}.`);
        creatures.push(c); used.add(index); members++;
        if (band.leaderId === null) band.leaderId = c.id;
      }
      for (const next of neighbors(index, world.size)) if (!visited.has(next) && walkable(world.cells[next])) { visited.add(next); queue.push(next); }
    }
    bands.push(band);
  }
  // The Folhins are a creation: the being that declares them gives them life, when it exists in this world.
  const creator = world.beings.some(b => b.id === creatorOf('Folhins')?.id) ? creatorOf('Folhins') : undefined;
  const arrival: LifeEvent = { day: world.day, kind: 'arrival', creatureId: creatures[0].id, text: creator ? `${creator.name} criou ${creatures.length} Folhins em ${bands.length} bandos de origem regional.` : `${creatures.length} Folhins chegaram em ${bands.length} bandos de origem regional.` };
  return { ...world, life: { ...world.life, creatures, bands, nextId: world.life.nextId + creatures.length, events: [...world.life.events, arrival].slice(-40) } };
}

/** Consume real plant matter. Tree biomass is never eaten directly. */
export function graze(cell: Cell, requested: number) {
  const vegetation = { ...cell.vegetation };
  let remaining = Math.max(0, requested), consumed = 0;
  for (const [kind, conversion] of [['fruit', 1], ['grass', 0.2], ['shrubs', 0.3]] as const) {
    const bite = Math.min(remaining, vegetation[kind] * conversion);
    vegetation[kind] = Math.max(0, vegetation[kind] - bite / conversion);
    remaining -= bite; consumed += bite;
  }
  return { consumed, cell: { ...cell, vegetation, food: foodFrom(vegetation) } };
}

function chooseMove(world: World, creature: Creature, occupancy: Map<number, number>) {
  const origin = creature.y * world.size + creature.x;
  const queue = [{ index: origin, distance: 0, first: origin }], visited = new Set([origin]);
  let best = origin, bestScore = -Infinity;
  const hungry = creature.energy < 65, vision = modifiers.vision(creature, hungry);
  const band = world.life.bands.find(b => b.id === creature.bandId);
  const leaderId = band?.leaderId;
  const leader = world.life.creatures.find(c => c.id === leaderId);
  const threats = creature.relations.filter(r => r.fear > 0.15).flatMap(r => {
    const other = world.life.creatures.find(c => c.id === r.id);
    return other && Math.abs(other.x - creature.x) + Math.abs(other.y - creature.y) <= vision ? [{ other, fear: r.fear }] : [];
  });
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    if (node.distance > 0) {
      const food = edibleFood(world.cells[node.index].vegetation);
      const novelty = creature.recentCells.includes(node.first) ? -1.2 : 0.5;
      let score = hungry ? Math.min(food, 12) - node.distance * 0.65 : novelty + random(world.seed, creature.id + node.index, world.day * TICKS_PER_DAY + world.tick, 6) * creature.curiosity;
      score -= (occupancy.get(node.index) ?? 0) * 0.8;
      const nx = node.index % world.size, ny = Math.floor(node.index / world.size);
      for (const { other, fear } of threats) score -= fear * 12 / (1 + Math.abs(nx - other.x) + Math.abs(ny - other.y));
      for (const { other, fear } of threats) if (fear > 0.3 && Math.abs(other.x - creature.x) + Math.abs(other.y - creature.y) <= 2) {
        score -= 100 * fear / (1 + Math.abs(node.first % world.size - other.x) + Math.abs(Math.floor(node.first / world.size) - other.y));
      }
      if (!hungry && leader && leader.id !== creature.id && Math.abs(leader.x - creature.x) + Math.abs(leader.y - creature.y) <= vision * 2) score += (1 + (band?.cohesion ?? 0.5) * 3) / (1 + Math.abs(nx - leader.x) + Math.abs(ny - leader.y));
      if (hungry && creature.foodMemory && world.day - creature.foodMemory.day <= 14) {
        const mx = creature.foodMemory.cell % world.size, my = Math.floor(creature.foodMemory.cell / world.size);
        score += 1 / (1 + Math.abs(mx - node.index % world.size) + Math.abs(my - Math.floor(node.index / world.size)));
      }
      // Fed Folhins drift toward places where essence is strong, more so the greater their affinity.
      if (!hungry) score += world.cells[node.index].essence * modifiers.affinity(creature) * 0.8;
      if (score > bestScore) { bestScore = score; best = node.first; }
    }
    if (node.distance >= vision) continue;
    for (const next of neighbors(node.index, world.size)) if (!visited.has(next) && walkable(world.cells[next])) {
      visited.add(next); queue.push({ index: next, distance: node.distance + 1, first: node.distance === 0 ? next : node.first });
    }
  }
  return best;
}

export function advanceLife(world: World, elapsedDays = 1): World {
  if (!world.life.creatures.length) return world;
  const cells = world.cells.slice(), creatures: Creature[] = [], departed = [...world.life.departed];
  const events = [...world.life.events], occupancy = new Map<number, number>();
  let deaths = world.life.deaths, births = world.life.births, nextId = world.life.nextId;
  for (const c of world.life.creatures) { const index = c.y * world.size + c.x; occupancy.set(index, (occupancy.get(index) ?? 0) + 1); }
  // Rotate update order each day so the same individual does not always get first access.
  const moment = world.day * TICKS_PER_DAY + world.tick;
  const offset = moment % world.life.creatures.length;
  const ordered = [...world.life.creatures.slice(offset), ...world.life.creatures.slice(0, offset)];
  const newDay = elapsedDays === 1 || world.tick === 0, winter = Math.floor(world.day / 90) % 4 === 3;
  for (const original of ordered) {
    const c: Creature = { ...original, deeds: { ...original.deeds }, age: original.age + (newDay ? 1 : 0), energy: Math.max(0, original.energy - 2.8 * original.appetite * modifiers.upkeep(original, winter) * elapsedDays), recentCells: [...original.recentCells], history: [...original.history], relations: original.relations.map(r => ({ ...r, fear: Math.max(0, r.fear - 0.025 * elapsedDays), anger: Math.max(0, r.anger - 0.005 * elapsedDays) })).filter(r => r.fear > 0 || r.anger > 0) };
    const index = c.y * world.size + c.x;
    c.moving = false;
    const afraid = c.relations.some(r => r.fear > 0.3 && world.life.creatures.some(other => other.id === r.id && Math.abs(c.x - other.x) + Math.abs(c.y - other.y) <= 2));
    if (!afraid && c.energy < 85 && edibleFood(cells[index].vegetation) > 0.05) {
      const meal = graze(cells[index], Math.min(c.appetite * 1.4 * elapsedDays, (100 - c.energy) / 9));
      cells[index] = meal.cell; c.energy = Math.min(100, c.energy + meal.consumed * 9); c.action = 'grazing'; c.deeds.grazed += meal.consumed;
      c.foodMemory = { cell: index, day: world.day }; remember(c, world.day, `Encontrou alimento em (${c.x}, ${c.y}).`);
    } else if (!afraid && c.energy >= 65 && random(world.seed, c.id, moment, 7) > c.curiosity) {
      c.action = 'resting';
    } else {
      const next = chooseMove({ ...world, cells }, c, occupancy);
      c.action = afraid ? 'fleeing' : c.energy < 65 ? 'seeking' : 'exploring';
      if (next !== index) {
        if (next % world.size !== c.x) c.facing = next % world.size < c.x ? 'left' : 'right';
        c.moving = true;
        c.x = next % world.size; c.y = Math.floor(next / world.size); c.energy = Math.max(0, c.energy - modifiers.moveCost(c) * elapsedDays);
        c.deeds.walked++; c.recentCells = [...c.recentCells, index].slice(-8);
        occupancy.set(index, Math.max(0, (occupancy.get(index) ?? 0) - 1)); occupancy.set(next, (occupancy.get(next) ?? 0) + 1);
      }
      if (c.energy < 25) remember(c, world.day, 'Está com muita fome e procura alimento.');
    }
    const here = c.y * world.size + c.x;
    const drawn = absorbEssence(cells[here], modifiers.affinity(c), elapsedDays);
    cells[here] = drawn.cell;
    c.essence = Math.min(100, Math.max(0, c.essence + drawn.points - c.essence * ESSENCE.leak * elapsedDays));
    if (c.awakenedDay === null && c.essence >= ESSENCE.awakening) {
      c.awakenedDay = world.day;
      const text = `Folhim #${c.id} despertou para a essência em (${c.x}, ${c.y}).`;
      remember(c, world.day, 'Despertou para a essência.'); events.push({ day: world.day, kind: 'essence', creatureId: c.id, text });
    }
    // Once per day: count lived conditions, earn skills, and evolve when the path is complete.
    if (newDay) {
      const ground = cells[here];
      if (ground.dryDays >= 14) c.deeds.droughtDays++;
      if (winter) c.deeds.winterDays++;
      if (ground.essence >= 0.6) c.deeds.nearSourceDays++;
      for (const skill of learnSkills(c)) {
        remember(c, world.day, `Aprendeu ${skill.name}.`);
        events.push({ day: world.day, kind: 'skill', creatureId: c.id, text: `Folhim #${c.id} adquiriu a habilidade ${skill.name}${skill.rarity === 'comum' ? '' : ` (${skill.rarity})`}.` });
      }
      const path = evolutionFor(c);
      if (path) {
        c.form = path; c.evolvedDay = world.day; c.lifespan += EVOLUTION.extraLife;
        remember(c, world.day, `Evoluiu para ${forms[path].name}.`);
        events.push({ day: world.day, kind: 'evolution', creatureId: c.id, text: `Folhim #${c.id} evoluiu e tornou-se ${forms[path].name}.` });
      }
    }
    if (c.age >= c.lifespan || c.energy <= 0) {
      const cause = c.energy <= 0 ? 'falta de alimento' : 'velhice'; c.action = 'dead'; c.moving = false;
      remember(c, world.day, `Morreu por ${cause}.`); departed.push(c); deaths++;
      events.push({ day: world.day, kind: 'death', creatureId: c.id, text: `Folhim #${c.id} morreu por ${cause}.` });
      const finalIndex = c.y * world.size + c.x;
      cells[finalIndex] = deathResidue(cells[finalIndex], c.essence);
      occupancy.set(finalIndex, Math.max(0, (occupancy.get(finalIndex) ?? 0) - 1));
      continue;
    }
    creatures.push(c);
  }
  const adults = [...creatures].sort((a, b) => a.id - b.id);
  for (const parent of adults) {
    if (creatures.length >= POPULATION_LIMIT) break;
    if (parent.age < 28 || parent.energy < 82 || world.day - parent.lastBirthDay < 35) continue;
    const mate = adults.find(other => other.id !== parent.id && other.age >= 28 && other.energy >= 82 && world.day - other.lastBirthDay >= 35 && Math.abs(parent.x - other.x) + Math.abs(parent.y - other.y) <= 3);
    if (!mate) continue;
    const child = makeCreature(world, nextId++, cells[parent.y * world.size + parent.x], Math.max(parent.generation, mate.generation) + 1, [parent.id, mate.id]);
    child.bandId = parent.bandId; child.variant = parent.variant;
    parent.energy -= 18; mate.energy -= 18; parent.lastBirthDay = mate.lastBirthDay = world.day;
    remember(parent, world.day, `Teve o filhote #${child.id} com #${mate.id}.`); remember(mate, world.day, `Teve o filhote #${child.id} com #${parent.id}.`);
    creatures.push(child); births++;
    events.push({ day: world.day, kind: 'birth', creatureId: child.id, text: `Nasceu Folhim #${child.id}, geração ${child.generation}.` });
  }
  return advanceSocialLife({ ...world, cells, life: { bands: world.life.bands.map(b => ({ ...b })), creatures: creatures.sort((a, b) => a.id - b.id), departed: departed.slice(-20), nextId, births, deaths, events: events.slice(-40) } }, elapsedDays);
}
