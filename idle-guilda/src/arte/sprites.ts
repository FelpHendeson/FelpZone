import type { ArmaId, Classe, Material } from '../motor/tipos';
import { sprite, type Sprite } from './sprite';

const CONTORNO = '#1b1b2a';
const PELE = { s: '#f2c29b', S: '#c98d6b', e: CONTORNO };

/* ---------- Heróis (16×16, virados para a direita) ---------- */

const CORPO = [
  '....kaaaaaak....',
  '...kaAaaaaask...',
  '...kaAaaaaak....',
  '....kccccck.....',
  '....kpppppk.....',
  '....kppkppk.....',
  '....kbbkbbk.....',
  '....kkk.kkk.....',
];

const HEROIS: Record<Classe, Sprite> = {
  guerreiro: sprite(
    [
      '.......cc.......',
      '.....kkkkkk.....',
      '....khhhhhhk....',
      '...khhhhhhhhk...',
      '...kHhhhhhhhk...',
      '...kHhsssesk....',
      '...kHhssssSk....',
      '....kkkssSk.....',
      ...CORPO,
    ],
    {
      k: CONTORNO, ...PELE,
      h: '#a9b4c4', H: '#66728a', a: '#5b7fbf', A: '#3d5a8f', c: '#c23b3b', p: '#4a4a5a', b: '#6b4a2f',
    },
  ),
  cacadora: sprite(
    [
      '................',
      '.....kkkkk......',
      '....khhhhhk.....',
      '...khhhhhhhk....',
      '..khHhhhhhhhk...',
      '..kHHhsssesk....',
      '...kHhssssSk....',
      '....kkkssSk.....',
      ...CORPO,
    ],
    {
      k: CONTORNO, ...PELE,
      h: '#4f9a4a', H: '#2f6b34', a: '#8a6a42', A: '#5e452b', c: '#d9b44a', p: '#3f5a3a', b: '#4a3322',
    },
  ),
  mistica: sprite(
    [
      '........kk......',
      '.......khhk.....',
      '......khhhk.....',
      '.....khhhhhk....',
      '..kkkhhcchhhkk..',
      '....kHsssesk....',
      '....kHssssSk....',
      '....kkkssSk.....',
      '....kaaaaaak....',
      '...kaAaaaaask...',
      '...kaAaaaaak....',
      '....kaacaak.....',
      '...kaaAaaaak....',
      '...kaaAaaaak....',
      '...kAAAAAAAk....',
      '....kkkkkkk.....',
    ],
    {
      k: CONTORNO, ...PELE,
      h: '#7a4fbf', H: '#e8e0d0', a: '#6a45b0', A: '#47307f', c: '#e8c547', p: '#47307f', b: '#3a2a4a',
    },
  ),
};

export function spriteHeroi(classe: Classe): Sprite {
  return HEROIS[classe];
}

/** Coluna e linha da mão do herói, onde a arma é presa. */
export const MAO = { x: 12, y: 9 };

/* ---------- Armas (presas pela empunhadura `pega`) ---------- */

export interface SpriteArma {
  sprite: Sprite;
  pega: { x: number; y: number };
}

const METAL = { w: '#e6ecf2', W: '#8f9bb0', c: '#c9a227', b: '#6b4a2f', k: CONTORNO };

