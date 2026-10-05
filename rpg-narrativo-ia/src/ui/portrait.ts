import { useEffect, useState } from 'react';

/** Opções do retrato montável (índices guardados no save). */
export const SKIN_TONES = ['#f2d6bd', '#e0b38f', '#c68e63', '#9b6a45', '#6d4a32', '#45301f'] as const;
export const HAIR_COLORS = ['#1d1916', '#4a3020', '#8a5a2b', '#caa25b', '#a8432a', '#d9d9d9'] as const;
export const HAIR_STYLES = ['Raspado', 'Curto', 'Longo', 'Preso', 'Arrepiado', 'Capuz'] as const;

const CUSTOM_KEY = 'reset.portrait.custom';

/** Imagem própria do retrato, guardada só neste aparelho. */
export function readCustomPortrait(): string | null {
  try {
    return globalThis.localStorage?.getItem(CUSTOM_KEY) ?? null;
  } catch {
    return null;
  }
}

export function writeCustomPortrait(dataUrl: string | null): boolean {
  try {
    if (dataUrl) globalThis.localStorage?.setItem(CUSTOM_KEY, dataUrl);
    else globalThis.localStorage?.removeItem(CUSTOM_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Recorta e reduz a imagem escolhida (quadrado de 192 px) antes de guardar no aparelho. */
export async function prepareCustomPortrait(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('A imagem não pôde ser lida.'));
      element.src = url;
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('O aparelho não conseguiu preparar a imagem.');
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 192, 192);
    return canvas.toDataURL('image/webp', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function useCustomPortrait(): string | null {
  const [src, setSrc] = useState<string | null>(() => readCustomPortrait());
  useEffect(() => {
    const onStorage = () => setSrc(readCustomPortrait());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return src;
}

