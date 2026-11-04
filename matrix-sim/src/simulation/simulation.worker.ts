import { advanceTicks, type World, type Cell } from './world';
import type { SimulationFrame } from './frame';
export type SimulationCommand = { type: 'reset'; world: World } | { type: 'advance'; ticks: number };
export type SimulationResult = { frame: SimulationFrame | null; elapsed: number };
let world: World | null = null;
const workerScope = self as unknown as { onmessage: (event: MessageEvent<{ id: number; command: SimulationCommand }>) => void; postMessage: (message: unknown) => void };
workerScope.onmessage = ({ data: { id, command } }) => {
  try {
    const started = performance.now();
    let frame: SimulationFrame | null = null;
    if (command.type === 'reset') world = command.world;
    else {
      if (!world) throw new Error('O mundo ainda está sendo preparado.');
      const previous = world;
      world = advanceTicks(world, command.ticks);
      frame = { day: world.day, tick: world.tick, summary: world.summary, life: world.life, beings: world.beings,
        changes: world.cells.flatMap((cell, index) => cell === previous.cells[index] ? [] : [[index, cell] as [number, Cell]]) };
    }
    workerScope.postMessage({ id, result: { frame, elapsed: performance.now() - started } });
  } catch (error) { workerScope.postMessage({ id, error: error instanceof Error ? error.message : String(error) }); }
};
