// Era 2: Bairro (Morro do Farol). Anos depois da escola: dinheiro de verdade, lotes pra construir,
// armas, eventos. As gangues são locais; as grandes (Corvos, Serpentes, Dragões) esperam na Cidade.
import { TYPES } from '../types.js';

const RIVALS = {
  A: { name: 'Bonde da Ladeira', leader: 'Tião Ladeira', color: '#a855f7', aggr: 0.5,
       quotes: ['A Ladeira não desce pra ninguém.', 'Tu era moleque de colégio ontem, parceiro.', 'Sobe aqui se for homem.'] },
  B: { name: 'Família Martelo', leader: 'Martelo', color: '#22c55e', aggr: 0.4,
       quotes: ['A Família não esquece e não perdoa.', 'Aqui é tudo na base do respeito. O teu acabou.', 'Martelo bate uma vez só.'] },
  C: { name: 'Os Vira-Latas', leader: 'Pitoco', color: '#f97316', aggr: 0.35,
       quotes: ['Vira-lata morde e some.', 'A beira do córrego é nossa desde sempre.', 'Pode vir, a matilha tá com fome.'] },
};

// [nome, tipo, x, y, dono, guardas]
const MAP = [
  ['Laje do Farol',            'hq',         160, 140, 'P', 4], // 0
  ['Bar do Tonhão',            'bar',        310,  90, null, 2], // 1
  ['Campinho do Farol',        'campinho',   120, 300, null, 2], // 2
  ['Boca da Escadaria',        'boca',       330, 240, null, 2], // 3
  ['Lote da Caixa d’Água',     'lote',       470, 120, null, 0], // 4
  ['Mercadinho do Seu Jorge',  'mercado',    500, 280, null, 3], // 5
  ['Fliperama da Ladeira',     'fliperama',  680, 100, 'A', 3], // 6
  ['QG da Ladeira',            'hq',         860, 110, 'A', 6], // 7
  ['Boca da Curva',            'boca',       850, 280, 'A', 3], // 8
  ['Lote do Beco',             'lote',       680, 250, null, 0], // 9
  ['Posto da PM',              'policia',    560, 430, 'X', 0], // 10
  ['Inferninho Estrela',       'inferninho', 380, 420, null, 3], // 11
  ['Lote da Encosta',          'lote',       230, 430, null, 0], // 12
  ['QG da Família',            'hq',         130, 580, 'B', 6], // 13
  ['Desmanche do Martelo',     'desmanche',  300, 600, 'B', 3], // 14
  ['Lote do Córrego',          'lote',       460, 600, null, 0], // 15
  ['Boteco do Pitoco',         'bar',        680, 600, 'C', 3], // 16
  ['QG dos Vira-Latas',        'hq',         880, 580, 'C', 6], // 17
  ['Lote da Ponte',            'lote',       870, 430, null, 0], // 18
  ['Lote da Pracinha',         'lote',       720, 420, null, 0], // 19
];
const EDGES = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 3], [2, 12], [3, 5], [3, 11], [4, 5], [4, 6], [5, 9], [6, 7], [6, 9], [7, 8],
  [8, 9], [8, 18], [9, 19], [5, 11], [11, 12], [11, 15], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [16, 19],
  [17, 18], [18, 19],
  [5, 6], [11, 14], [11, 16],   // ruas diretas: os lotes ajudam, mas não são o único caminho
];
const DISTRICTS = [
  ['MORRO DO FAROL', 240, 200, 200, '#ef444410'],
  ['LADEIRA', 790, 180, 170, '#a855f712'],
  ['VILA DO MARTELO', 220, 540, 160, '#22c55e10'],
  ['BEIRA DO CÓRREGO', 780, 530, 170, '#f9731610'],
];

