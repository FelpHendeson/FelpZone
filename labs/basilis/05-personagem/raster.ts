// Imagens indexadas: cada pixel guarda um índice de paleta (0 = transparente).
// Tudo aqui roda sem canvas, então o molde pode ser testado no Vitest e pintado depois com qualquer paleta.

export class IndexedImage {
  readonly data: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): number {
    return this.inside(x, y) ? this.data[y * this.width + x] : 0;
  }

  set(x: number, y: number, value: number): void {
    if (this.inside(x, y)) this.data[y * this.width + x] = value;
  }

  /** Copia os pixels não transparentes de `source` para (dx, dy); `flip` espelha na horizontal. */
  blit(source: IndexedImage, dx: number, dy: number, flip = false): void {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const value = source.get(flip ? source.width - 1 - x : x, y);
        if (value !== 0) this.set(dx + x, dy + y, value);
      }
    }
  }

  /** Copia por cima os pixels não transparentes de um retângulo de `source` para o mesmo lugar desta imagem. */
  overlayRect(source: IndexedImage, x: number, y: number, width: number, height: number): void {
    for (let j = y; j < y + height; j++) {
      for (let i = x; i < x + width; i++) {
        const value = source.get(i, j);
        if (value !== 0) this.set(i, j, value);
      }
    }
  }

  /** Retângulo que contém todos os pixels não transparentes, ou null se a imagem estiver vazia. */
  bounds(): { x: number; y: number; width: number; height: number } | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y) === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (minX === Infinity) return null;
    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  /** Índices de paleta usados (sem o transparente). */
  colorsUsed(): Set<number> {
    const used = new Set<number>();
    for (const value of this.data) if (value !== 0) used.add(value);
    return used;
  }
}

/** Mapa de partes: cada pixel diz qual parte do corpo está ali (-1 = vazio). As partes de cima sobrescrevem as de baixo. */
export class PartMap {
  readonly data: Int16Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Int16Array(width * height).fill(-1);
  }

  get(x: number, y: number): number {
    return x >= 0 && y >= 0 && x < this.width && y < this.height ? this.data[y * this.width + x] : -1;
  }

  set(x: number, y: number, part: number): void {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.data[y * this.width + x] = part;
  }

  rect(x: number, y: number, width: number, height: number, part: number): void {
    for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) this.set(x + i, y + j, part);
  }

  /** Retângulo com os cantos arredondados (tira `radius` pixels em diagonal de cada canto). */
  roundRect(x: number, y: number, width: number, height: number, radius: number, part: number): void {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const dx = Math.min(i, width - 1 - i);
        const dy = Math.min(j, height - 1 - j);
        if (dx + dy < radius) continue;
        this.set(x + i, y + j, part);
      }
    }
  }

  /**
   * Segmento grosso entre dois pontos de canto (coordenadas entre pixels), carimbando um quadrado
   * de `thickness` pixels centrado em cada ponto. Serve para braços e pernas.
   */
  limb(x0: number, y0: number, x1: number, y1: number, thickness: number, part: number): void {
    const half = Math.floor(thickness / 2);
    const stamp = (x: number, y: number) => this.rect(x - half, y - half, thickness, thickness, part);
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      stamp(x, y);
      if (x === x1 && y === y1) break;
      const e2 = 2 * error;
      if (e2 >= dy) {
        error += dy;
        x += sx;
      }
      if (e2 <= dx) {
        error += dx;
        y += sy;
      }
    }
  }
}
