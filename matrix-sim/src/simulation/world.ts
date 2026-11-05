import { createRegionalWeather, type ClimateZone, type Precipitation } from './regionalWeather';
import { advanceLife, emptyLife, type Life } from './creatures';
import { foodFrom } from './food';
import { TICKS_PER_DAY } from './dayClock';
import { flowEssence, seedEssence, type EssenceSource } from './essence';
import { advanceBeings, createBeings, type BeingState } from './beings';
export { foodFrom } from './food';

export type Terrain = 'water' | 'sand' | 'grass' | 'forest' | 'mountain';
export type Vegetation = { grass: number; shrubs: number; trees: number; fruit: number; litter: number };
export const ENVIRONMENT_RHYTHM = { growth: 7, decomposition: 14, stressTolerance: 14 } as const;
export type DaySummary = { soilChanged: number; grown: number; declined: number; recycled: number; fruitChanged: number };
function emptySummary(): DaySummary { return { soilChanged: 0, grown: 0, declined: 0, recycled: 0, fruitChanged: 0 }; }
export type Cell = { x: number; y: number; elevation: number; moisture: number; terrain: Terrain; food: number; fertility: number; temperature: number; waterAccess: number; dryDays: number; stressDays: number; vegetation: Vegetation; climateZone: ClimateZone; rainfall: number; precipitation: Precipitation; essence: number; essenceBase: number };
export type World = { version: 11; seed: string; size: number; waterLevel: number; essenceSources: EssenceSource[]; beings: BeingState[]; day: number; tick: number; summary: DaySummary; cells: Cell[]; life: Life };
export const seasons = ['Primavera', 'Verão', 'Outono', 'Inverno'] as const;
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export function climateAt(seed: string, day: number) {
  const seasonIndex = Math.floor(day / 90) % 4;
  return { season: seasons[seasonIndex], year: Math.floor(day / 360) + 1, temperature: [18, 29, 15, 5][seasonIndex], sunlight: [0.75, 1, 0.55, 0.3][seasonIndex] };
}
export function weatherDescription(world: World) {
  let rain = 0, snow = 0;
  for (const cell of world.cells) { if (cell.precipitation === 'rain') rain++; else if (cell.precipitation === 'snow') snow++; }
  if (!rain && !snow) return 'Sem precipitação no mapa';
  const coverage = ((rain + snow) / world.cells.length * 100).toFixed(1).replace('.', ',');
  return `${rain && snow ? 'Chuva e neve' : snow ? 'Neve' : 'Chuva'} em ${coverage}% do mapa`;
}
export function describeDay(world: World) {
  if (world.day === 0 && world.tick === 0) return world.life.creatures.length ? `${world.life.creatures.length} Folhins acabam de ser criados. Inicie o tempo para observar a primeira espécie.` : 'Mundo pronto. O ambiente muda em ciclos, sem pressa.';
  const summary = world.summary, events: string[] = [];
  if (summary.soilChanged) events.push(`a umidade mudou em ${summary.soilChanged.toLocaleString('pt-BR')} regiões`);
  if (summary.grown) events.push(`a vegetação cresceu em ${summary.grown.toLocaleString('pt-BR')} regiões`);
  if (summary.declined) events.push(`a vegetação perdeu biomassa em ${summary.declined.toLocaleString('pt-BR')} regiões após condições ruins persistentes`);
  if (summary.fruitChanged) events.push('os frutos foram renovados');
  if (summary.recycled) events.push('a matéria orgânica foi decomposta');
  const grazers = world.life.creatures.filter(c => c.action === 'grazing').length;
  if (grazers) events.push(`${grazers} Folhins estão comendo`);
  const births = world.life.events.filter(e => e.day === world.day && e.kind === 'birth').length;
  const deaths = world.life.events.filter(e => e.day === world.day && e.kind === 'death').length;
  if (births) events.push(`${births} filhotes nasceram`);
  if (deaths) events.push(`${deaths} Folhins morreram`);
  return events.length ? `${weatherDescription(world)}: ${events.join('; ')}.` : `${weatherDescription(world)}. Vegetação, frutos e solo mantiveram seus recursos.`;
}
export const terrainInfo: Record<Terrain, { name: string; color: string; description: string }> = {
  water: { name: 'Água', color: '#315b70', description: 'Lagos e oceanos. Reserva de água do mundo.' },
  sand: { name: 'Areia', color: '#c6b481', description: 'Margens de transição entre a água e a terra.' },
  grass: { name: 'Planície', color: '#82976a', description: 'Terreno aberto com recursos para a futura vida.' },
  forest: { name: 'Floresta', color: '#416f57', description: 'Região úmida com maior disponibilidade de alimento.' },
  mountain: { name: 'Montanha', color: '#a0a69e', description: 'Terreno elevado e rochoso, com poucos recursos.' },
};

