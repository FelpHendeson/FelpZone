// O catálogo de peças, geradas por código sobre as mesmas poses do molde: as opções da criação de
// personagem (seção 6 de PERSONAGEM.md: 2 corpos, 4 formas de olhos, 3 de sobrancelhas, 8 cabelos com a
// careca, 3 barbas, 3 marcas), a roupa da Terra, uma linhagem de exemplo (lobo de Mykol) e dois
// equipamentos de cabeça que provam o esconder.
// Cada peça é desenhada em tons-índice (canal + tom) pelo mesmo motor do manequim, então sai com o mesmo
// sombreado, o mesmo contorno colorido e o mesmo contorno seletivo. As peças que vestem o corpo seguem o
// tipo de corpo da receita (`ManequimOptions.silhueta`).

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
  type Box,
  type ManequimOptions,
  type Silhueta,
} from './manequim.ts';
import { frameRect } from '../04-animacao/animation.ts';
import { MOLDE_FORMAT, MOLDE_SIZE, decodeTone, paletteIndex, type Channel } from './molde.ts';
import { MOLDE_POSES, type Pose } from './poses.ts';
import { IndexedImage } from './raster.ts';

// Tons que cada peça usa (contorno, sombra, base, luz → tom). Economizar tons é o que deixa
// a receita em até 15 cores mais a transparente (regra da direção de arte).
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

/** Para que lado fica o canto de fora de um olho: de frente, para fora do rosto; de lado, para a nuca. */
function outwardOf(pose: Pose, eye: Vec): number {
  if (pose.lying || pose.direction === 'up') return 0;
  if (pose.direction === 'side') return -1;
  return eye.x < 16 ? -1 : 1;
}

/** Imagem com os pixels de um desenho direto (sem sombreado), um por chamada de `put`. */
function direct(draw: (put: (x: number, y: number, channel: Channel, tone: number) => void) => void): IndexedImage {
  const image = blank();
  draw((x, y, channel, tone) => image.set(x, y, paletteIndex(channel, tone)));
  return image;
}

// ---- Corpo base: corpo A e corpo B ----

function corpo(id: string, nome: string, silhueta: Silhueta): Peca {
  return {
    id,
    nome,
    slot: 'corpo',
    silhueta,
    partes: [
      { id: 'corpo', camada: 'corpo-base' },
      { id: 'roupa-de-baixo', camada: 'corpo-base' },
    ],
    esconde: [],
    canais: ['pele', 'tecido-secundario'],
    desenhar(pose, options) {
      // O manequim sem os olhos (que vão na camada do rosto), separado em pele e roupa de baixo.
      const { builder, rendered } = renderBody(pose, { ...options, silhueta });
      return splitByParte(builder, rendered);
    },
  };
}

const corpoA = corpo('corpo-a', 'Corpo A', 'a');
const corpoB = corpo('corpo-b', 'Corpo B', 'b');

// ---- Rosto: olhos (4 formas) ----

type EyeDraw = (put: (x: number, y: number, channel: Channel, tone: number) => void, eye: Vec, out: number) => void;

/** Uma forma de olhos. Fechados (dano) e em X (morte) são iguais em todas as formas. */
function olhos(id: string, nome: string, canais: Channel[], open: EyeDraw): Peca {
  return {
    id,
    nome,
    slot: 'olhos',
    partes: [{ id: 'olhos', camada: 'rosto' }],
    esconde: [],
    canais,
    desenhar(pose) {
      if (pose.eyes !== 'open') {
        const image = blank();
        drawEyes(image, pose, paletteIndex('olhos', 1));
        return { olhos: image };
      }
      return { olhos: direct((put) => eyePositions(pose).forEach((eye) => open(put, eye, outwardOf(pose, eye)))) };
    },
  };
}

// O olho usa o tom de sombra da rampa (escuro para ler, mas ainda com a cor); o branco e a pálpebra são da pele.
const olhos1 = olhos('olhos-1', 'Redondos', ['olhos'], (put, { x, y }) => {
  put(x, y, 'olhos', 1);
  put(x, y + 1, 'olhos', 1);
});
const olhos2 = olhos('olhos-2', 'Finos', ['olhos'], (put, { x, y }, out) => {
  put(x, y + 1, 'olhos', 1);
  put(x + (out || 1), y + 1, 'olhos', 1);
});
const olhos3 = olhos('olhos-3', 'Grandes', ['olhos', 'pele'], (put, { x, y }, out) => {
  put(x, y, 'olhos', 1);
  put(x, y + 1, 'olhos', 1);
  if (out) {
    put(x + out, y, 'pele', 3);
    put(x + out, y + 1, 'pele', 3);
  }
});
const olhos4 = olhos('olhos-4', 'Pálpebra pesada', ['olhos', 'pele'], (put, { x, y }, out) => {
  put(x, y, 'pele', 1);
  if (out) put(x + out, y, 'pele', 1);
  put(x, y + 1, 'olhos', 1);
});

