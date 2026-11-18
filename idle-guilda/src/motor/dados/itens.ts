import type { Material, Mod, Raridade, Slot, Stat, Stats, TipoSlot } from '../tipos';
import type { TipoArma, TipoArmadura } from './personagens';

export interface BaseItem {
  id: string;
  nome: string;
  slot: TipoSlot;
  /** Armaduras têm tipo de armadura; armas e secundárias, tipo de arma. */
  armadura?: TipoArmadura;
  arma?: TipoArma;
  /** Atributos no nível 1, antes de raridade e melhorias. */
  stats: Partial<Stats>;
  /** Relíquias: passivas próprias. */
  mods?: Mod[];
}

export const SLOTS: Slot[] = ['elmo', 'peitoral', 'manoplas', 'calcas', 'botas', 'arma', 'secundaria', 'acessorio1', 'acessorio2', 'reliquia'];

export const NOME_SLOT: Record<Slot, string> = {
  elmo: 'Elmo',
  peitoral: 'Peitoral',
  manoplas: 'Manoplas',
  calcas: 'Calças',
  botas: 'Botas',
  arma: 'Arma',
  secundaria: 'Mão secundária',
  acessorio1: 'Acessório',
  acessorio2: 'Acessório',
  reliquia: 'Relíquia',
};

export const tipoDoSlot = (s: Slot): TipoSlot => (s === 'acessorio1' || s === 'acessorio2' ? 'acessorio' : s);

const ARMADURAS: Record<TipoArmadura, Record<'elmo' | 'peitoral' | 'manoplas' | 'calcas' | 'botas', Partial<Stats>>> = {
  pesada: {
    elmo: { def: 4, vida: 22 },
    peitoral: { def: 8, vida: 40 },
    manoplas: { def: 3, atq: 2 },
    calcas: { def: 5, vida: 25 },
    botas: { def: 3, vel: 1 },
  },
  media: {
    elmo: { def: 3, defM: 2, vida: 16 },
    peitoral: { def: 6, defM: 3, vida: 30 },
    manoplas: { def: 2, atq: 3 },
    calcas: { def: 4, defM: 2, vida: 18 },
    botas: { def: 2, vel: 2 },
  },
  leve: {
    elmo: { def: 2, vel: 1, vida: 12 },
    peitoral: { def: 4, defM: 2, vida: 22, vel: 1 },
    manoplas: { atq: 4, vel: 1 },
    calcas: { def: 3, vel: 1, vida: 14 },
    botas: { vel: 3, def: 1 },
  },
  tecido: {
    elmo: { defM: 4, atqM: 2, vida: 10 },
    peitoral: { defM: 7, atqM: 3, vida: 20 },
    manoplas: { atqM: 4, velM: 1 },
    calcas: { defM: 5, vida: 14 },
    botas: { velM: 3, defM: 1 },
  },
};

const NOME_ARMADURA: Record<TipoArmadura, string> = { pesada: 'de placas', media: 'de malha', leve: 'de couro', tecido: 'de seda' };
const NOME_PECA = { elmo: 'Elmo', peitoral: 'Peitoral', manoplas: 'Manoplas', calcas: 'Calças', botas: 'Botas' } as const;

const lista: BaseItem[] = [];
for (const armadura of Object.keys(ARMADURAS) as TipoArmadura[]) {
  for (const peca of Object.keys(NOME_PECA) as (keyof typeof NOME_PECA)[]) {
    lista.push({
      id: `${peca}-${armadura}`,
      nome: `${NOME_PECA[peca]} ${NOME_ARMADURA[armadura]}`,
      slot: peca,
      armadura,
      stats: ARMADURAS[armadura][peca],
    });
  }
}
lista.push(
  { id: 'espada', nome: 'Espada', slot: 'arma', arma: 'espada', stats: { atq: 9 } },
  { id: 'lanca', nome: 'Lança', slot: 'arma', arma: 'lanca', stats: { atq: 8, vel: 1, def: 1 } },
  { id: 'adaga', nome: 'Adaga', slot: 'arma', arma: 'adaga', stats: { atq: 7, vel: 2 } },
  { id: 'cajado', nome: 'Cajado', slot: 'arma', arma: 'cajado', stats: { atqM: 10, velM: 1 } },
  { id: 'escudo', nome: 'Escudo', slot: 'secundaria', arma: 'escudo', stats: { def: 6, defM: 3, vida: 15 } },
  { id: 'orbe', nome: 'Orbe', slot: 'secundaria', arma: 'orbe', stats: { atqM: 5, velM: 1 } },
  { id: 'grimorio', nome: 'Grimório', slot: 'secundaria', arma: 'grimorio', stats: { atqM: 3, defM: 3, velM: 1 } },
  { id: 'adagaCurta', nome: 'Adaga curta', slot: 'secundaria', arma: 'adaga', stats: { atq: 4, vel: 2 } },
  { id: 'anel', nome: 'Anel', slot: 'acessorio', stats: { atq: 3, atqM: 3 } },
  { id: 'amuleto', nome: 'Amuleto', slot: 'acessorio', stats: { vida: 30, defM: 2 } },
  { id: 'bracelete', nome: 'Bracelete', slot: 'acessorio', stats: { def: 2, vel: 1, velM: 1 } },
);

