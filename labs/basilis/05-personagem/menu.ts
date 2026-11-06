// O boneco do menu (seção 7 de PERSONAGEM.md): um desenho próprio de 64 × 96, de frente, parado e
// respirando (4 quadros), montado pela mesma receita que o sprite do jogo: as mesmas peças, as mesmas
// camadas na mesma ordem (a pilha de frente), as mesmas regras de esconder e os mesmos tons-índice, então
// sai pintado pelas mesmas rampas. Cada peça tem aqui uma "camada de menu" desenhada por código no mesmo
// motor do manequim (`PartBuilder` + `renderParts`), na escala 3 da geometria do corpo do sprite, com
// detalhe próprio (olhos, mechas, solado, gola). É o custo que o lab mede: um desenho a mais por item.
// Sem canvas: tudo em `IndexedImage`.

import type { Vec } from '../01-controles/input.ts';
import { pilha, type CamadaId, type Peca, type ParteDef } from './camadas.ts';
import { opcoesDoCorpo, type MontarOpcoes } from './compor.ts';
import {
  MANEQUIM_DEFAULTS,
  PartBuilder,
  bodyGeometry,
  eyePositions,
  footBox,
  renderParts,
  splitByParte,
  type Box,
  type ManequimOptions,
  type Silhueta,
} from './manequim.ts';
import { MOLDE_FORMAT, paletteIndex, type Channel } from './molde.ts';
import { folhasDaPeca } from './pecas.ts';
import { MOLDE_POSES } from './poses.ts';
import { IndexedImage, PartMap } from './raster.ts';
import { pecasDaReceita, type Receita } from './receita.ts';

/** Quantos pixels do menu valem um pixel do sprite. */
export const MENU_ESCALA = 3;

/** O quadro do boneco: 64 × 96, pés em (32, 92); 4 quadros de respiração a 3 q/s, como o parado do jogo. */
export const MENU_FORMAT = { width: 64, height: 96, anchorX: 32, anchorY: 92, frames: 4, fps: 3 } as const;

/** Quantos pixels a cabeça, os ombros e os braços descem em cada quadro (o jogo desce 1 pixel em 2 quadros). */
export const MENU_RESPIRA = [0, 1, 2, 1] as const;

/** A folha do boneco: os 4 quadros lado a lado. */
export const MENU_SHEET = { width: MENU_FORMAT.width * MENU_FORMAT.frames, height: MENU_FORMAT.height } as const;

const THREE = [0, 1, 2, 2] as const;
const TWO = [0, 2, 2, 2] as const;

/** Coordenada do sprite (em cantos de pixel, no quadro de 32 × 32) → coordenada do menu. */
export const menuX = (x: number) => MENU_FORMAT.anchorX + (x - MOLDE_FORMAT.anchorX) * MENU_ESCALA;
export const menuY = (y: number) => MENU_FORMAT.anchorY + (y - MOLDE_FORMAT.anchorY) * MENU_ESCALA;
const scaled = (box: Box, dy = 0): Box => ({
  x: menuX(box.x),
  y: menuY(box.y) + dy,
  width: box.width * MENU_ESCALA,
  height: box.height * MENU_ESCALA,
});

// ---- Geometria do corpo no menu ----

export interface MenuArm {
  shoulder: Vec;
  hand: Vec;
}

/** Onde fica cada parte do corpo no boneco: a geometria do sprite parado de frente, ampliada, mais a respiração. */
export interface MenuGeo {
  quadro: number;
  /** Quanto a parte de cima desceu neste quadro. */
  dy: number;
  silhueta: Silhueta;
  head: Box;
  torso: Box;
  shorts: Box;
  crotch: Box;
  /** A mão principal (à esquerda da tela) e a outra. */
  arms: MenuArm[];
  legs: Box[];
  feet: Box[];
  /** O pixel do meio de cada olho na coluna e o de cima na linha; `out` é o lado de fora do rosto. */
  eyes: { x: number; y: number; out: number }[];
}

