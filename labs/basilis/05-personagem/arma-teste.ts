// Espada de teste: uma folha de 16 orientações já desenhadas (sem rotação em tempo real),
// gerada uma vez e colocada pelo ponto `mao-principal`. Só serve para provar os pontos;
// as armas de verdade, por família, são do Lab 07.

import { IndexedImage } from './raster.ts';
import { ORIENTATIONS, orientationVector } from './pontos.ts';

/** Paleta da espada: metal (contorno, sombra, base, luz) e ouro do pomo e da guarda. */
export const ARMA_PALETTE: (string | null)[] = [null, '#2e3352', '#7d87a8', '#c3cbe0', '#f4f7ff', '#7a5214', '#e0b04a'];
const METAL = [1, 2, 3, 4];
const GOLD = [5, 6];

/** Cada orientação é desenhada num quadrado com a pegada no canto (RADIUS, RADIUS). */
export const ARMA_RADIUS = 15;
const BLADE = 9;

export interface WeaponSprite {
  image: IndexedImage;
  /** Ponto da pegada dentro da imagem, em cantos de pixel; vai sobre o ponto da mão. */
  gripX: number;
  gripY: number;
}

function drawOrientation(orientation: number): WeaponSprite {
  const size = ARMA_RADIUS * 2;
  const image = new IndexedImage(size, size);
  const shape = new IndexedImage(size, size);
  const { x: c, y: s } = orientationVector(orientation);
  const cell = (along: number, across = 0) => ({
    x: Math.floor(ARMA_RADIUS + c * along - s * across),
    y: Math.floor(ARMA_RADIUS + s * along + c * across),
  });
  const put = (along: number, across: number, color: number) => {
    const p = cell(along, across);
    shape.set(p.x, p.y, 1);
    image.set(p.x, p.y, color);
  };
  // O cabo fica escondido pela mão (que é do corpo); aparecem o pomo atrás, a guarda na frente e a lâmina.
  put(-2, 0, GOLD[1]);
  for (const across of [-1, 0, 1]) put(2, across, across < 0 ? GOLD[1] : GOLD[0]);
  // Lâmina de um pixel: mais escura junto da guarda, clara no meio e brilhante na ponta.
  for (let along = 3; along <= BLADE + 1; along += 0.5) put(along, 0, along >= BLADE ? METAL[3] : along < 5 ? METAL[1] : METAL[2]);
  // Contorno colorido em volta: o tom mais escuro do metal.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (shape.get(x, y) !== 0) continue;
      const touches = shape.get(x + 1, y) || shape.get(x - 1, y) || shape.get(x, y + 1) || shape.get(x, y - 1);
      if (touches) image.set(x, y, METAL[0]);
    }
  }
  return { image, gripX: ARMA_RADIUS, gripY: ARMA_RADIUS };
}

/** As 16 orientações da espada de teste, na ordem de `ORIENTATIONS`. */
export function generateTestSword(): WeaponSprite[] {
  return Array.from({ length: ORIENTATIONS }, (_, orientation) => drawOrientation(orientation));
}
