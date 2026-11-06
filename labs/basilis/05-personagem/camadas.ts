// As camadas do personagem (seção 3 de PERSONAGEM.md), da mais funda para a mais alta, e as regras
// de esconder: cada peça diz quais partes de outras peças ela esconde. Sem canvas, testável.

import type { Direction } from './molde.ts';
import type { Channel } from './molde.ts';
import type { ManequimOptions, Silhueta } from './manequim.ts';
import type { Pose } from './poses.ts';
import type { IndexedImage } from './raster.ts';

export type CamadaId =
  | 'sombra'
  | 'atras-do-corpo'
  | 'cabelo-de-tras'
  | 'corpo-base'
  | 'rosto'
  | 'linhagem'
  | 'roupa'
  | 'pernas-pes-maos'
  | 'tronco'
  | 'ombros-e-cinto'
  | 'cabelo-da-frente'
  | 'barba'
  | 'cabeca'
  | 'na-frente-do-corpo'
  | 'efeitos';

export type Grupo = 'personalização' | 'roupa padrão' | 'equipamento' | '—';

export interface Camada {
  id: CamadaId;
  /** Número da seção 3 (ordem olhando para baixo). */
  ordem: number;
  nome: string;
  grupo: Grupo;
  exemplos: string;
}

/** A tabela da seção 3, na ordem de baixo (frente). */
export const CAMADAS: Camada[] = [
  { id: 'sombra', ordem: 1, nome: 'Sombra', grupo: '—', exemplos: 'Elipse no chão' },
  { id: 'atras-do-corpo', ordem: 2, nome: 'Atrás do corpo', grupo: 'equipamento', exemplos: 'Capa, aljava, asas, cauda' },
  { id: 'cabelo-de-tras', ordem: 3, nome: 'Cabelo de trás', grupo: 'personalização', exemplos: 'Cabelo comprido' },
  { id: 'corpo-base', ordem: 4, nome: 'Corpo base', grupo: 'personalização', exemplos: 'Pele: cabeça, tronco, braços, pernas' },
  { id: 'rosto', ordem: 5, nome: 'Rosto', grupo: 'personalização', exemplos: 'Olhos, sobrancelhas, marcas' },
  { id: 'linhagem', ordem: 6, nome: 'Linhagem', grupo: 'personalização', exemplos: 'Orelhas de lobo, presas, chifres' },
  { id: 'roupa', ordem: 7, nome: 'Roupa', grupo: 'roupa padrão', exemplos: 'Calça, camisa, sapatos' },
  { id: 'pernas-pes-maos', ordem: 8, nome: 'Pernas, pés, mãos', grupo: 'equipamento', exemplos: 'Botas, grevas, luvas' },
  { id: 'tronco', ordem: 9, nome: 'Tronco', grupo: 'equipamento', exemplos: 'Peitoral, túnica, manto' },
  { id: 'ombros-e-cinto', ordem: 10, nome: 'Ombros e cinto', grupo: 'equipamento', exemplos: 'Ombreiras, cinto, bolsas' },
  { id: 'cabelo-da-frente', ordem: 11, nome: 'Cabelo da frente', grupo: 'personalização', exemplos: 'Franja e topo' },
  { id: 'barba', ordem: 12, nome: 'Barba', grupo: 'personalização', exemplos: 'Barba' },
  { id: 'cabeca', ordem: 13, nome: 'Cabeça', grupo: 'equipamento', exemplos: 'Capacete, chapéu, capuz' },
  { id: 'na-frente-do-corpo', ordem: 14, nome: 'Na frente do corpo', grupo: 'equipamento', exemplos: 'Arma na frente, escudo' },
  { id: 'efeitos', ordem: 15, nome: 'Efeitos', grupo: '—', exemplos: 'Brilho de melhoria, marcas de Etéris' },
];

export const CAMADA_BY_ID: Record<CamadaId, Camada> = Object.fromEntries(CAMADAS.map((camada) => [camada.id, camada])) as Record<
  CamadaId,
  Camada
>;

