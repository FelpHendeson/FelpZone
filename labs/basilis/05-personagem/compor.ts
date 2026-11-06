// Compõe um quadro do personagem: sombra, arma atrás, corpo, arma na frente.
// A arma é colocada pelo ponto `mao-principal` do quadro, na orientação que o molde manda,
// sem rotação. Feito para ser reaproveitado pelas próximas partes e pelos Labs 06 a 08.

import { MOLDE_FORMAT } from './molde.ts';
import { pointsAt } from './pontos.ts';

export interface WeaponImages {
  /** Uma imagem por orientação (16). */
  orientations: CanvasImageSource[];
  gripX: number;
  gripY: number;
}

export interface ComposeOptions {
  weapon?: WeaponImages | null;
  shadow?: boolean;
}

const SHADOW = 'rgba(16, 32, 20, 0.38)';

/** Sombra em pixels, embaixo dos pés: uma elipse achatada em volta da âncora. */
export function drawShadow(ctx: CanvasRenderingContext2D, anchorX: number, anchorY: number): void {
  ctx.fillStyle = SHADOW;
  ctx.fillRect(anchorX - 4, anchorY - 2, 8, 1);
  ctx.fillRect(anchorX - 6, anchorY - 1, 12, 1);
  ctx.fillRect(anchorX - 5, anchorY, 10, 1);
}

/**
 * Desenha o quadro `index` da animação `clipName` com o canto do quadro em (x, y), em pixels do contexto.
 * `flip` espelha para a esquerda (corpo e pontos).
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  frames: Record<string, CanvasImageSource[]>,
  clipName: string,
  index: number,
  flip: boolean,
  x: number,
  y: number,
  options: ComposeOptions = {},
): void {
  const { frameWidth, anchorX, anchorY } = MOLDE_FORMAT;
  if (options.shadow) drawShadow(ctx, x + anchorX, y + anchorY);
  const hand = pointsAt(clipName, index, flip)['mao-principal'];
  const weapon = options.weapon;
  const drawWeapon = () => {
    if (!weapon) return;
    ctx.drawImage(weapon.orientations[hand.orientation], x + hand.x - weapon.gripX, y + hand.y - weapon.gripY);
  };
  if (!hand.front) drawWeapon();
  const image = frames[clipName][index];
  if (flip) {
    ctx.save();
    ctx.translate(x + frameWidth, y);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  } else ctx.drawImage(image, x, y);
  if (hand.front) drawWeapon();
}
