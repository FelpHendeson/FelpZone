import { sprite } from './sprite';

const CONTORNO = '#1b1b2a';

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
  cura: sprite(['.g.', 'gwg', '.g.'], { g: '#5fcf5a', w: '#e9ffe0' }),
};

/* ---------- Moeda ---------- */

export const ICONES = {
  ouro: sprite(
    ['..kkkk..', '.kyyyYk.', 'kyywyyYk', 'kyywyyYk', 'kyywyyYk', 'kyyyyyYk', '.kYYYYk.', '..kkkk..'],
    { k: '#5a3d0a', y: '#f7cf3d', Y: '#c99a1c', w: '#fff3b0' },
  ),
};
