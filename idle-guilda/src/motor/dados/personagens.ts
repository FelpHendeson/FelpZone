import type { Elemento, Escola, Papel, PersonagemId, Stat, Stats } from '../tipos';

export const STATS: Stat[] = ['vida', 'atq', 'def', 'vel', 'atqM', 'defM', 'velM'];

export const NOME_STAT: Record<Stat, { curto: string; nome: string; efeito: string }> = {
  vida: { curto: 'PV', nome: 'Vida', efeito: 'Quanto dano aguenta antes de cair.' },
  atq: { curto: 'ATQ', nome: 'Ataque físico', efeito: 'Dano de golpes e habilidades físicas.' },
  def: { curto: 'DEF', nome: 'Defesa física', efeito: 'Reduz o dano físico recebido.' },
  vel: { curto: 'VEL', nome: 'Velocidade física', efeito: 'Ataques básicos mais frequentes e recarga das habilidades físicas.' },
  atqM: { curto: 'ATQ.M', nome: 'Ataque mágico', efeito: 'Dano de magias, curas e escudos.' },
  defM: { curto: 'DEF.M', nome: 'Defesa mágica', efeito: 'Reduz o dano mágico recebido.' },
  velM: { curto: 'VEL.M', nome: 'Velocidade mágica', efeito: 'Recarga das habilidades mágicas e conjuração.' },
};

/** Quanto cada ponto distribuído soma ao atributo. */
export const VALOR_PONTO: Stats = { vida: 12, atq: 1.5, def: 1.5, vel: 1, atqM: 1.5, defM: 1.5, velM: 1 };
export const PONTOS_POR_NIVEL = 3;

export type TipoArmadura = 'pesada' | 'media' | 'leve' | 'tecido';
export type TipoArma = 'espada' | 'escudo' | 'cajado' | 'orbe' | 'adaga' | 'grimorio' | 'lanca';

export interface Personagem {
  id: PersonagemId;
  nome: string;
  titulo: string;
  raca: string;
  papel: Papel;
  papelNome: string;
  elemento: Elemento;
  /** Escola do ataque básico. */
  escolaBasica: Escola;
  base: Stats;
  crescimento: Stats;
  armaduras: TipoArmadura[];
  armas: TipoArma[];
  secundarias: TipoArma[];
  /** Peso para atrair os inimigos. */
  ameaca: number;
  /** Posição na formação: frente recebe golpes primeiro. */
  linha: 'frente' | 'tras';
  habilidadesIniciais: string[];
  lore: string;
  /** Na Taverna: nível mínimo do Sir LionHearth e preço. */
  recrutamento: { nivel: number; ouro: number } | null;
}

