// Animações de golpe. Cada estilo é uma forma de desenhar o mesmo ataque; no futuro, cada arma escolhe o seu.

export type SlashStyle = 'cone' | 'crescent' | 'pixels';

export const SLASH_OPTIONS: [SlashStyle, string][] = [
  ['cone', 'Cone (preenche com brilho que some)'],
  ['crescent', 'Crescente (lâmina que varre)'],
  ['pixels', 'Pixels (borda do arco)'],
];

export interface SlashShape {
  /** Centro do golpe e raio, em pixels de tela. */
  x: number;
  y: number;
  reach: number;
  /** Direção do golpe e abertura total, em radianos. */
  angle: number;
  arc: number;
  /** 0 no início do golpe, 1 no fim. */
  progress: number;
  /** Pixels de tela por pixel do jogo, para o estilo em pixels. */
  scale: number;
}

const LIGHT = '255, 244, 200';

export function drawSlash(ctx: CanvasRenderingContext2D, style: SlashStyle, shape: SlashShape): void {
  if (style === 'cone') drawCone(ctx, shape);
  else if (style === 'crescent') drawCrescent(ctx, shape);
  else drawPixels(ctx, shape);
}

/** O golpe do Lab 01: um setor que se abre e vai sumindo. */
function drawCone(ctx: CanvasRenderingContext2D, { x, y, reach, angle, arc, progress }: SlashShape): void {
  const half = arc / 2;
  const sweep = -half + arc * progress;
  ctx.fillStyle = `rgba(${LIGHT}, ${0.55 * (1 - progress) + 0.15})`;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, reach, angle - half, angle + sweep);
  ctx.closePath();
  ctx.fill();
}

/** Uma faixa curva que varre o arco, com a ponta mais forte e um rastro que se apaga. */
function drawCrescent(ctx: CanvasRenderingContext2D, { x, y, reach, angle, arc, progress }: SlashShape): void {
  const half = arc / 2;
  const head = angle - half + arc * Math.min(1, progress * 1.4);
  const tailLength = arc * 0.55;
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const from = Math.max(angle - half, head - tailLength * (1 - t0));
    const to = Math.max(angle - half, head - tailLength * (1 - t1));
    if (to <= from) continue;
    // Mais grossa e mais clara perto da ponta.
    const inner = reach * (0.78 - 0.28 * t1);
    const alpha = (0.15 + 0.75 * t1) * (1 - Math.max(0, progress - 0.7) / 0.3);
    ctx.fillStyle = `rgba(${LIGHT}, ${Math.max(0, alpha)})`;
    ctx.beginPath();
    ctx.arc(x, y, reach, from, to);
    ctx.arc(x, y, inner, to, from, true);
    ctx.closePath();
    ctx.fill();
  }
}

/** Arco de quadradinhos claros, em pixels do jogo. */
function drawPixels(ctx: CanvasRenderingContext2D, { x, y, reach, angle, arc, progress, scale }: SlashShape): void {
  const size = Math.round(2 * scale);
  ctx.fillStyle = `rgb(${LIGHT})`;
  for (let i = 0; i <= 6; i++) {
    const a = angle - arc / 2 + arc * (i / 6) * Math.min(1, progress * 1.5);
    ctx.fillRect(Math.round(x + Math.cos(a) * reach), Math.round(y + Math.sin(a) * reach), size, size);
  }
}