export function menuGeometry(quadro: number, silhueta: Silhueta = 'a'): MenuGeo {
  const pose = MOLDE_POSES['idle-down'][0];
  const geo = bodyGeometry(pose, silhueta);
  const dy = MENU_RESPIRA[quadro % MENU_RESPIRA.length];
  const point = (v: Vec): Vec => ({ x: menuX(v.x), y: menuY(v.y) + dy });
  return {
    quadro,
    dy,
    silhueta,
    head: scaled(geo.head, dy),
    torso: scaled(geo.torso, dy),
    shorts: scaled(geo.shorts),
    crotch: scaled(geo.crotch!),
    arms: [geo.mainArm, geo.offArm].map((arm) => ({ shoulder: point(arm.shoulder), hand: point(arm.hand) })),
    // A perna do sprite é carimbada em quadrados de 3 em volta do quadril e do pé (do pixel de cima ao de baixo).
    legs: geo.legs.map((leg) => ({
      x: menuX(leg.hip.x - 1),
      y: menuY(leg.hip.y - 1),
      width: leg.thickness * MENU_ESCALA,
      height: menuY(leg.foot.y + 2) - menuY(leg.hip.y - 1),
    })),
    feet: geo.legs.flatMap((leg) => footBox(leg).map((box) => scaled(box))),
    eyes: eyePositions(pose).map((eye) => ({ x: menuX(eye.x) + 1, y: menuY(eye.y) + dy, out: eye.x < 16 ? -1 : 1 })),
  };
}

// ---- Primitivas próprias do menu ----

/** Forma entre o retângulo e a elipse (superelipse), para cabeça, cabelo e chapéu. */
export function blob(map: PartMap, box: Box, part: number, power = 2.6): void {
  const cx = (box.width - 1) / 2;
  const cy = (box.height - 1) / 2;
  for (let j = 0; j < box.height; j++) {
    for (let i = 0; i < box.width; i++) {
      const nx = Math.abs((i - cx) / (box.width / 2));
      const ny = Math.abs((j - cy) / (box.height / 2));
      if (nx ** power + ny ** power <= 1) map.set(box.x + i, box.y + j, part);
    }
  }
}

/** Uma linha de pixels cortada em dentes de `step` em `step` (pontas de cabelo, mechas). */
function teeth(map: PartMap, x: number, y: number, width: number, step: number, depth: number): void {
  for (let i = 0; i < width; i++) {
    const phase = i % step;
    const cut = Math.max(0, depth - Math.min(phase, step - 1 - phase));
    for (let j = 0; j < cut; j++) map.set(x + i, y - j, -1);
  }
}

const builder = () => new PartBuilder(MENU_FORMAT.width, MENU_FORMAT.height);
const blank = () => new IndexedImage(MENU_FORMAT.width, MENU_FORMAT.height);

function render(b: PartBuilder, options: ManequimOptions): Record<string, IndexedImage> {
  return splitByParte(b, renderParts(b, options));
}

/** Pixels de um desenho direto, nas coordenadas de um olho: `u` cresce para fora do rosto, `v` para baixo. */
function eyePainter(image: IndexedImage, eye: MenuGeo['eyes'][number]) {
  // Tom negativo apaga o pixel (um furo por onde aparece a pele: o brilho do olho).
  return (u: number, v: number, channel: Channel, tone: number) =>
    image.set(eye.x + u * eye.out, eye.y + v, tone < 0 ? 0 : paletteIndex(channel, tone));
}
type Paint = ReturnType<typeof eyePainter>;

function span(paint: Paint, from: number, to: number, v: number, channel: Channel, tone: number): void {
  for (let u = from; u <= to; u++) paint(u, v, channel, tone);
}

/** Braço (do ombro à mão, 6 pixels) e a mão, um pouco mais larga. */
function armShape(map: PartMap, arm: MenuArm, armId: number, handId: number = armId): void {
  map.limb(arm.shoulder.x, arm.shoulder.y, arm.hand.x, arm.hand.y, 6, armId);
  blob(map, { x: arm.hand.x - 4, y: arm.hand.y - 2, width: 8, height: 8 }, handId, 2.2);
}

function maskArms(b: PartBuilder, g: MenuGeo): void {
  for (const arm of g.arms) armShape(b.map, arm, b.mask());
}

// ---- As camadas de menu, por peça ----

export type DesenhoDeMenu = (g: MenuGeo, options: ManequimOptions) => Record<string, IndexedImage>;

