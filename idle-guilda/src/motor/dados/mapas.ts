import type { Elemento, Escola, Material, Stats } from '../tipos';

export interface Monstro {
  nome: string;
  /** Nome do sprite em arte/sprites. */
  sprite: string;
  elemento: Elemento;
  escola: Escola;
  fraqueza: Elemento | null;
  resistencia: Elemento | null;
  /** Multiplicadores sobre a curva de atributos por nível. */
  mult: Partial<Stats>;
  /** Ataca toda a party (com 60% do dano) em vez de um alvo. */
  area?: boolean;
}

export const MONSTROS: Record<string, Monstro> = {
  gosma: { nome: 'Gosma de Ferrugem', sprite: 'gosma', elemento: 'neutro', escola: 'fisica', fraqueza: 'raio', resistencia: null, mult: { vida: 0.6, atq: 0.7, vel: 0.8 } },
  lobo: { nome: 'Lobo de Aço', sprite: 'lobo', elemento: 'neutro', escola: 'fisica', fraqueza: 'fogo', resistencia: null, mult: { vel: 1.3 } },
  harpia: { nome: 'Harpia', sprite: 'harpia', elemento: 'vento', escola: 'fisica', fraqueza: 'raio', resistencia: 'vento', mult: { vida: 0.85, vel: 1.4, def: 0.8 } },
  esqueleto: { nome: 'Esqueleto Guardião', sprite: 'esqueleto', elemento: 'sombra', escola: 'fisica', fraqueza: 'luz', resistencia: 'sombra', mult: { def: 1.3, vida: 1.1 } },
  espectro: { nome: 'Espectro', sprite: 'espectro', elemento: 'sombra', escola: 'magica', fraqueza: 'luz', resistencia: 'natureza', mult: { vida: 0.8, def: 1.5, defM: 0.7 }, area: true },
  golem: { nome: 'Golem de Magma', sprite: 'golem', elemento: 'fogo', escola: 'fisica', fraqueza: 'gelo', resistencia: 'fogo', mult: { vida: 1.5, def: 1.5, vel: 0.6, atq: 1.2 } },
  diabrete: { nome: 'Diabrete de Brasa', sprite: 'diabrete', elemento: 'fogo', escola: 'magica', fraqueza: 'natureza', resistencia: 'fogo', mult: { vida: 0.8, vel: 1.3 }, area: true },
  sentinela: { nome: 'Sentinela Celeste', sprite: 'sentinela', elemento: 'raio', escola: 'fisica', fraqueza: 'sombra', resistencia: 'raio', mult: { vida: 1.3, def: 1.4, defM: 1.2 } },
};

export interface Mapa {
  id: string;
  nome: string;
  descricao: string;
  /** Nível do Sir LionHearth para liberar. */
  nivelMinimo: number;
  /** Nível dos inimigos na primeira onda. */
  nivelInimigo: number;
  monstros: string[];
  material: Material;
  /** Conjunto de armadura que pode cair aqui. */
  conjunto: string;
  /** Inimigos por onda, no máximo. */
  maxInimigos: number;
  cenario: 'ilha' | 'bosque' | 'ruinas' | 'vulcao' | 'cidadela';
}

export const MAPAS: Mapa[] = [
  {
    id: 'patio',
    nome: 'Arredores da Ilha de Aço',
    descricao: 'As terras da família LionHearth, onde a ferrugem ganha vida.',
    nivelMinimo: 1, nivelInimigo: 1, monstros: ['gosma', 'lobo'], material: 'ferrugem', conjunto: 'leaoDeAco', maxInimigos: 3, cenario: 'ilha',
  },
  {
    id: 'bosque',
    nome: 'Bosque Suspenso',
    descricao: 'Árvores que crescem sobre as nuvens, ninho das harpias.',
    nivelMinimo: 8, nivelInimigo: 9, monstros: ['lobo', 'harpia'], material: 'pena', conjunto: 'sombraDaNevoa', maxInimigos: 3, cenario: 'bosque',
  },
  {
    id: 'ruinas',
    nome: 'Ruínas da Velha Hope',
    descricao: 'A primeira capital do reino, tomada por guardiões que não sabem que morreram.',
    nivelMinimo: 15, nivelInimigo: 17, monstros: ['esqueleto', 'espectro'], material: 'osso', conjunto: 'vigiliaDeHope', maxInimigos: 4, cenario: 'ruinas',
  },
  {
    id: 'vulcao',
    nome: 'Forja Vulcânica',
    descricao: 'O coração quente das ilhas, onde o povo salamandrino nasceu.',
    nivelMinimo: 23, nivelInimigo: 25, monstros: ['golem', 'diabrete'], material: 'brasa', conjunto: 'escamasSalamandra', maxInimigos: 4, cenario: 'vulcao',
  },
  {
    id: 'cidadela',
    nome: 'Cidadela das Nuvens',
    descricao: 'Uma fortaleza antiga que flutua acima de todas as outras ilhas.',
    nivelMinimo: 31, nivelInimigo: 33, monstros: ['sentinela', 'harpia'], material: 'nucleo', conjunto: 'runasDoVento', maxInimigos: 4, cenario: 'cidadela',
  },
];

export const mapaPorId = (id: string): Mapa => MAPAS.find((m) => m.id === id) ?? MAPAS[0];

/** Atributos de um monstro comum no nível informado (antes dos multiplicadores). */
export function curvaInimigo(nivel: number): Stats {
  const n = nivel - 1;
  return {
    vida: Math.round(150 * Math.pow(1.115, n) + 30 * n),
    atq: 10 * Math.pow(1.1, n) + 2 * n,
    def: 4 * Math.pow(1.085, n) + n * 0.6,
    vel: 8 + n * 0.35,
    atqM: 10 * Math.pow(1.1, n) + 2 * n,
    defM: 4 * Math.pow(1.085, n) + n * 0.6,
    velM: 8 + n * 0.35,
  };
}

export const ONDAS_POR_CHEFE = 10;
/** Ondas que sobem o nível dos inimigos; depois disso o mapa está dominado e repete o topo. */
export const NIVEIS_POR_MAPA = 8;
/** Cada 10 ondas vencidas no mapa, os inimigos sobem um nível (até o teto do mapa). */
export const nivelDaOnda = (mapa: Mapa, onda: number) =>
  mapa.nivelInimigo + Math.min(NIVEIS_POR_MAPA - 1, Math.floor((onda - 1) / ONDAS_POR_CHEFE));

export const recompensaXp = (nivel: number) => 5 * Math.pow(1.1, nivel - 1);
export const recompensaOuro = (nivel: number) => 2 * Math.pow(1.09, nivel - 1);
