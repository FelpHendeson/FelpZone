// Era 1: Escola. O bonde ainda é de colégio: briga no braço, respeito, bicos e motos.
// Personagens menores de idade: sem drogas, armas, inferninhos, sequestro ou assassinato (ver docs/gdd.md).

const TYPES = {
  hq:         { label: 'Base',              icon: '🏫', income: 40, heat: 0, resp: 0, def: 2.0, recruit: 12,
                desc: 'O canto do bonde no colégio. Se cair, o bonde se desfaz.' },
  quadra:     { label: 'Quadra',            icon: '🏀', income: 10,  heat: 1, resp: 2, def: 1.0, recruit: 8,
                desc: 'Onde se decide quem manda. Bom pra recrutar e ganhar respeito.' },
  banheiro:   { label: 'Banheiro dos fundos', icon: '🚽', income: 15, heat: 2, resp: 2, def: 1.2,
                desc: 'Território de briga. Quem manda aqui é respeitado.' },
  cantina:    { label: 'Cantina',           icon: '🥪', income: 40, heat: 1, resp: 0, def: 1.0,
                desc: 'Bico vendendo lanche e figurinha. Grana pouca, mas certa.' },
  patio:      { label: 'Pátio',             icon: '🌳', income: 10,  heat: 1, resp: 1, def: 1.0,
                desc: 'Todo mundo passa por aqui. Quem domina o pátio é visto.' },
  fliperama:  { label: 'Fliperama',         icon: '🕹️', income: 25, heat: 0, resp: 1, def: 1.0, recruit: 10,
                desc: 'Ponto de encontro depois da aula. Dá pra recrutar.' },
  oficina:    { label: 'Oficina de motos',  icon: '🏍️', income: 30, heat: 1, resp: 0, def: 1.1, recruit: 12,
                desc: 'Dominando a oficina dá pra comprar motos: atacar mais longe e com mais força.' },
  lanchonete: { label: 'Lanchonete',        icon: '🍔', income: 45, heat: 1, resp: 0, def: 1.0,
                desc: 'Entregas de bike e de moto. Os melhores bicos da região.' },
  musica:     { label: 'Sala de música',    icon: '🎸', income: 10,  heat: 0, resp: 2, def: 0.9,
                desc: 'A banda do colégio. Fama e respeito.' },
  ponto:      { label: 'Ponto de ônibus',   icon: '🚏', income: 15, heat: 1, resp: 0, def: 1.0, recruit: 10,
                desc: 'Aluno de todo colégio passa aqui. Dá pra recrutar.' },
  pista:      { label: 'Pista de skate',    icon: '🛹', income: 15, heat: 1, resp: 1, def: 1.0, recruit: 10,
                desc: 'A galera do skate é brava e leal. Dá pra recrutar.' },
  portao:     { label: 'Portão',            icon: '🚪', income: 15, heat: 1, resp: 1, def: 1.3,
                desc: 'A entrada de um colégio. Difícil de passar.' },
  policia:    { label: 'Diretoria',         icon: '🧑‍🏫', income: 0, heat: 0, resp: 0, def: 0,
                desc: 'Zona neutra. O inspetor fica de olho em quem faz barulho aqui perto.' },
};

// Os rivais de colégio são as futuras gangues da cidade (mesmas chaves A, B, C).
const RIVALS = {
  A: { name: 'Corvos do Técnico', leader: 'Navalha', color: '#a855f7', aggr: 0.45,
       quotes: ['O Técnico não perde pra colégio estadual.', 'Corvo não esquece cara.', 'Vem pro portão depois da aula, se tiver coragem.'] },
  B: { name: 'Serpentes da Vila', leader: 'Vivi Víbora', color: '#22c55e', aggr: 0.35,
       quotes: ['Na Vila quem manda sou eu, novato.', 'Cobra pequena também morde.', 'Paciência. Uma hora você vacila.'] },
  C: { name: 'Dragões do Cais', leader: 'Ryu', color: '#f97316', aggr: 0.3,
       quotes: ['Lá no Cais a gente resolve no braço.', 'Respeito não se pede, se toma.', 'Um dragão nunca foge da briga.'] },
};

// [nome, tipo, x, y, dono, guardas]
const MAP = [
  ['Terraço do Estadual', 'hq',         170, 150, 'P', 3], // 0
  ['Quadra do Estadual',  'quadra',     330, 110, null, 2], // 1
  ['Banheiro dos Fundos', 'banheiro',   110, 300, null, 2], // 2
  ['Cantina',             'cantina',    320, 260, null, 2], // 3
  ['Pátio',               'patio',      480, 200, null, 2], // 4
  ['Fliperama Turbo',     'fliperama',  610,  90, null, 3], // 5
  ['Oficina do Tonho',    'oficina',    530, 360, null, 3], // 6
  ['Diretoria',           'policia',    390, 450, 'X', 0], // 7
  ['QG do Técnico',       'hq',         870, 110, 'A', 5], // 8
  ['Pátio do Técnico',    'patio',      740, 190, 'A', 2], // 9
  ['Lanchonete Neon',     'lanchonete', 720, 340, null, 3], // 10
  ['Ponto de Ônibus',     'ponto',      610, 510, null, 2], // 11
  ['QG da Vila',          'hq',         130, 570, 'B', 5], // 12
  ['Quadra da Vila',      'quadra',     280, 490, 'B', 2], // 13
  ['Sala de Música',      'musica',     240, 380, null, 2], // 14
  ['QG do Cais',          'hq',         880, 570, 'C', 5], // 15
  ['Pista do Píer',       'pista',      760, 620, 'C', 2], // 16
  ['Portão do Cais',      'portao',     870, 420, 'C', 2], // 17
  ['Campinho',            'quadra',     450, 590, null, 2], // 18
];
const EDGES = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 3], [2, 14], [3, 14], [3, 4], [4, 5], [4, 6], [5, 9], [5, 8], [9, 8], [9, 10],
  [6, 10], [6, 14], [6, 11], [10, 17], [17, 15], [15, 16], [16, 11], [11, 18], [18, 13], [13, 12], [12, 14], [13, 14],
  [18, 6], [10, 11],
];
const DISTRICTS = [
  ['ESTADUAL', 250, 220, 210, '#ef444410'],
  ['TÉCNICO', 810, 150, 170, '#a855f712'],
  ['VILA', 190, 530, 160, '#22c55e10'],
  ['CAIS', 820, 540, 170, '#f9731610'],
];

