// Peças de exemplo, geradas por código sobre as mesmas poses do molde: pelo menos uma em cada camada
// de que a criação de personagem (parte 3) vai precisar, o bastante para provar a pilha.
// Cada peça é desenhada em tons-índice (canal + tom) pelo mesmo motor do manequim, então sai com o mesmo
// sombreado, o mesmo contorno colorido e o mesmo contorno seletivo. A variedade completa é da parte 3.

import type { Vec } from '../01-controles/input.ts';
import type { Peca } from './camadas.ts';
import {
  ARM,
  armsByLayer,
  bodyGeometry,
  drawEyes,
  eyePositions,
  footBox,
  renderBody,
  renderParts,
  splitByParte,
  PartBuilder,
  type ArmGeometry,
  type BodyGeometry,
  type ManequimOptions,
} from './manequim.ts';
import { frameRect } from '../04-animacao/animation.ts';
import { MOLDE_FORMAT, MOLDE_SIZE, decodeTone, paletteIndex, type Channel } from './molde.ts';
import { MOLDE_POSES, type Pose } from './poses.ts';
import { IndexedImage } from './raster.ts';

// Tons que cada peça usa (contorno, sombra, base, luz → tom). Economizar tons é o que deixa
// a receita padrão em até 15 cores mais a transparente (regra da direção de arte).
const ALL = [0, 1, 2, 3] as const;
const THREE = [0, 1, 2, 2] as const;
const TWO = [0, 2, 2, 2] as const;

const blank = () => new IndexedImage(32, 32);

function render(b: PartBuilder, options: ManequimOptions): Record<string, IndexedImage> {
  return splitByParte(b, renderParts(b, options));
}

/** O ponto a `n` pixels de `a` no caminho até `b` (a manga, o começo do braço). */
function toward(a: Vec, b: Vec, n: number): Vec {
  const length = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  if (length === 0) return a;
  const k = Math.min(1, n / length);
  return { x: Math.round(a.x + (b.x - a.x) * k), y: Math.round(a.y + (b.y - a.y) * k) };
}

/** Abre buracos onde os braços do corpo passam na frente (a mão sobre a calça, o braço sobre a camiseta). */
function maskFrontArms(b: PartBuilder, geo: BodyGeometry, arms: ArmGeometry[] = armsByLayer(geo).front): void {
  for (const arm of arms) b.map.limb(arm.shoulder.x, arm.shoulder.y, arm.hand.x, arm.hand.y, ARM, b.mask());
}

function maskHead(b: PartBuilder, geo: BodyGeometry): void {
  const id = b.mask();
  b.map.roundRect(geo.head.x, geo.head.y, geo.head.width, geo.head.height, 2, id);
  if (geo.nose) b.map.set(geo.nose.x, geo.nose.y, id);
}

// ---- Corpo base ----

const corpoA: Peca = {
  id: 'corpo-a',
  nome: 'Corpo A',
  slot: 'corpo',
  partes: [
    { id: 'corpo', camada: 'corpo-base' },
    { id: 'roupa-de-baixo', camada: 'corpo-base' },
  ],
  esconde: [],
  canais: ['pele', 'tecido-secundario'],
  desenhar(pose, options) {
    // O manequim sem os olhos (que vão na camada do rosto), separado em pele e roupa de baixo.
    const { builder, rendered } = renderBody(pose, options);
    return splitByParte(builder, rendered);
  },
};

// ---- Rosto ----

const olhos1: Peca = {
  id: 'olhos-1',
  nome: 'Olhos 1',
  slot: 'olhos',
  partes: [{ id: 'olhos', camada: 'rosto' }],
  esconde: [],
  canais: ['olhos'],
  desenhar(pose) {
    const image = blank();
    drawEyes(image, pose, paletteIndex('olhos', 1));
    return { olhos: image };
  },
};