function corpo(silhueta: Silhueta): DesenhoDeMenu {
  return (g, options) => {
    const b = builder();
    for (const leg of g.legs) b.map.rect(leg.x, leg.y, leg.width, leg.height, b.part('pele', { outlineOver: true, parte: 'corpo' }));
    const torso = b.part('pele', { round: true, parte: 'corpo' });
    b.map.roundRect(g.torso.x, g.torso.y, g.torso.width, g.torso.height, 3, torso);
    const shorts = b.part('tecido-secundario', { parte: 'roupa-de-baixo' });
    b.map.rect(g.shorts.x, g.shorts.y, g.shorts.width, g.shorts.height, shorts);
    b.map.rect(g.crotch.x, g.crotch.y, g.crotch.width, g.crotch.height, -1);
    const head = b.part('pele', { round: true, outlineOver: true, parte: 'corpo' });
    blob(b.map, g.head, head, 2.4);
    for (const arm of g.arms) armShape(b.map, arm, b.part('pele', { outlineOver: true, parte: 'corpo' }), b.part('pele', { outlineOver: true, parte: 'corpo' }));
    const parts = render(b, { ...options, silhueta });
    // Nariz e boca, só no menu: a sombra e o contorno da pele.
    const face = parts.corpo;
    const h = g.head;
    const cx = h.x + h.width / 2;
    face.set(cx, h.y + 18, paletteIndex('pele', 1));
    face.set(cx - 1, h.y + 19, paletteIndex('pele', 1));
    face.set(cx, h.y + 19, paletteIndex('pele', 1));
    for (let x = cx - 3; x <= cx + 2; x++) face.set(x, h.y + 22, paletteIndex('pele', x === cx - 3 || x === cx + 2 ? 1 : 0));
    return parts;
  };
}

/** Uma forma de olhos, desenhada nos dois olhos (espelhada). */
function olhos(draw: (paint: Paint) => void): DesenhoDeMenu {
  return (g) => {
    const image = blank();
    for (const eye of g.eyes) draw(eyePainter(image, eye));
    return { olhos: image };
  };
}

// O olho usa só o tom de sombra da rampa (como no jogo); o brilho é um buraco por onde aparece a pele.
const olhosRedondos = olhos((p) => {
  span(p, -1, 1, 0, 'olhos', 1);
  for (let v = 1; v <= 4; v++) span(p, -2, 2, v, 'olhos', 1);
  span(p, -1, 1, 5, 'olhos', 1);
  p(-1, 1, 'olhos', -1);
});
const olhosFinos = olhos((p) => {
  span(p, 0, 3, 2, 'olhos', 1);
  span(p, -2, 3, 3, 'olhos', 1);
  span(p, -1, 1, 4, 'olhos', 1);
});
const olhosGrandes = olhos((p) => {
  span(p, -2, 3, 0, 'pele', 3);
  for (let v = 1; v <= 5; v++) span(p, -3, 4, v, 'pele', 3);
  span(p, -2, 3, 6, 'pele', 3);
  for (let v = 1; v <= 6; v++) span(p, -2, 1, v, 'olhos', 1);
  p(-1, 2, 'pele', 3);
});
const olhosPalpebra = olhos((p) => {
  span(p, -3, 3, 1, 'pele', 1);
  span(p, -2, 3, 2, 'pele', 1);
  for (let v = 3; v <= 4; v++) span(p, -2, 2, v, 'olhos', 1);
  span(p, -1, 1, 5, 'olhos', 1);
  p(-1, 3, 'olhos', -1);
});

/** Sobrancelhas na cor do cabelo (o tom de contorno, como no jogo), acima de cada olho e puxadas para fora. */
function sobrancelhas(draw: (paint: Paint) => void): DesenhoDeMenu {
  return (g) => {
    const image = blank();
    for (const eye of g.eyes) draw(eyePainter(image, eye));
    return { sobrancelhas: image };
  };
}
const sobrancelhasRetas = sobrancelhas((p) => {
  span(p, -2, 3, -4, 'cabelo', 0);
  span(p, -2, 3, -3, 'cabelo', 0);
});
const sobrancelhasGrossas = sobrancelhas((p) => {
  span(p, -2, 4, -5, 'cabelo', 0);
  span(p, -3, 4, -4, 'cabelo', 0);
  span(p, -3, 3, -3, 'cabelo', 0);
});
const sobrancelhasArqueadas = sobrancelhas((p) => {
  p(-2, -4, 'cabelo', 0);
  span(p, -1, 1, -5, 'cabelo', 0);
  span(p, 2, 3, -4, 'cabelo', 0);
  p(4, -3, 'cabelo', 0);
});

