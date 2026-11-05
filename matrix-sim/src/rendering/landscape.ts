import { type Cell, type World } from '../simulation/world';
import type { DrawingContext } from './surface';

/** Art pixels per world cell. The map is pixel art: drawn at this size and scaled up without smoothing. */
export const PIXEL = 8;
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
// Coordinate-based visual variation never consumes the simulation's randomness.
function variation(x: number, y: number, salt = 0) {
  let h = Math.imul(x + 171, 374761393) ^ Math.imul(y + salt * 79, 668265263);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
// Ordered dithering turns gradients into the stepped bands of pixel art.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

type RGB = readonly [number, number, number];
// ImageData is little-endian RGBA, so a 32-bit pixel reads ABGR.
const pack = ([r, g, b]: RGB) => (255 << 24 | b << 16 | g << 8 | r) >>> 0;
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t].map(Math.round) as unknown as RGB;

const WATER: RGB[] = [[86, 162, 188], [56, 124, 168], [42, 92, 142], [34, 70, 118], [28, 54, 96]];
const FOAM: RGB = [202, 230, 226];
const SAND: RGB[] = [[198, 172, 114], [224, 204, 146], [236, 222, 172]];
// Per season (spring, summer, autumn, winter): dark, mid and light tones.
const GRASS: RGB[][] = [
  [[78, 140, 60], [106, 170, 68], [142, 196, 86]],
  [[72, 128, 52], [98, 154, 58], [132, 178, 72]],
  [[128, 118, 54], [160, 144, 64], [190, 168, 86]],
  [[98, 120, 94], [124, 142, 112], [160, 174, 146]],
];
const FOREST: RGB[][] = [
  [[30, 70, 42], [38, 82, 48], [50, 96, 54]],
  [[28, 64, 38], [36, 76, 44], [46, 90, 50]],
  [[78, 66, 36], [94, 78, 40], [112, 90, 44]],
  [[58, 78, 68], [72, 92, 80], [92, 110, 96]],
];
const DRY: RGB = [182, 164, 96];
const ROCK: RGB[] = [[70, 66, 78], [102, 98, 108], [136, 132, 134], [166, 162, 158]];
const SNOW: RGB[] = [[184, 202, 216], [232, 238, 242]];
const FLOWERS: RGB[] = [[232, 134, 164], [244, 214, 96], [236, 236, 244]];

const Ground = { Water: 0, Sand: 1, Land: 2, Rock: 3 } as const;
let groundCache: { key: string; pixels: Uint32Array; kinds: Uint8Array } | null = null;

export function drawLandscape(ctx: DrawingContext, world: World) {
  const season = Math.floor(world.day / 90) % 4;
  // The ground follows moisture and snow weekly; topology and analytical layers stay exact.
  const key = JSON.stringify([world.seed, world.size, world.waterLevel, season, Math.floor(world.day / 7)]);
  if (!groundCache || groundCache.key !== key) groundCache = { key, ...paintGround(world, season) };
  const side = world.size * PIXEL;
  const image = ctx.createImageData(side, side);
  const pixels = new Uint32Array(image.data.buffer);
  pixels.set(groundCache.pixels);
  paintObjects(pixels, side, world, season);
  ctx.putImageData(image, 0, 0);
}