const ARMAS_SPRITES: Record<ArmaId | 'picareta', SpriteArma> = {
  bastao: {
    sprite: sprite(['....b', '...b.', '..b..', '.b...', 'b....'], { b: '#8a6a42' }),
    pega: { x: 1, y: 3 },
  },
  espada: {
    sprite: sprite(
      ['......w', '.....wW', '....wW.', '...wW..', 'c.wW...', '.cc....', 'b.c....'],
      METAL,
    ),
    pega: { x: 0, y: 6 },
  },
  arco: {
    sprite: sprite(
      ['b...', 'wb..', 'wb..', 'w.b.', 'w.b.', 'w.c.', 'w.b.', 'wb..', 'wb..', 'b...'],
      { b: '#8a5a2b', c: '#d9b44a', w: '#e6ecf2' },
    ),
    pega: { x: 2, y: 5 },
  },
  cajado: {
    sprite: sprite(
      ['.k.', 'kCk', 'cCc', '.k.', '.b.', '.b.', '.b.', '.b.', '.b.', '.b.', '.b.', '.b.'],
      { k: CONTORNO, C: '#7fe3ff', c: '#3aa7d9', b: '#6b4a2f' },
    ),
    pega: { x: 1, y: 7 },
  },
  lamina: {
    sprite: sprite(
      [
        '........wP',
        '.......wPk',
        '......wPk.',
        '.....wPk..',
        '....wPk...',
        '...wPk....',
        'c.wPk.....',
        '.cck......',
        'b.c.......',
      ],
      { w: '#f4e9ff', P: '#a678f0', k: '#5a3a9a', c: '#c9a227', b: '#3a2a4a' },
    ),
    pega: { x: 0, y: 8 },
  },
  picareta: {
    sprite: sprite(
      ['..WWWW.', '.W..b.W', 'W...b..', '....b..', '....b..', '....b..'],
      { W: '#8f9bb0', b: '#8a6a42' },
    ),
    pega: { x: 4, y: 5 },
  },
};

export function spriteArma(arma: ArmaId | 'picareta'): SpriteArma {
  return ARMAS_SPRITES[arma];
}

/** Ícone da arma para menus: o próprio sprite. */
export function iconeArma(arma: ArmaId): Sprite {
  return ARMAS_SPRITES[arma].sprite;
}

/* ---------- Monstros (16×16, virados para a esquerda) ---------- */

export const MONSTROS = {
  gosma: sprite(
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.......kkk......',
      '.....kkgggkk....',
      '....kggggggGk...',
      '...kgwwgggggGk..',
      '...kgwkgkggggk..',
      '..kggggggggggGk.',
      '..kgggggggggGGk.',
      '..kGgggggggGGGk.',
      '...kkkkkkkkkkk..',
      '................',
    ],
    { k: '#173d1f', g: '#5fcf5a', G: '#3a9a46', w: '#e9ffe0' },
  ),
  lobo: sprite(
    [
      '................',
      '................',
      '................',
      '..k.k...........',
      '.kgkgk..........',
      '.kgggk..........',
      'kgrggGkkkkkkkk..',
      'kkgggggggggggGk.',
      '.kwggggggggggGGk',
      '..kkgggggggggGkk',
      '...kGgGkkkGgGk..',
      '...kgk.k...kgk..',
      '...kgk.....kgk..',
      '...kkk.....kkk..',
      '................',
      '................',
    ],
    { k: CONTORNO, g: '#8e95a3', G: '#5f6676', r: '#f0d24a', w: '#e6e6e6' },
  ),
  esqueleto: sprite(
    [
      '................',
      '.....kkkkk......',
      '....kwwwwwk.....',
      '...kwwwwwwwk....',
      '...kkrwkrwWk....',
      '...kwwwwwwWk....',
      '....kwkwkwk.....',
      '.....kkkkk......',
      '.......kwk......',
      '....kkwwwwwkk...',
      '...kw.kwWk.wk...',
      '...k..kwwk..k...',
      '.......kWk......',
      '......kw.wk.....',
      '......kw.wk.....',
      '.....kkk.kkk....',
    ],
    { k: CONTORNO, w: '#ece6d6', W: '#b3ab98', r: '#ff4a4a' },
  ),
};

/* ---------- Cenário ---------- */

