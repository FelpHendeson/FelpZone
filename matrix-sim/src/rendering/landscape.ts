import { type Cell, type World } from '../simulation/world';
import { createSurface, type DrawingContext, type Surface } from './surface';

export const LANDSCAPE_CELL = 24;
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
// Coordinate-based visual variation never consumes the simulation's randomness.
function variation(x: number, y: number, salt = 0) {
  let h = Math.imul(x + 171, 374761393) ^ Math.imul(y + salt * 79, 668265263);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
type RGB = [number, number, number];
const palettes: RGB[][] = [
  [[122, 155, 83], [65, 105, 65], [165, 177, 100]],
  [[143, 155, 79], [55, 95, 63], [172, 170, 100]],
  [[155, 144, 78], [103, 111, 63], [181, 151, 88]],
  [[143, 158, 139], [81, 110, 101], [170, 180, 159]],
];
const treeSprites = new Map<string, Surface>();
const rockSprites = new Map<string, Surface>();
const CHUNK_SIZE = 16;
let landscapeIdentity = '';
let groundCache: { key: string; canvas: Surface } | null = null;
const chunks = new Map<string, { signature: string; canvas: Surface }>();

function objectSignature(cell: Cell) {
  const v = cell.vegetation;
  const count = v.trees < 8 ? 0 : Math.min(3, Math.ceil(v.trees / 35));
  let radii = '';
  for (let i = 0; i < count; i++) radii += Math.round(3.2 + Math.min(1, v.trees / 65) * 3 + variation(cell.x, cell.y, i) * 1.5);
  return `${cell.terrain}:${+ (v.grass > 4)}${+ (v.shrubs > 5)}${+ (v.fruit > 1)}:${count}:${radii}:${+ (cell.temperature < 0)};`;
}

export function drawLandscape(ctx: DrawingContext, world: World) {
  const identity = JSON.stringify([world.seed, world.size, world.waterLevel]);
  if (identity !== landscapeIdentity) { landscapeIdentity = identity; groundCache = null; chunks.clear(); }
  const season = Math.floor(world.day / 90) % 4;
  // Ground tint changes weekly; topology and analytical layers stay exact.
  const groundKey = `${season}:${Math.floor(world.day / 7)}`;
  if (!groundCache || groundCache.key !== groundKey) {
    const canvas = groundCache?.canvas ?? createSurface(world.size * 3, world.size * 3);
    const context = canvas.getContext('2d') as DrawingContext;
    context.setTransform(3 / LANDSCAPE_CELL, 0, 0, 3 / LANDSCAPE_CELL, 0, 0);
    drawGround(context, world);
    groundCache = { key: groundKey, canvas };
  }
  const extent = world.size * LANDSCAPE_CELL;
  ctx.drawImage(groundCache.canvas, 0, 0, extent, extent);
  const pad = LANDSCAPE_CELL;
  for (let y = 0; y < world.size; y += CHUNK_SIZE) for (let x = 0; x < world.size; x += CHUNK_SIZE) {
    const right = Math.min(world.size, x + CHUNK_SIZE), bottom = Math.min(world.size, y + CHUNK_SIZE);
    const leftHalo = Math.max(0, x - 1), topHalo = Math.max(0, y - 1);
    const rightHalo = Math.min(world.size, right + 1), bottomHalo = Math.min(world.size, bottom + 1);
    let signature = `${season}:`;
    for (let row = topHalo; row < bottomHalo; row++) for (let column = leftHalo; column < rightHalo; column++) signature += objectSignature(world.cells[row * world.size + column]);
    const key = `${x}:${y}`, cached = chunks.get(key);
    const width = (right - x) * LANDSCAPE_CELL, height = (bottom - y) * LANDSCAPE_CELL;
    let tile = cached?.canvas;
    if (!cached || cached.signature !== signature) {
      tile ??= createSurface(width + pad * 2, height + pad * 2);
      const context = tile.getContext('2d') as DrawingContext;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, tile.width, tile.height);
      context.translate(pad - x * LANDSCAPE_CELL, pad - y * LANDSCAPE_CELL);
      drawObjects(context, world, leftHalo, topHalo, rightHalo, bottomHalo);
      chunks.set(key, { signature, canvas: tile });
    }
    ctx.drawImage(tile!, pad, pad, width, height, x * LANDSCAPE_CELL, y * LANDSCAPE_CELL, width, height);
  }
}