function paintGround(world: World, season: number) {
  const { size, cells, waterLevel } = world;
  const side = size * PIXEL;
  const pixels = new Uint32Array(side * side), kinds = new Uint8Array(side * side), bands = new Uint8Array(side * side);
  const at = (x: number, y: number) => cells[clamp(y, 0, size - 1) * size + clamp(x, 0, size - 1)];
  const grass = GRASS[season], forest = FOREST[season];
  const snowLine = season === 3 ? 0.85 : 0.94;
  for (let py = 0; py < side; py++) for (let px = 0; px < side; px++) {
    const gx = (px + 0.5) / PIXEL - 0.5, gy = (py + 0.5) / PIXEL - 0.5;
    const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
    const lerp = (va: number, vb: number, vc: number, vd: number) => (va * (1 - fx) + vb * fx) * (1 - fy) + (vc * (1 - fx) + vd * fx) * fy;
    const noise = variation(px, py), blot = variation(px >> 1, py >> 1, 2);
    const height = lerp(a.elevation, b.elevation, c.elevation, d.elevation) + (noise - 0.5) * 0.006;
    const i = py * side + px, dither = bayer(px, py);
    let color: RGB;
    if (height < waterLevel) {
      const band = Math.min(4, Math.floor(clamp((waterLevel - height) / 0.16) * 5 + dither - 0.25));
      kinds[i] = Ground.Water; bands[i] = Math.max(0, band);
      color = noise > 0.985 && band > 0 ? WATER[band - 1] : WATER[Math.max(0, band)];
    } else if (height < waterLevel + 0.035) {
      kinds[i] = Ground.Sand;
      color = SAND[blot > 0.85 ? 2 : 1];
    } else if (height > 0.76 || (height > 0.72 && dither < (height - 0.72) / 0.04)) {
      kinds[i] = Ground.Rock;
      // Light comes from the upper left: faces sloping toward it are lit.
      const slope = (b.elevation - a.elevation) * (1 - fy) + (d.elevation - c.elevation) * fy + (c.elevation - a.elevation) * (1 - fx) + (d.elevation - b.elevation) * fx;
      const light = -slope * 14 + (blot - 0.5) * 0.35;
      if (height > snowLine + (dither - 0.5) * 0.03) color = SNOW[light < -0.3 || blot < 0.22 ? 0 : 1];
      else color = ROCK[light > 0.5 ? 3 : light > -0.1 ? 2 : light > -0.6 ? 1 : 0];
    } else {
      kinds[i] = Ground.Land;
      const woods = lerp(+(a.terrain === 'forest'), +(b.terrain === 'forest'), +(c.terrain === 'forest'), +(d.terrain === 'forest'));
      const palette = woods + (variation(px >> 1, py >> 1, 9) - 0.5) * 0.35 > 0.5 ? forest : grass;
      color = palette[blot < 0.12 ? 0 : blot > 0.9 ? 2 : 1];
      const moisture = lerp(a.moisture, b.moisture, c.moisture, d.moisture);
      const dryness = clamp((0.32 - moisture) / 0.25);
      if (dryness > dither) color = mix(color, DRY, 0.55);
      const cell = cells[clamp(Math.round(gy), 0, size - 1) * size + clamp(Math.round(gx), 0, size - 1)];
      if (season === 3 && cell.temperature < 0 && dither < clamp(-cell.temperature / 4, 0.25, 0.85)) color = SNOW[noise > 0.5 ? 1 : 0];
    }
    pixels[i] = pack(color);
  }
  // Second pass: foam where water meets land, and wet sand on the shoreline.
  for (let py = 0; py < side; py++) for (let px = 0; px < side; px++) {
    const i = py * side + px;
    const land = (x: number, y: number) => x >= 0 && y >= 0 && x < side && y < side && kinds[y * side + x] !== Ground.Water;
    if (kinds[i] === Ground.Water && bands[i] <= 2 && (land(px + 1, py) || land(px - 1, py) || land(px, py + 1) || land(px, py - 1))) pixels[i] = pack(FOAM);
    else if (kinds[i] === Ground.Sand && !land(px, py + 1)) pixels[i] = pack(SAND[0]);
  }
  return { pixels, kinds };
}

// Objects come from a spritesheet (src/sprites/mundo.png): 16×16 frames, one row per season, each sprite standing on
// the frame's bottom row and centred on column 8. Edit the PNG in any pixel art editor to change how the world looks.
export const SPRITE = { frame: 16, broadleaf: 0, round: 1, sapling: 2, pine: 3, bush: 4, fruitBush: 5, peak: 6, boulder: 7 } as const;
type SpriteSheet = { pixels: Uint32Array; width: number };
let sheet: SpriteSheet | null = null;
export function setSpriteSheet(image: { data: Uint8ClampedArray; width: number }) {
  sheet = { pixels: new Uint32Array(image.data.buffer.slice(0)), width: image.width };
}

/** Draws one frame with its foot at (x, y), blending translucent pixels such as shadows over what is below. */
function stamp(pixels: Uint32Array, side: number, column: number, row: number, x: number, y: number) {
  if (!sheet) return;
  const size = SPRITE.frame, left = x - size / 2, top = y - size + 1;
  for (let fy = 0; fy < size; fy++) {
    const py = top + fy;
    if (py < 0 || py >= side) continue;
    const source = (row * size + fy) * sheet.width + column * size;
    for (let fx = 0; fx < size; fx++) {
      const px = left + fx, color = sheet.pixels[source + fx], alpha = color >>> 24;
      if (!alpha || px < 0 || px >= side) continue;
      const i = py * side + px;
      if (alpha === 255) { pixels[i] = color; continue; }
      const below = pixels[i], a = alpha / 255;
      const channel = (shift: number) => Math.round((color >>> shift & 255) * a + (below >>> shift & 255) * (1 - a));
      pixels[i] = (255 << 24 | channel(16) << 16 | channel(8) << 8 | channel(0)) >>> 0;
    }
  }
}