function marca(draw: (paint: Paint, out: number) => void): DesenhoDeMenu {
  return (g) => {
    const image = blank();
    for (const eye of g.eyes) draw(eyePainter(image, eye), eye.out);
    return { marcas: image };
  };
}
const sardas = marca((p) => {
  for (const [u, v] of [
    [-3, 8],
    [-1, 9],
    [1, 8],
    [3, 9],
    [0, 11],
  ])
    p(u, v, 'pele', 1);
});
/** O corte atravessa a sobrancelha e desce pela bochecha, no olho do lado direito da tela (como no jogo). */
const cicatriz = marca((p, out) => {
  if (out < 0) return;
  for (const [u, v] of [
    [3, -7],
    [3, -6],
    [3, -5],
    [4, -4],
    [4, -3],
    [4, -2],
    [4, 7],
    [5, 8],
    [5, 9],
    [6, 10],
  ])
    p(u, v, 'pele', 0);
});
const pinturaNoRosto = marca((p) => {
  span(p, -3, 3, 8, 'olhos', 1);
  span(p, -3, 3, 9, 'olhos', 1);
  span(p, -1, 1, 10, 'olhos', 1);
  p(0, 11, 'olhos', 1);
});

// ---- Lobo de Mykol ----

function ear(b: PartBuilder, g: MenuGeo, left: boolean): void {
  const fur = b.part('cabelo', { round: true, parte: 'orelhas', tones: THREE });
  const inner = b.part('pele', { parte: 'orelhas', tones: [1, 1, 1, 1] });
  // A orelha da esquerda da tela; a da direita é a mesma espelhada no meio do rosto.
  const mirror = (x: number) => (left ? x : g.head.x * 2 + g.head.width - 1 - x);
  // Alta o bastante para sair de qualquer cabelo (o cacheado é o mais volumoso), como no jogo.
  const x0 = g.head.x + 2;
  const top = g.head.y - 19;
  for (let j = 0; j < 21; j++) {
    const from = x0 + (j < 3 ? 1 : 0);
    const to = x0 + Math.min(10, 1 + Math.floor(j * 0.6));
    for (let x = from; x <= to; x++) b.map.set(mirror(x), top + j, fur);
  }
  for (let j = 6; j < 17; j++) {
    const to = x0 + 2 + Math.floor((j - 6) * 0.5);
    for (let x = x0 + 2; x <= to; x++) b.map.set(mirror(x), top + j, inner);
  }
}

const loboDeMykol: DesenhoDeMenu = (g, options) => {
  const b = builder();
  ear(b, g, true);
  ear(b, g, false);
  // A cauda sai atrás do quadril, à direita da tela, e sobe (não respira com o tronco).
  const tail = b.part('cabelo', { round: true, parte: 'cauda', tones: THREE });
  const limb = (x0: number, y0: number, x1: number, y1: number, t: number) => b.map.limb(x0, y0, x1, y1, t, tail);
  limb(menuX(20), menuY(22), menuX(23), menuY(24), 7);
  limb(menuX(23), menuY(24), menuX(25) - 2, menuY(22), 6);
  limb(menuX(25) - 2, menuY(22), menuX(25) - 1, menuY(20), 5);
  limb(menuX(25) - 1, menuY(20), menuX(25) - 2, menuY(19), 3);
  const parts = render(b, options);
  const eyes = blank();
  for (const eye of g.eyes) {
    const p = eyePainter(eyes, eye);
    // Puxados: o canto de fora sobe.
    span(p, 2, 4, 0, 'olhos', 1);
    span(p, 0, 4, 1, 'olhos', 1);
    span(p, -2, 3, 2, 'olhos', 1);
    span(p, -2, 2, 3, 'olhos', 1);
    span(p, -1, 1, 4, 'olhos', 1);
    p(0, 2, 'olhos', -1);
  }
  return { ...parts, 'olhos-de-lobo': eyes };
};

// ---- Cabelo ----

interface MenuHair {
  b: PartBuilder;
  h: Box;
  g: MenuGeo;
  topo: number;
  franja: number;
  tras(): number;
  /** Uma mecha a mais, com linha de contorno sobre o resto. */
  mecha(parte: 'cabelo-topo' | 'franja'): number;
}

function cabelo(comTras: boolean, style: (k: MenuHair) => void): DesenhoDeMenu {
  return (g, options) => {
    const b = builder();
    let tras = -1;
    const k: MenuHair = {
      b,
      h: g.head,
      g,
      topo: -1,
      franja: -1,
      tras: () => (tras >= 0 ? tras : (tras = b.part('cabelo', { round: true, parte: 'cabelo-tras', tones: THREE }))),
      mecha: (parte) => b.part('cabelo', { round: true, outlineOver: true, parte, tones: THREE }),
    };
    if (comTras) k.tras();
    k.topo = b.part('cabelo', { round: true, parte: 'cabelo-topo', tones: THREE });
    k.franja = b.part('cabelo', { round: true, parte: 'franja', tones: THREE });
    style(k);
    return render(b, options);
  };
}

