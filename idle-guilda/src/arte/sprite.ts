/**
 * Sprite em pixel art descrito como texto: cada caractere é um pixel e
 * `.` é transparente. As cores vêm de uma paleta, o que permite trocar
 * roupas e materiais sem redesenhar.
 */
export interface Sprite {
  linhas: string[];
  paleta: Record<string, string>;
}

export function sprite(linhas: string[], paleta: Record<string, string>): Sprite {
  const largura = linhas[0]?.length ?? 0;
  for (const l of linhas) {
    if (l.length !== largura) throw new Error(`Linha de sprite com largura diferente: "${l}"`);
  }
  return { linhas, paleta };
}

export const largura = (s: Sprite) => s.linhas[0]?.length ?? 0;
export const altura = (s: Sprite) => s.linhas.length;

export interface OpcoesDesenho {
  espelhar?: boolean;
  /** Substitui cores da paleta (ex.: olhos fechados). */
  trocas?: Record<string, string>;
}

export function desenhar(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, op: OpcoesDesenho = {}): void {
  const w = largura(s);
  s.linhas.forEach((linha, py) => {
    for (let px = 0; px < linha.length; px++) {
      let c = linha[px];
      if (c === '.') continue;
      c = op.trocas?.[c] ?? c;
      const cor = s.paleta[c];
      if (!cor) continue;
      ctx.fillStyle = cor;
      ctx.fillRect(Math.round(x) + (op.espelhar ? w - 1 - px : px), Math.round(y) + py, 1, 1);
    }
  });
}

const cacheUrl = new Map<string, string>();

/** Gera (uma única vez) uma imagem PNG do sprite para usar em <img>. */
export function urlDoSprite(chave: string, s: Sprite): string {
  const existente = cacheUrl.get(chave);
  if (existente) return existente;
  const canvas = document.createElement('canvas');
  canvas.width = largura(s);
  canvas.height = altura(s);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  desenhar(ctx, s, 0, 0);
  const url = canvas.toDataURL();
  cacheUrl.set(chave, url);
  return url;
}
