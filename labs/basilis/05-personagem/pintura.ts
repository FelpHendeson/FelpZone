// Pinta imagens indexadas num canvas com uma paleta (lista de cores CSS em hexadecimal; 0 = transparente).

import { IndexedImage } from './raster.ts';

function rgba(color: string | null): [number, number, number, number] {
  if (!color) return [0, 0, 0, 0];
  const hex = color.replace('#', '');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255];
}

export function paintIndexed(image: IndexedImage, palette: (string | null)[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(image.width, image.height);
  const colors = palette.map(rgba);
  for (let i = 0; i < image.data.length; i++) pixels.data.set(colors[image.data[i]] ?? [0, 0, 0, 0], i * 4);
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

/** Salva um canvas como PNG. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, 'image/png');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
