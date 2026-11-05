import { describe, expect, it } from 'vitest';
import { cellAt, cellRect, facingFromVector, type SheetLayout } from './tileset.ts';
import { cameraAxis, computeViewport } from './viewport.ts';

describe('computeViewport', () => {
  it('em pé, a área central ocupa a largura e sobra altura', () => {
    const view = computeViewport(1080, 2340, 160, 'integer');
    expect(view.scale).toBe(6);
    expect(view.width).toBe(180);
    expect(view.height).toBe(390);
  });

  it('deitado, a mesma escala mostra mais para os lados', () => {
    const view = computeViewport(2340, 1080, 160, 'integer');
    expect(view.scale).toBe(6);
    expect(view.width).toBe(390);
    expect(view.height).toBe(180);
  });

  it('a área central sempre cabe, nas duas escalas', () => {
    for (const mode of ['integer', 'free'] as const) {
      for (const [w, h] of [[750, 1334], [1170, 2532], [1920, 1080], [412, 915]]) {
        const view = computeViewport(w, h, 160, mode);
        expect(view.width).toBeGreaterThanOrEqual(160);
        expect(view.height).toBeGreaterThanOrEqual(160);
      }
    }
  });

  it('na escala livre a área central tem sempre o mesmo tamanho na tela', () => {
    const view = computeViewport(1170, 2532, 160, 'free');
    expect(160 * view.scale).toBeCloseTo(1170);
  });

  it('tela menor que a área central fica em escala 1', () => {
    expect(computeViewport(100, 100, 160, 'integer').scale).toBe(1);
  });
});

describe('cameraAxis', () => {
  it('na rolagem lisa guarda a fração para a hora de ampliar', () => {
    const axis = cameraAxis(512.4, 180, 1024, false);
    expect(axis.origin).toBe(422);
    expect(axis.fraction).toBeCloseTo(0.4);
    expect(axis.left).toBeCloseTo(422.4);
  });

  it('pixel a pixel anda só em pixels inteiros', () => {
    expect(cameraAxis(512.6, 180, 1024, true)).toEqual({ left: 423, origin: 423, fraction: 0 });
  });

  it('a rolagem lisa avança de forma contínua, sem saltos', () => {
    const lefts = [0, 0.3, 0.6, 0.9, 1.2].map((step) => cameraAxis(500 + step, 180, 1024, false));
    lefts.forEach((axis, i) => expect(axis.origin + axis.fraction).toBeCloseTo(410 + [0, 0.3, 0.6, 0.9, 1.2][i]));
  });

  it('não mostra além da borda do mundo', () => {
    expect(cameraAxis(10, 180, 1024, false).left).toBe(0);
    expect(cameraAxis(1020, 180, 1024, false).left).toBe(844);
  });

  it('centraliza um mundo menor que a tela', () => {
    expect(cameraAxis(50, 180, 100, false).left).toBe(-40);
  });
});

describe('grade da folha', () => {
  const layout: SheetLayout = { tileSize: 64, offsetX: 8, offsetY: 4, spacing: 2 };

  it('acha a célula sob o toque', () => {
    expect(cellAt(layout, 8, 4)).toEqual({ col: 0, row: 0 });
    expect(cellAt(layout, 8 + 66 * 2 + 10, 4 + 66 + 63)).toEqual({ col: 2, row: 1 });
  });

  it('ignora margem e espaçamento', () => {
    expect(cellAt(layout, 3, 10)).toBeNull();
    expect(cellAt(layout, 8 + 64, 10)).toBeNull();
  });

  it('cellRect é o inverso de cellAt', () => {
    const rect = cellRect(layout, { col: 3, row: 2 });
    expect(cellAt(layout, rect.x, rect.y)).toEqual({ col: 3, row: 2 });
    expect(cellAt(layout, rect.x + rect.size - 1, rect.y + rect.size - 1)).toEqual({ col: 3, row: 2 });
  });
});

describe('facingFromVector', () => {
  it('prende o rosto a 4 direções', () => {
    expect(facingFromVector(0.9, 0.3)).toBe('right');
    expect(facingFromVector(-0.2, -0.8)).toBe('up');
    expect(facingFromVector(-0.7, 0.6)).toBe('left');
    expect(facingFromVector(0, 1)).toBe('down');
  });
});