/** O topo do cabelo: a calota acima da testa (o que o chapéu esconde). */
function calota({ b, h, topo }: MenuHair, grow = 3): void {
  blob(b.map, { x: h.x - grow, y: h.y - 6, width: h.width + grow * 2, height: 16 }, topo, 2.2);
  for (let y = h.y; y < b.map.height; y++) for (let x = 0; x < b.map.width; x++) if (b.map.get(x, y) === topo) b.map.set(x, y, -1);
}

/** A franja na testa: uma faixa com mechas que descem, e as costeletas dos lados (`side` linhas). */
function franja(k: MenuHair, side: number, grow = 3): void {
  const { b, h } = k;
  b.map.rect(h.x - grow, h.y, h.width + grow * 2, 4, k.franja);
  teeth(b.map, h.x - grow + 6, h.y + 3, h.width + grow * 2 - 12, 5, 1);
  // Uma mecha da franja caindo para o lado do repartido.
  const lock = k.mecha('franja');
  b.map.roundRect(h.x + 3, h.y + 1, 15, 5, 2, lock);
  b.map.set(h.x + 3, h.y + 5, -1);
  b.map.rect(h.x - grow, h.y, 6, side, k.franja);
  b.map.rect(h.x + h.width + grow - 6, h.y, 6, side, k.franja);
  b.map.set(h.x - grow, h.y + side - 1, -1);
  b.map.set(h.x + h.width + grow - 1, h.y + side - 1, -1);
}

function classico(long: boolean): (k: MenuHair) => void {
  return (k) => {
    const { b, h } = k;
    if (long) {
      b.map.rect(h.x - 3, h.y + 6, h.width + 6, 27, k.tras());
      teeth(b.map, h.x - 3, h.y + 32, h.width + 6, 6, 2);
    }
    calota(k);
    // O repartido: a metade da esquerda da calota é uma mecha com o próprio contorno.
    blob(b.map, { x: h.x - 3, y: h.y - 6, width: 22, height: 12 }, k.mecha('cabelo-topo'), 2.2);
    for (let y = h.y; y < b.map.height; y++) for (let x = 0; x < b.map.width; x++) if (b.map.get(x, y) === b.parts.length - 1) b.map.set(x, y, -1);
    franja(k, long ? 18 : 10);
  };
}

const rente = (k: MenuHair) => {
  const { b, h } = k;
  b.map.roundRect(h.x, h.y - 3, h.width, 9, 6, k.topo);
  for (let y = h.y; y < h.y + 6; y++) for (let x = 0; x < b.map.width; x++) if (b.map.get(x, y) === k.topo && x > h.x + 3 && x < h.x + h.width - 4) b.map.set(x, y, -1);
  b.map.rect(h.x, h.y + 3, 3, 7, k.franja);
  b.map.rect(h.x + h.width - 3, h.y + 3, 3, 7, k.franja);
};

const arrepiado = (k: MenuHair) => {
  const { b, h } = k;
  classico(false)(k);
  // Pontas para cima: triângulos que nascem na calota (longe de onde nascem as orelhas de uma linhagem).
  const spike = (x: number, lean: number) => {
    const id = k.mecha('cabelo-topo');
    for (let j = 0; j < 8; j++) {
      const width = Math.max(1, 7 - j);
      const left = x + Math.round((j * lean) / 3) + Math.floor((7 - width) / 2);
      b.map.rect(left, h.y - 6 - j, width, 1, id);
    }
  };
  spike(h.x - 4, -1);
  spike(h.x + 15, 0);
  spike(h.x + h.width - 3, 1);
  for (const dx of [5, 12, 23, 30]) b.map.rect(h.x + dx, h.y + 4, 2, 2, k.franja);
};

/** O topo puxado para trás, sem franja solta (rabo de cavalo e coque). */
function puxado(k: MenuHair): void {
  const { b, h } = k;
  calota(k);
  b.map.rect(h.x - 3, h.y, h.width + 6, 3, k.franja);
  b.map.rect(h.x - 3, h.y, 3, 9, k.franja);
  b.map.rect(h.x + h.width, h.y, 3, 9, k.franja);
  // A linha do cabelo puxado: pontas miúdas na testa.
  teeth(b.map, h.x + 3, h.y + 2, h.width - 6, 4, 1);
}

const rabo = (k: MenuHair) => {
  const { b, h } = k;
  // De frente, a ponta do rabo aparece atrás do pescoço, de um lado.
  b.map.roundRect(h.x + h.width - 3, h.y + 15, 9, 18, 3, k.tras());
  teeth(b.map, h.x + h.width - 3, h.y + 32, 9, 4, 1);
  puxado(k);
};