const sobrancelhas1: Peca = {
  id: 'sobrancelhas-1',
  nome: 'Sobrancelhas 1',
  slot: 'sobrancelhas',
  partes: [{ id: 'sobrancelhas', camada: 'rosto' }],
  esconde: [],
  canais: ['cabelo'],
  desenhar(pose) {
    const image = blank();
    // Seguem a cor do cabelo (tom de contorno), logo acima de cada olho, puxadas para fora do rosto.
    if (!pose.lying && pose.eyes !== 'x') {
      const color = paletteIndex('cabelo', 0);
      for (const eye of eyePositions(pose)) {
        const outward = pose.direction === 'down' && eye.x < 16 ? -1 : 0;
        image.set(eye.x + outward, eye.y - 1, color);
        image.set(eye.x + outward + 1, eye.y - 1, color);
      }
    }
    return { sobrancelhas: image };
  },
};

const sardas: Peca = {
  id: 'sardas',
  nome: 'Sardas',
  slot: 'marcas',
  partes: [{ id: 'marcas', camada: 'rosto' }],
  esconde: [],
  canais: ['pele'],
  desenhar(pose) {
    const image = blank();
    if (!pose.lying) {
      const color = paletteIndex('pele', 1);
      for (const eye of eyePositions(pose)) {
        image.set(eye.x - 1, eye.y + 2, color);
        image.set(eye.x + 1, eye.y + 2, color);
      }
    }
    return { marcas: image };
  },
};

// ---- Linhagem: lobo de Mykol (orelhas e cauda) ----

function ear(b: PartBuilder, x: number, top: number, flip: boolean): void {
  const fur = b.part('cabelo', { parte: 'orelhas', tones: THREE });
  const rows = [1, 2, 3, 3];
  rows.forEach((width, j) => b.map.rect(flip ? x + 3 - width : x, top + j, width, 1, fur));
  const inner = b.part('pele', { parte: 'orelhas' });
  b.map.set(x + 1, top + 2, inner);
}

const loboDeMykol: Peca = {
  id: 'lobo-de-mykol',
  nome: 'Lobo de Mykol',
  slot: 'linhagem',
  partes: [
    { id: 'orelhas', camada: 'linhagem' },
    { id: 'cauda', camada: 'atras-do-corpo' },
  ],
  esconde: [],
  canais: ['cabelo', 'pele'],
  desenhar(pose, options) {
    const geo = bodyGeometry(pose);
    const h = geo.head;
    const b = new PartBuilder();
    const by = pose.body.y;
    const bx = pose.body.x;
    if (!geo.lying) {
      if (pose.direction === 'side') ear(b, h.x + 3, h.y - 5, false);
      else {
        ear(b, h.x + 1, h.y - 5, false);
        ear(b, h.x + h.width - 4, h.y - 5, true);
      }
    }
    const tail = b.part('cabelo', { round: true, parte: 'cauda', tones: THREE });
    const limb = (x0: number, y0: number, x1: number, y1: number) => b.map.limb(x0, y0, x1, y1, 2, tail);
    if (geo.lying) limb(21, 27 + by, 24, 29 + by);
    else if (pose.direction === 'down') {
      limb(20 + bx, 22 + by, 23 + bx, 24 + by);
      limb(23 + bx, 24 + by, 25 + bx, 22 + by);
    } else if (pose.direction === 'up') {
      limb(16 + bx, 21 + by, 16 + bx, 25 + by);
      limb(16 + bx, 25 + by, 18 + bx, 26 + by);
    } else {
      limb(13 + bx, 21 + by, 10 + bx, 22 + by);
      limb(10 + bx, 22 + by, 8 + bx, 19 + by);
    }
    return render(b, options);
  },
};

// ---- Cabelo ----