function randomFrom(seed: string) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ state >>> 15, state | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function noiseField(random: () => number, size: number) {
  const layers = [4, 8, 16, 32].map(resolution => ({ resolution, values: Array.from({ length: (resolution + 1) ** 2 }, random) }));
  return (x: number, y: number) => {
    let total = 0;
    layers.forEach(({ resolution, values }, octave) => {
      const px = x / size * resolution, py = y / size * resolution;
      const ix = Math.floor(px), iy = Math.floor(py);
      const smooth = (v: number) => v * v * (3 - 2 * v);
      const fx = smooth(px - ix), fy = smooth(py - iy);
      const at = (dx: number, dy: number) => values[(iy + dy) * (resolution + 1) + ix + dx];
      const top = at(0, 0) * (1 - fx) + at(1, 0) * fx;
      const bottom = at(0, 1) * (1 - fx) + at(1, 1) * fx;
      total += (top * (1 - fy) + bottom * fy) * (1 / 2 ** octave);
    });
    return total / 1.875;
  };
}

export function createWorld(seed: string, size = 96, waterLevel = 0.4): World {
  if (!Number.isInteger(size) || size < 8 || size > 256) throw new Error('O tamanho deve estar entre 8 e 256.');
  if (!Number.isFinite(waterLevel) || waterLevel < 0.2 || waterLevel > 0.65) throw new Error('Nível de água inválido.');
  if (!seed.trim() || seed.length > 80) throw new Error('Informe uma semente de 1 a 80 caracteres.');
  const random = randomFrom(seed);
  const height = noiseField(random, size), moistureField = noiseField(random, size);
  const cells = Array.from({ length: size * size }, (_, index): Cell => {
    const x = index % size, y = Math.floor(index / size);
    const distance = Math.hypot((x / (size - 1) - 0.5) * 2, (y / (size - 1) - 0.5) * 2);
    const elevation = Math.max(0, Math.min(1, height(x, y) * 1.35 - Math.max(0, distance - 0.45) * 0.5));
    const moisture = moistureField(x, y);
    const terrain: Terrain = elevation < waterLevel ? 'water' : elevation < waterLevel + 0.035 ? 'sand' : elevation > 0.76 ? 'mountain' : moisture > 0.51 ? 'forest' : 'grass';
    return { x, y, elevation, moisture, terrain, food: 0, fertility: 0, temperature: 0, waterAccess: 0, dryDays: 0, stressDays: 0, climateZone: 'temperate', rainfall: 0, precipitation: 'none', essence: 0, essenceBase: 0, vegetation: { grass: 0, shrubs: 0, trees: 0, fruit: 0, litter: 0 } };
  });
  // Multi-source breadth-first search: distance to the nearest surface water.
  const distances = new Int32Array(cells.length).fill(-1);
  const queue: number[] = [];
  cells.forEach((cell, index) => { if (cell.terrain === 'water') { distances[index] = 0; queue.push(index); } });
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head], { x, y } = cells[index];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      const next = ny * size + nx;
      if (distances[next] !== -1) continue;
      distances[next] = distances[index] + 1; queue.push(next);
    }
  }
  const initialClimate = climateAt(seed, 0);
  const initialWeather = createRegionalWeather(seed, size, 0);
  for (const [index, cell] of cells.entries()) {
    cell.waterAccess = distances[index] < 0 ? 0 : Math.exp(-distances[index] / 5);
    cell.moisture = cell.terrain === 'water' ? 1 : clamp(cell.moisture * 0.7 + cell.waterAccess * 0.3);
    cell.temperature = initialClimate.temperature - cell.elevation * 12;
    Object.assign(cell, initialWeather(cell.x, cell.y, cell.temperature));
    const fertile = cell.terrain === 'forest' || cell.terrain === 'grass';
    cell.fertility = fertile ? clamp(0.25 + cell.moisture * 0.6 - cell.elevation * 0.1) : cell.terrain === 'sand' ? 0.08 : 0;
    if (fertile) {
      cell.vegetation.grass = cell.fertility * (cell.terrain === 'grass' ? 80 : 25);
      cell.vegetation.shrubs = cell.fertility * 30;
      cell.vegetation.trees = cell.fertility * (cell.terrain === 'forest' ? 85 : 12);
      cell.vegetation.fruit = cell.vegetation.shrubs * 0.12 + cell.vegetation.trees * 0.08;
    }
    cell.food = foodFrom(cell.vegetation);
  }
  const essenceSources = seedEssence(seed, size, cells);
  const world: World = { version: 11, seed, size, waterLevel, essenceSources, beings: [], day: 0, tick: 0, summary: emptySummary(), cells, life: emptyLife() };
  return { ...world, beings: createBeings(world) };
}

