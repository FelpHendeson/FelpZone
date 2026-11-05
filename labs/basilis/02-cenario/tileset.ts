// Tiles e personagem do lab: uma folha gerada por código (16 px, contorno colorido, luz do alto à esquerda)
// e o fatiamento de qualquer folha, inclusive de IA, em tiles de 16 × 16.

export const TILE_SIZE = 16;
export const PLAYER_WIDTH = 16;
export const PLAYER_HEIGHT = 24;

/** Papéis que o cenário precisa. A ordem é a da folha gerada. */
export const ROLES = ['grass', 'grassDark', 'flower', 'rock', 'tree', 'water', 'water2'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  grass: 'Grama',
  grassDark: 'Grama escura',
  flower: 'Flores',
  rock: 'Pedra',
  tree: 'Árvore',
  water: 'Água',
  water2: 'Água (2º quadro)',
};

export interface SheetLayout {
  /** Tamanho de um tile na folha, em px da imagem (folhas de IA costumam usar 64 ou mais). */
  tileSize: number;
  offsetX: number;
  offsetY: number;
  spacing: number;
}

export interface Cell {
  col: number;
  row: number;
}

export type RoleCells = Partial<Record<Role, Cell>>;

export function cellRect(layout: SheetLayout, cell: Cell): { x: number; y: number; size: number } {
  const step = layout.tileSize + layout.spacing;
  return { x: layout.offsetX + cell.col * step, y: layout.offsetY + cell.row * step, size: layout.tileSize };
}

/** Célula sob um ponto da imagem, ou nula se o ponto cair na margem ou no espaçamento. */
export function cellAt(layout: SheetLayout, x: number, y: number): Cell | null {
  const step = layout.tileSize + layout.spacing;
  if (step <= 0) return null;
  const localX = x - layout.offsetX;
  const localY = y - layout.offsetY;
  if (localX < 0 || localY < 0) return null;
  const col = Math.floor(localX / step);
  const row = Math.floor(localY / step);
  if (localX - col * step >= layout.tileSize || localY - row * step >= layout.tileSize) return null;
  return { col, row };
}

export type TileImages = Record<Role, HTMLCanvasElement>;

/** Corta cada papel da folha e reduz para 16 × 16 sem suavização. Papéis sem célula usam o reserva. */
export function sliceSheet(image: CanvasImageSource, layout: SheetLayout, cells: RoleCells, fallback: TileImages): TileImages {
  const result = { ...fallback };
  for (const role of ROLES) {
    const cell = cells[role];
    if (!cell) continue;
    const { x, y, size } = cellRect(layout, cell);
    const { canvas, ctx } = createCanvas(TILE_SIZE, TILE_SIZE);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, x, y, size, size, 0, 0, TILE_SIZE, TILE_SIZE);
    result[role] = canvas;
  }
  return result;
}

// ---- Folha gerada ----

const PALETTE = {
  grass: '#5f9e48',
  grassLight: '#7cba5c',
  grassDark: '#4a8239',
  grassDeep: '#3a6a2e',
  water: '#3d78b8',
  waterLight: '#6aa6dc',
  waterDark: '#2f6098',
  foam: '#d4ecf8',
  rock: '#9c9c90',
  rockLight: '#c4c4b6',
  rockDark: '#717167',
  rockOutline: '#46463f',
  canopy: '#3f8a3a',
  canopyLight: '#62ad50',
  canopyDark: '#2d6a2b',
  canopyOutline: '#1c4219',
  trunk: '#7a5232',
  trunkOutline: '#4a3020',
  shadow: 'rgba(20, 40, 20, 0.35)',
  flowers: ['#f4d35e', '#ee6c8b', '#f5f1e6'],
};

/** Folha gerada: os papéis lado a lado numa linha, na ordem de ROLES. */
export function generateSheet(): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(TILE_SIZE * ROLES.length, TILE_SIZE);
  ROLES.forEach((role, index) => {
    ctx.save();
    ctx.translate(index * TILE_SIZE, 0);
    drawRole(ctx, role);
    ctx.restore();
  });
  return canvas;
}

export const GENERATED_LAYOUT: SheetLayout = { tileSize: TILE_SIZE, offsetX: 0, offsetY: 0, spacing: 0 };

export function generatedCells(): RoleCells {
  return Object.fromEntries(ROLES.map((role, col) => [role, { col, row: 0 }])) as RoleCells;
}

