import type { Sprite } from './sprite';

/**
 * Ícones da interface (navegação, barra superior, ações). Mesmo formato dos
 * sprites em texto de src/arte/ (ver sprite.ts): todos com o mesmo tamanho e
 * traço. Enquanto um ícone não tiver sprite, IconeUi mostra o emoji de EMOJI_UI.
 */
export const NOMES_ICONE_UI = [
  'batalha',
  'party',
  'mochila',
  'cidade',
  'expedicoes',
  'mundo',
  'menu',
  'nuvem',
  'filtro',
  'ordenar',
  'cadeado',
  'selecionar',
  'vender',
  'desmontar',
] as const;

export type NomeIconeUi = (typeof NOMES_ICONE_UI)[number];

/** Emoji usado hoje em cada lugar; é o que aparece enquanto o sprite não existe. */
export const EMOJI_UI: Record<NomeIconeUi, string> = {
  batalha: '⚔',
  party: '🛡',
  mochila: '🎒',
  cidade: '🏰',
  expedicoes: '🧭',
  mundo: '🌐',
  menu: '☰',
  nuvem: '☁',
  filtro: '⚲',
  ordenar: '⇅',
  cadeado: '🔒',
  selecionar: '☑',
  vender: '🪙',
  desmontar: '🔨',
};

/** Sprites prontos. Vazio por enquanto: a arte vem depois (à mão ou por scripts/fatiar.py). */
export const SPRITES_UI: Partial<Record<NomeIconeUi, Sprite>> = {};