function drawGround(ctx: DrawingContext, world: World) {
  const { size, cells, waterLevel } = world;
  const season = Math.floor(world.day / 90) % 4;
  const palette = palettes[season];
  const raster = createSurface(1, 1);
  const samples = 3;
  const resolution = size * samples;
  raster.width = raster.height = resolution;
  const rasterCtx = raster.getContext('2d') as DrawingContext;
  const image = rasterCtx.createImageData(resolution, resolution);
  const at = (x: number, y: number) => cells[clamp(y, 0, size - 1) * size + clamp(x, 0, size - 1)];
  for (let py = 0; py < resolution; py++) for (let px = 0; px < resolution; px++) {
    const gx = px / samples - 0.5, gy = py / samples - 0.5;
    const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
    const height = (a.elevation * (1 - fx) + b.elevation * fx) * (1 - fy) + (c.elevation * (1 - fx) + d.elevation * fx) * fy;
    const moisture = (a.moisture * (1 - fx) + b.moisture * fx) * (1 - fy) + (c.moisture * (1 - fx) + d.moisture * fx) * fy;
    const grain = (variation(px, py) - 0.5) * 9;
    const slopeX = (b.elevation - a.elevation) * (1 - fy) + (d.elevation - c.elevation) * fy;
    const slopeY = (c.elevation - a.elevation) * (1 - fx) + (d.elevation - b.elevation) * fx;
    const slope = (slopeX + slopeY) * 3;
    const shade = clamp(1 - slope, 0.73, 1.17);
    let red: number, green: number, blue: number;
    if (height < waterLevel) {
      const depth = clamp((waterLevel - height) / 0.28);
      red = 58 - depth * 36; green = 139 - depth * 66; blue = 147 - depth * 48;
      if (waterLevel - height < 0.012) { red = 110; green = 169; blue = 161; }
    } else if (height < waterLevel + 0.036) {
      const wet = clamp((height - waterLevel) / 0.036);
      red = 178 + wet * 42; green = 172 + wet * 31; blue = 126 + wet * 27;
    } else if (height > 0.76) {
      const snow = season === 3 && height > 0.86;
      red = snow ? 211 : 148 + height * 19; green = snow ? 223 : 149 + height * 16; blue = snow ? 215 : 127 + height * 20;
    } else {
      const forest = clamp((moisture - 0.4) / 0.25);
      const dryness = clamp((0.3 - moisture) / 0.3);
      red = (palette[0][0] * (1 - forest) + palette[1][0] * forest) * (1 - dryness) + palette[2][0] * dryness;
      green = (palette[0][1] * (1 - forest) + palette[1][1] * forest) * (1 - dryness) + palette[2][1] * dryness;
      blue = (palette[0][2] * (1 - forest) + palette[1][2] * forest) * (1 - dryness) + palette[2][2] * dryness;
    }
    const offset = (py * resolution + px) * 4;
    const lighting = height < waterLevel ? 1 : shade;
    image.data[offset] = red * lighting + grain;
    image.data[offset + 1] = green * lighting + grain;
    image.data[offset + 2] = blue * lighting + grain;
    image.data[offset + 3] = 255;
  }
  rasterCtx.putImageData(image, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(raster, 0, 0, size * LANDSCAPE_CELL, size * LANDSCAPE_CELL);

}

function drawObjects(ctx: DrawingContext, world: World, left: number, top: number, right: number, bottom: number) {
  const season = Math.floor(world.day / 90) % 4;
  // Tile halos preserve objects and shadows crossing a chunk boundary.
  for (let row = top; row < bottom; row++) for (let column = left; column < right; column++) {
    const cell = world.cells[row * world.size + column];
    const { x, y, vegetation: v } = cell;
    const rand = variation(x, y, 3);
    const cx = (x + 0.2 + rand * 0.6) * LANDSCAPE_CELL;
    const cy = (y + 0.25 + variation(x, y, 7) * 0.5) * LANDSCAPE_CELL;
    if (cell.terrain === 'water') continue;
    if (cell.terrain === 'mountain') {
      if (rand > 0.64) rock(ctx, cx, cy, 6 + (cell.elevation - 0.76) * 36, season === 3 && cell.temperature < 0);
      continue;
    }
    if (cell.terrain === 'sand') {
      if (rand > 0.7) { ctx.strokeStyle = '#9e94744d'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx - 3, cy); ctx.quadraticCurveTo(cx, cy - 2, cx + 5, cy); ctx.stroke(); }
      continue;
    }
    if (v.grass > 4 && rand > 0.35) {
      ctx.strokeStyle = season === 2 ? '#b5ab6d99' : '#c4d08d88'; ctx.lineWidth = 0.8; ctx.beginPath();
      ctx.moveTo(cx - 5, cy + 5); ctx.lineTo(cx - 6, cy + 1); ctx.moveTo(cx - 4, cy + 5); ctx.lineTo(cx - 2, cy + 2); ctx.stroke();
    }
    const count = v.trees < 8 ? 0 : Math.min(3, Math.ceil(v.trees / 35));
    for (let i = 0; i < count; i++) {
      const tx = count === 1 ? cx : (x + 0.12 + variation(x + i * 71, y, 12) * 0.76) * LANDSCAPE_CELL;
      const ty = count === 1 ? cy : (y + 0.2 + variation(x, y + i * 59, 5) * 0.65) * LANDSCAPE_CELL;
      tree(ctx, tx, ty, 3.2 + Math.min(1, v.trees / 65) * 3 + variation(x, y, i) * 1.5, season, rand);
    }
    if (v.shrubs > 5 && rand > 0.3) {
      const sx = cx + 5, sy = cy + 7;
      ctx.fillStyle = '#203c3240'; ctx.beginPath(); ctx.ellipse(sx + 2, sy + 2, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = season === 2 ? '#b09952' : season === 3 ? '#8da58b' : '#a2b85e';
      ctx.beginPath(); ctx.ellipse(sx, sy, 3.2, 2.2, -0.25, 0, Math.PI * 2); ctx.fill();
      if (v.fruit > 1) { ctx.fillStyle = '#e6a55f'; ctx.beginPath(); ctx.arc(sx - 1, sy - 1, 0.9, 0, Math.PI * 2); ctx.arc(sx + 1.7, sy, 0.8, 0, Math.PI * 2); ctx.fill(); }
    }
  }
}

function tree(ctx: DrawingContext, x: number, y: number, r: number, season: number, rand: number) {
  const radius = Math.round(r), key = `${radius}:${season}:${rand > 0.55}`;
  let sprite = treeSprites.get(key);
  if (!sprite) {
    sprite = createSurface(48, 48);
    paintTree(sprite.getContext('2d') as DrawingContext, 24, 30, radius, season, rand);
    treeSprites.set(key, sprite);
  }
  ctx.drawImage(sprite, x - 24, y - 30);
}

function paintTree(ctx: DrawingContext, x: number, y: number, r: number, season: number, rand: number) {
  ctx.fillStyle = '#152e2e42'; ctx.beginPath(); ctx.ellipse(x + r * 0.65, y + r * 0.5, r * 1.1, r * 0.6, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#655238'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.lineTo(x, y - r * 0.3); ctx.stroke();
  const colors = season === 2 ? ['#746e37', '#a48b43', '#c0a458'] : season === 3 ? ['#496b60', '#719080', '#a1b6a1'] : ['#294e3d', '#467348', '#719557'];
  ctx.fillStyle = colors[0]; ctx.beginPath(); ctx.ellipse(x, y - r * 0.55, r, r * 0.83, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = colors[1]; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.9, r * 0.74, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = colors[2]; ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 1.05, r * 0.43, r * 0.25, -0.6, 0, Math.PI * 2); ctx.fill();
  if (season === 3 && rand > 0.55) { ctx.fillStyle = '#d6dfcc'; ctx.beginPath(); ctx.ellipse(x - r * 0.2, y - r * 1.1, r * 0.62, r * 0.24, 0, 0, Math.PI * 2); ctx.fill(); }
}

function rock(ctx: DrawingContext, x: number, y: number, r: number, snow: boolean) {
  const radius = Math.round(r), key = `${radius}:${snow}`;
  let sprite = rockSprites.get(key);
  if (!sprite) {
    sprite = createSurface(64, 64);
    paintRock(sprite.getContext('2d') as DrawingContext, 32, 42, radius, snow);
    rockSprites.set(key, sprite);
  }
  ctx.drawImage(sprite, x - 32, y - 42);
}

function paintRock(ctx: DrawingContext, x: number, y: number, r: number, snow: boolean) {
  ctx.fillStyle = '#46565038'; ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.2, r, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a9ad98'; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x - r * 0.15, y - r * 1.2); ctx.lineTo(x + r * 0.7, y - r * 0.2); ctx.lineTo(x + r, y + r * 0.25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#747f71'; ctx.beginPath(); ctx.moveTo(x - r * 0.15, y - r * 1.2); ctx.lineTo(x + r, y + r * 0.25); ctx.lineTo(x + r * 0.05, y + r * 0.1); ctx.closePath(); ctx.fill();
  if (snow) { ctx.fillStyle = '#e1e8dd'; ctx.beginPath(); ctx.moveTo(x - r * 0.15, y - r * 1.2); ctx.lineTo(x - r * 0.6, y - r * 0.55); ctx.lineTo(x - r * 0.1, y - r * 0.68); ctx.lineTo(x + r * 0.35, y - r * 0.55); ctx.closePath(); ctx.fill(); }
}

/** Only precipitation moves. Water, trees and terrain stay still between state changes. */
export function drawAtmosphere(ctx: DrawingContext, world: World, time: number) {
  const width = world.size * LANDSCAPE_CELL;
  ctx.clearRect(0, 0, width, width);
  if (!world.cells.some(cell => cell.precipitation !== 'none')) return;
  ctx.strokeStyle = '#d5e5e650'; ctx.lineWidth = 1.5; ctx.beginPath();
  const flakes: [number, number][] = [];
  for (let i = 0; i < 130; i++) {
    const x = (variation(i, 13) * width + time * 20) % width;
    const y = (variation(i, 37) * width + time * 190) % width;
    const cell = world.cells[Math.floor(y / LANDSCAPE_CELL) * world.size + Math.floor(x / LANDSCAPE_CELL)];
    if (cell.precipitation === 'rain') { ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 11); }
    const sx = (variation(i, 17) * width + Math.sin(time + i) * 5 + width) % width;
    const sy = (variation(i, 43) * width + time * 35) % width;
    const snowCell = world.cells[Math.floor(sy / LANDSCAPE_CELL) * world.size + Math.floor(sx / LANDSCAPE_CELL)];
    if (snowCell.precipitation === 'snow') flakes.push([sx, sy]);
  }
  ctx.stroke();
  ctx.fillStyle = '#f1f4e6d9'; ctx.beginPath();
  for (const [x, y] of flakes) { ctx.moveTo(x + 2, y); ctx.arc(x, y, 2, 0, Math.PI * 2); }
  ctx.fill();
}
