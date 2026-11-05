// Folhas de personagem geradas por código, no formato de `animation.ts`.
// Herói: quadros de 32 × 32 (corpo de 16 × 24 com espaço para a espada). Folhim: 16 × 16.

import { frameRect, sheetSize, type Clip, type SheetFormat } from './animation.ts';

const directional = (row: number, frames: number, fps: number, loop: boolean, active?: [number, number]) => ({
  down: { row, frames, fps, loop, active },
  up: { row: row + 1, frames, fps, loop, active },
  side: { row: row + 2, frames, fps, loop, active },
});

function expand(name: string, clips: Record<'down' | 'up' | 'side', Clip>): Record<string, Clip> {
  return Object.fromEntries(Object.entries(clips).map(([direction, clip]) => [`${name}-${direction}`, clip]));
}

export const HERO_FORMAT: SheetFormat = {
  frameWidth: 32,
  frameHeight: 32,
  anchorX: 16,
  anchorY: 28,
  clips: {
    ...expand('idle', directional(0, 2, 2.5, true)),
    ...expand('walk', directional(3, 4, 8, true)),
    ...expand('attack', directional(6, 4, 16, false, [1, 2])),
    ...expand('hurt', directional(9, 2, 10, false)),
    ...expand('dodge', directional(12, 3, 16, false)),
    death: { row: 15, frames: 4, fps: 6, loop: false },
  },
};

export const FOLHIM_FORMAT: SheetFormat = {
  frameWidth: 16,
  frameHeight: 16,
  anchorX: 8,
  anchorY: 14,
  clips: {
    idle: { row: 0, frames: 2, fps: 3, loop: true },
    walk: { row: 1, frames: 2, fps: 8, loop: true },
    windup: { row: 2, frames: 2, fps: 14, loop: true },
    lunge: { row: 3, frames: 1, fps: 1, loop: true },
    hurt: { row: 4, frames: 1, fps: 1, loop: true },
    death: { row: 5, frames: 4, fps: 10, loop: false },
  },
};

/** Recorta cada animação da folha em quadros separados. */
export function sliceClips(sheet: CanvasImageSource, format: SheetFormat): Record<string, HTMLCanvasElement[]> {
  const result: Record<string, HTMLCanvasElement[]> = {};
  for (const [name, clip] of Object.entries(format.clips)) {
    result[name] = Array.from({ length: clip.frames }, (_, index) => {
      const { x, y, width, height } = frameRect(format, clip, index);
      const { canvas, ctx } = createCanvas(width, height);
      ctx.drawImage(sheet, x, y, width, height, 0, 0, width, height);
      return canvas;
    });
  }
  return result;
}

// ---- Herói ----

const HERO = {
  outline: '#3b2a1a',
  skin: '#f0c8a0',
  skinShade: '#d39f78',
  hair: '#5a3a22',
  hairLight: '#7a5232',
  tunic: '#c9a227',
  tunicLight: '#e3c457',
  tunicDark: '#97781a',
  pants: '#4b5a78',
  boots: '#3b2a1a',
  eye: '#1d1d2b',
  shadow: 'rgba(20, 40, 20, 0.35)',
  blade: '#dfe5ee',
  bladeTip: '#ffffff',
  bladeDark: '#8a93a6',
  guard: '#b08a2e',
  grip: '#6b4a2b',
};

type Facing = 'down' | 'up' | 'side';

interface Pose {
  facing: Facing;
  /** Sobe (negativo) ou desce o tronco e a cabeça. */
  bob?: number;
  /** Abaixa tronco e cabeça encolhendo as pernas (agachar, rolar). */
  crouch?: number;
  /** Inclina tronco e cabeça para os lados, em pixels (positivo = para onde olha). */
  lean?: number;
  leftLift?: number;
  rightLift?: number;
  eyes?: 'open' | 'closed' | 'x';
}

/** Corpo de 16 × 24 desenhado com o canto em (8, 6) do quadro de 32 × 32; pés na linha 28. */
const BODY_X = 8;
const BODY_Y = 6;

