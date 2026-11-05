// Inimigo do lab gerado por código: um Folhim selvagem de 16 × 16, nas regras da direção de arte.

const FOLHIM = {
  outline: '#1f3d1a',
  body: '#6cae4a',
  bodyLight: '#8fcf63',
  bodyDark: '#4d8a36',
  leaf: '#3f8a3a',
  leafLight: '#62ad50',
  eye: '#1d1d2b',
  eyeAngry: '#c8323a',
  shadow: 'rgba(20, 40, 20, 0.35)',
};

export interface FolhimFrames {
  idle: HTMLCanvasElement;
  hop: HTMLCanvasElement;
  /** Aviso antes do bote: corpo encolhido e olhos vermelhos. */
  windup: HTMLCanvasElement;
}

export function generateFolhim(): FolhimFrames {
  return { idle: draw('idle'), hop: draw('hop'), windup: draw('windup') };
}

function draw(pose: 'idle' | 'hop' | 'windup'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  const lift = pose === 'hop' ? -2 : 0;
  const squash = pose === 'windup' ? 1 : 0;

  ctx.fillStyle = FOLHIM.shadow;
  ctx.fillRect(4, 14, 8, 2);

  const cx = 8;
  const cy = 10 + lift + squash;
  const rx = 5.5 + squash * 0.5;
  const ry = 4.5 - squash;
  const inside = (x: number, y: number) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      ctx.fillStyle = edge ? FOLHIM.outline : x + y < cx + cy - 4 ? FOLHIM.bodyLight : x + y > cx + cy + 3 ? FOLHIM.bodyDark : FOLHIM.body;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Broto no alto da cabeça.
  const top = Math.round(cy - ry);
  ctx.fillStyle = FOLHIM.outline;
  ctx.fillRect(7, top - 3, 1, 3);
  ctx.fillStyle = FOLHIM.leaf;
  ctx.fillRect(8, top - 4, 3, 2);
  ctx.fillStyle = FOLHIM.leafLight;
  ctx.fillRect(8, top - 4, 2, 1);
  ctx.fillStyle = FOLHIM.leaf;
  ctx.fillRect(4, top - 3, 3, 1);

  const eyeColor = pose === 'windup' ? FOLHIM.eyeAngry : FOLHIM.eye;
  const eyeY = Math.round(cy - 1);
  ctx.fillStyle = eyeColor;
  ctx.fillRect(5, eyeY, 2, 2);
  ctx.fillRect(9, eyeY, 2, 2);
  if (pose === 'windup') {
    // Sobrancelhas franzidas.
    ctx.fillStyle = FOLHIM.outline;
    ctx.fillRect(4, eyeY - 1, 2, 1);
    ctx.fillRect(10, eyeY - 1, 2, 1);
  }
  return canvas;
}
