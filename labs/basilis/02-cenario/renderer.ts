// Render em pixel art com centro imutável e rolagem lisa: o mundo numa resolução interna ampliada sem suavização,
// deslocado pela fração da câmera em pixels de tela; sprites direto na tela, na mesma escala.

import type { Vec } from '../01-controles/input.ts';
import { TILE, tileAt, type World } from '../01-controles/world.ts';
import { TILE_SIZE, type Role, type TileImages } from './tileset.ts';
import { cameraAxis, computeViewport, type CameraAxis, type ScaleMode, type Viewport } from './viewport.ts';

export interface RenderOptions {
  safeTiles: number;
  scaleMode: ScaleMode;
  /** Rolagem pixel a pixel (como o GBA) em vez de lisa. */
  snap: boolean;
}

export interface Frame {
  view: Viewport;
  cameraX: CameraAxis;
  cameraY: CameraAxis;
  offsetX: number;
  offsetY: number;
  safeSize: number;
  /** Converte pixels do jogo (coordenadas do mundo) em pixels de tela. */
  toScreen(worldX: number, worldY: number): Vec;
}

const ROLE_BY_TILE: Record<number, Role> = {
  [TILE.grass]: 'grass',
  [TILE.grassDark]: 'grassDark',
  [TILE.flower]: 'flower',
  [TILE.rock]: 'rock',
  [TILE.tree]: 'tree',
  [TILE.water]: 'water',
};
const WATER_FRAME_SECONDS = 0.6;

export class PixelRenderer {
  private readonly low = document.createElement('canvas');
  private readonly lowCtx = this.low.getContext('2d')!;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    readonly ctx: CanvasRenderingContext2D,
  ) {}

  /** Mede a tela e posiciona a câmera (em pixels do jogo). Nulo enquanto a tela mede zero. */
  begin(camera: Vec, world: World, options: RenderOptions): Frame | null {
    const { canvas } = this;
    if (canvas.width === 0 || canvas.height === 0) return null;
    const safeSize = options.safeTiles * TILE_SIZE;
    const view = computeViewport(canvas.width, canvas.height, safeSize, options.scaleMode);
    const cameraX = cameraAxis(camera.x, view.width, world.width * TILE_SIZE, options.snap);
    const cameraY = cameraAxis(camera.y, view.height, world.height * TILE_SIZE, options.snap);
    const offsetX = Math.round((canvas.width - view.width * view.scale) / 2);
    const offsetY = Math.round((canvas.height - view.height * view.scale) / 2);
    const snap = options.snap;
    return {
      view,
      cameraX,
      cameraY,
      offsetX,
      offsetY,
      safeSize,
      toScreen: (worldX, worldY) => ({
        x: Math.round(offsetX + ((snap ? Math.round(worldX) : worldX) - cameraX.left) * view.scale),
        y: Math.round(offsetY + ((snap ? Math.round(worldY) : worldY) - cameraY.left) * view.scale),
      }),
    };
  }

  drawWorld(frame: Frame, world: World, tiles: TileImages, time: number): void {
    const { low, lowCtx, ctx, canvas } = this;
    const { view, cameraX, cameraY } = frame;
    // Um pixel a mais em cada eixo para cobrir o deslocamento fracionário da rolagem lisa.
    if (low.width !== view.width + 1 || low.height !== view.height + 1) {
      low.width = view.width + 1;
      low.height = view.height + 1;
    }
    const waterRole: Role = Math.floor(time / WATER_FRAME_SECONDS) % 2 === 0 ? 'water' : 'water2';
    const firstX = Math.floor(cameraX.origin / TILE_SIZE);
    const firstY = Math.floor(cameraY.origin / TILE_SIZE);
    const lastX = Math.floor((cameraX.origin + low.width) / TILE_SIZE);
    const lastY = Math.floor((cameraY.origin + low.height) / TILE_SIZE);
    lowCtx.imageSmoothingEnabled = false;
    for (let ty = firstY; ty <= lastY; ty++) {
      for (let tx = firstX; tx <= lastX; tx++) {
        const tile = tileAt(world, tx, ty);
        const x = tx * TILE_SIZE - cameraX.origin;
        const y = ty * TILE_SIZE - cameraY.origin;
        const role = tile === TILE.water ? waterRole : ROLE_BY_TILE[tile];
        // Pedras e árvores vão sobre grama: folhas de IA costumam trazê-las com fundo transparente.
        if (role === 'rock' || role === 'tree') lowCtx.drawImage(tiles.grass, x, y);
        lowCtx.drawImage(tiles[role], x, y);
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0f1a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      low,
      frame.offsetX - Math.round(cameraX.fraction * view.scale),
      frame.offsetY - Math.round(cameraY.fraction * view.scale),
      low.width * view.scale,
      low.height * view.scale,
    );
  }

  /**
   * Desenha uma imagem de pixel art com o canto superior esquerdo em (worldX, worldY), pixels do jogo.
   * `flip` espelha na horizontal (a esquerda é a direita espelhada).
   */
  drawSprite(frame: Frame, image: CanvasImageSource & { width: number; height: number }, worldX: number, worldY: number, flip = false): void {
    const p = frame.toScreen(worldX, worldY);
    const width = Math.round(image.width * frame.view.scale);
    const height = Math.round(image.height * frame.view.scale);
    if (!flip) {
      this.ctx.drawImage(image, p.x, p.y, width, height);
      return;
    }
    this.ctx.save();
    this.ctx.translate(p.x + width, p.y);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(image, 0, 0, width, height);
    this.ctx.restore();
  }

  /** Contorno tracejado da área central. Perto da borda do mundo, o personagem sai do meio dela. */
  drawSafeArea(frame: Frame, ratio: number): void {
    const { ctx } = this;
    const { view } = frame;
    const side = frame.safeSize * view.scale;
    const centerX = frame.offsetX + (view.width / 2) * view.scale;
    const centerY = frame.offsetY + (view.height / 2) * view.scale;
    ctx.setLineDash([8 * ratio, 6 * ratio]);
    ctx.lineWidth = 2 * ratio;
    ctx.strokeStyle = 'rgba(255, 224, 102, 0.8)';
    ctx.strokeRect(Math.round(centerX - side / 2), Math.round(centerY - side / 2), Math.round(side), Math.round(side));
    ctx.setLineDash([]);
  }
}