function paintObjects(pixels: Uint32Array, side: number, world: World, season: number) {
  // Row by row, so whatever stands lower on the map overlaps what stands behind it.
  for (const cell of world.cells) {
    const { x, y, vegetation: v } = cell, left = x * PIXEL, top = y * PIXEL, rand = variation(x, y, 3);
    if (cell.terrain === 'water' || cell.terrain === 'sand') continue;
    if (cell.terrain === 'mountain') {
      const snowy = cell.elevation > 0.94 || (season === 3 && cell.temperature < 0);
      if (rand > 0.55) stamp(pixels, side, SPRITE.peak, snowy ? 3 : 0, left + 3 + Math.floor(variation(x, y, 4) * 3), top + 7);
      else if (rand > 0.35) stamp(pixels, side, SPRITE.boulder, snowy ? 3 : 0, left + 2 + Math.floor(variation(x, y, 4) * 4), top + 5);
      continue;
    }
    const open = cell.terrain === 'grass';
    if (open && v.grass > 4) flowersAndTufts(pixels, side, cell, season);
    if (open && v.shrubs > 5 && rand > 0.68) stamp(pixels, side, v.fruit > 3 ? SPRITE.fruitBush : SPRITE.bush, season, left + 2 + Math.floor(variation(x, y, 5) * 4), top + 3 + Math.floor(variation(x, y, 6) * 5));
    const count = v.trees < 8 ? 0 : Math.min(2, Math.ceil(v.trees / 40));
    const trees: [number, number, number][] = [];
    // One tree near the middle of the cell, or two staggered ones, with a little jitter so woods do not look planted.
    for (let i = 0; i < count; i++) trees.push([left + (count === 1 ? 4 : 2 + i * 4) + Math.floor(variation(x + i * 71, y, 12) * 2), top + (count === 1 ? 6 : 4 + i * 3) + Math.floor(variation(x, y + i * 59, 5) * 2), i]);
    trees.sort((p, q) => p[1] - q[1]);
    for (const [tx, ty, i] of trees) {
      const conifer = cell.elevation > 0.64 || variation(x, y, 20 + i) > 0.78;
      const kind = conifer ? SPRITE.pine : v.trees < 45 || variation(x, y, 30 + i) < 0.2 ? SPRITE.sapling : variation(x, y, 40 + i) > 0.5 ? SPRITE.round : SPRITE.broadleaf;
      stamp(pixels, side, kind, season, tx, ty);
    }
  }
}

function flowersAndTufts(pixels: Uint32Array, side: number, cell: Cell, season: number) {
  const { x, y } = cell;
  const r = variation(x, y, 8);
  if (r < 0.45) return;
  const px = x * PIXEL + Math.floor(variation(x, y, 9) * 7), py = y * PIXEL + Math.floor(variation(x, y, 10) * 7);
  if (px + 2 >= side || py + 1 >= side) return;
  if ((season === 0 || season === 1) && r > 0.9) pixels[py * side + px] = pack(FLOWERS[Math.floor(variation(x, y, 11) * 3)]);
  else {
    const tuft = pack(GRASS[season][2]);
    pixels[py * side + px] = tuft; pixels[py * side + px + 2] = tuft; pixels[(py + 1) * side + px + 1] = tuft;
  }
}

/** Only precipitation moves, in whole art pixels. Water, trees and terrain stay still between state changes. */
export function drawAtmosphere(ctx: DrawingContext, world: World, time: number) {
  const width = world.size * PIXEL;
  ctx.clearRect(0, 0, width, width);
  if (!world.cells.some(cell => cell.precipitation !== 'none')) return;
  const cellAt = (x: number, y: number) => world.cells[Math.floor(y / PIXEL) * world.size + Math.floor(x / PIXEL)];
  ctx.fillStyle = '#c8dceab0';
  for (let i = 0; i < 160; i++) {
    const x = Math.floor((variation(i, 13) * width + time * 7) % width), y = Math.floor((variation(i, 37) * width + time * 64) % width);
    if (cellAt(x, y).precipitation === 'rain') ctx.fillRect(x, y, 1, 3);
  }
  ctx.fillStyle = '#f4f6ec';
  for (let i = 0; i < 160; i++) {
    const x = Math.floor((variation(i, 17) * width + Math.sin(time + i) * 2 + width) % width), y = Math.floor((variation(i, 43) * width + time * 12) % width);
    if (cellAt(x, y).precipitation === 'snow') ctx.fillRect(x, y, 1, 1);
  }
}
