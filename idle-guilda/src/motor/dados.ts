import type { ArmaId, Atributo, Classe, Material, ZonaId } from './tipos';

export interface DadosClasse {
  nome: string;
  primario: Atributo;
  atributosIniciais: Record<Atributo, number>;
  vidaExtra: number;
}

export const CLASSES: Record<Classe, DadosClasse> = {
  guerreiro: {
    nome: 'Guerreiro',
    primario: 'forca',
    atributosIniciais: { forca: 5, destreza: 2, mente: 1, vigor: 5 },
    vidaExtra: 20,
  },
  cacadora: {
    nome: 'Caçadora',
    primario: 'destreza',
    atributosIniciais: { forca: 2, destreza: 5, mente: 2, vigor: 3 },
    vidaExtra: 0,
  },
  mistica: {
    nome: 'Mística',
    primario: 'mente',
    atributosIniciais: { forca: 1, destreza: 2, mente: 5, vigor: 3 },
    vidaExtra: 0,
  },
};

export const ATRIBUTOS: Record<Atributo, { nome: string; efeito: string }> = {
  forca: { nome: 'Força', efeito: 'Mineração mais rápida' },
  destreza: { nome: 'Destreza', efeito: '+3% de saque por ponto' },
  mente: { nome: 'Mente', efeito: '+3% de XP por ponto' },
  vigor: { nome: 'Vigor', efeito: 'Mais vida, defesa e resistência à fadiga' },
};

export const MATERIAIS: Record<Material, { nome: string }> = {
  gosma: { nome: 'Gosma' },
  couro: { nome: 'Couro' },
  minerio: { nome: 'Minério' },
  fragmento: { nome: 'Fragmento arcano' },
};

export interface Monstro {
  nome: string;
  plural: string;
  vida: number;
  /** Dano por segundo antes da defesa. */
  ataque: number;
  xp: number;
  ouro: number;
  saque: Material;
  /** Quantidade esperada do material por abate. */
  chanceSaque: number;
}

export interface Zona {
  nome: string;
  nivelMinimo: number;
  monstro: Monstro;
}

export const ZONAS: Record<ZonaId, Zona> = {
  campina: {
    nome: 'Campina Verde',
    nivelMinimo: 1,
    monstro: { nome: 'Gosma', plural: 'gosmas', vida: 40, ataque: 1.5, xp: 1, ouro: 1, saque: 'gosma', chanceSaque: 0.5 },
  },
  bosque: {
    nome: 'Bosque Sombrio',
    nivelMinimo: 5,
    monstro: { nome: 'Lobo cinzento', plural: 'lobos cinzentos', vida: 150, ataque: 6, xp: 8, ouro: 5, saque: 'couro', chanceSaque: 0.4 },
  },
  ruinas: {
    nome: 'Ruínas Antigas',
    nivelMinimo: 10,
    monstro: { nome: 'Esqueleto', plural: 'esqueletos', vida: 600, ataque: 14, xp: 30, ouro: 15, saque: 'fragmento', chanceSaque: 0.25 },
  },
};

export const ORDEM_ZONAS: ZonaId[] = ['campina', 'bosque', 'ruinas'];

export type FormaArma = 'bastao' | 'espada' | 'arco' | 'cajado' | 'lamina';

export interface Arma {
  nome: string;
  ataque: number;
  /** Classe que recebe +50% do ataque da arma. */
  afinidade: Classe | null;
  custoOuro: number;
  custoMateriais: Partial<Record<Material, number>>;
}

export const ARMAS: Record<ArmaId, Arma> = {
  bastao: { nome: 'Bastão de treino', ataque: 2, afinidade: null, custoOuro: 0, custoMateriais: {} },
  espada: {
    nome: 'Espada de ferro',
    ataque: 9,
    afinidade: 'guerreiro',
    custoOuro: 60,
    custoMateriais: { minerio: 10, gosma: 5 },
  },
  arco: {
    nome: 'Arco de caça',
    ataque: 9,
    afinidade: 'cacadora',
    custoOuro: 60,
    custoMateriais: { minerio: 4, gosma: 12 },
  },
  cajado: {
    nome: 'Cajado rúnico',
    ataque: 24,
    afinidade: 'mistica',
    custoOuro: 350,
    custoMateriais: { couro: 15, minerio: 20 },
  },
  lamina: {
    nome: 'Lâmina das ruínas',
    ataque: 50,
    afinidade: null,
    custoOuro: 1500,
    custoMateriais: { fragmento: 25, couro: 30, minerio: 40 },
  },
};

export const ORDEM_ARMAS: ArmaId[] = ['bastao', 'espada', 'arco', 'cajado', 'lamina'];

/** Custo em ouro do próximo herói, pelo tamanho atual da guilda. */
export const CUSTO_CONTRATACAO = [0, 150, 900];
export const MAXIMO_HEROIS = CUSTO_CONTRATACAO.length;

/** Teto do progresso offline: 8 horas. */
export const OFFLINE_MAXIMO_SEGUNDOS = 8 * 60 * 60;

export const PONTOS_POR_NIVEL = 2;

/** Com descanso automático, o herói para de lutar abaixo desta fração da vida. */
export const LIMITE_VIDA_DESCANSO = 0.25;
/** Fração da vida máxima recuperada por segundo de descanso. */
export const RECUPERACAO_VIDA = 0.03;
export const TAMANHO_DIARIO = 40;