function hair(pose: Pose, options: ManequimOptions, long: boolean): Record<string, IndexedImage> {
  const geo = bodyGeometry(pose);
  const h = geo.head;
  const b = new PartBuilder();
  const tras = long ? b.part('cabelo', { round: true, parte: 'cabelo-tras', tones: THREE }) : -1;
  // O topo é o que um chapéu esconde; a "franja" é tudo o que ainda aparece por baixo dele:
  // franja, costeletas e nuca.
  const topo = b.part('cabelo', { round: true, parte: 'cabelo-topo', tones: THREE });
  const franja = b.part('cabelo', { round: true, parte: 'franja', tones: THREE });
  const jagged = (x: number, y: number, width: number) => {
    for (let i = 1; i < width; i += 3) b.map.set(x + i, y, -1);
  };
  /** Passa para a franja o que o topo desenhou da linha `y` para baixo. */
  const below = (y: number) => {
    for (let j = y; j < b.map.height; j++) for (let i = 0; i < b.map.width; i++) if (b.map.get(i, j) === topo) b.map.set(i, j, franja);
  };

  if (geo.lying) {
    b.map.roundRect(h.x - 1, h.y, 4, h.height, 1, topo);
    if (long) b.map.rect(h.x - 3, h.y + 1, 3, h.height - 2, tras);
  } else if (pose.direction === 'down') {
    if (long) {
      b.map.rect(h.x - 1, h.y + 2, h.width + 2, 9, tras);
      jagged(h.x - 1, h.y + 10, h.width + 2);
    }
    // Topo acima da cabeça, franja na primeira linha da testa (com uma mecha no meio) e costeletas.
    b.map.roundRect(h.x - 1, h.y - 2, h.width + 2, 3, 2, topo);
    b.map.rect(h.x - 1, h.y, h.width + 2, 1, franja);
    b.map.rect(h.x + 5, h.y + 1, 2, 1, franja);
    const side = long ? 6 : 3;
    b.map.rect(h.x - 1, h.y, 2, side, franja);
    b.map.rect(h.x + h.width - 1, h.y, 2, side, franja);
  } else if (pose.direction === 'up') {
    if (long) {
      b.map.roundRect(h.x, h.y + 4, h.width, 7, 1, tras);
      jagged(h.x, h.y + 10, h.width);
    }
    b.map.roundRect(h.x - 1, h.y - 2, h.width + 2, h.height - 1, 2, topo);
    below(h.y);
  } else {
    if (long) b.map.roundRect(h.x - 1, h.y + 3, 4, 8, 1, tras);
    b.map.roundRect(h.x - 1, h.y - 2, h.width + 1, 3, 2, topo);
    b.map.rect(h.x - 1, h.y - 1, 5, long ? 7 : 5, topo);
    below(h.y);
    b.map.rect(h.x + 4, h.y, h.width - 4, 1, franja);
  }
  return render(b, options);
}

const cabeloCurto: Peca = {
  id: 'cabelo-curto',
  nome: 'Cabelo curto',
  slot: 'cabelo',
  partes: [
    { id: 'cabelo-topo', camada: 'cabelo-da-frente' },
    { id: 'franja', camada: 'cabelo-da-frente' },
  ],
  esconde: [],
  canais: ['cabelo'],
  desenhar: (pose, options) => hair(pose, options, false),
};

const cabeloComprido: Peca = {
  id: 'cabelo-comprido',
  nome: 'Cabelo comprido',
  slot: 'cabelo',
  partes: [
    { id: 'cabelo-tras', camada: 'cabelo-de-tras' },
    { id: 'cabelo-topo', camada: 'cabelo-da-frente' },
    { id: 'franja', camada: 'cabelo-da-frente' },
  ],
  esconde: [],
  canais: ['cabelo'],
  desenhar: (pose, options) => hair(pose, options, true),
};

const careca: Peca = {
  id: 'careca',
  nome: 'Careca',
  slot: 'cabelo',
  partes: [],
  esconde: [],
  canais: [],
  desenhar: () => ({}),
};

// ---- Barba ----

const barbaCurta: Peca = {
  id: 'barba-curta',
  nome: 'Barba curta',
  slot: 'barba',
  partes: [{ id: 'barba', camada: 'barba' }],
  esconde: [],
  canais: ['cabelo'],
  desenhar(pose, options) {
    const geo = bodyGeometry(pose);
    const h = geo.head;
    const b = new PartBuilder();
    if (geo.lying || pose.direction === 'up') return {};
    const beard = b.part('cabelo', { round: true, parte: 'barba', tones: THREE });
    if (pose.direction === 'down') {
      b.map.roundRect(h.x, h.y + 5, h.width, 4, 2, beard);
      b.map.rect(h.x, h.y + 3, 1, 2, beard);
      b.map.rect(h.x + h.width - 1, h.y + 3, 1, 2, beard);
      b.map.rect(h.x + 2, h.y + 5, h.width - 4, 2, b.mask());
    } else {
      b.map.roundRect(h.x + 2, h.y + 5, h.width - 2, 4, 2, beard);
      b.map.rect(h.x + 5, h.y + 5, h.width - 5, 2, b.mask());
    }
    return render(b, options);
  },
};