function drawBody(ctx: CanvasRenderingContext2D, pose: Pose): void {
  const crouch = pose.crouch ?? 0;
  const dy = (pose.bob ?? 0) + crouch;
  const dx = pose.lean ?? 0;
  const side = pose.facing === 'side';
  const rect = (x: number, y: number, w: number, h: number, color: string, ox = 0, oy = 0) => {
    if (w <= 0 || h <= 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(BODY_X + x + ox, BODY_Y + y + oy, w, h);
  };

  rect(4, 22, 8, 2, HERO.shadow);

  // Pernas: encolhem no agachamento; no passo, uma sobe um pixel.
  const legHeight = Math.max(1, 5 - crouch);
  const leg = (x: number, lift: number) => {
    const top = 22 - legHeight - lift;
    rect(x, top, 4, legHeight, HERO.outline);
    rect(x + 1, top, 2, Math.max(0, legHeight - 2), HERO.pants);
    rect(x + 1, top + legHeight - 2, 2, legHeight >= 2 ? 1 : 0, HERO.boots);
  };
  if (side) leg(6, pose.leftLift ?? 0);
  else {
    leg(4, pose.leftLift ?? 0);
    leg(8, pose.rightLift ?? 0);
  }

  // Tronco.
  rect(3, 11, 10, 7, HERO.outline, dx, dy);
  rect(4, 12, 8, 5, HERO.tunic, dx, dy);
  rect(4, 12, 3, 2, HERO.tunicLight, dx, dy);
  rect(4, 16, 8, 1, HERO.tunicDark, dx, dy);
  if (!side) {
    rect(2, 12, 2, 4, HERO.outline, dx, dy);
    rect(12, 12, 2, 4, HERO.outline, dx, dy);
    rect(2, 13, 1, 2, HERO.skin, dx, dy);
    rect(13, 13, 1, 2, HERO.skin, dx, dy);
  }

  // Cabeça.
  rect(3, 2, 10, 10, HERO.outline, dx, dy);
  rect(4, 3, 8, 8, HERO.skin, dx, dy);
  rect(10, 8, 2, 3, HERO.skinShade, dx, dy);
  rect(4, 3, 8, 3, HERO.hair, dx, dy);
  rect(5, 3, 3, 1, HERO.hairLight, dx, dy);

  const eye = (x: number) => {
    if (pose.eyes === 'closed') rect(x, 8, 2, 1, HERO.eye, dx, dy);
    else if (pose.eyes === 'x') {
      rect(x, 7, 1, 1, HERO.eye, dx, dy);
      rect(x + 1, 8, 1, 1, HERO.eye, dx, dy);
    } else rect(x, 7, 1, 2, HERO.eye, dx, dy);
  };
  if (pose.facing === 'down') {
    eye(5);
    eye(10);
  } else if (pose.facing === 'up') {
    rect(4, 3, 8, 7, HERO.hair, dx, dy);
    rect(5, 4, 3, 1, HERO.hairLight, dx, dy);
  } else {
    rect(4, 3, 3, 6, HERO.hair, dx, dy);
    eye(10);
  }
}

/** Mão que segura a espada, por direção, em coordenadas do quadro de 32 × 32. */
const HAND: Record<Facing, { x: number; y: number; angle: number }> = {
  down: { x: 21, y: 20, angle: Math.PI / 2 },
  up: { x: 10, y: 20, angle: -Math.PI / 2 },
  side: { x: 18, y: 20, angle: 0 },
};
/**
 * Ângulo da espada em cada quadro do ataque, relativo a para onde o herói olha: prepara, corta, acerta, volta.
 * De lado, a preparação puxa a espada para trás das costas, para ela continuar visível.
 */
const SWING: Record<Facing, number[]> = {
  down: [-110, -40, 30, 70].map((degrees) => (degrees * Math.PI) / 180),
  up: [-110, -40, 30, 70].map((degrees) => (degrees * Math.PI) / 180),
  side: [-150, -40, 30, 70].map((degrees) => (degrees * Math.PI) / 180),
};

function drawSword(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const px = (i: number, offset = 0) => ({ x: Math.round(x + cos * i - sin * offset), y: Math.round(y + sin * i + cos * offset) });
  const dot = (p: { x: number; y: number }, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y, 1, 1);
  };
  dot(px(0), HERO.grip);
  dot(px(1), HERO.grip);
  dot(px(2, -1), HERO.guard);
  dot(px(2), HERO.guard);
  dot(px(2, 1), HERO.guard);
  for (let i = 3; i <= 11; i++) {
    dot(px(i, 1), HERO.bladeDark);
    dot(px(i), i === 11 ? HERO.bladeTip : HERO.blade);
  }
}

/** Ângulo da espada em repouso, por direção: apontada para baixo, ao lado do corpo (graus). */
const REST: Record<Facing, number> = { down: 100, up: 80, side: 65 };
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Corpo com a arma sempre na mão. A mão acompanha o tronco (inclinação, passo e agachamento).
 * De costas atacando, ou erguida acima da mão, a arma fica atrás do corpo.
 */
