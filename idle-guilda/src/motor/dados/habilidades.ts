import type { Elemento, Habilidade, Rank } from '../tipos';

type Def = Omit<Habilidade, 'id'>;

const h = (d: Def) => d;

/** Habilidades fixas do jogo, por id. As criadas no Jardim ficam no estado. */
export const HABILIDADES: Record<string, Habilidade> = Object.fromEntries(
  Object.entries({
    /* ----- Sir LionHearth ----- */
    golpeJusto: h({
      nome: 'Golpe Justo',
      descricao: 'Um corte limpo, como manda o código de Hope: 180% do ATQ em um alvo.',
      tipo: 'ativa', escola: 'fisica', elemento: 'neutro', rank: 'D', recarga: 6,
      efeitos: [{ tipo: 'dano', mult: 1.8 }],
    }),
    escudoDeHope: h({
      nome: 'Escudo de Hope',
      descricao: 'Ergue o escudo da família: escudo de 4× a DEF em si mesmo.',
      tipo: 'ativa', escola: 'fisica', elemento: 'luz', rank: 'D', recarga: 14,
      efeitos: [{ tipo: 'escudo', mult: 4, base: 'def' }],
    }),
    rugidoFlamejante: h({
      nome: 'Rugido Flamejante',
      descricao: 'Um rugido que vira labareda: 110% do ATQ em todos e queimadura.',
      tipo: 'ativa', escola: 'fisica', elemento: 'fogo', rank: 'C', recarga: 12,
      efeitos: [{ tipo: 'dano', mult: 1.1, area: true }, { tipo: 'dot', mult: 0.2, duracao: 5, area: true }],
    }),
    investidaDoLeao: h({
      nome: 'Investida do Leão',
      descricao: 'Avança em chamas: 280% do ATQ em um alvo.',
      tipo: 'ativa', escola: 'fisica', elemento: 'fogo', rank: 'C', recarga: 16,
      efeitos: [{ tipo: 'dano', mult: 2.8 }],
    }),
    leaoDasChamas: h({
      nome: 'Leão das Chamas',
      descricao:
        'A outra face desperta: por 15 s, +45% ATQ, +30% VEL, 12% de roubo de vida e +25% de dano de fogo. Recarga longa.',
      tipo: 'transformacao', escola: 'fisica', elemento: 'fogo', rank: 'B', recarga: 50, duracao: 15,
      efeitos: [],
      mods: [
        { tipo: 'stat', stat: 'atq', pct: 45 },
        { tipo: 'stat', stat: 'vel', pct: 30 },
        { tipo: 'rouboVida', pct: 12 },
        { tipo: 'elemento', elemento: 'fogo', pct: 25 },
      ],
    }),
    juramentoInabalavel: h({
      nome: 'Juramento Inabalável',
      descricao: 'Princípios imutáveis: +10% DEF, +10% DEF.M e +8% de vida.',
      tipo: 'passiva', escola: 'fisica', elemento: 'luz', rank: 'C', recarga: 0, efeitos: [],
      mods: [{ tipo: 'stat', stat: 'def', pct: 10 }, { tipo: 'stat', stat: 'defM', pct: 10 }, { tipo: 'stat', stat: 'vida', pct: 8 }],
    }),
    sedeDeBatalha: h({
      nome: 'Sede de Batalha',
      descricao: 'O gosto do sangue inimigo: 6% de roubo de vida e +25% de dano crítico.',
      tipo: 'passiva', escola: 'fisica', elemento: 'fogo', rank: 'C', recarga: 0, efeitos: [],
      mods: [{ tipo: 'rouboVida', pct: 6 }, { tipo: 'danoCritico', pct: 25 }],
    }),

    /* ----- Quentin Salamander ----- */
    provocar: h({
      nome: 'Provocar',
      descricao: 'Bate no escudo e chama todos para si por 8 s, com +20% DEF.',
      tipo: 'ativa', escola: 'fisica', elemento: 'neutro', rank: 'D', recarga: 12,
      efeitos: [{ tipo: 'provocar', duracao: 8 }, { tipo: 'buff', mods: [{ tipo: 'stat', stat: 'def', pct: 20 }], duracao: 8 }],
    }),
    golpeDeEscudo: h({
      nome: 'Golpe de Escudo',
      descricao: '120% do ATQ e deixa o alvo 30% mais lento por 4 s.',
      tipo: 'ativa', escola: 'fisica', elemento: 'neutro', rank: 'D', recarga: 8,
      efeitos: [{ tipo: 'dano', mult: 1.2 }, { tipo: 'debuff', mods: [{ tipo: 'stat', stat: 'vel', pct: -30 }], duracao: 4 }],
    }),
    caudaIgnea: h({
      nome: 'Cauda Ígnea',
      descricao: 'Varre a frente com a cauda em brasa: 90% do ATQ em todos.',
      tipo: 'ativa', escola: 'fisica', elemento: 'fogo', rank: 'C', recarga: 10,
      efeitos: [{ tipo: 'dano', mult: 0.9, area: true }],
    }),
    muralha: h({
      nome: 'Muralha de Escamas',
      descricao: 'Escudo de 2,5× a DEF de Quentin em toda a party.',
      tipo: 'ativa', escola: 'fisica', elemento: 'fogo', rank: 'C', recarga: 22,
      efeitos: [{ tipo: 'escudo', mult: 2.5, base: 'def', todos: true }],
    }),
    peleDeBrasa: h({
      nome: 'Pele de Brasa',
      descricao: '+15% DEF e devolve 20% do dano recebido a quem atacou.',
      tipo: 'passiva', escola: 'fisica', elemento: 'fogo', rank: 'C', recarga: 0, efeitos: [],
      mods: [{ tipo: 'stat', stat: 'def', pct: 15 }, { tipo: 'espinhos', pct: 20 }],
    }),
    ultimaBrasa: h({
      nome: 'Última Brasa',
      descricao: 'Recupera 1,2% da vida por segundo e recebe 10% menos dano.',
      tipo: 'passiva', escola: 'fisica', elemento: 'fogo', rank: 'B', recarga: 0, efeitos: [],
      mods: [{ tipo: 'regen', pct: 1.2 }, { tipo: 'danoRecebido', pct: -10 }],
    }),

    /* ----- Cyrus Viper ----- */
    faiscaEmCadeia: h({
      nome: 'Faísca em Cadeia',
      descricao: 'Um raio salta entre todos os inimigos: 85% do ATQ.M em área.',
      tipo: 'ativa', escola: 'magica', elemento: 'raio', rank: 'D', recarga: 7,
      efeitos: [{ tipo: 'dano', mult: 0.85, area: true }],
    }),
    barreiraEstatica: h({
      nome: 'Barreira Estática',
      descricao: 'Campo elétrico protetor: escudo de 1,6× o ATQ.M em toda a party.',
      tipo: 'ativa', escola: 'magica', elemento: 'raio', rank: 'D', recarga: 16,
      efeitos: [{ tipo: 'escudo', mult: 1.6, base: 'atqM', todos: true }],
    }),
    tempestade: h({
      nome: 'Tempestade de Raios',
      descricao: '150% do ATQ.M em área e −20% DEF.M nos inimigos por 8 s.',
      tipo: 'ativa', escola: 'magica', elemento: 'raio', rank: 'C', recarga: 18,
      efeitos: [
        { tipo: 'dano', mult: 1.5, area: true },
        { tipo: 'debuff', mods: [{ tipo: 'stat', stat: 'defM', pct: -20 }], duracao: 8, area: true },
      ],
    }),
    lancaTrovejante: h({
      nome: 'Lança Trovejante',
      descricao: 'Concentra a tempestade numa lança: 260% do ATQ.M em um alvo.',
      tipo: 'ativa', escola: 'magica', elemento: 'raio', rank: 'C', recarga: 11,
      efeitos: [{ tipo: 'dano', mult: 2.6 }],
    }),
    sobrecarga: h({
      nome: 'Sobrecarga',
      descricao: '+12% ATQ.M e +10% VEL.M.',
      tipo: 'passiva', escola: 'magica', elemento: 'raio', rank: 'C', recarga: 0, efeitos: [],
      mods: [{ tipo: 'stat', stat: 'atqM', pct: 12 }, { tipo: 'stat', stat: 'velM', pct: 10 }],
    }),
    campoCondutor: h({
      nome: 'Campo Condutor',
      descricao: 'Aura: toda a party ganha +12% DEF.M e +8% DEF.',
      tipo: 'passiva', escola: 'magica', elemento: 'raio', rank: 'B', recarga: 0, efeitos: [], aura: true,
      mods: [{ tipo: 'stat', stat: 'defM', pct: 12 }, { tipo: 'stat', stat: 'def', pct: 8 }],
    }),

    /* ----- Vesper Ashveil ----- */
    corteDuplo: h({
      nome: 'Corte Duplo',
      descricao: 'Dois cortes rápidos de 80% do ATQ.',
      tipo: 'ativa', escola: 'fisica', elemento: 'sombra', rank: 'D', recarga: 4,
      efeitos: [{ tipo: 'dano', mult: 0.8, golpes: 2 }],
    }),
    laminaVenenosa: h({
      nome: 'Lâmina Venenosa',
      descricao: '70% do ATQ e veneno de 30% do ATQ por segundo durante 6 s.',
      tipo: 'ativa', escola: 'fisica', elemento: 'natureza', rank: 'D', recarga: 9,
      efeitos: [{ tipo: 'dano', mult: 0.7 }, { tipo: 'dot', mult: 0.3, duracao: 6 }],
    }),
    marcaDaMorte: h({
      nome: 'Marca da Morte',
      descricao: 'Marca o alvo: ele recebe 25% mais dano por 10 s.',
      tipo: 'ativa', escola: 'fisica', elemento: 'sombra', rank: 'C', recarga: 14,
      efeitos: [{ tipo: 'debuff', mods: [{ tipo: 'danoRecebido', pct: 25 }], duracao: 10 }],
    }),
    dancaDasLaminas: h({
      nome: 'Dança das Lâminas',
      descricao: 'Cinco golpes de 55% do ATQ em todos os inimigos.',
      tipo: 'ativa', escola: 'fisica', elemento: 'vento', rank: 'B', recarga: 15,
      efeitos: [{ tipo: 'dano', mult: 0.55, golpes: 5, area: true }],
    }),
    passoSombrio: h({
      nome: 'Passo Sombrio',
      descricao: '+15% VEL e +12% de chance de crítico.',
      tipo: 'passiva', escola: 'fisica', elemento: 'sombra', rank: 'C', recarga: 0, efeitos: [],
      mods: [{ tipo: 'stat', stat: 'vel', pct: 15 }, { tipo: 'critico', pct: 12 }],
    }),
    instintoAssassino: h({
      nome: 'Instinto Assassino',
      descricao: '+45% de dano crítico e +8% de chance de crítico.',
      tipo: 'passiva', escola: 'fisica', elemento: 'sombra', rank: 'B', recarga: 0, efeitos: [],
      mods: [{ tipo: 'danoCritico', pct: 45 }, { tipo: 'critico', pct: 8 }],
    }),

    /* ----- Odalys Thornwick ----- */
    bencaoDeHope: h({
      nome: 'Bênção de Hope',
      descricao: 'Runa dourada: +20% ATQ e ATQ.M para toda a party por 12 s.',
      tipo: 'ativa', escola: 'magica', elemento: 'luz', rank: 'D', recarga: 20,
      efeitos: [
        { tipo: 'buff', mods: [{ tipo: 'stat', stat: 'atq', pct: 20 }, { tipo: 'stat', stat: 'atqM', pct: 20 }], duracao: 12, todos: true },
      ],
    }),
    maldicaoDeEspinhos: h({
      nome: 'Maldição de Espinhos',
      descricao: 'Espinhos rúnicos: −20% DEF e DEF.M em todos os inimigos por 10 s.',
      tipo: 'ativa', escola: 'magica', elemento: 'natureza', rank: 'D', recarga: 16,
      efeitos: [
        { tipo: 'debuff', mods: [{ tipo: 'stat', stat: 'def', pct: -20 }, { tipo: 'stat', stat: 'defM', pct: -20 }], duracao: 10, area: true },
      ],
    }),
    seivaRestauradora: h({
      nome: 'Seiva Restauradora',
      descricao: 'Cura toda a party em 1,4× o ATQ.M.',
      tipo: 'ativa', escola: 'magica', elemento: 'natureza', rank: 'C', recarga: 14,
      efeitos: [{ tipo: 'cura', mult: 1.4, base: 'atqM', todos: true }],
    }),
    raizesLentas: h({
      nome: 'Raízes Lentas',
      descricao: '60% do ATQ.M em área e −30% VEL nos inimigos por 8 s.',
      tipo: 'ativa', escola: 'magica', elemento: 'natureza', rank: 'C', recarga: 12,
      efeitos: [
        { tipo: 'dano', mult: 0.6, area: true },
        { tipo: 'debuff', mods: [{ tipo: 'stat', stat: 'vel', pct: -30 }, { tipo: 'stat', stat: 'velM', pct: -30 }], duracao: 8, area: true },
      ],
    }),
    cancaoDoVento: h({
      nome: 'Canção do Vento',
      descricao: '+25% VEL e VEL.M para toda a party por 12 s.',
      tipo: 'ativa', escola: 'magica', elemento: 'vento', rank: 'C', recarga: 22,
      efeitos: [
        { tipo: 'buff', mods: [{ tipo: 'stat', stat: 'vel', pct: 25 }, { tipo: 'stat', stat: 'velM', pct: 25 }], duracao: 12, todos: true },
      ],
    }),
    florescer: h({
      nome: 'Florescer',
      descricao: 'Aura: toda a party recupera 0,6% da vida por segundo e recebe +15% de cura.',
      tipo: 'passiva', escola: 'magica', elemento: 'natureza', rank: 'B', recarga: 0, efeitos: [], aura: true,
      mods: [{ tipo: 'regen', pct: 0.6 }, { tipo: 'cura', pct: 15 }],
    }),

    /* ----- Fusões com receita (resultado fixo no Jardim) ----- */
    julgamentoDoLeao: h({
      nome: 'Julgamento do Leão',
      descricao: 'Justiça e fúria num só golpe: 340% do ATQ de fogo em um alvo e queimadura forte.',
      tipo: 'ativa', escola: 'fisica', elemento: 'fogo', rank: 'A', recarga: 14,
      efeitos: [{ tipo: 'dano', mult: 3.4 }, { tipo: 'dot', mult: 0.45, duracao: 6 }],
    }),
    fortalezaIgnea: h({
      nome: 'Fortaleza Ígnea',
      descricao: 'Provoca todos por 10 s e dá à party escudo de 3× a DEF de Quentin.',
      tipo: 'ativa', escola: 'fisica', elemento: 'fogo', rank: 'A', recarga: 24,
      efeitos: [{ tipo: 'provocar', duracao: 10 }, { tipo: 'escudo', mult: 3, base: 'def', todos: true }],
    }),
    juizoDoTrovao: h({
      nome: 'Juízo do Trovão',
      descricao: 'Tempestade concentrada: 220% do ATQ.M em área e −30% DEF.M por 10 s.',
      tipo: 'ativa', escola: 'magica', elemento: 'raio', rank: 'A', recarga: 20,
      efeitos: [
        { tipo: 'dano', mult: 2.2, area: true },
        { tipo: 'debuff', mods: [{ tipo: 'stat', stat: 'defM', pct: -30 }], duracao: 10, area: true },
      ],
    }),
    eclipseDeLaminas: h({
      nome: 'Eclipse de Lâminas',
      descricao: 'Oito golpes de 60% do ATQ em todos e veneno nos sobreviventes.',
      tipo: 'ativa', escola: 'fisica', elemento: 'sombra', rank: 'A', recarga: 18,
      efeitos: [{ tipo: 'dano', mult: 0.6, golpes: 8, area: true }, { tipo: 'dot', mult: 0.25, duracao: 6, area: true }],
    }),
    jardimDeHope: h({
      nome: 'Jardim de Hope',
      descricao: 'Cura a party em 1,6× o ATQ.M e dá +25% ATQ, ATQ.M e VEL por 12 s.',
      tipo: 'ativa', escola: 'magica', elemento: 'luz', rank: 'A', recarga: 26,
      efeitos: [
        { tipo: 'cura', mult: 1.6, base: 'atqM', todos: true },
        {
          tipo: 'buff', todos: true, duracao: 12,
          mods: [{ tipo: 'stat', stat: 'atq', pct: 25 }, { tipo: 'stat', stat: 'atqM', pct: 25 }, { tipo: 'stat', stat: 'vel', pct: 25 }],
        },
      ],
    }),
  } satisfies Record<string, Def>).map(([id, d]) => [id, { id, ...d }]),
);

