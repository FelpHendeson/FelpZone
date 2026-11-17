// Dados do bonde: atributos, origens, traços e nomes (inspiração Brasil + anime).

export const ATTRS = {
  forca:  { label: 'Força',       icon: '👊', desc: '+4% de ataque por ponto.' },
  tatica: { label: 'Tática',      icon: '🧠', desc: '+3% de ataque e +3% de defesa por ponto.' },
  labia:  { label: 'Lábia',       icon: '🗣️', desc: 'Recruta mais por dia, compra pontos mais barato e promove capitães mais barato.' },
  frio:   { label: 'Sangue-frio', icon: '🧊', desc: '−4% de visada por ponto e menos chance de traição no bonde.' },
};
export const ATTR_KEYS = Object.keys(ATTRS);
export const ATTR_BASE = 1;        // todo atributo começa em 1
export const ATTR_POINTS = 6;      // pontos para distribuir na criação
export const ATTR_MAX_START = 5;

export const ORIGINS = {
  morro:    { label: 'Filho do morro',      icon: '🏚️', bonus: { forca: 1 }, perk: '+1 recrutamento por dia.',
              line: 'Cresci olhando essa cidade lá de cima. Agora ela vai olhar pra mim.' },
  playboy:  { label: 'Playboy desgarrado',  icon: '💳', bonus: { labia: 1 }, perk: 'Começa com +$600.',
              line: 'Larguei o condomínio. Grana eu sei fazer, respeito eu vou tomar.' },
  oficina:  { label: 'Moleque de oficina',  icon: '🔧', bonus: { tatica: 1 }, perk: 'Desmanches rendem +20%.',
              line: 'Motor, ferro e graxa. Eu sei montar qualquer coisa, até um império.' },
  lutador:  { label: 'Lutador de academia', icon: '🥊', bonus: { forca: 2 }, perk: 'Nenhum além da força bruta.',
              line: 'Na academia eu aprendi: quem bate primeiro escreve a história.' },
};

// Traços dos membros com nome. Os efeitos são aplicados em src/core/crew.js.
export const TRAITS = {
  brigao:      { label: 'Brigão',      icon: '💢', desc: 'Ponto que comanda tem +35% de defesa (em vez de +20%).' },
  esperto:     { label: 'Esperto',     icon: '🦊', desc: 'Ponto que comanda rende +15%.' },
  carismatico: { label: 'Carismático', icon: '✨', desc: '+1 de respeito por dia enquanto comanda um ponto.' },
  leal:        { label: 'Leal',        icon: '🤝', desc: 'Perde lealdade pela metade e ganha +1 por dia.' },
  ganancioso:  { label: 'Ganancioso',  icon: '💰', desc: 'Ponto rende +25%, mas perde 2 de lealdade por dia e fica com ciúme de promoções.' },
  esquentado:  { label: 'Esquentado',  icon: '🔥', desc: 'Ponto tem +20% de defesa extra, mas gera +1 de visada e fica com ciúme de promoções.' },
  frio:        { label: 'Frio',        icon: '🧊', desc: 'Ponto que comanda gera −2 de visada.' },
  covarde:     { label: 'Covarde',     icon: '🐔', desc: 'Defesa −10%, mas foge em vez de morrer quando o ponto cai.' },
};
export const TRAIT_KEYS = Object.keys(TRAITS);

export const FIRST_NAMES = [
  'Kauã', 'Davi', 'Ryan', 'Thiago', 'Bruno', 'Caio', 'Rafael', 'Vitor', 'Igor', 'Luan', 'Wesley', 'Matheus',
  'Diego', 'Renan', 'Gabriel', 'Enzo', 'Yuri', 'Jonas', 'Márcio', 'Kevin', 'Ana', 'Bia', 'Larissa', 'Jéssica',
  'Camila', 'Duda', 'Tainá', 'Raíssa', 'Kelly', 'Yasmin', 'Nayara', 'Lívia',
];
// Vulgos de rua e apelidos com cara de anime.
export const NICKNAMES = [
  'Sombra', 'Faísca', 'Trovão', 'Muralha', 'Fumaça', 'Piloto', 'Corisco', 'Ligeiro', 'Zica', 'Brabo',
  'Fantasma', 'Navalhinha', 'Gato', 'Cria', 'Mudo', 'Tigrão', 'Magrelo', 'Sorriso', 'Kamikaze', 'Relâmpago',
  'Mão de Ferro', 'Olho de Tigre', 'Lâmina', 'Dragãozinho', 'Corvo Branco', 'Lua', 'Tempestade', 'Raio',
];