// ---- Rosto: sobrancelhas (3 formas, na cor do cabelo) ----

function sobrancelhas(id: string, nome: string, pixels: (eye: Vec, out: number) => Vec[]): Peca {
  return {
    id,
    nome,
    slot: 'sobrancelhas',
    partes: [{ id: 'sobrancelhas', camada: 'rosto' }],
    esconde: [],
    canais: ['cabelo'],
    desenhar(pose) {
      const image = blank();
      // Seguem a cor do cabelo (tom de contorno), logo acima de cada olho.
      if (!pose.lying && pose.eyes !== 'x') {
        const color = paletteIndex('cabelo', 0);
        for (const eye of eyePositions(pose)) for (const p of pixels(eye, outwardOf(pose, eye))) image.set(p.x, p.y, color);
      }
      return { sobrancelhas: image };
    },
  };
}

/** As retas: o pixel do olho e o de fora (de lado, o da frente), puxadas para fora do rosto. */
const straight = (x: number, y: number, out: number): Vec[] => {
  const start = out < 0 && x < 16 ? x - 1 : x;
  return [
    { x: start, y: y - 1 },
    { x: start + 1, y: y - 1 },
  ];
};
const sobrancelhas1 = sobrancelhas('sobrancelhas-1', 'Retas', ({ x, y }, out) => straight(x, y, out));
const sobrancelhas2 = sobrancelhas('sobrancelhas-2', 'Grossas', ({ x, y }, out) => [
  ...straight(x, y, out),
  { x: out < 0 ? x - (x < 16 ? 2 : 1) : x + 2, y: y - 1 },
]);
const sobrancelhas3 = sobrancelhas('sobrancelhas-3', 'Arqueadas', ({ x, y }, out) => [
  { x, y: y - 2 },
  { x: x + (out || 1), y: y - 1 },
]);

// ---- Rosto: marcas ----

function marca(id: string, nome: string, canais: Channel[], draw: EyeDraw): Peca {
  return {
    id,
    nome,
    slot: 'marcas',
    partes: [{ id: 'marcas', camada: 'rosto' }],
    esconde: [],
    canais,
    desenhar(pose) {
      if (pose.lying) return { marcas: blank() };
      return { marcas: direct((put) => eyePositions(pose).forEach((eye) => draw(put, eye, outwardOf(pose, eye)))) };
    },
  };
}

const sardas = marca('sardas', 'Sardas', ['pele'], (put, { x, y }) => {
  put(x - 1, y + 2, 'pele', 1);
  put(x + 1, y + 2, 'pele', 1);
});
/** Um corte que atravessa a sobrancelha e desce pela bochecha, no olho do lado direito da tela. */
const cicatriz = marca('cicatriz', 'Cicatriz', ['pele'], (put, { x, y }, out) => {
  if (out < 0 && x < 16) return;
  const dx = out < 0 ? -1 : 1;
  put(x + dx, y - 2, 'pele', 0);
  put(x + dx, y - 1, 'pele', 0);
  put(x + dx, y + 2, 'pele', 0);
  put(x + dx * 2, y + 3, 'pele', 0);
});
/** Pintura no rosto: uma faixa embaixo de cada olho, na cor dos olhos (assim não gasta cor nova). */
const pintura = marca('pintura', 'Pintura no rosto', ['olhos'], (put, { x, y }) => {
  for (let i = -1; i <= 1; i++) put(x + i, y + 2, 'olhos', 1);
  put(x, y + 3, 'olhos', 1);
});