export const ESCOLA = {
  id: 'escola',
  label: 'Escola',
  types: TYPES, rivals: RIVALS,
  map: { MAP, EDGES, DISTRICTS, POLICE_NODE: 7 },
  decor: 'nenhum',
  introScene: 'introEscola',
  cfg: {
    upkeep: 2, captainSalary: 0, actions: 3, truceDays: 4,
    policeRadius: 180, heatPerPoint: 3.2, heatDrift: 0.35, bribeDays: 3,
    price: 0.12, startMoney: 80, startFree: 6, startRespect: 5, rivalStartMoney: 60, rivalStartReserve: 4,
    raid: 'advertencia',            // barulho alto: advertências; 3 = suspensão (2 dias sem ações)
    rivalCapBase: 8, rivalCapPerNode: 4, guardBase: 4, guardEvery: 7,   // colégios rivais menores que as gangues da cidade
    motoCost: 120,
  },
  words: {
    heat: 'Barulho', heatIcon: '📢', police: 'diretoria', bribe: 'Agradar o inspetor', bribeIcon: '🍎', soldiers: 'alunos',
    bribeTip: 'Tira 20 de barulho e o inspetor olha pro outro lado por {dias} dias',
  },
  text: {
    start: [
      ['{leader} junta os primeiros moleques do {gang} no terraço do Estadual. O colégio ainda não sabe quem você é.', 'big'],
      ['Os outros colégios ainda estão te medindo. Você tem {trégua} dias antes de virem tirar satisfação.', 'warn'],
    ],
    eliminatedByPlayer: '💥 {rival} SE DESFIZERAM! {lider} perdeu o respeito do colégio. Os pontos deles ficaram sem dono.',
    eliminatedByOther: '💥 {rival} foram derrubados por {por}! Os pontos deles ficaram sem dono.',
    bribe: '🍎 Você agradou o inspetor ({custo}). Ele vai olhar pro outro lado por {dias} dias.',
    bribeEnd: '🧑‍🏫 O inspetor voltou a rondar os corredores.',
    winTitle: '🏆 REI DOS COLÉGIOS',
    win: 'No dia {dia}, o {gang} unificou os colégios da região. Todo mundo sabe quem é {leader}.',
    loseTitle: '🎒 O BONDE SE DESFEZ',
    lose: 'O terraço do Estadual caiu no dia {dia}. O {gang} virou piada no recreio.',
  },
  events: {
    money: '🪙 Alguém achou grana esquecida num armário. +{grana}',
    recruits: '🛹 Dois moleques do skate pediram pra entrar pro bonde. +2 alunos',
    news: '📣 Um professor reclamou da bagunça na reunião. Barulho +8',
    party: '🎉 O racha de futebol na quadra bombou. Todo mundo comentando. +5 respeito',
    partyType: 'quadra',
    caught: '🎒 Um dos seus foi pego matando aula e ficou de castigo. -1 aluno',
    rivalSplit: '🗞️ Briga interna: {rival} perderam 2 alunos.',
  },
  // Tutorial guiado: um objetivo por vez, com recompensa e fala do vice. Dá pra pular.
  objectives: [
    { id: 'recrutar', text: 'Recrute 2 alunos (toque no Terraço)', check: (s) => s.stats.recruited >= 2,
      progress: (s) => `${Math.min(2, s.stats.recruited)}/2`, reward: { respect: 2 },
      say: 'Boa! Gente nova no bonde. Agora vamos mostrar quem manda no Estadual.' },
    { id: 'banheiro', text: 'Tome o Banheiro dos Fundos', check: (s) => s.nodes[2].owner === 'P', reward: { money: 20 },
      say: 'O banheiro é nosso! Quem manda no banheiro dos fundos manda no recreio.' },
    { id: 'dia', text: 'Encerre o dia', check: (s) => s.day >= 2, reward: { respect: 2 },
      say: 'Cada dia é uma rodada: os outros colégios jogam, os bicos pagam e o lanche do bonde sai do caixa.' },
    { id: 'capitao', text: 'Designe um capitão num ponto', check: (s) => s.members.some((m) => m.node !== null && m.status === 'ok'), reward: { respect: 2 },
      say: 'Com alguém de confiança cuidando do ponto, fica bem mais difícil de tomarem.' },
    { id: 'moto', text: 'Domine a Oficina do Tonho e compre uma moto', check: (s) => s.motos >= 1, reward: { respect: 4 },
      say: 'Agora a gente chega em qualquer canto! Com moto dá pra atacar ponto a duas ruas de distância.' },
    { id: 'lider', text: 'Derrube um colégio rival numa briga de bonde', check: (s) => Object.values(s.rivals).some((r) => !r.alive), reward: { respect: 5 },
      say: 'Um colégio já caiu. Os outros vão vir com tudo, mas a gente tá pronto.' },
    { id: 'unificar', text: 'Unifique os colégios', check: (s) => Object.values(s.rivals).every((r) => !r.alive) },
  ],
};
