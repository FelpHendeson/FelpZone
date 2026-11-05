// Campo de testes em tiles: grama, flores, pedras, árvores e água. Posições em unidades de tile.

export const TILE = {
  grass: 0,
  grassDark: 1,
  flower: 2,
  rock: 3,
  tree: 4,
  water: 5,
} as const;

export type Tile = (typeof TILE)[keyof typeof TILE];

export interface World {
  width: number;
  height: number;
  tiles: Uint8Array;
}

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function createWorld(width: number, height: number, seed: number): World {
  const random = mulberry32(seed);
  const tiles = new Uint8Array(width * height);
  const cx = width / 2;
  const cy = height / 2;
  const pond = { x: cx + 9, y: cy - 7, r: 3.5 };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const border = Math.min(x, y, width - 1 - x, height - 1 - y);
      const nearSpawn = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 6;
      const roll = random();
      let tile: Tile = roll < 0.35 ? TILE.grassDark : TILE.grass;
      if (border < 2 || Math.hypot(x + 0.5 - pond.x, y + 0.5 - pond.y) < pond.r) tile = TILE.water;
      else if (!nearSpawn && roll > 0.94) tile = TILE.tree;
      else if (!nearSpawn && roll > 0.91) tile = TILE.rock;
      else if (roll > 0.85) tile = TILE.flower;
      tiles[y * width + x] = tile;
    }
  }
  return { width, height, tiles };
}

export function tileAt(world: World, tx: number, ty: number): Tile {
  if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) return TILE.water;
  return world.tiles[ty * world.width + tx] as Tile;
}

export function isSolid(world: World, tx: number, ty: number): boolean {
  return tileAt(world, tx, ty) >= TILE.rock;
}

const EPSILON = 1e-4;
const MAX_STEP = 0.25;

/** Move um corpo quadrado de meia-largura `radius`, eixo por eixo, parando nos tiles sólidos. */
export function moveWithCollision(world: World, body: Body, dx: number, dy: number, radius: number): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_STEP));
  for (let i = 0; i < steps; i++) {
    moveAxis(world, body, dx / steps, 'x', radius);
    moveAxis(world, body, dy / steps, 'y', radius);
  }
}

function moveAxis(world: World, body: Body, delta: number, axis: 'x' | 'y', radius: number): void {
  if (delta === 0) return;
  const next = body[axis] + delta;
  const x = axis === 'x' ? next : body.x;
  const y = axis === 'y' ? next : body.y;
  if (!overlapsSolid(world, x, y, radius)) {
    body[axis] = next;
    return;
  }
  body[axis] = delta > 0 ? Math.floor(next + radius) - radius - EPSILON : Math.floor(next - radius) + 1 + radius + EPSILON;
  if (axis === 'x') body.vx = 0;
  else body.vy = 0;
}

function overlapsSolid(world: World, x: number, y: number, radius: number): boolean {
  for (let ty = Math.floor(y - radius); ty <= Math.floor(y + radius - EPSILON); ty++) {
    for (let tx = Math.floor(x - radius); tx <= Math.floor(x + radius - EPSILON); tx++) {
      if (isSolid(world, tx, ty)) return true;
    }
  }
  return false;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