// ---- Linhagem: lobo de Mykol (orelhas, olhos e cauda) ----

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
    { id: 'olhos-de-lobo', camada: 'linhagem' },
    { id: 'cauda', camada: 'atras-do-corpo' },
  ],
  // Os olhos de lobo tomam o lugar dos olhos escolhidos (a cor continua a da receita).
  esconde: ['olhos'],
  canais: ['cabelo', 'pele', 'olhos'],
  desenhar(pose, options) {
    const geo = bodyGeometry(pose, options.silhueta);
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
    const parts = render(b, options);
    // Olhos puxados: o canto de fora sobe um pixel.
    const eyes = blank();
    if (pose.eyes !== 'open') drawEyes(eyes, pose, paletteIndex('olhos', 1));
    else {
      const color = paletteIndex('olhos', 1);
      for (const eye of eyePositions(pose)) {
        const out = outwardOf(pose, eye) || -1;
        eyes.set(eye.x, eye.y, color);
        eyes.set(eye.x, eye.y + 1, color);
        eyes.set(eye.x + out, eye.y, color);
      }
    }
    return { ...parts, 'olhos-de-lobo': eyes };
  },
};

// ---- Cabelo: 8 estilos, a careca incluída ----

/**
 * O kit de desenho de um cabelo. O topo é o que um chapéu esconde; a "franja" é tudo o que ainda
 * aparece por baixo dele (franja, costeletas e nuca); a parte de trás (cabelo comprido, rabo de cavalo)
 * vai na camada do cabelo de trás.
 */
interface HairKit {
  b: PartBuilder;
  h: Box;
  pose: Pose;
  topo: number;
  franja: number;
  /** Cria a parte de trás (só quem tem). */
  tras(): number;
  /** Outra parte de topo, com linha de contorno sobre o resto (um coque). */
  volume(): number;
  /** Tira um pixel a cada 3 numa linha (pontas, cachos). */
  jagged(x: number, y: number, width: number): void;
  /** Passa para a franja o que o topo desenhou da linha `y` para baixo. */
  below(y: number): void;
}

function hairKit(pose: Pose, options: ManequimOptions): HairKit {
  const geo = bodyGeometry(pose, options.silhueta);
  const b = new PartBuilder();
  let tras = -1;
  const kit: HairKit = {
    b,
    h: geo.head,
    pose,
    // A parte de trás é criada antes, para ficar embaixo do topo no mesmo desenho.
    topo: -1,
    franja: -1,
    tras: () => (tras >= 0 ? tras : (tras = b.part('cabelo', { round: true, parte: 'cabelo-tras', tones: THREE }))),
    volume: () => b.part('cabelo', { round: true, outlineOver: true, parte: 'cabelo-topo', tones: THREE }),
    jagged: (x, y, width) => {
      for (let i = 1; i < width; i += 3) b.map.set(x + i, y, -1);
    },
    below: (y) => {
      for (let j = y; j < b.map.height; j++) for (let i = 0; i < b.map.width; i++) if (b.map.get(i, j) === kit.topo) b.map.set(i, j, kit.franja);
    },
  };
  return kit;
}

type HairStyle = (k: HairKit) => void;

function cabelo(id: string, nome: string, comTras: boolean, style: HairStyle): Peca {
  return {
    id,
    nome,
    slot: 'cabelo',
    partes: [
      ...(comTras ? [{ id: 'cabelo-tras', camada: 'cabelo-de-tras' as const }] : []),
      { id: 'cabelo-topo', camada: 'cabelo-da-frente' },
      { id: 'franja', camada: 'cabelo-da-frente' },
    ],
    esconde: [],
    canais: ['cabelo'],
    desenhar(pose, options) {
      const k = hairKit(pose, options);
      if (comTras) k.tras();
      k.topo = k.b.part('cabelo', { round: true, parte: 'cabelo-topo', tones: THREE });
      k.franja = k.b.part('cabelo', { round: true, parte: 'franja', tones: THREE });
      style(k);
      return render(k.b, options);
    },
  };
}

