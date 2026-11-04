import type { Cell, World } from './world';

export type SimulationFrame = Pick<World, 'day' | 'tick' | 'summary' | 'life' | 'beings'> & { changes: [number, Cell][] };
export function applyFrame(previous: World, frame: SimulationFrame): World {
  const changes = new Map(frame.changes);
  return { ...previous, day: frame.day, tick: frame.tick, summary: frame.summary, life: frame.life, beings: frame.beings,
    cells: previous.cells.map((cell, index) => changes.get(index) ?? cell) };
}