export const CENARIO = {
  arvore: sprite(
    [
      '....kkkk....',
      '..kkggggkk..',
      '.kggggGgggk.',
      'kggGgggggGgk',
      'kgggggGggggk',
      'kGgggggggGGk',
      '.kGGgggGGGk.',
      '..kkGGGGkk..',
      '....kttk....',
      '....kttk....',
      '....ktTk....',
      '...kkttkk...',
    ],
    { k: '#14301c', g: '#3f8f45', G: '#2b6a35', t: '#6b4a2f', T: '#4a3322' },
  ),
  pinheiro: sprite(
    [
      '.....kk.....',
      '....kggk....',
      '...kgggGk...',
      '...kggGGk...',
      '..kggggGGk..',
      '..kgggGGGk..',
      '.kggggGGGGk.',
      '.kkkkkkkkkk.',
      '.....tt.....',
      '.....tt.....',
    ],
    { k: '#0d1f17', g: '#2a5a43', G: '#1c4232', t: '#3a2a1e' },
  ),
  tufo: sprite(['.g..g', 'gg.gg', '.ggg.'], { g: '#6fbf4a' }),
  flor: sprite(['.r.', 'rwr', '.g.'], { r: '#f07a9a', w: '#fff4b0', g: '#4f9a4a' }),
  pilar: sprite(
    [
      'kkkkkkk',
      'kpPpppk',
      '.kpppk.',
      '.kpPpk.',
      '.kppPk.',
      '.kpppk.',
      '.kpPpk.',
      '.kpppk.',
      '.kpppk.',
      '.kppPk.',
      'kkpppkk',
      'kpppppk',
    ],
    { k: '#2a2633', p: '#9a93a8', P: '#6e6880' },
  ),
  pilarQuebrado: sprite(
    ['..kk...', '.kpPk..', '.kppk..', '.kpPpk.', 'kkpppkk', 'kpppppk'],
    { k: '#2a2633', p: '#9a93a8', P: '#6e6880' },
  ),
  rochaMinerio: sprite(
    [
      '....kkkk....',
      '..kkrrrrkk..',
      '.krrbrrrrRk.',
      '.krrrrrbrRk.',
      'krbrrrrrrRRk',
      'krrrrbrrrRRk',
      'kRrrrrrrRRRk',
      '.kkkkkkkkkk.',
    ],
    { k: '#22222c', r: '#7a7a88', R: '#55555f', b: '#6fd0ff' },
  ),
  fogueira: sprite(
    [
      '...y....',
      '..yoy...',
      '..ooy.y.',
      '.oorooy.',
      '.orrroo.',
      'bwbbbwb.',
      '.bbwbb..',
    ],
    { y: '#ffe36a', o: '#ff9a2e', r: '#e04a2a', b: '#6b4a2f', w: '#4a3322' },
  ),
  zz: sprite(['kkk', '..k', '.k.', 'kkk'], { k: '#e6ecf2' }),
  faisca: sprite(['.w.', 'wyw', '.w.'], { w: '#ffffff', y: '#ffe36a' }),
};

/* ---------- Ícones (8×8) ---------- */

export const ICONES: Record<Material | 'ouro', Sprite> = {
  ouro: sprite(
    ['..kkkk..', '.kyyyYk.', 'kyywyyYk', 'kyywyyYk', 'kyywyyYk', 'kyyyyyYk', '.kYYYYk.', '..kkkk..'],
    { k: '#5a3d0a', y: '#f7cf3d', Y: '#c99a1c', w: '#fff3b0' },
  ),
  gosma: sprite(
    ['...kk...', '..kgGk..', '..kggk..', '.kgwggk.', '.kwgggk.', 'kggggGGk', 'kGgggGGk', '.kkkkkk.'],
    { k: '#173d1f', g: '#5fcf5a', G: '#3a9a46', w: '#e9ffe0' },
  ),
  couro: sprite(
    ['.k....k.', 'kckkkkck', 'kccccCck', '.kcccCk.', '.kccCck.', 'kcccccCk', 'kCkkkkCk', '.k....k.'],
    { k: '#3a2416', c: '#b07a48', C: '#7f5330' },
  ),
  minerio: sprite(
    ['...kkk..', '..krrRk.', '.krbrrRk', 'krrrrbRk', 'krbrrrRk', 'kRrrrRRk', '.kRRRRk.', '..kkkk..'],
    { k: '#22222c', r: '#9a9aa8', R: '#66666f', b: '#6fd0ff' },
  ),
  fragmento: sprite(
    ['...kk...', '..kwPk..', '..kwPk..', '.kwpPPk.', '.kwpPPk.', '.kppPPk.', '..kpPk..', '...kk...'],
    { k: '#2f1d55', w: '#f0e4ff', p: '#b48cff', P: '#7a4fd8' },
  ),
};