/** Receitas do Jardim: a ordem dos dois ingredientes não importa. */
export const RECEITAS: { a: string; b: string; resultado: string }[] = [
  { a: 'golpeJusto', b: 'rugidoFlamejante', resultado: 'julgamentoDoLeao' },
  { a: 'provocar', b: 'muralha', resultado: 'fortalezaIgnea' },
  { a: 'tempestade', b: 'lancaTrovejante', resultado: 'juizoDoTrovao' },
  { a: 'corteDuplo', b: 'dancaDasLaminas', resultado: 'eclipseDeLaminas' },
  { a: 'bencaoDeHope', b: 'seivaRestauradora', resultado: 'jardimDeHope' },
];

export const ORDEM_RANK: Rank[] = ['D', 'C', 'B', 'A', 'S'];

/** Elemento que nasce da fusão de dois elementos (para fusões sem receita). */
export function fundirElementos(a: Elemento, b: Elemento): { elemento: Elemento; prefixo: string } {
  if (a === b) return { elemento: a, prefixo: PREFIXO_PURO[a] };
  const chave = [a, b].sort().join('+');
  return COMBINACOES[chave] ?? { elemento: a === 'neutro' ? b : a, prefixo: PREFIXO_PURO[a === 'neutro' ? b : a] };
}