export const RELIQUIAS: BaseItem[] = [
  { id: 'coracaoDeBrasa', nome: 'Coração de Brasa', slot: 'reliquia', stats: {}, mods: [{ tipo: 'elemento', elemento: 'fogo', pct: 15 }, { tipo: 'rouboVida', pct: 4 }] },
  { id: 'prismaDoTrovao', nome: 'Prisma do Trovão', slot: 'reliquia', stats: {}, mods: [{ tipo: 'elemento', elemento: 'raio', pct: 15 }, { tipo: 'recarga', pct: 8 }] },
  { id: 'penaDaFenix', nome: 'Pena da Fênix', slot: 'reliquia', stats: {}, mods: [{ tipo: 'regen', pct: 1 }, { tipo: 'cura', pct: 10 }] },
  { id: 'dadoDoDestino', nome: 'Dado do Destino', slot: 'reliquia', stats: {}, mods: [{ tipo: 'critico', pct: 10 }, { tipo: 'danoCritico', pct: 20 }] },
  { id: 'coroaPartida', nome: 'Coroa Partida de Vel’Nora', slot: 'reliquia', stats: {}, mods: [{ tipo: 'xp', pct: 10 }, { tipo: 'ouro', pct: 10 }] },
  { id: 'raizMae', nome: 'Raiz-Mãe', slot: 'reliquia', stats: {}, mods: [{ tipo: 'stat', stat: 'vida', pct: 12 }, { tipo: 'stat', stat: 'defM', pct: 8 }] },
  { id: 'emblemaLionHearth', nome: 'Emblema LionHearth', slot: 'reliquia', stats: {}, mods: [{ tipo: 'danoCausado', pct: 8 }, { tipo: 'ameaca', pct: 10 }] },
  { id: 'ampulhetaCeleste', nome: 'Ampulheta Celeste', slot: 'reliquia', stats: {}, mods: [{ tipo: 'recarga', pct: 12 }] },
  { id: 'olhoDeVesper', nome: 'Olho do Abismo', slot: 'reliquia', stats: {}, mods: [{ tipo: 'elemento', elemento: 'sombra', pct: 15 }, { tipo: 'stat', stat: 'vel', pct: 6 }] },
  { id: 'sementeDeHope', nome: 'Semente de Hope', slot: 'reliquia', stats: {}, mods: [{ tipo: 'elemento', elemento: 'natureza', pct: 15 }, { tipo: 'saque', pct: 15 }] },
];

for (const r of RELIQUIAS) lista.push(r);

export const BASES: Record<string, BaseItem> = Object.fromEntries(lista.map((b) => [b.id, b]));

/* ---------- Raridades ---------- */

export const RARIDADES: Raridade[] = ['comum', 'incomum', 'raro', 'epico', 'lendario'];

export const DADOS_RARIDADE: Record<Raridade, { nome: string; mult: number; afixos: number; preco: number; cor: string }> = {
  comum: { nome: 'Comum', mult: 1, afixos: 0, preco: 1, cor: '#c9c9d6' },
  incomum: { nome: 'Incomum', mult: 1.15, afixos: 1, preco: 2, cor: '#7ed66a' },
  raro: { nome: 'Raro', mult: 1.35, afixos: 2, preco: 4, cor: '#5b9bff' },
  epico: { nome: 'Épico', mult: 1.6, afixos: 3, preco: 8, cor: '#c27bff' },
  lendario: { nome: 'Lendário', mult: 1.9, afixos: 4, preco: 16, cor: '#ffb43a' },
};

/** Os afixos sorteados ficam entre estes atributos. */
export const STATS_AFIXO: Stat[] = ['vida', 'atq', 'def', 'vel', 'atqM', 'defM', 'velM'];

/* ---------- Conjuntos ---------- */