// ---- Roupa da Terra: camiseta, calça e tênis gastos ----

const roupaDaTerra: Peca = {
  id: 'roupa-da-terra',
  nome: 'Roupa da Terra',
  slot: 'roupa',
  partes: [
    { id: 'calca', camada: 'roupa' },
    { id: 'sapatos', camada: 'roupa' },
    { id: 'camiseta', camada: 'roupa' },
  ],
  esconde: ['roupa-de-baixo'],
  canais: ['tecido-principal', 'tecido-secundario', 'couro'],
  desenhar(pose, options) {
    const geo = bodyGeometry(pose);
    const b = new PartBuilder();
    const arms = armsByLayer(geo);
    const sleeve = (arm: ArmGeometry) => {
      const id = b.part('tecido-principal', { depth: arm.depth, outlineOver: true, parte: 'camiseta', tones: THREE });
      const end = toward(arm.shoulder, arm.hand, 2);
      b.map.limb(arm.shoulder.x, arm.shoulder.y, end.x, end.y, ARM, id);
    };
    for (const arm of arms.behind) sleeve(arm);
    for (const leg of geo.legs) {
      const pants = b.part('tecido-secundario', { depth: leg.depth, outlineOver: true, parte: 'calca', tones: TWO });
      b.map.limb(leg.hip.x, leg.hip.y, leg.foot.x, leg.foot.y, leg.thickness, pants);
      const shoe = b.part('couro', { depth: leg.depth, outlineOver: true, parte: 'sapatos', tones: TWO });
      const boxes = leg.thickness === 2 ? [{ x: leg.foot.x - 1, y: leg.foot.y - 1, width: 2, height: 2 }] : footBox(leg);
      for (const box of boxes) b.map.rect(box.x, box.y, box.width, box.height, shoe);
    }
    const waist = b.part('tecido-secundario', { parte: 'calca', tones: TWO });
    b.map.rect(geo.shorts.x, geo.shorts.y, geo.shorts.width, geo.shorts.height, waist);
    if (geo.crotch) b.map.rect(geo.crotch.x, geo.crotch.y, geo.crotch.width, geo.crotch.height, -1);
    const shirt = b.part('tecido-principal', { round: true, parte: 'camiseta', tones: THREE });
    b.map.roundRect(geo.torso.x, geo.torso.y, geo.torso.width, geo.torso.height, 1, shirt);
    maskHead(b, geo);
    maskFrontArms(b, geo);
    for (const arm of arms.front) sleeve(arm);
    return render(b, options);
  },
};

// ---- Cabeça (equipamento): um chapéu que esconde só o topo do cabelo e um capuz que esconde todo o cabelo ----

const chapeuDePalha: Peca = {
  id: 'chapeu-de-palha',
  nome: 'Chapéu de palha',
  slot: 'equipamento.cabeca',
  partes: [{ id: 'chapeu', camada: 'cabeca' }],
  esconde: ['cabelo-topo'],
  canais: ['couro'],
  desenhar(pose, options) {
    const geo = bodyGeometry(pose);
    const h = geo.head;
    const b = new PartBuilder();
    const brim = b.part('couro', { parte: 'chapeu', tones: TWO });
    const crown = b.part('couro', { round: true, outlineOver: true, parte: 'chapeu', tones: TWO });
    if (geo.lying) {
      b.map.rect(h.x - 2, h.y - 1, 2, h.height + 2, brim);
      b.map.rect(h.x - 4, h.y + 2, 2, h.height - 4, crown);
    } else if (pose.direction === 'side') {
      b.map.rect(h.x - 3, h.y - 2, h.width + 5, 1, brim);
      b.map.roundRect(h.x + 1, h.y - 4, h.width - 4, 2, 1, crown);
    } else {
      b.map.rect(h.x - 2, h.y - 2, h.width + 4, 1, brim);
      b.map.roundRect(h.x + 2, h.y - 4, h.width - 4, 2, 1, crown);
    }
    maskFrontArms(b, geo);
    return render(b, options);
  },
};

