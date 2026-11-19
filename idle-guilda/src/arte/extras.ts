import { imagemPronta } from './carregar';
import extras from './extras.json';

/**
 * Cenários e folhas de ícones gerados por scripts/fatiar.py. Quem usa cai no
 * desenho em código quando a imagem não existe ou ainda está carregando.
 */
interface FolhaIcones {
  imagem: string;
  tamanho: number;
  colunas: number;
  indices: Record<string, number>;
}

const CENARIOS = extras.cenarios as Record<string, { imagem: string }>;
const FOLHAS_ICONES = extras.icones as Record<string, FolhaIcones>;

const url = (caminho: string) => `${import.meta.env.BASE_URL}${caminho}`;

/** Imagem 320×180 do cenário, pronta para desenhar, ou null. */
export function imagemDoCenario(id: string): HTMLImageElement | null {
  const c = CENARIOS[id];
  return c ? imagemPronta(url(c.imagem)) : null;
}

export interface IconeDeFolha {
  url: string;
  tamanho: number;
  colunas: number;
  linhas: number;
  indice: number;
}

/** Posição de um ícone (relíquia, material...) nas folhas de ícones, se houver. */
export function iconeDeFolha(id: string): IconeDeFolha | null {
  for (const f of Object.values(FOLHAS_ICONES)) {
    const indice = f.indices[id];
    if (indice === undefined) continue;
    const total = Object.keys(f.indices).length;
    return { url: url(f.imagem), tamanho: f.tamanho, colunas: f.colunas, linhas: Math.ceil(total / f.colunas), indice };
  }
  return null;
}

/** URL da imagem do cenário (para miniaturas em CSS), ou null se não houver. */
export function urlDoCenario(id: string): string | null {
  const c = CENARIOS[id];
  return c ? url(c.imagem) : null;
}
