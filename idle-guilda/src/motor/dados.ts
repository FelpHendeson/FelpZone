import type { ArmaId, Atributo, Classe, Material, ZonaId } from './tipos';

export type Papel = 'tanque' | 'dano' | 'cura';

export interface DadosClasse {
  nome: string;
  papel: Papel;
  /** Rótulo curto do papel. */
  papelNome: string;
  descricao: string;
  atributosIniciais: Record<Atributo, number>;
  /** Multiplicador do dano causado. */
  fatorDano: number;
  vidaExtra: number;
}

export const CLASSES: Record<Classe, DadosClasse> = {
  guerreiro: {
    nome: 'Guerreiro',
    papel: 'tanque',
    papelNome: 'Tanque',
    descricao: 'Fica na frente e recebe os golpes no lugar do grupo.',
    atributosIniciais: { poder: 4, vigor: 6 },
    fatorDano: 0.8,
    vidaExtra: 20,
  },
  cacadora: {
    nome: 'Caçadora',
    papel: 'dano',
    papelNome: 'Dano',
    descricao: 'Causa o maior dano e faz o grupo achar 25% mais materiais.',
    atributosIniciais: { poder: 6, vigor: 3 },
    fatorDano: 1.3,
    vidaExtra: 0,
  },
  mistica: {
    nome: 'Mística',
    papel: 'cura',
    papelNome: 'Cura',
    descricao: 'Cura quem estiver mais ferido e dá +25% de XP para o grupo.',
    atributosIniciais: { poder: 6, vigor: 3 },
    fatorDano: 0.4,
    vidaExtra: 0,
  },
};

export const ATRIBUTOS: Record<Atributo, { nome: string; efeito: string }> = {
  poder: { nome: 'Poder', efeito: 'Mais dano (e mais cura, na Mística)' },
  vigor: { nome: 'Vigor', efeito: 'Mais vida e menos dano recebido' },
};

export const MATERIAIS: Record<Material, { nome: string }> = {
  gosma: { nome: 'Gosma' },
  couro: { nome: 'Couro' },
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
    monstro: { nome: 'Gosma', plural: 'gosmas', vida: 40, ataque: 4, xp: 2, ouro: 2, saque: 'gosma', chanceSaque: 0.6 },
  },
  bosque: {
    nome: 'Bosque Sombrio',
    nivelMinimo: 5,
    monstro: {
      nome: 'Lobo cinzento',
      plural: 'lobos cinzentos',
      vida: 250,
      ataque: 22,
      xp: 17,
      ouro: 9,
      saque: 'couro',
      chanceSaque: 0.4,
    },
  },
  ruinas: {
    nome: 'Ruínas Antigas',
    nivelMinimo: 10,
    monstro: {
      nome: 'Esqueleto',
      plural: 'esqueletos',
      vida: 900,
      ataque: 55,
      xp: 100,
      ouro: 40,
      saque: 'fragmento',
      chanceSaque: 0.3,
    },
  },
};

export const ORDEM_ZONAS: ZonaId[] = ['campina', 'bosque', 'ruinas'];

export interface Arma {
  nome: string;
  ataque: number;
  /** Classe que recebe +50% do bônus da arma. */
  afinidade: Classe | null;
  custoOuro: number;
  custoMateriais: Partial<Record<Material, number>>;
}

export const ARMAS: Record<ArmaId, Arma> = {
  bastao: { nome: 'Bastão de treino', ataque: 2, afinidade: null, custoOuro: 0, custoMateriais: {} },
  espada: { nome: 'Espada de ferro', ataque: 8, afinidade: 'guerreiro', custoOuro: 30, custoMateriais: { gosma: 8 } },
  arco: { nome: 'Arco de caça', ataque: 8, afinidade: 'cacadora', custoOuro: 60, custoMateriais: { gosma: 15 } },
  cajado: { nome: 'Cajado rúnico', ataque: 8, afinidade: 'mistica', custoOuro: 60, custoMateriais: { gosma: 15 } },
  lamina: {
    nome: 'Lâmina das ruínas',
    ataque: 30,
    afinidade: null,
    custoOuro: 800,
    custoMateriais: { couro: 30, fragmento: 15 },
  },
};

export const ORDEM_ARMAS: ArmaId[] = ['bastao', 'espada', 'arco', 'cajado', 'lamina'];

/** Custo em ouro do próximo herói, pelo tamanho atual da party. */
export const CUSTO_CONTRATACAO = [0, 40, 250];
export const MAXIMO_HEROIS = CUSTO_CONTRATACAO.length;

/** Teto do progresso offline: 8 horas. */
export const OFFLINE_MAXIMO_SEGUNDOS = 8 * 60 * 60;

export const PONTOS_POR_NIVEL = 2;
export const TAMANHO_DIARIO = 40;

/** A party recua para descansar quando alguém fica abaixo desta fração da vida. */
export const LIMITE_VIDA_RECUO = 0.25;
/** Fração da vida máxima recuperada por segundo de descanso. */
export const RECUPERACAO_VIDA = 0.05;
/** Bônus de grupo trazidos pelas classes de apoio. */
export const BONUS_XP_MISTICA = 0.25;
export const BONUS_SAQUE_CACADORA = 0.25;