/**
 * Ordem de desenho por direção. De frente e de lado vale a tabela. De costas (olhando para cima):
 * o que fica atrás do corpo (capa, cauda) passa para a frente, no lugar 14, e o que ia na frente
 * (escudo) passa para trás, no lugar 2; o cabelo comprido cai sobre as costas, logo antes do cabelo da frente.
 */
export function ordemDasCamadas(direction: Direction): CamadaId[] {
  const ids: CamadaId[] = CAMADAS.map((camada) => camada.id);
  if (direction !== 'up') return ids;
  const order: CamadaId[] = ids.filter((id) => id !== 'cabelo-de-tras');
  order.splice(order.indexOf('cabelo-da-frente'), 0, 'cabelo-de-tras');
  const behind = order.indexOf('atras-do-corpo');
  const front = order.indexOf('na-frente-do-corpo');
  order[behind] = 'na-frente-do-corpo';
  order[front] = 'atras-do-corpo';
  return order;
}

// ---- Peças ----

/** Onde a peça entra na receita (seção 5). */
export type Slot =
  | 'corpo'
  | 'olhos'
  | 'sobrancelhas'
  | 'marcas'
  | 'linhagem'
  | 'cabelo'
  | 'barba'
  | 'roupa'
  | 'equipamento.cabeca'
  | 'equipamento.tronco'
  | 'equipamento.pes';

export interface ParteDef {
  /** Nome da parte; é o que as regras de esconder citam (ex.: "cabelo-topo"). */
  id: string;
  camada: CamadaId;
}

/** Uma peça: uma ou mais partes, cada uma numa camada, desenhadas em tons-índice sobre as poses do molde. */
export interface Peca {
  id: string;
  nome: string;
  slot: Slot;
  partes: ParteDef[];
  /**
   * Partes de outras peças que esta esconde, sempre de camadas mais fundas que a parte mais alta desta
   * (os olhos de lobo, na camada da linhagem, escondem os olhos da camada do rosto).
   */
  esconde: string[];
  canais: Channel[];
  /** Só nas peças do slot `corpo`: o tipo de corpo, que as outras peças seguem ao se desenhar. */
  silhueta?: Silhueta;
  /** Um quadro de cada parte para uma pose. Partes sem pixel nesta pose podem faltar. */
  desenhar(pose: Pose, options: ManequimOptions): Record<string, IndexedImage>;
}

/**
 * As partes escondidas pelas peças escolhidas (`peça/parte` → quem esconde). Uma peça nunca esconde
 * as próprias partes, e uma peça com todas as camadas desligadas não aparece, então não esconde nada.
 */
export function partesEscondidas(pecas: Peca[], desligadas: ReadonlySet<CamadaId> = new Set()): Map<string, string> {
  const hidden = new Map<string, string>();
  for (const peca of pecas) {
    if (!peca.partes.some((parte) => !desligadas.has(parte.camada))) continue;
    for (const outra of pecas) {
      if (outra === peca) continue;
      for (const parte of outra.partes) {
        const key = `${outra.id}/${parte.id}`;
        if (peca.esconde.includes(parte.id) && !hidden.has(key)) hidden.set(key, peca.id);
      }
    }
  }
  return hidden;
}

export interface ParteVisivel {
  peca: Peca;
  parte: ParteDef;
}

/**
 * O que desenhar em cada camada, na ordem da direção, já sem as partes escondidas e sem as camadas
 * desligadas. Dentro de uma camada, as peças seguem a ordem da receita.
 */
export function pilha(pecas: Peca[], direction: Direction, desligadas: ReadonlySet<CamadaId> = new Set()): ParteVisivel[] {
  const hidden = partesEscondidas(pecas, desligadas);
  const result: ParteVisivel[] = [];
  for (const camada of ordemDasCamadas(direction)) {
    if (desligadas.has(camada)) continue;
    for (const peca of pecas) {
      for (const parte of peca.partes) {
        if (parte.camada === camada && !hidden.has(`${peca.id}/${parte.id}`)) result.push({ peca, parte });
      }
    }
  }
  return result;
}
