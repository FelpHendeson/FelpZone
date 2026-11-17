// Mapa de Porto Neon (Modo Cidade).
// [nome, tipo, x, y, dono, guardas]   dono: 'P' você, A/B/C rivais, null neutro, 'X' polícia
export const MAP = [
  ['QG do Farol',          'hq',         150, 120, 'P', 4],  // 0
  ['Boca da Escadaria',    'boca',       290,  90, null, 2], // 1
  ['Bar do Tonhão',        'bar',        110, 270, null, 2], // 2
  ['Inferninho Lua Rubra', 'inferninho', 330, 235, null, 3], // 3
  ['Fliperama Neon',       'fliperama',  480, 130, null, 2], // 4
  ['Boca da Praça',        'boca',       520, 300, null, 3], // 5
  ['Mercadão',             'mercado',    660, 210, null, 4], // 6
  ['QG dos Corvos',        'hq',         850, 100, 'A', 6],  // 7
  ['Desmanche da Linha',   'desmanche',  700,  80, 'A', 3],  // 8
  ['Boca do Viaduto',      'boca',       890, 260, 'A', 3],  // 9
  ['Inferninho Paraíso',   'inferninho', 420, 420, null, 3], // 10
  ['13ª Delegacia',        'policia',    570, 470, 'X', 0],  // 11
  ['QG das Serpentes',     'hq',         140, 560, 'B', 6],  // 12
  ['Boca do Campinho',     'boca',       270, 460, 'B', 3],  // 13
  ['Bar da Esquina',       'bar',        300, 610, 'B', 3],  // 14
  ['Cais 7',               'porto',      730, 470, null, 5], // 15
  ['QG dos Dragões',       'hq',         890, 590, 'C', 6],  // 16
  ['Boate Maré Alta',      'inferninho', 660, 610, 'C', 3],  // 17
  ['Boca do Cais',         'boca',       880, 420, 'C', 3],  // 18
  ['Ferro Velho',          'desmanche',  480, 590, null, 3], // 19
];

export const EDGES = [
  [0,1],[0,2],[1,3],[1,4],[2,3],[2,13],[3,5],[3,10],[4,5],[4,6],[5,6],[5,10],
  [6,8],[6,9],[8,7],[7,9],[9,18],[6,15],[5,15],[10,13],[10,19],[12,13],[12,14],
  [13,14],[14,19],[19,17],[19,15],[15,17],[15,18],[17,16],[18,16],
];

export const DISTRICTS = [
  ['MORRO DO FAROL', 210, 175, 190, '#ef444410'],
  ['ZONA INDUSTRIAL', 810, 170, 180, '#a855f712'],
  ['CENTRO', 540, 250, 160, '#facc1508'],
  ['VILA ESPERANÇA', 230, 545, 180, '#22c55e10'],
  ['CAIS', 790, 530, 180, '#f9731610'],
];

export const POLICE_NODE = 11;

// Vizinhança derivada das ruas.
export const ADJ = MAP.map(() => []);
EDGES.forEach(([a, b]) => { ADJ[a].push(b); ADJ[b].push(a); });
