import { drawWorld, type Layer } from './drawWorld';
import { setSpriteSheet } from './landscape';
import type { World } from '../simulation/world';
export type RenderCommand = { world: World; layer: Layer };
export type RenderResult = { bitmap: ImageBitmap; elapsed: number };
const canvas = new OffscreenCanvas(1, 1);
// The world's spritesheet is read once; every frame waits for it so trees never pop in later.
const sprites = fetch(new URL('../sprites/mundo.png', import.meta.url))
  .then(response => { if (!response.ok) throw new Error('Não foi possível carregar os sprites do mundo.'); return response.blob(); })
  .then(blob => createImageBitmap(blob))
  .then(bitmap => {
    const sheet = new OffscreenCanvas(bitmap.width, bitmap.height), ctx = sheet.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0); bitmap.close();
    setSpriteSheet(ctx.getImageData(0, 0, sheet.width, sheet.height));
  });
const workerScope = self as unknown as { onmessage: (event: MessageEvent<{ id: number; command: RenderCommand }>) => void; postMessage: (message: unknown, transfer?: Transferable[]) => void };
workerScope.onmessage = async ({ data: { id, command } }) => {
  try {
    await sprites;
    const started = performance.now();
    drawWorld(canvas, command.world, command.layer);
    const bitmap = canvas.transferToImageBitmap();
    workerScope.postMessage({ id, result: { bitmap, elapsed: performance.now() - started } }, [bitmap]);
  } catch (error) { workerScope.postMessage({ id, error: error instanceof Error ? error.message : String(error) }); }
};