const capuz: Peca = {
  id: 'capuz',
  nome: 'Capuz de viagem',
  slot: 'equipamento.cabeca',
  partes: [{ id: 'capuz', camada: 'cabeca' }],
  esconde: ['cabelo-topo', 'franja', 'cabelo-tras', 'orelhas'],
  canais: ['tecido-secundario'],
  desenhar(pose, options) {
    const geo = bodyGeometry(pose);
    const h = geo.head;
    const b = new PartBuilder();
    const hood = b.part('tecido-secundario', { round: true, parte: 'capuz', tones: THREE });
    if (geo.lying) {
      b.map.roundRect(h.x - 2, h.y - 2, h.width + 1, h.height + 4, 3, hood);
      b.map.roundRect(h.x + 2, h.y, h.width - 2, h.height, 2, b.mask());
    } else if (pose.direction === 'up') {
      b.map.roundRect(h.x - 2, h.y - 3, h.width + 4, h.height + 3, 3, hood);
      b.map.rect(h.x + h.width / 2 - 1, h.y + h.height, 2, 2, hood);
    } else if (pose.direction === 'down') {
      b.map.roundRect(h.x - 2, h.y - 3, h.width + 4, h.height + 3, 3, hood);
      b.map.roundRect(h.x + 1, h.y + 2, h.width - 2, h.height - 2, 2, b.mask());
    } else {
      b.map.roundRect(h.x - 2, h.y - 3, h.width + 3, h.height + 3, 3, hood);
      b.map.roundRect(h.x + 4, h.y + 2, h.width - 3, h.height - 2, 2, b.mask());
    }
    maskFrontArms(b, geo);
    return render(b, options);
  },
};

/** O catálogo de peças desta parte. A parte 3 acrescenta formas e estilos; o Lab 06, os equipamentos. */
export const PECAS: Peca[] = [
  corpoA,
  olhos1,
  sobrancelhas1,
  sardas,
  loboDeMykol,
  cabeloCurto,
  cabeloComprido,
  careca,
  barbaCurta,
  roupaDaTerra,
  chapeuDePalha,
  capuz,
];

export const PECA_BY_ID: Record<string, Peca> = Object.fromEntries(PECAS.map((peca) => [peca.id, peca]));

/** Os canais que uma peça realmente pinta numa pose (para conferir `canais`). */
export function canaisDesenhados(images: Record<string, IndexedImage>): Set<Channel> {
  const used = new Set<Channel>();
  for (const image of Object.values(images)) {
    for (const code of image.colorsUsed()) {
      const tone = decodeTone(code);
      if (tone) used.add(tone.channel);
    }
  }
  return used;
}

const sheetCache = new Map<string, Record<string, IndexedImage>>();

/** As folhas (uma por parte) de uma peça, no formato do molde. Geradas uma vez por peça e ajuste de contorno. */
export function folhasDaPeca(peca: Peca, options: ManequimOptions): Record<string, IndexedImage> {
  const key = `${peca.id}|${options.selectiveOutline}|${options.innerLines}`;
  const cached = sheetCache.get(key);
  if (cached) return cached;
  const sheets: Record<string, IndexedImage> = {};
  for (const parte of peca.partes) sheets[parte.id] = new IndexedImage(MOLDE_SIZE.width, MOLDE_SIZE.height);
  for (const [name, clip] of Object.entries(MOLDE_FORMAT.clips)) {
    MOLDE_POSES[name].forEach((pose, index) => {
      const { x, y } = frameRect(MOLDE_FORMAT, clip, index);
      const images = peca.desenhar(pose, options);
      for (const parte of peca.partes) if (images[parte.id]) sheets[parte.id].blit(images[parte.id], x, y);
    });
  }
  sheetCache.set(key, sheets);
  return sheets;
}