/** Curto e comprido (os da parte 2): topo acima da cabeça, franja na testa com uma mecha no meio, costeletas. */
function classic(long: boolean): HairStyle {
  return ({ b, h, pose, topo, franja, tras, jagged, below }) => {
    if (pose.lying) {
      b.map.roundRect(h.x - 1, h.y, 4, h.height, 1, topo);
      if (long) b.map.rect(h.x - 3, h.y + 1, 3, h.height - 2, tras());
    } else if (pose.direction === 'down') {
      if (long) {
        b.map.rect(h.x - 1, h.y + 2, h.width + 2, 9, tras());
        jagged(h.x - 1, h.y + 10, h.width + 2);
      }
      b.map.roundRect(h.x - 1, h.y - 2, h.width + 2, 3, 2, topo);
      b.map.rect(h.x - 1, h.y, h.width + 2, 1, franja);
      b.map.rect(h.x + 5, h.y + 1, 2, 1, franja);
      const side = long ? 6 : 3;
      b.map.rect(h.x - 1, h.y, 2, side, franja);
      b.map.rect(h.x + h.width - 1, h.y, 2, side, franja);
    } else if (pose.direction === 'up') {
      if (long) {
        b.map.roundRect(h.x, h.y + 4, h.width, 7, 1, tras());
        jagged(h.x, h.y + 10, h.width);
      }
      b.map.roundRect(h.x - 1, h.y - 2, h.width + 2, h.height - 1, 2, topo);
      below(h.y);
    } else {
      if (long) b.map.roundRect(h.x - 1, h.y + 3, 4, 8, 1, tras());
      b.map.roundRect(h.x - 1, h.y - 2, h.width + 1, 3, 2, topo);
      b.map.rect(h.x - 1, h.y - 1, 5, long ? 7 : 5, topo);
      below(h.y);
      b.map.rect(h.x + 4, h.y, h.width - 4, 1, franja);
    }
  };
}

/** Rente: uma camada fina colada na cabeça; por baixo de um chapéu sobram só as costeletas e a nuca. */
const shaved: HairStyle = ({ b, h, pose, topo, franja, below }) => {
  if (pose.lying) b.map.roundRect(h.x, h.y + 1, 2, h.height - 2, 1, topo);
  else if (pose.direction === 'down') {
    b.map.roundRect(h.x, h.y - 1, h.width, 3, 2, topo);
    b.map.rect(h.x, h.y + 1, 1, 2, franja);
    b.map.rect(h.x + h.width - 1, h.y + 1, 1, 2, franja);
  } else if (pose.direction === 'up') {
    b.map.roundRect(h.x, h.y - 1, h.width, h.height - 2, 2, topo);
    below(h.y + 3);
  } else {
    b.map.roundRect(h.x, h.y - 1, h.width - 1, 3, 2, topo);
    b.map.rect(h.x, h.y - 1, 4, 6, topo);
    below(h.y + 2);
  }
};

/** Arrepiado: o curto com pontas para cima (longe de onde nascem as orelhas de uma linhagem). */
const spiky: HairStyle = (k) => {
  const { b, h, pose, topo, franja } = k;
  classic(false)(k);
  if (pose.lying) {
    b.map.set(h.x - 2, h.y + 2, topo);
    b.map.set(h.x - 2, h.y + 5, topo);
    return;
  }
  const spike = (x: number, tipX: number) => {
    b.map.rect(x, h.y - 3, 2, 1, topo);
    b.map.set(tipX, h.y - 4, topo);
  };
  if (pose.direction === 'side') {
    spike(h.x + 7, h.x + 8);
    spike(h.x, h.x - 1);
    b.map.set(h.x - 2, h.y, franja);
    b.map.set(h.x - 2, h.y + 2, franja);
  } else {
    spike(h.x - 1, h.x - 1);
    spike(h.x + 5, pose.direction === 'up' ? h.x + 6 : h.x + 5);
    spike(h.x + h.width - 1, h.x + h.width);
    if (pose.direction === 'down') for (const dx of [1, 4, 7, 10]) b.map.set(h.x + dx, h.y + 1, franja);
  }
};

/** Rabo de cavalo: o cabelo puxado para trás e o rabo na camada de trás (aparece de lado e de costas). */
const ponytail: HairStyle = (k) => {
  const { b, h, pose, tras } = k;
  // O rabo primeiro: o topo, desenhado depois, fica por cima de onde ele nasce.
  if (pose.lying) b.map.rect(h.x - 4, h.y + 3, 3, 2, tras());
  // De frente, a ponta do rabo aparece atrás do pescoço, de um lado.
  else if (pose.direction === 'down') b.map.roundRect(h.x + h.width - 1, h.y + 5, 3, 6, 1, tras());
  else if (pose.direction === 'up') b.map.limb(16 + pose.body.x, h.y + 4, 16 + pose.body.x, h.y + 12, 3, tras());
  else if (pose.direction === 'side') b.map.limb(h.x - 1, h.y + 1, h.x - 3, h.y + 9, 3, tras());
  ponytailTop(k);
};