export const PERSONAGENS: Record<PersonagemId, Personagem> = {
  leao: {
    id: 'leao',
    nome: 'Sir LionHearth',
    titulo: 'Cavaleiro de Hope',
    raca: 'Humano',
    papel: 'equilibrado',
    papelNome: 'Dano explosivo',
    elemento: 'fogo',
    escolaBasica: 'fisica',
    base: { vida: 150, atq: 15, def: 12, vel: 10, atqM: 8, defM: 9, velM: 8 },
    crescimento: { vida: 15, atq: 2.4, def: 1.8, vel: 0.9, atqM: 1, defM: 1.3, velM: 0.7 },
    armaduras: ['pesada', 'media'],
    armas: ['espada', 'lanca'],
    secundarias: ['escudo'],
    ameaca: 2,
    linha: 'frente',
    habilidadesIniciais: ['golpeJusto', 'escudoDeHope'],
    lore:
      'Filho do lorde da Ilha de Aço, a maior das Sky Islands do reino de Hope. Disciplinado, justo e de princípios imutáveis, ' +
      'parte para espalhar o nome da família LionHearth. Mas, no calor da batalha, as brasas da alma acendem a silhueta de um ' +
      'leão em chamas, e uma face cruel e maníaca por combate se revela.',
    recrutamento: null,
  },
  quentin: {
    id: 'quentin',
    nome: 'Quentin Salamander',
    titulo: 'Escudeiro do Leão',
    raca: 'Salamandrino',
    papel: 'tanque',
    papelNome: 'Tanque',
    elemento: 'fogo',
    escolaBasica: 'fisica',
    base: { vida: 190, atq: 9, def: 18, vel: 8, atqM: 6, defM: 14, velM: 7 },
    crescimento: { vida: 20, atq: 1.2, def: 2.8, vel: 0.7, atqM: 0.6, defM: 2.1, velM: 0.6 },
    armaduras: ['pesada'],
    armas: ['espada', 'lanca'],
    secundarias: ['escudo'],
    ameaca: 5,
    linha: 'frente',
    habilidadesIniciais: ['provocar', 'golpeDeEscudo'],
    lore:
      'Recém-sagrado escudeiro e discípulo de Sir LionHearth, segue o mestre como uma sombra, mas uma sombra de brasas tão ' +
      'quentes que suporta as chamas do Leão. Do povo salamandrino, tem escamas que endurecem sob o fogo.',
    recrutamento: { nivel: 2, ouro: 60 },
  },
  cyrus: {
    id: 'cyrus',
    nome: 'Cyrus Viper',
    titulo: 'Aprendiz de Mago',
    raca: 'Humano',
    papel: 'area',
    papelNome: 'Dano em área',
    elemento: 'raio',
    escolaBasica: 'magica',
    base: { vida: 95, atq: 5, def: 7, vel: 9, atqM: 17, defM: 12, velM: 12 },
    crescimento: { vida: 9, atq: 0.5, def: 1, vel: 0.8, atqM: 2.6, defM: 1.8, velM: 1.2 },
    armaduras: ['tecido', 'leve'],
    armas: ['cajado'],
    secundarias: ['orbe', 'grimorio'],
    ameaca: 1,
    linha: 'tras',
    habilidadesIniciais: ['faiscaEmCadeia', 'barreiraEstatica'],
    lore:
      'Nascido em Hope, aprendiz de mago designado a serviço de Sir LionHearth. Calmo e marcante como o raio que conjura: ' +
      'fala pouco, mas quando fala, ilumina o campo de batalha inteiro.',
    recrutamento: { nivel: 5, ouro: 250 },
  },
  vesper: {
    id: 'vesper',
    nome: 'Vesper Ashveil',
    titulo: 'Lâmina da Névoa',
    raca: 'Meio-elfa',
    papel: 'dps',
    papelNome: 'Dano constante',
    elemento: 'sombra',
    escolaBasica: 'fisica',
    base: { vida: 105, atq: 17, def: 8, vel: 15, atqM: 6, defM: 8, velM: 9 },
    crescimento: { vida: 10, atq: 2.7, def: 1.1, vel: 1.4, atqM: 0.6, defM: 1.1, velM: 0.8 },
    armaduras: ['leve', 'media'],
    armas: ['adaga'],
    secundarias: ['adaga'],
    ameaca: 1,
    linha: 'tras',
    habilidadesIniciais: ['corteDuplo', 'laminaVenenosa'],
    lore:
      'Sobrevivente de Vel’Nora, uma ilha flutuante que caiu nas nuvens. Vendeu a lâmina a quem pagasse até cruzar com a ' +
      'família LionHearth, a única que a tratou como gente. Golpeia rápido, sempre, sem nunca parar.',
    recrutamento: { nivel: 10, ouro: 1200 },
  },
  odalys: {
    id: 'odalys',
    nome: 'Odalys Thornwick',
    titulo: 'Feiticeira das Runas',
    raca: 'Sylph',
    papel: 'suporte',
    papelNome: 'Buffs e debuffs',
    elemento: 'natureza',
    escolaBasica: 'magica',
    base: { vida: 100, atq: 5, def: 7, vel: 10, atqM: 14, defM: 14, velM: 14 },
    crescimento: { vida: 9.5, atq: 0.5, def: 1, vel: 0.9, atqM: 2, defM: 2, velM: 1.5 },
    armaduras: ['tecido', 'leve'],
    armas: ['cajado'],
    secundarias: ['grimorio', 'orbe'],
    ameaca: 1,
    linha: 'tras',
    habilidadesIniciais: ['bencaoDeHope', 'maldicaoDeEspinhos'],
    lore:
      'Sylph do Jardim Suspenso, povo de asas finas que conversa com o vento e com as raízes. Grava runas no ar: algumas ' +
      'fortalecem os aliados, outras enfraquecem quem estiver do outro lado.',
    recrutamento: { nivel: 14, ouro: 2500 },
  },
};

export const ORDEM_PERSONAGENS: PersonagemId[] = ['leao', 'quentin', 'cyrus', 'vesper', 'odalys'];

export const NOME_ELEMENTO: Record<Elemento, string> = {
  neutro: 'Neutro',
  fogo: 'Fogo',
  raio: 'Raio',
  sombra: 'Sombra',
  natureza: 'Natureza',
  vento: 'Vento',
  gelo: 'Gelo',
  luz: 'Luz',
};

export const COR_ELEMENTO: Record<Elemento, string> = {
  neutro: '#c9c9d6',
  fogo: '#ff8a3a',
  raio: '#ffe36a',
  sombra: '#b48cff',
  natureza: '#7ed66a',
  vento: '#9fe8e0',
  gelo: '#8fd3ff',
  luz: '#fff3b0',
};

/**
 * XP para ir do nível n ao n+1: cerca de (20 + 3n² + n³) inimigos do mesmo nível.
 * Lutar contra inimigos mais fracos rende menos, e o mapa antigo fica obsoleto.
 */
export function xpParaProximo(nivel: number): number {
  return Math.round((20 + 3 * nivel * nivel + nivel * nivel * nivel) * 5 * Math.pow(1.1, nivel - 1));
}

/** Nível com que um herói recrutado chega: perto da média da party. */
export function nivelDeChegada(niveis: number[]): number {
  if (niveis.length === 0) return 1;
  return Math.max(1, Math.floor((niveis.reduce((s, n) => s + n, 0) / niveis.length) * 0.85));
}