const PREFIXO_PURO: Record<Elemento, string> = {
  neutro: 'Aço',
  fogo: 'Brasa',
  raio: 'Trovão',
  sombra: 'Névoa',
  natureza: 'Raiz',
  vento: 'Brisa',
  gelo: 'Geada',
  luz: 'Aurora',
};

const COMBINACOES: Record<string, { elemento: Elemento; prefixo: string }> = {
  'fogo+raio': { elemento: 'raio', prefixo: 'Plasma' },
  'fogo+sombra': { elemento: 'sombra', prefixo: 'Chama Negra' },
  'fogo+natureza': { elemento: 'fogo', prefixo: 'Cinzas' },
  'fogo+vento': { elemento: 'fogo', prefixo: 'Fornalha' },
  'fogo+luz': { elemento: 'luz', prefixo: 'Sol' },
  'luz+raio': { elemento: 'luz', prefixo: 'Relâmpago Sagrado' },
  'natureza+raio': { elemento: 'raio', prefixo: 'Tempestade Verde' },
  'raio+sombra': { elemento: 'sombra', prefixo: 'Raio Rubro' },
  'raio+vento': { elemento: 'vento', prefixo: 'Ciclone' },
  'natureza+sombra': { elemento: 'natureza', prefixo: 'Espinho Noturno' },
  'sombra+vento': { elemento: 'sombra', prefixo: 'Vendaval Sombrio' },
  'luz+sombra': { elemento: 'luz', prefixo: 'Crepúsculo' },
  'luz+natureza': { elemento: 'natureza', prefixo: 'Bosque Sagrado' },
  'natureza+vento': { elemento: 'vento', prefixo: 'Pólen' },
  'luz+vento': { elemento: 'vento', prefixo: 'Aurora Boreal' },
};
