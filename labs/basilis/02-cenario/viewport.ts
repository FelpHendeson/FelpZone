// Centro imutável: a escala é a maior que ainda mostra a área central inteira; o que sobra mostra mais mundo.

export type ScaleMode = 'integer' | 'free';

export interface Viewport {
  /** Pixels de tela por pixel do jogo. */
  scale: number;
  /** Resolução interna, em pixels do jogo. */
  width: number;
  height: number;
}

export function computeViewport(screenWidth: number, screenHeight: number, safeSize: number, mode: ScaleMode): Viewport {
  let scale = Math.min(screenWidth / safeSize, screenHeight / safeSize);
  if (mode === 'integer') scale = Math.max(1, Math.floor(scale));
  return { scale, width: Math.ceil(screenWidth / scale), height: Math.ceil(screenHeight / scale) };
}

export interface CameraAxis {
  /** Borda esquerda (ou de cima) da câmera, em pixels do jogo, com fração. */
  left: number;
  /** Pixel inteiro onde o mundo é desenhado na resolução interna. */
  origin: number;
  /** Sobra entre `left` e `origin` (0 a 1), aplicada só na hora de ampliar. */
  fraction: number;
}

/**
 * Câmera centrada no alvo e sem sair do mundo.
 * Com `snap`, ela anda de pixel em pixel do jogo; sem `snap`, a fração vira deslocamento em pixels de tela,
 * o que deixa a rolagem lisa sem mudar o tamanho dos pixels.
 */
export function cameraAxis(target: number, size: number, world: number, snap: boolean): CameraAxis {
  let left = world <= size ? (world - size) / 2 : Math.min(Math.max(target - size / 2, 0), world - size);
  if (snap) left = Math.round(left);
  const origin = Math.floor(left);
  return { left, origin, fraction: left - origin };
}