function drawArmed(ctx: CanvasRenderingContext2D, pose: Pose, angle: number, attacking = false): void {
  const hand = HAND[pose.facing];
  const x = hand.x + (pose.lean ?? 0);
  const y = hand.y + (pose.bob ?? 0) + (pose.crouch ?? 0);
  const behind = (attacking && pose.facing === 'up') || Math.sin(angle) < -0.3;
  if (behind) drawSword(ctx, x, y, angle);
  drawBody(ctx, pose);
  if (!behind) drawSword(ctx, x, y, angle);
}

/** Repouso mais um desvio (balanço do passo, braço caído no dano). */
const held = (facing: Facing, offset = 0) => radians(REST[facing] + offset);

function drawAttack(ctx: CanvasRenderingContext2D, facing: Facing, frame: number): void {
  const lean = [-1, 0, 1, 1][frame];
  const pose: Pose = {
    facing,
    lean: facing === 'side' ? lean : 0,
    crouch: frame === 0 ? 1 : 0,
    bob: facing === 'side' ? 0 : frame === 2 ? -1 : 0,
  };
  drawArmed(ctx, pose, HAND[facing].angle + SWING[facing][frame], true);
}

function drawLying(ctx: CanvasRenderingContext2D): void {
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  rect(6, 27, 22, 3, HERO.shadow);
  rect(5, 20, 9, 9, HERO.outline);
  rect(6, 21, 7, 7, HERO.skin);
  rect(6, 21, 3, 7, HERO.hair);
  rect(10, 23, 1, 1, HERO.eye);
  rect(11, 24, 1, 1, HERO.eye);
  rect(10, 25, 1, 1, HERO.eye);
  rect(13, 21, 9, 7, HERO.outline);
  rect(14, 22, 7, 5, HERO.tunic);
  rect(14, 22, 7, 1, HERO.tunicLight);
  rect(21, 22, 7, 5, HERO.outline);
  rect(22, 23, 5, 3, HERO.pants);
  // A espada cai ao lado do corpo.
  drawSword(ctx, 9, 30, 0);
}

const WALK_STEPS: Pose[] = [
  { facing: 'down', leftLift: 1, bob: -1 },
  { facing: 'down' },
  { facing: 'down', rightLift: 1, bob: -1 },
  { facing: 'down' },
];
/** Desvio da espada em cada quadro do andar, em graus. */
const WALK_SWING = [12, 0, -12, 0];

export function generateHeroSheet(): HTMLCanvasElement {
  const { width, height } = sheetSize(HERO_FORMAT);
  const { canvas, ctx } = createCanvas(width, height);
  const cell = (name: string, index: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
    const { x, y } = frameRect(HERO_FORMAT, HERO_FORMAT.clips[name], index);
    ctx.save();
    ctx.translate(x, y);
    draw(ctx);
    ctx.restore();
  };

  for (const facing of ['down', 'up', 'side'] as Facing[]) {
    cell(`idle-${facing}`, 0, (c) => drawArmed(c, { facing }, held(facing)));
    cell(`idle-${facing}`, 1, (c) => drawArmed(c, { facing, crouch: 1 }, held(facing)));
    // A espada balança com o passo.
    WALK_STEPS.forEach((step, index) =>
      cell(`walk-${facing}`, index, (c) => drawArmed(c, { ...step, facing }, held(facing, WALK_SWING[index]))),
    );
    for (let index = 0; index < 4; index++) cell(`attack-${facing}`, index, (c) => drawAttack(c, facing, index));
    cell(`hurt-${facing}`, 0, (c) => drawArmed(c, { facing, eyes: 'x', crouch: 1, lean: facing === 'side' ? -1 : 0 }, held(facing, 25)));
    cell(`hurt-${facing}`, 1, (c) => drawArmed(c, { facing, eyes: 'closed' }, held(facing, 10)));
    [2, 4, 2].forEach((crouch, index) =>
      cell(`dodge-${facing}`, index, (c) => drawArmed(c, { facing, crouch, eyes: 'closed' }, held(facing, crouch * 6))),
    );
  }
  cell('death', 0, (c) => drawArmed(c, { facing: 'down', eyes: 'x', crouch: 2 }, held('down', 30)));
  cell('death', 1, (c) => drawArmed(c, { facing: 'down', eyes: 'x', crouch: 4 }, held('down', 50)));
  cell('death', 2, drawLying);
  cell('death', 3, drawLying);
  return canvas;
}

// ---- Folhim ----

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

interface FolhimPose {
  lift?: number;
  /** Achata (positivo) ou estica (negativo) o corpo. */
  squash?: number;
  /** Alonga para os lados (bote). */
  stretch?: number;
  eyes?: 'open' | 'angry' | 'x';
  sprout?: boolean;
}