/** Advance a duration in whole days using the same fine steps as real-time playback. */
export function advanceWorld(world: World, days = 1): World {
  if (!Number.isInteger(days) || days < 1 || days > 360) throw new Error('Avance entre 1 e 360 dias.');
  return advanceTicks(world, days * TICKS_PER_DAY);
}

/** Fast inhabitants; one staggered environmental update per cell per day. */
export function advanceTicks(world: World, ticks = 1): World {
  if (!Number.isInteger(ticks) || ticks < 1 || ticks > 360 * TICKS_PER_DAY) throw new Error('Quantidade de passos inválida.');
  let current = world;
  for (let step = 0; step < ticks; step++) {
    const day = current.day + 1, climate = climateAt(current.seed, day);
    const summary = current.tick === 0 ? emptySummary() : { ...current.summary };
    const regionalWeather = createRegionalWeather(current.seed, current.size, current.day + (current.tick + 1) / TICKS_PER_DAY);
    const cells = current.cells.map((cell, index) => {
      // Stable spatial phases spread rain, growth and rot through the day.
      if ((index * 7 + Math.floor(index / current.size) * 3) % TICKS_PER_DAY !== current.tick) return cell;
      const temperature = climate.temperature - cell.elevation * 12;
      const weather = regionalWeather(cell.x, cell.y, temperature);
      const dryDays = weather.precipitation !== 'none' ? 0 : cell.dryDays + 1;
      const essence = flowEssence(current.cells, index, current.size, day);
      if (cell.terrain === 'water') return { ...cell, temperature, dryDays, essence, ...weather };
      const waterGain = weather.precipitation === 'none' ? 0 : weather.precipitation === 'snow' ? 0.015 + weather.rainfall * 0.015 : 0.04 + weather.rainfall * 0.04;
      const slowDrying = dryDays > 0 && dryDays % 7 === 0 ? 0.025 : 0;
      const moisture = clamp(cell.moisture + waterGain + (day % 7 === 0 ? cell.waterAccess * 0.03 : 0) - slowDrying);
      if (Math.abs(moisture - cell.moisture) > 0.00001) summary.soilChanged++;
      const suitable = cell.terrain === 'grass' || cell.terrain === 'forest';
      const stressDays = suitable && (moisture < 0.12 || temperature < -3) ? cell.stressDays + 1 : 0;
      const growthDay = day % ENVIRONMENT_RHYTHM.growth === 0;
      const recyclingDay = day % ENVIRONMENT_RHYTHM.decomposition === 0;
      // Most days only weather and counters change; vegetation is reused as-is.
      if (!suitable || (!growthDay && !recyclingDay)) return { ...cell, temperature, moisture, dryDays, stressDays, essence, ...weather };
      const v = { ...cell.vegetation };
      let fertility = cell.fertility;
      if (recyclingDay && v.litter > 0) {
        const decomposition = Math.min(v.litter, 1 + moisture * 3);
        v.litter -= decomposition;
        fertility = clamp(fertility + decomposition * 0.0015);
        summary.recycled++;
      }
      const growth = moisture * fertility * clamp((temperature + 2) / 20) * climate.sunlight;
      const previousBiomass = v.grass + v.shrubs + v.trees;
      for (const [kind, capacity, rate] of [['grass', cell.terrain === 'grass' ? 100 : 40, 4], ['shrubs', 55, 1.8], ['trees', cell.terrain === 'forest' ? 120 : 30, 0.6]] as const) {
        const previous = v[kind];
        const gain = growthDay && stressDays === 0 ? growth * rate * Math.max(0, 1 - previous / capacity) : 0;
        const loss = recyclingDay && stressDays >= ENVIRONMENT_RHYTHM.stressTolerance ? previous * 0.02 : 0;
        v[kind] = clamp(previous + gain - loss, 0, capacity);
        v.litter += loss;
        fertility = clamp(fertility - gain * 0.0008);
      }
      const biomass = v.grass + v.shrubs + v.trees;
      if (biomass > previousBiomass + 0.00001) summary.grown++;
      if (biomass < previousBiomass - 0.00001) summary.declined++;
      if (growthDay) {
        const fruitGain = climate.season !== 'Inverno' && stressDays === 0 ? (v.shrubs * 0.06 + v.trees * 0.04) * growth : 0;
        const rot = v.fruit * 0.08;
        v.fruit = clamp(v.fruit + fruitGain - rot, 0, 60);
        v.litter += rot;
        if (Math.abs(v.fruit - cell.vegetation.fruit) > 0.00001) summary.fruitChanged++;
      }
      return { ...cell, temperature, moisture, fertility, dryDays, stressDays, essence, vegetation: v, food: foodFrom(v), ...weather };
    });
    const tick = (current.tick + 1) % TICKS_PER_DAY;
    current = advanceLife({ ...current, day: tick === 0 ? day : current.day, tick, summary, cells }, 1 / TICKS_PER_DAY);
    if (tick === 0) current = advanceBeings(current);
  }
  return current;
}
