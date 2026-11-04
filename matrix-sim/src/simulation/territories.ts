import type { World } from './world';

export type Territories = { owners: Int32Array; contested: Uint8Array; areas: Map<number, number> };
export const territoryRadius = (population: number) => Math.min(13, 4 + Math.ceil(Math.sqrt(population) * 1.7));
export function territoryKey(world: World) {
  const populations = new Map<number, number>();
  for (const c of world.life.creatures) populations.set(c.bandId, (populations.get(c.bandId) ?? 0) + 1);
  return world.life.bands.map(b => `${b.id}:${b.home}:${populations.has(b.id) ? territoryRadius(populations.get(b.id)!) : 0}`).join('|');
}

/** Reachable land around the group's home, not ownership of the entire map. */
export function buildTerritories(world: World): Territories {
  const owners = new Int32Array(world.cells.length), contested = new Uint8Array(world.cells.length);
  const best = new Float32Array(world.cells.length).fill(Infinity), second = new Float32Array(world.cells.length).fill(Infinity);
  for (const band of [...world.life.bands].sort((a, b) => a.id - b.id)) {
    const population = world.life.creatures.filter(c => c.bandId === band.id).length;
    if (!population) continue;
    const radius = territoryRadius(population), visited = new Set([band.home]);
    const queue = [{ index: band.home, distance: 0 }];
    for (let head = 0; head < queue.length; head++) {
      const { index, distance } = queue[head], cell = world.cells[index];
      if (cell.terrain === 'water' || cell.terrain === 'mountain') continue;
      const score = distance / radius;
      if (score < best[index] - 0.000001) { second[index] = best[index]; best[index] = score; owners[index] = band.id; }
      else second[index] = Math.min(second[index], score);
      if (distance >= radius) continue;
      const x = index % world.size, y = Math.floor(index / world.size);
      const neighbors = [x > 0 ? index - 1 : -1, x < world.size - 1 ? index + 1 : -1, y > 0 ? index - world.size : -1, y < world.size - 1 ? index + world.size : -1];
      for (const next of neighbors) if (next >= 0 && !visited.has(next)) {
        visited.add(next); queue.push({ index: next, distance: distance + 1 });
      }
    }
  }
  const areas = new Map<number, number>();
  for (let i = 0; i < owners.length; i++) if (owners[i]) {
    areas.set(owners[i], (areas.get(owners[i]) ?? 0) + 1);
    contested[i] = Number(Number.isFinite(second[i]) && second[i] - best[i] < 0.18);
  }
  return { owners, contested, areas };
}
