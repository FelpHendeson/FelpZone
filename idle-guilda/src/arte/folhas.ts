import manifesto from './folhas.json';

/**
 * Spritesheets geradas fora do código (scripts/fatiar.py). Enquanto a imagem
 * carrega, ou se uma folha não existir, quem desenha usa o sprite em texto.
 */
export interface Folha {
  imagem: string;
  largura: number;
  altura: number;
  colunas: number;
  quadros: number;
  /** Linha dos pés e centro horizontal do personagem dentro do quadro. */
  pe: number;
  centro: number;
  animacoes: Record<string, number[]>;
}

export type Animacao = 'parado' | 'ataque' | 'habilidade' | 'dano' | 'caido';

const FOLHAS = manifesto as Record<string, Folha>;
const imagens = new Map<string, HTMLImageElement>();

function imagem(nome: string): HTMLImageElement | null {
  const folha = FOLHAS[nome];
  if (!folha || typeof Image === 'undefined') return null;
  let img = imagens.get(nome);
  if (!img) {
    img = new Image();
    img.src = `${import.meta.env.BASE_URL}${folha.imagem}`;
    imagens.set(nome, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function temFolha(nome: string): boolean {
  return !!FOLHAS[nome];
}

export function folha(nome: string): Folha | undefined {
  return FOLHAS[nome];
}

/** Índice do quadro: `progresso` de 0 a 1 percorre a animação; acima de 1, repete. */
export function quadroDa(f: Folha, animacao: Animacao, progresso: number, repetir = true): number {
  const lista = f.animacoes[animacao] ?? f.animacoes.parado;
  const i = Math.floor(progresso * lista.length);
  return lista[repetir ? ((i % lista.length) + lista.length) % lista.length : Math.min(lista.length - 1, Math.max(0, i))];
}

/**
 * Desenha um quadro com os pés em (pX, pY). `escala` converte pixels da folha
 * para a unidade do canvas (0,5 quando o canvas está com transformação 2×).
 * Devolve false se a imagem ainda não está pronta.
 */
export function desenharQuadro(
  ctx: CanvasRenderingContext2D,
  nome: string,
  quadro: number,
  pX: number,
  pY: number,
  escala = 0.5,
  espelhar = false,
): boolean {
  const f = FOLHAS[nome];
  const img = imagem(nome);
  if (!f || !img) return false;
  const sx = (quadro % f.colunas) * f.largura;
  const sy = Math.floor(quadro / f.colunas) * f.altura;
  const w = f.largura * escala;
  const h = f.altura * escala;
  const centro = (espelhar ? f.largura - f.centro : f.centro) * escala;
  const x = Math.round((pX - centro) / escala) * escala;
  const y = Math.round((pY - f.pe * escala) / escala) * escala;
  if (espelhar) {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, f.largura, f.altura, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, sx, sy, f.largura, f.altura, x, y, w, h);
  }
  return true;
}