/** Coque: o cabelo puxado e um coque no alto (um chapéu esconde os dois). */
const bun: HairStyle = (k) => {
  const { b, h, pose } = k;
  ponytailTop(k);
  const knot = k.volume();
  if (pose.lying) b.map.roundRect(h.x - 4, h.y + 2, 3, 4, 1, knot);
  else if (pose.direction === 'down') b.map.roundRect(h.x + 4, h.y - 4, 4, 3, 1, knot);
  else if (pose.direction === 'up') b.map.roundRect(h.x + 4, h.y, 4, 4, 2, knot);
  else b.map.roundRect(h.x - 2, h.y - 3, 4, 4, 2, knot);
};

/** O topo do rabo de cavalo, sem o rabo. */
function ponytailTop({ b, h, pose, topo, franja, below }: HairKit): void {
  if (pose.lying) b.map.roundRect(h.x - 1, h.y, 4, h.height, 1, topo);
  else if (pose.direction === 'down') {
    b.map.roundRect(h.x - 1, h.y - 2, h.width + 2, 3, 2, topo);
    b.map.rect(h.x - 1, h.y, h.width + 2, 1, franja);
    b.map.rect(h.x - 1, h.y, 1, 3, franja);
    b.map.rect(h.x + h.width, h.y, 1, 3, franja);
  } else if (pose.direction === 'up') {
    b.map.roundRect(h.x - 1, h.y - 2, h.width + 2, h.height - 1, 2, topo);
    below(h.y);
  } else {
    b.map.roundRect(h.x - 1, h.y - 2, h.width + 1, 3, 2, topo);
    b.map.rect(h.x - 1, h.y - 1, 5, 5, topo);
    below(h.y);
    b.map.rect(h.x + 4, h.y, h.width - 4, 1, franja);
  }
}

/** Cacheado: volume em volta da cabeça, com a borda recortada; por baixo de um chapéu sobram os lados. */
const curly: HairStyle = ({ b, h, pose, topo, franja, jagged, below }) => {
  if (pose.lying) {
    b.map.roundRect(h.x - 3, h.y - 1, 5, h.height + 2, 2, topo);
    jagged(h.x - 3, h.y - 1, 5);
  } else if (pose.direction === 'down') {
    b.map.roundRect(h.x - 2, h.y - 2, h.width + 4, 4, 3, topo);
    jagged(h.x - 2, h.y - 2, h.width + 4);
    below(h.y + 1);
    b.map.roundRect(h.x - 2, h.y + 1, 3, 7, 1, franja);
    b.map.roundRect(h.x + h.width - 1, h.y + 1, 3, 7, 1, franja);
    for (const dx of [2, 5, 8]) b.map.set(h.x + dx, h.y + 2, franja);
    b.map.set(h.x - 2, h.y + 7, -1);
    b.map.set(h.x + h.width + 1, h.y + 7, -1);
  } else if (pose.direction === 'up') {
    b.map.roundRect(h.x - 2, h.y - 2, h.width + 4, h.height + 1, 3, topo);
    jagged(h.x - 2, h.y - 2, h.width + 4);
    jagged(h.x - 1, h.y + h.height - 2, h.width + 2);
    below(h.y + 1);
  } else {
    b.map.roundRect(h.x - 2, h.y - 2, h.width + 2, 4, 3, topo);
    b.map.roundRect(h.x - 2, h.y, 6, 8, 2, topo);
    jagged(h.x - 2, h.y - 2, h.width + 2);
    below(h.y + 1);
    b.map.set(h.x - 2, h.y + 7, -1);
    for (const dx of [5, 8]) b.map.set(h.x + dx, h.y + 2, franja);
  }
};

const cabeloCurto = cabelo('cabelo-curto', 'Curto', false, classic(false));
const cabeloComprido = cabelo('cabelo-comprido', 'Comprido', true, classic(true));
const cabeloRente = cabelo('cabelo-rente', 'Rente', false, shaved);
const cabeloArrepiado = cabelo('cabelo-arrepiado', 'Arrepiado', false, spiky);
const cabeloRabo = cabelo('cabelo-rabo', 'Rabo de cavalo', true, ponytail);
const cabeloCoque = cabelo('cabelo-coque', 'Coque', false, bun);
const cabeloCacheado = cabelo('cabelo-cacheado', 'Cacheado', false, curly);