function drawRole(ctx: CanvasRenderingContext2D, role: Role): void {
  const random = seeded(ROLES.indexOf(role) * 97 + 13);
  const px = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  };

  if (role === 'water' || role === 'water2') {
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    const shift = role === 'water2' ? 4 : 0;
    for (const [x, y] of [[2, 3], [9, 6], [4, 11], [11, 13]]) {
      const wx = (x + shift) % TILE_SIZE;
      px(wx, y, PALETTE.waterLight);
      px((wx + 1) % TILE_SIZE, y, PALETTE.waterLight);
      px((wx + 2) % TILE_SIZE, y - 1, PALETTE.foam);
      px((wx + 3) % TILE_SIZE, y, PALETTE.waterLight);
      px(wx, y + 1, PALETTE.waterDark);
    }
    return;
  }

  // Todo o resto fica sobre grama (pedra e árvore também, para a folha gerada funcionar sozinha).
  ctx.fillStyle = role === 'grassDark' ? PALETTE.grassDark : PALETTE.grass;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  for (let i = 0; i < 5; i++) {
    const x = 1 + Math.floor(random() * 13);
    const y = 2 + Math.floor(random() * 12);
    px(x, y, role === 'grassDark' ? PALETTE.grassDeep : PALETTE.grassDark);
    px(x + 2, y, role === 'grassDark' ? PALETTE.grassDeep : PALETTE.grassDark);
    px(x + 1, y + 1, role === 'grassDark' ? PALETTE.grassDeep : PALETTE.grassDark);
    if (role !== 'grassDark') px(x + 1, y - 1, PALETTE.grassLight);
  }

  if (role === 'flower') {
    for (const [x, y, c] of [[3, 4, 0], [11, 6, 1], [6, 11, 2], [12, 12, 0]]) {
      const color = PALETTE.flowers[c];
      px(x, y - 1, color);
      px(x - 1, y, color);
      px(x + 1, y, color);
      px(x, y + 1, color);
      px(x, y, '#f7e9a0');
    }
  }

  if (role === 'rock') {
    shape(ctx, 8, 12.5, 6.5, 2, () => PALETTE.shadow, () => null);
    shape(
      ctx,
      8,
      9.5,
      6,
      4.5,
      (x, y) => (x + y < 13 ? PALETTE.rockLight : x + y > 19 ? PALETTE.rockDark : PALETTE.rock),
      () => PALETTE.rockOutline,
    );
  }

  if (role === 'tree') {
    shape(ctx, 8, 14, 6, 1.8, () => PALETTE.shadow, () => null);
    ctx.fillStyle = PALETTE.trunkOutline;
    ctx.fillRect(6, 10, 4, 5);
    ctx.fillStyle = PALETTE.trunk;
    ctx.fillRect(7, 10, 2, 4);
    shape(
      ctx,
      8,
      6,
      7,
      6,
      (x, y) => (x + y < 9 ? PALETTE.canopyLight : x + y > 17 ? PALETTE.canopyDark : PALETTE.canopy),
      () => PALETTE.canopyOutline,
    );
  }
}

/** Elipse em pixels: preenchimento por posição e contorno nos pixels de borda (nulo = sem contorno). */
function shape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: (x: number, y: number) => string,
  outline: () => string | null,
): void {
  const inside = (x: number, y: number) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      const color = edge ? (outline() ?? fill(x, y)) : fill(x, y);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

// ---- Personagem gerado ----

export type Facing = 'down' | 'up' | 'left' | 'right';
export const FACINGS: Facing[] = ['down', 'up', 'left', 'right'];

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
};

/** Quadros por direção: 0 parado, 1 e 2 passos. O ciclo de andar é 1, 0, 2, 0. */
export const WALK_CYCLE = [1, 0, 2, 0];

export function generateHero(): Record<Facing, HTMLCanvasElement[]> {
  const frames = {} as Record<Facing, HTMLCanvasElement[]>;
  for (const facing of FACINGS) {
    frames[facing] = [0, 1, 2].map((frame) => {
      const { canvas, ctx } = createCanvas(PLAYER_WIDTH, PLAYER_HEIGHT);
      drawHero(ctx, facing, frame);
      return canvas;
    });
  }
  return frames;
}

function drawHero(ctx: CanvasRenderingContext2D, facing: Facing, frame: number): void {
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const bob = frame === 0 ? 0 : -1;
  const side = facing === 'left' || facing === 'right';

  rect(4, 22, 8, 2, HERO.shadow);

  // Pernas: no passo, uma perna sobe um pixel.
  const leftLift = frame === 1 ? 1 : 0;
  const rightLift = frame === 2 ? 1 : 0;
  if (side) {
    rect(6, 17 - leftLift, 4, 5, HERO.outline);
    rect(7, 17 - leftLift, 2, 3, HERO.pants);
    rect(7, 20 - leftLift, 2, 1, HERO.boots);
  } else {
    rect(4, 17 - leftLift, 4, 5, HERO.outline);
    rect(8, 17 - rightLift, 4, 5, HERO.outline);
    rect(5, 17 - leftLift, 2, 3, HERO.pants);
    rect(9, 17 - rightLift, 2, 3, HERO.pants);
  }

  // Corpo.
  rect(3, 11 + bob, 10, 7, HERO.outline);
  rect(4, 12 + bob, 8, 5, HERO.tunic);
  rect(4, 12 + bob, 3, 2, HERO.tunicLight);
  rect(4, 16 + bob, 8, 1, HERO.tunicDark);
  if (!side) {
    rect(2, 12 + bob, 2, 4, HERO.outline);
    rect(12, 12 + bob, 2, 4, HERO.outline);
    rect(2, 13 + bob, 1, 2, HERO.skin);
    rect(13, 13 + bob, 1, 2, HERO.skin);
  }

  // Cabeça.
  rect(3, 2 + bob, 10, 10, HERO.outline);
  rect(4, 3 + bob, 8, 8, HERO.skin);
  rect(10, 8 + bob, 2, 3, HERO.skinShade);
  rect(4, 3 + bob, 8, 3, HERO.hair);
  rect(5, 3 + bob, 3, 1, HERO.hairLight);

  if (facing === 'down') {
    rect(5, 7 + bob, 1, 2, HERO.eye);
    rect(10, 7 + bob, 1, 2, HERO.eye);
  } else if (facing === 'up') {
    rect(4, 3 + bob, 8, 7, HERO.hair);
    rect(5, 4 + bob, 3, 1, HERO.hairLight);
  } else {
    const back = facing === 'left' ? 9 : 4;
    const eye = facing === 'left' ? 5 : 10;
    rect(back, 3 + bob, 3, 6, HERO.hair);
    rect(eye, 7 + bob, 1, 2, HERO.eye);
  }
}

/** Direção do sprite a partir do vetor para onde o personagem olha. */
export function facingFromVector(x: number, y: number): Facing {
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d')! };
}

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