const coque = (k: MenuHair) => {
  const { b, h } = k;
  puxado(k);
  blob(b.map, { x: h.x + 11, y: h.y - 14, width: 14, height: 11 }, k.mecha('cabelo-topo'), 2.2);
};

const cacheado = (k: MenuHair) => {
  const { b, h } = k;
  // Cachos: círculos em volta da cabeça, cada um com o próprio contorno; os de baixo da testa são a "franja"
  // (o que aparece por baixo de um chapéu).
  const curl = (cx: number, cy: number, size = 9) => {
    const parte = cy >= h.y + 2 ? 'franja' : 'cabelo-topo';
    blob(b.map, { x: cx - Math.floor(size / 2), y: cy - Math.floor(size / 2), width: size, height: size }, k.mecha(parte), 2);
  };
  blob(b.map, { x: h.x - 5, y: h.y - 6, width: h.width + 10, height: 16 }, k.topo, 2.2);
  for (let y = h.y + 2; y < b.map.height; y++) for (let x = 0; x < b.map.width; x++) if (b.map.get(x, y) === k.topo) b.map.set(x, y, -1);
  for (const [dx, dy] of [
    [-2, 4],
    [1, 12],
    [0, 20],
    [h.width + 1, 4],
    [h.width - 2, 12],
    [h.width - 1, 20],
  ])
    curl(h.x + dx, h.y + dy);
  for (const dx of [7, 14, 22, 29]) curl(h.x + dx, h.y - 4, 9);
  for (const dx of [7, 15, 23, 30]) curl(h.x + dx, h.y + 1, 8);
};

// ---- Barba ----

function barba(chin: number): DesenhoDeMenu {
  return (g, options) => {
    const h = g.head;
    const b = builder();
    const beard = b.part('cabelo', { round: true, parte: 'barba', tones: THREE });
    // As costeletas descendo pelo queixo e o queixo embaixo do nariz; a boca aberta na barba.
    const bottom = h.y + 15 + chin;
    b.map.roundRect(h.x, h.y + 20, h.width, bottom - (h.y + 20), 6, beard);
    b.map.rect(h.x, h.y + 9, 4, 13, beard);
    b.map.rect(h.x + h.width - 4, h.y + 9, 4, 13, beard);
    teeth(b.map, h.x + 6, bottom - 1, h.width - 12, 4, 1);
    b.map.roundRect(h.x + 13, h.y + 21, 10, 3, 1, b.mask());
    return render(b, options);
  };
}

/** Bigode: pixels na sombra e no contorno do cabelo (como no jogo), com as pontas caídas. */
const bigode: DesenhoDeMenu = (g) => {
  const h = g.head;
  const image = blank();
  const cx = h.x + h.width / 2;
  const put = (x: number, y: number, tone: number) => image.set(x, y, paletteIndex('cabelo', tone));
  for (let x = cx - 6; x <= cx + 5; x++) put(x, h.y + 20, 0);
  for (let x = cx - 8; x <= cx + 7; x++) put(x, h.y + 21, x <= cx - 7 || x >= cx + 6 ? 0 : 1);
  put(cx - 8, h.y + 22, 0);
  put(cx + 7, h.y + 22, 0);
  put(cx - 8, h.y + 23, 0);
  put(cx + 7, h.y + 23, 0);
  return { barba: image };
};

// ---- Roupa da Terra ----

