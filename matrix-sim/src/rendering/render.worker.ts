import { drawWorld, type Layer } from './drawWorld';
import type { World } from '../simulation/world';
export type RenderCommand = { world: World; layer: Layer; resolution: number };
export type RenderResult = { bitmap: ImageBitmap; elapsed: number };
const canvas = new OffscreenCanvas(1, 1);
const workerScope = self as unknown as { onmessage: (event: MessageEvent<{ id: number; command: RenderCommand }>) => void; postMessage: (message: unknown, transfer?: Transferable[]) => void };
workerScope.onmessage = ({ data: { id, command } }) => {
  try {
    const started = performance.now();
    drawWorld(canvas, command.world, command.layer, command.resolution);
    const bitmap = canvas.transferToImageBitmap();
    workerScope.postMessage({ id, result: { bitmap, elapsed: performance.now() - started } }, [bitmap]);
  } catch (error) { workerScope.postMessage({ id, error: error instanceof Error ? error.message : String(error) }); }
};
