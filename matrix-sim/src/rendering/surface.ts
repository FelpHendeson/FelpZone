export type Surface = HTMLCanvasElement | OffscreenCanvas;
export type DrawingContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export function createSurface(width: number, height: number): Surface {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  return canvas;
}