const roupaDaTerra: DesenhoDeMenu = (g, options) => {
  const b = builder();
  for (const leg of g.legs) {
    const pants = b.part('tecido-secundario', { outlineOver: true, parte: 'calca', tones: TWO });
    b.map.rect(leg.x, leg.y, leg.width + 1, leg.height - 4, pants);
  }
  for (const foot of g.feet) {
    const shoe = b.part('couro', { outlineOver: true, parte: 'sapatos', tones: TWO });
    blob(b.map, { x: foot.x - 1, y: foot.y - 2, width: foot.width + 2, height: foot.height + 1 }, shoe, 3);
    const sole = b.part('couro', { outlineOver: true, parte: 'sapatos', tones: TWO });
    b.map.rect(foot.x - 1, foot.y + foot.height - 2, foot.width + 2, 2, sole);
  }
  const waist = b.part('tecido-secundario', { parte: 'calca', tones: TWO });
  b.map.rect(g.shorts.x, g.shorts.y, g.shorts.width, g.shorts.height, waist);
  b.map.rect(g.crotch.x, g.crotch.y, g.crotch.width, g.crotch.height + 1, -1);
  const shirt = b.part('tecido-principal', { round: true, parte: 'camiseta', tones: THREE });
  b.map.roundRect(g.torso.x - 1, g.torso.y, g.torso.width + 2, g.torso.height + 2, 3, shirt);
  // A barra da camiseta, com a própria linha.
  const hem = b.part('tecido-principal', { outlineOver: true, parte: 'camiseta', tones: THREE });
  b.map.rect(g.torso.x - 1, g.torso.y + g.torso.height - 1, g.torso.width + 2, 3, hem);
  // A gola: um V aberto no pescoço.
  const collar = b.mask();
  const cx = g.torso.x + g.torso.width / 2;
  for (let j = 0; j < 4; j++) b.map.rect(cx - 3 + j, g.torso.y + j, 6 - 2 * j, 1, collar);
  blob(b.map, g.head, b.mask(), 2.4);
  maskArms(b, g);
  for (const arm of g.arms) {
    const sleeve = b.part('tecido-principal', { outlineOver: true, parte: 'camiseta', tones: THREE });
    b.map.limb(arm.shoulder.x, arm.shoulder.y - 1, arm.shoulder.x, arm.shoulder.y + 6, 8, sleeve);
  }
  return render(b, options);
};

// ---- Equipamento de cabeça ----

const chapeuDePalha: DesenhoDeMenu = (g, options) => {
  const h = g.head;
  const b = builder();
  const brim = b.part('couro', { parte: 'chapeu', tones: TWO });
  blob(b.map, { x: h.x - 8, y: h.y - 9, width: h.width + 16, height: 7 }, brim, 3);
  const crown = b.part('couro', { round: true, outlineOver: true, parte: 'chapeu', tones: TWO });
  blob(b.map, { x: h.x + 6, y: h.y - 17, width: h.width - 12, height: 12 }, crown, 3);
  const band = b.part('couro', { outlineOver: true, parte: 'chapeu', tones: TWO });
  b.map.rect(h.x + 6, h.y - 9, h.width - 12, 3, band);
  maskArms(b, g);
  return render(b, options);
};

const capuz: DesenhoDeMenu = (g, options) => {
  const h = g.head;
  const b = builder();
  const hood = b.part('tecido-secundario', { round: true, parte: 'capuz', tones: THREE });
  blob(b.map, { x: h.x - 6, y: h.y - 9, width: h.width + 12, height: h.height + 12 }, hood, 2.4);
  // A dobra do capuz caindo nos ombros.
  b.map.roundRect(h.x - 4, h.y + h.height - 3, h.width + 8, 8, 3, b.part('tecido-secundario', { outlineOver: true, parte: 'capuz', tones: THREE }));
  blob(b.map, { x: h.x + 3, y: h.y + 5, width: h.width - 6, height: h.height - 4 }, b.mask(), 2.6);
  maskArms(b, g);
  return render(b, options);
};

/** A camada de menu de cada peça do catálogo. Uma peça sem desenho aqui cai no sprite ampliado (`ampliarParte`). */
export const MENU_DESENHOS: Record<string, DesenhoDeMenu> = {
  'corpo-a': corpo('a'),
  'corpo-b': corpo('b'),
  'olhos-1': olhosRedondos,
  'olhos-2': olhosFinos,
  'olhos-3': olhosGrandes,
  'olhos-4': olhosPalpebra,
  'sobrancelhas-1': sobrancelhasRetas,
  'sobrancelhas-2': sobrancelhasGrossas,
  'sobrancelhas-3': sobrancelhasArqueadas,
  sardas,
  cicatriz,
  pintura: pinturaNoRosto,
  'lobo-de-mykol': loboDeMykol,
  'cabelo-curto': cabelo(false, classico(false)),
  'cabelo-comprido': cabelo(true, classico(true)),
  'cabelo-rente': cabelo(false, rente),
  'cabelo-arrepiado': cabelo(false, arrepiado),
  'cabelo-rabo': cabelo(true, rabo),
  'cabelo-coque': cabelo(false, coque),
  'cabelo-cacheado': cabelo(false, cacheado),
  careca: () => ({}),
  'barba-curta': barba(12),
  bigode,
  'barba-cheia': barba(21),
  'roupa-da-terra': roupaDaTerra,
  'chapeu-de-palha': chapeuDePalha,
  capuz,
};