export interface Conjunto {
  id: string;
  nome: string;
  armadura: TipoArmadura;
  /** Bônus por número de peças equipadas. */
  bonus: { pecas: number; mods: Mod[]; texto: string }[];
}

export const CONJUNTOS: Record<string, Conjunto> = {
  leaoDeAco: {
    id: 'leaoDeAco',
    nome: 'Leão de Aço',
    armadura: 'pesada',
    bonus: [
      { pecas: 2, mods: [{ tipo: 'stat', stat: 'def', pct: 10 }], texto: '+10% DEF' },
      { pecas: 4, mods: [{ tipo: 'stat', stat: 'atq', pct: 15 }, { tipo: 'elemento', elemento: 'fogo', pct: 10 }], texto: '+15% ATQ e +10% de dano de fogo' },
      { pecas: 5, mods: [{ tipo: 'rouboVida', pct: 6 }], texto: '6% de roubo de vida' },
    ],
  },
  sombraDaNevoa: {
    id: 'sombraDaNevoa',
    nome: 'Sombra da Névoa',
    armadura: 'leve',
    bonus: [
      { pecas: 2, mods: [{ tipo: 'stat', stat: 'vel', pct: 8 }], texto: '+8% VEL' },
      { pecas: 4, mods: [{ tipo: 'critico', pct: 12 }], texto: '+12% de chance de crítico' },
      { pecas: 5, mods: [{ tipo: 'danoCritico', pct: 30 }], texto: '+30% de dano crítico' },
    ],
  },
  vigiliaDeHope: {
    id: 'vigiliaDeHope',
    nome: 'Vigília de Hope',
    armadura: 'tecido',
    bonus: [
      { pecas: 2, mods: [{ tipo: 'stat', stat: 'atqM', pct: 10 }], texto: '+10% ATQ.M' },
      { pecas: 4, mods: [{ tipo: 'recarga', pct: 10 }], texto: '−10% de recarga' },
      { pecas: 5, mods: [{ tipo: 'stat', stat: 'velM', pct: 12 }, { tipo: 'cura', pct: 15 }], texto: '+12% VEL.M e +15% de cura' },
    ],
  },
  escamasSalamandra: {
    id: 'escamasSalamandra',
    nome: 'Escamas de Salamandra',
    armadura: 'pesada',
    bonus: [
      { pecas: 2, mods: [{ tipo: 'stat', stat: 'vida', pct: 12 }], texto: '+12% de vida' },
      { pecas: 4, mods: [{ tipo: 'stat', stat: 'def', pct: 15 }, { tipo: 'stat', stat: 'defM', pct: 15 }], texto: '+15% DEF e DEF.M' },
      { pecas: 5, mods: [{ tipo: 'espinhos', pct: 15 }, { tipo: 'regen', pct: 0.5 }], texto: 'Devolve 15% do dano e regenera 0,5%/s' },
    ],
  },
  runasDoVento: {
    id: 'runasDoVento',
    nome: 'Runas do Vento',
    armadura: 'tecido',
    bonus: [
      { pecas: 2, mods: [{ tipo: 'stat', stat: 'defM', pct: 10 }], texto: '+10% DEF.M' },
      { pecas: 4, mods: [{ tipo: 'stat', stat: 'velM', pct: 12 }, { tipo: 'stat', stat: 'vel', pct: 12 }], texto: '+12% VEL e VEL.M' },
      { pecas: 5, mods: [{ tipo: 'danoCausado', pct: 10 }], texto: '+10% de dano causado' },
    ],
  },
};

/* ---------- Materiais ---------- */

export const MATERIAIS: Record<Material, { nome: string; preco: number }> = {
  ferrugem: { nome: 'Ferrugem', preco: 2 },
  pena: { nome: 'Pena de harpia', preco: 6 },
  osso: { nome: 'Osso antigo', preco: 15 },
  brasa: { nome: 'Brasa viva', preco: 35 },
  nucleo: { nome: 'Núcleo celeste', preco: 80 },
  essencia: { nome: 'Essência de habilidade', preco: 150 },
};

/** Nome por faixa de nível do item: mostra de que época ele é. */
export function sufixoDoNivel(nivel: number): string {
  if (nivel < 8) return 'rústico';
  if (nivel < 16) return 'de aço';
  if (nivel < 24) return 'de Hope';
  if (nivel < 32) return 'vulcânico';
  return 'celeste';
}

export const INVENTARIO_MAXIMO = 60;
export const MELHORIA_MAXIMA = 10;