export const BAIRRO = {
  id: 'bairro',
  label: 'Bairro',
  types: TYPES, rivals: RIVALS,
  map: { MAP, EDGES, DISTRICTS, POLICE_NODE: 10 },
  decor: 'nenhum',
  introScene: 'introBairro',
  cfg: {
    upkeep: 12, captainSalary: 15, actions: 3, truceDays: 4,
    policeRadius: 190, heatPerPoint: 2.6, heatDrift: 0.35, bribeDays: 3,
    price: 1, startMoney: 800, startFree: 6, startRespect: 10, rivalStartMoney: 400, rivalStartReserve: 4,
    raid: 'policia', motoCost: 0,
    rivalCapBase: 10, rivalCapPerNode: 3, guardBase: 3, guardEvery: 7,
    build: true, weapons: true, events: true,
  },
  words: {
    heat: 'Visada', heatIcon: '👁️', police: 'polícia', bribe: 'Subornar', bribeIcon: '💼', soldiers: 'soldados',
    bribeTip: 'Tira 20 de visada e corta o alvo pela metade por {dias} dias',
  },
  text: {
    start: [
      ['{leader} volta pro Morro do Farol depois de anos. O {gang} vai começar pelo próprio bairro.', 'big'],
      ['As gangues do bairro ainda estão te medindo. Você tem {trégua} dias antes de virem pra cima.', 'warn'],
    ],
    eliminatedByPlayer: '💀 {rival} CAÍRAM! {lider} sumiu do bairro. Você pegou o caixa deles ({grana}). Os pontos deles ficaram sem dono.',
    eliminatedByOther: '💀 {rival} foram destruídos por {por}! Os pontos deles ficaram sem dono.',
    bribe: '💼 Molhou a mão do sargento do posto com {custo}. Vista grossa por {dias} dias.',
    bribeEnd: '👮 Acabou a vista grossa. O posto voltou a olhar pra você.',
    winTitle: '🏘️ DONO DO BAIRRO',
    win: 'No dia {dia}, o {gang} derrubou a última gangue do Morro do Farol. O bairro responde a {leader}.',
    loseTitle: '☠️ FIM DA LINHA',
    lose: 'A Laje do Farol caiu no dia {dia}. O {gang} nem chegou a ver a cidade.',
  },
  events: {
    money: '🎒 Um olheiro achou uma mochila esquecida num dos pontos. +{grana}',
    recruits: '🏍️ Dois moleques de moto pediram pra entrar pro bonde. +2 soldados',
    news: '📰 A rádio comunitária falou da guerra no morro. Visada +8',
    party: '🎉 A festa no inferninho bombou. Todo mundo comentando. +5 respeito',
    partyType: 'inferninho',
    caught: '🚔 Um dos seus foi pego numa blitz na entrada do morro. -1 soldado',
    rivalSplit: '🗞️ Racha interno: {rival} perderam 2 soldados numa briga entre eles.',
  },
  objectives: [
    { id: 'lote', text: 'Compre um lote vazio 🚧 vizinho a um ponto seu', check: (s) => s.stats.lots >= 1, reward: { money: 200 },
      say: 'Terreno é poder. Agora escolhe o que levantar ali: boca dá grana, bar recruta, depósito guarda arma...' },
    { id: 'obra', text: 'Comece uma obra num lote seu', check: (s) => s.stats.builds >= 1, reward: { respect: 2 },
      say: 'Enquanto a obra não termina, o ponto fica frágil. Bota uns guardas lá.' },
    { id: 'arma', text: 'Compre armas no 🔫 Arsenal', check: (s) => Object.values(s.arsenal || {}).some((v) => v > 0), reward: { respect: 2 },
      say: 'Bonde armado briga melhor. Só não esquece: arma dá visada e munição custa todo dia.' },
    { id: 'evento', text: 'Faça um evento num ponto (bailão, racha, churrasco...)', check: (s) => s.stats.events >= 1, reward: { respect: 3 },
      say: 'O morro inteiro tá comentando. É assim que se ganha o bairro: no braço e na festa.' },
    { id: 'bairro', text: 'Domine o bairro: derrube as três gangues', check: (s) => Object.values(s.rivals).every((r) => !r.alive) },
  ],
};