const careca: Peca = {
  id: 'careca',
  nome: 'Careca',
  slot: 'cabelo',
  partes: [],
  esconde: [],
  canais: [],
  desenhar: () => ({}),
};

// ---- Barba: 3 estilos ----

function barbaCom(id: string, nome: string, chin: number): Peca {
  return {
    id,
    nome,
    slot: 'barba',
    partes: [{ id: 'barba', camada: 'barba' }],
    esconde: [],
    canais: ['cabelo'],
    desenhar(pose, options) {
      const geo = bodyGeometry(pose, options.silhueta);
      const h = geo.head;
      const b = new PartBuilder();
      if (geo.lying || pose.direction === 'up') return {};
      const beard = b.part('cabelo', { round: true, parte: 'barba', tones: THREE });
      // `chin`: quantas linhas a barba desce a partir da bochecha (4 = rente ao queixo).
      if (pose.direction === 'down') {
        b.map.roundRect(h.x, h.y + 5, h.width, chin, 2, beard);
        b.map.rect(h.x, h.y + 3, 1, 2, beard);
        b.map.rect(h.x + h.width - 1, h.y + 3, 1, 2, beard);
        b.map.rect(h.x + 2, h.y + 5, h.width - 4, 2, b.mask());
      } else {
        b.map.roundRect(h.x + 2, h.y + 5, h.width - 2, chin, 2, beard);
        b.map.rect(h.x + 5, h.y + 5, h.width - 5, 2, b.mask());
      }
      return render(b, options);
    },
  };
}

const barbaCurta = barbaCom('barba-curta', 'Curta', 4);
const barbaCheia = barbaCom('barba-cheia', 'Cheia', 7);

/** Bigode: um traço de pixels na sombra do cabelo, com as pontas caídas. */
const bigode: Peca = {
  id: 'bigode',
  nome: 'Bigode',
  slot: 'barba',
  partes: [{ id: 'barba', camada: 'barba' }],
  esconde: [],
  canais: ['cabelo'],
  desenhar(pose, options): Record<string, IndexedImage> {
    const geo = bodyGeometry(pose, options.silhueta);
    const h = geo.head;
    if (geo.lying || pose.direction === 'up') return {};
    const image = direct((put) => {
      const [from, to] = pose.direction === 'down' ? [h.x + 3, h.x + 8] : [h.x + 6, h.x + 9];
      for (let x = from; x <= to; x++) put(x, h.y + 7, 'cabelo', x === from || x === to ? 0 : 1);
      put(from, h.y + 8, 'cabelo', 0);
      if (pose.direction === 'down') put(to, h.y + 8, 'cabelo', 0);
    });
    return { barba: image };
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
    const geo = bodyGeometry(pose, options.silhueta);
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
    const geo = bodyGeometry(pose, options.silhueta);
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
    const geo = bodyGeometry(pose, options.silhueta);
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

/** O catálogo de peças. A ordem de cada slot é a ordem das opções na tela de criação. */
export const PECAS: Peca[] = [
  corpoA,
  corpoB,
  olhos1,
  olhos2,
  olhos3,
  olhos4,
  sobrancelhas1,
  sobrancelhas2,
  sobrancelhas3,
  sardas,
  cicatriz,
  pintura,
  loboDeMykol,
  cabeloCurto,
  cabeloComprido,
  cabeloRente,
  cabeloArrepiado,
  cabeloRabo,
  cabeloCoque,
  cabeloCacheado,
  careca,
  barbaCurta,
  bigode,
  barbaCheia,
  roupaDaTerra,
  chapeuDePalha,
  capuz,
];

export const PECA_BY_ID: Record<string, Peca> = Object.fromEntries(PECAS.map((peca) => [peca.id, peca]));

/** As peças de um slot, na ordem do catálogo. */
export function pecasDoSlot(slot: Peca['slot']): Peca[] {
  return PECAS.filter((peca) => peca.slot === slot);
}

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

/**
 * As folhas (uma por parte) de uma peça, no formato do molde. Geradas uma vez por peça, tipo de corpo e
 * ajuste de contorno.
 */
export function folhasDaPeca(peca: Peca, options: ManequimOptions): Record<string, IndexedImage> {
  const key = `${peca.id}|${options.silhueta ?? 'a'}|${options.selectiveOutline}|${options.innerLines}`;
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
