import type { Cell } from './world';

/** A place where the world's essence surfaces. Named, fixed for the life of the world. */
export type EssenceSource = { index: number; name: string; strength: number };
export const ESSENCE = {
  regeneration: 0.03, // share of the gap to the natural level recovered per day
  diffusion: 0.15, // weekly pull toward the neighbors' average
  absorption: 0.004, // share of the ground's essence a creature with affinity 1 draws per day
  pointsPerUnit: 300, // ground essence (0–1) to creature points (0–100)
  leak: 0.01, // share of a creature's points that fades per day
  awakening: 50, // points at which a Folhim awakens
  deathPulse: 0.12, deathMemory: 0.004,
} as const;
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

// Its own random stream: adding essence must not change the terrain of existing seeds.
function stream(seed: string) {
  let state = 2166136261;
  for (const char of `${seed}:essência`) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ state >>> 15, state | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function smoothNoise(random: () => number, size: number, resolution = 6) {
  const values = Array.from({ length: (resolution + 1) ** 2 }, random);
  return (x: number, y: number) => {
    const px = x / size * resolution, py = y / size * resolution, ix = Math.floor(px), iy = Math.floor(py);
    const smooth = (v: number) => v * v * (3 - 2 * v), fx = smooth(px - ix), fy = smooth(py - iy);
    const at = (dx: number, dy: number) => values[Math.min(resolution, iy + dy) * (resolution + 1) + Math.min(resolution, ix + dx)];
    return (at(0, 0) * (1 - fx) + at(1, 0) * fx) * (1 - fy) + (at(0, 1) * (1 - fx) + at(1, 1) * fx) * fy;
  };
}
const syllables = ['va', 'lu', 'ar', 'en', 'thi', 'mor', 'sel', 'ia', 'quo', 'ren', 'da', 'ol', 'vi', 'ny', 'sa', 'ter'];
const places = ['Nascente', 'Poço', 'Fonte', 'Olho', 'Veio'];
function sourceName(random: () => number) {
  const word = Array.from({ length: 2 + Math.floor(random() * 2) }, () => syllables[Math.floor(random() * syllables.length)]).join('');
  return `${places[Math.floor(random() * places.length)]} de ${word[0].toUpperCase()}${word.slice(1)}`;
}

/** Places 3–5 named sources on land, spread apart, and sets each cell's natural essence. Mutates the new cells. */
export function seedEssence(seed: string, size: number, cells: Cell[]): EssenceSource[] {
  const random = stream(seed), noise = smoothNoise(random, size);
  const count = 3 + Math.floor(random() * 3), spacing = size / 4;
  const candidates = cells.filter(c => c.terrain !== 'water' && c.terrain !== 'sand')
    .map(c => ({ c, score: c.elevation * 0.5 + (c.terrain === 'forest' ? 0.3 : 0) + random() * 0.4 }))
    .sort((a, b) => b.score - a.score);
  const sources: EssenceSource[] = [];
  for (const { c } of candidates) {
    if (sources.length >= count) break;
    if (sources.some(s => Math.hypot(cells[s.index].x - c.x, cells[s.index].y - c.y) < spacing)) continue;
    sources.push({ index: c.y * size + c.x, name: sourceName(random), strength: 0.7 + random() * 0.3 });
  }
  const radius = size / 12;
  for (const cell of cells) {
    const bonus = cell.terrain === 'forest' ? 0.08 : cell.terrain === 'mountain' ? 0.1 : cell.terrain === 'water' ? -0.04 : 0;
    const glow = sources.reduce((sum, s) => sum + s.strength * Math.exp(-((Math.hypot(cells[s.index].x - cell.x, cells[s.index].y - cell.y) / radius) ** 2)), 0);
    cell.essenceBase = clamp(0.06 + noise(cell.x, cell.y) * 0.22 + bonus + glow * 0.75, 0, 0.95);
    cell.essence = cell.essenceBase;
  }
  return sources;
}

/** Daily: recover toward the natural level; on weekly days also spread toward the neighbors. */
export function flowEssence(cells: Cell[], index: number, size: number, day: number) {
  const cell = cells[index];
  let essence = cell.essence + (cell.essenceBase - cell.essence) * ESSENCE.regeneration;
  if (day % 7 === 0) {
    // Runs for every region; plain arithmetic instead of temporary arrays.
    const x = index % size, y = Math.floor(index / size);
    let sum = 0, count = 0;
    if (x > 0) { sum += cells[index - 1].essence; count++; }
    if (x < size - 1) { sum += cells[index + 1].essence; count++; }
    if (y > 0) { sum += cells[index - size].essence; count++; }
    if (y < size - 1) { sum += cells[index + size].essence; count++; }
    essence += (sum / count - essence) * ESSENCE.diffusion;
  }
  return essence < 0 ? 0 : essence > 1 ? 1 : essence;
}

/** What a creature draws from the ground in this slice of the day. Ground loses exactly what the creature gains. */
export function absorbEssence(cell: Cell, affinity: number, elapsedDays: number) {
  const drawn = Math.min(cell.essence, cell.essence * ESSENCE.absorption * affinity * elapsedDays);
  return { cell: drawn > 0 ? { ...cell, essence: cell.essence - drawn } : cell, points: drawn * ESSENCE.pointsPerUnit };
}

/** A death returns part of the creature's essence and leaves a lasting mark on the place. */
export function deathResidue(cell: Cell, points: number): Cell {
  return { ...cell, essence: clamp(cell.essence + ESSENCE.deathPulse + points / ESSENCE.pointsPerUnit * 0.4), essenceBase: clamp(cell.essenceBase + ESSENCE.deathMemory, 0, 0.95) };
}