function drawFolhim(ctx: CanvasRenderingContext2D, pose: FolhimPose): void {
  const lift = pose.lift ?? 0;
  const squash = pose.squash ?? 0;
  ctx.fillStyle = FOLHIM.shadow;
  ctx.fillRect(4 - (pose.stretch ?? 0), 14, 8 + 2 * (pose.stretch ?? 0), 2);

  const cx = 8;
  const cy = 10 + lift + squash;
  const rx = 5.5 + squash * 0.5 + (pose.stretch ?? 0);
  const ry = Math.max(1.5, 4.5 - squash);
  const inside = (x: number, y: number) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      ctx.fillStyle = edge ? FOLHIM.outline : x + y < cx + cy - 4 ? FOLHIM.bodyLight : x + y > cx + cy + 3 ? FOLHIM.bodyDark : FOLHIM.body;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  if (pose.sprout !== false) {
    const top = Math.round(cy - ry);
    ctx.fillStyle = FOLHIM.outline;
    ctx.fillRect(7, top - 3, 1, 3);
    ctx.fillStyle = FOLHIM.leaf;
    ctx.fillRect(8, top - 4, 3, 2);
    ctx.fillStyle = FOLHIM.leafLight;
    ctx.fillRect(8, top - 4, 2, 1);
    ctx.fillStyle = FOLHIM.leaf;
    ctx.fillRect(4, top - 3, 3, 1);
  }

  const eyeY = Math.round(cy - Math.min(1, ry - 1));
  if (pose.eyes === 'x') {
    ctx.fillStyle = FOLHIM.eye;
    for (const x of [5, 9]) {
      ctx.fillRect(x, eyeY - 1, 1, 1);
      ctx.fillRect(x + 1, eyeY, 1, 1);
      ctx.fillRect(x, eyeY + 1, 1, 1);
    }
    return;
  }
  ctx.fillStyle = pose.eyes === 'angry' ? FOLHIM.eyeAngry : FOLHIM.eye;
  ctx.fillRect(5, eyeY, 2, 2);
  ctx.fillRect(9, eyeY, 2, 2);
  if (pose.eyes === 'angry') {
    ctx.fillStyle = FOLHIM.outline;
    ctx.fillRect(4, eyeY - 1, 2, 1);
    ctx.fillRect(10, eyeY - 1, 2, 1);
  }
}

/** Folhas soltas e a mancha no chão quando o Folhim se desfaz. */
function drawPoof(ctx: CanvasRenderingContext2D, spread: number, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = FOLHIM.bodyDark;
  ctx.fillRect(5, 13, 6, 2);
  for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 0], [0, -1]]) {
    ctx.fillStyle = (x + y) % 2 === 0 ? FOLHIM.leafLight : FOLHIM.leaf;
    ctx.fillRect(Math.round(7 + x * spread), Math.round(9 + y * spread), 2, 1);
  }
  ctx.globalAlpha = 1;
}

export function generateFolhimSheet(): HTMLCanvasElement {
  const { width, height } = sheetSize(FOLHIM_FORMAT);
  const { canvas, ctx } = createCanvas(width, height);
  const cell = (name: string, index: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
    const { x, y } = frameRect(FOLHIM_FORMAT, FOLHIM_FORMAT.clips[name], index);
    ctx.save();
    ctx.translate(x, y);
    draw(ctx);
    ctx.restore();
  };
  cell('idle', 0, (c) => drawFolhim(c, {}));
  cell('idle', 1, (c) => drawFolhim(c, { squash: 1 }));
  cell('walk', 0, (c) => drawFolhim(c, { lift: -2, squash: -1 }));
  cell('walk', 1, (c) => drawFolhim(c, { squash: 1 }));
  cell('windup', 0, (c) => drawFolhim(c, { squash: 1, eyes: 'angry' }));
  cell('windup', 1, (c) => drawFolhim(c, { squash: 2, eyes: 'angry' }));
  cell('lunge', 0, (c) => drawFolhim(c, { stretch: 1.5, squash: 1, eyes: 'angry' }));
  cell('hurt', 0, (c) => drawFolhim(c, { squash: -1, eyes: 'x' }));
  cell('death', 0, (c) => drawFolhim(c, { squash: 2, eyes: 'x' }));
  cell('death', 1, (c) => drawFolhim(c, { squash: 3, eyes: 'x', sprout: false }));
  cell('death', 2, (c) => drawPoof(c, 3, 1));
  cell('death', 3, (c) => drawPoof(c, 5, 0.5));
  return canvas;
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d')! };
}