/** O quadro parado de frente do sprite, ampliado por inteiro (×3) e centrado no quadro do menu. */
export function ampliarQuadro(frame: IndexedImage): IndexedImage {
  const image = blank();
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const sx = Math.floor((x - MENU_FORMAT.anchorX) / MENU_ESCALA) + MOLDE_FORMAT.anchorX;
      const sy = Math.floor((y - MENU_FORMAT.anchorY) / MENU_ESCALA) + MOLDE_FORMAT.anchorY;
      if (sx >= 0 && sy >= 0 && sx < frame.width && sy < frame.height) image.set(x, y, frame.get(sx, sy));
    }
  }
  return image;
}

/** Uma parte de peça sem camada de menu: o quadro parado do sprite (o mesmo do respirar) ampliado. */
export function ampliarParte(peca: Peca, parte: ParteDef, quadro: number, options: ManequimOptions): IndexedImage {
  const sheet = folhasDaPeca(peca, options)[parte.id];
  const clip = MOLDE_FORMAT.clips['idle-down'];
  const frame = new IndexedImage(MOLDE_FORMAT.frameWidth, MOLDE_FORMAT.frameHeight);
  const index = quadro % clip.frames;
  for (let y = 0; y < frame.height; y++)
    for (let x = 0; x < frame.width; x++) frame.set(x, y, sheet.get(index * MOLDE_FORMAT.frameWidth + x, clip.row * MOLDE_FORMAT.frameHeight + y));
  return ampliarQuadro(frame);
}

const menuCache = new Map<string, Record<string, IndexedImage>[]>();

/**
 * As camadas de menu de uma peça (uma imagem por parte) nos 4 quadros, guardadas por peça, tipo de corpo e
 * ajuste de contorno, como as folhas do jogo.
 */
export function desenhoDeMenu(peca: Peca, options: ManequimOptions): Record<string, IndexedImage>[] {
  const key = `${peca.id}|${options.silhueta ?? 'a'}|${options.selectiveOutline}|${options.innerLines}`;
  const cached = menuCache.get(key);
  if (cached) return cached;
  const draw = MENU_DESENHOS[peca.id];
  const frames = Array.from({ length: MENU_FORMAT.frames }, (_, quadro) => {
    if (draw) return draw(menuGeometry(quadro, options.silhueta), options);
    return Object.fromEntries(peca.partes.map((parte) => [parte.id, ampliarParte(peca, parte, quadro, options)]));
  });
  menuCache.set(key, frames);
  return frames;
}

export interface CamadaDoBoneco {
  peca: Peca;
  parte: ParteDef;
  camada: CamadaId;
  image: IndexedImage;
}

/** As camadas do boneco num quadro, na ordem da pilha de frente do jogo, sem o que está escondido. */
export function camadasDoBoneco(receita: Receita, quadro: number, opcoes: MontarOpcoes = { manequim: MANEQUIM_DEFAULTS, desligadas: new Set() }): CamadaDoBoneco[] {
  const manequim = opcoesDoCorpo(receita, opcoes.manequim);
  const result: CamadaDoBoneco[] = [];
  for (const { peca, parte } of pilha(pecasDaReceita(receita), 'down', opcoes.desligadas)) {
    const image = desenhoDeMenu(peca, manequim)[quadro % MENU_FORMAT.frames][parte.id];
    if (image) result.push({ peca, parte, camada: parte.camada, image });
  }
  return result;
}

/** Um quadro do boneco (64 × 96, em tons-índice). */
export function comporBoneco(receita: Receita, quadro: number, opcoes?: MontarOpcoes): IndexedImage {
  const image = blank();
  for (const camada of camadasDoBoneco(receita, quadro, opcoes)) image.blit(camada.image, 0, 0);
  return image;
}

/** A folha do boneco: os 4 quadros lado a lado (256 × 96), para o `Montador` guardar e repintar. */
export function comporFolhaDoBoneco(receita: Receita, opcoes?: MontarOpcoes): IndexedImage {
  const sheet = new IndexedImage(MENU_SHEET.width, MENU_SHEET.height);
  for (let quadro = 0; quadro < MENU_FORMAT.frames; quadro++) sheet.blit(comporBoneco(receita, quadro, opcoes), quadro * MENU_FORMAT.width, 0);
  return sheet;
}

/** Quantas peças da receita têm camada de menu própria (o resto aparece ampliado do sprite). */
export function pecasComMenu(receita: Receita): { proprias: number; ampliadas: number } {
  const pecas = pecasDaReceita(receita);
  const proprias = pecas.filter((peca) => MENU_DESENHOS[peca.id]).length;
  return { proprias, ampliadas: pecas.length - proprias };
}
