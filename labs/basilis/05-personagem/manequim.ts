// O manequim: o corpo base do molde, gerado por código a partir das poses.
// Desenhado em tons-índice (canal + tom), com contorno colorido (o tom mais escuro da rampa de cada parte),
// contorno seletivo mais leve do lado da luz, luz do alto à esquerda e linhas internas onde uma parte
// passa por cima de outra. Tudo em `IndexedImage`, sem canvas.
//
// O mesmo motor (`PartBuilder` + `renderParts`) desenha as outras camadas (cabelo, roupa, chapéus):
// cada peça monta um mapa de partes sobre a geometria da pose (`bodyGeometry`) e sai sombreada e
// contornada do mesmo jeito que o corpo.

import { frameRect } from '../04-animacao/animation.ts';
import type { Vec } from '../01-controles/input.ts';
import { MOLDE_FORMAT, MOLDE_SIZE, paletteIndex, type Channel } from './molde.ts';
import { HEAD_BOX, LYING_HEAD_BOX, MOLDE_POSES, SKELETON, TORSO_BOX, type Layer, type Pose } from './poses.ts';
import { IndexedImage, PartMap } from './raster.ts';

export interface Part {
  channel: Channel;
  /** −1 escurece um tom (o braço e a perna do lado de longe). */
  depth: number;
  /** Sombreado por posição dentro da parte (cabeça, tronco), além das bordas. */
  round: boolean;
  /** Desenha uma linha de contorno sobre as partes que ficam atrás dela. */
  outlineOver: boolean;
  /** Nome da parte da peça (para separar uma peça em camadas ou esconder só um pedaço dela). */
  parte?: string;
  /** Máscara: não desenha nada, só abre um buraco (um braço do corpo que passa na frente da roupa). */
  mask?: boolean;
  /** Troca de tom (contorno, sombra, base, luz → o tom usado), para a peça gastar menos cores. */
  tones?: readonly [number, number, number, number];
}

/**
 * Tipo de corpo (seção 6: corpos A e B, sem rótulo de gênero). O B tem ombros e cintura mais estreitos e o
 * quadril da largura do A; cabeça, mãos e pés ficam no mesmo lugar, então os pontos e as armas não mudam.
 */
export type Silhueta = 'a' | 'b';

export interface ManequimOptions {
  /** Contorno do lado da luz (em cima e à esquerda) um tom mais claro. */
  selectiveOutline: boolean;
  /** Linhas de contorno onde uma parte passa por cima de outra. */
  innerLines: boolean;
  /** O corpo sobre o qual as peças são desenhadas (a roupa segue o corpo). Padrão: A. */
  silhueta?: Silhueta;
}

export const MANEQUIM_DEFAULTS: ManequimOptions = { selectiveOutline: true, innerLines: true };

export class PartBuilder {
  readonly map: PartMap;
  readonly parts: Part[] = [];

  constructor(width = MOLDE_FORMAT.frameWidth, height = MOLDE_FORMAT.frameHeight) {
    this.map = new PartMap(width, height);
  }

  part(channel: Channel, options: Partial<Omit<Part, 'channel'>> = {}): number {
    this.parts.push({ channel, depth: 0, round: false, outlineOver: false, ...options });
    return this.parts.length - 1;
  }

  mask(): number {
    return this.part('pele', { mask: true, outlineOver: true });
  }
}

// ---- Geometria do corpo ----

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArmGeometry {
  shoulder: Vec;
  hand: Vec;
  layer: Layer;
  depth: number;
}

export interface LegGeometry {
  hip: Vec;
  foot: Vec;
  depth: number;
  thickness: number;
  /** Pé visto de lado: +1 aponta para a direita. */
  toes: number;
}

/** Onde fica cada parte do corpo numa pose: tudo já com o deslocamento do corpo. */
export interface BodyGeometry {
  lying: boolean;
  head: Box;
  torso: Box;
  /** A roupa de baixo (o short do manequim). */
  shorts: Box;
  /** O vão entre as pernas, de frente e de costas. */
  crotch: Box | null;
  /** O nariz, de lado. */
  nose: Vec | null;
  mainArm: ArmGeometry;
  offArm: ArmGeometry;
  /** Na ordem de desenho: a perna de longe primeiro. */
  legs: LegGeometry[];
}

export const LEG = 3;
export const ARM = 2;

export function bodyGeometry(pose: Pose, silhueta: Silhueta = 'a'): BodyGeometry {
  if (pose.lying) {
    const dy = pose.body.y;
    const head = { ...LYING_HEAD_BOX, y: LYING_HEAD_BOX.y + dy };
    return {
      lying: true,
      head,
      torso: { x: 13, y: 21 + dy, width: 8, height: 6 },
      shorts: { x: 20, y: 21 + dy, width: 3, height: 6 },
      crotch: null,
      nose: null,
      mainArm: { shoulder: { x: 15, y: 25 + dy }, hand: pose.mainHand, layer: 'front', depth: 0 },
      offArm: { shoulder: { x: 19, y: 25 + dy }, hand: pose.offHand, layer: 'behind', depth: -1 },
      legs: [
        { hip: { x: 22, y: 23 + dy }, foot: { x: pose.mainFoot.x, y: pose.mainFoot.y + dy }, depth: 0, thickness: 2, toes: 0 },
        { hip: { x: 22, y: 25 + dy }, foot: { x: pose.offFoot.x, y: pose.offFoot.y + dy }, depth: -1, thickness: 2, toes: 0 },
      ],
    };
  }
  const { direction, body } = pose;
  const skeleton = SKELETON[direction];
  const side = direction === 'side';
  const shift = (box: Box): Box => ({ ...box, x: box.x + body.x, y: box.y + body.y });
  const head = shift(HEAD_BOX[direction]);
  const hips = shift(TORSO_BOX[direction]);
  // Corpo B: de frente e de costas, o tronco perde um pixel de cada lado e os ombros vêm junto;
  // de lado, perde um pixel nas costas. O quadril (a roupa de baixo, a cintura da calça) fica igual.
  const narrow = silhueta === 'b';
  const torso = !narrow ? hips : side ? { ...hips, x: hips.x + 1, width: hips.width - 1 } : { ...hips, x: hips.x + 1, width: hips.width - 2 };
  const inward = (s: Vec) => (narrow && !side ? (s.x < 16 ? 1 : -1) : 0);
  const shoulder = (s: Vec) => ({ x: s.x + body.x + inward(s), y: s.y + body.y });
  const hipY = 21 + body.y;
  const main: LegGeometry = { hip: { x: skeleton.mainFoot.x + body.x, y: hipY }, foot: pose.mainFoot, depth: 0, thickness: LEG, toes: side ? 1 : 0 };
  const off: LegGeometry = { hip: { x: skeleton.offFoot.x + body.x, y: hipY }, foot: pose.offFoot, depth: side ? -1 : 0, thickness: LEG, toes: side ? 1 : 0 };
  return {
    lying: false,
    head,
    torso,
    shorts: { x: hips.x, y: hips.y + hips.height - 1, width: hips.width, height: 3 },
    crotch: side ? null : { x: 15 + body.x, y: torso.y + torso.height + 1, width: 2, height: 1 },
    nose: side ? { x: head.x + head.width, y: head.y + 5 } : null,
    mainArm: { shoulder: shoulder(skeleton.mainShoulder), hand: pose.mainHand, layer: pose.mainArm, depth: 0 },
    offArm: {
      shoulder: shoulder(skeleton.offShoulder),
      hand: pose.offHand,
      layer: pose.offArm,
      depth: side && pose.offArm === 'behind' ? -1 : 0,
    },
    // De lado, a perna de longe fica atrás e um tom mais escura.
    legs: side ? [off, main] : [main, off],
  };
}

/** Braços que passam atrás do tronco (desenhados antes) e na frente (depois), nessa ordem. */
export function armsByLayer(geo: BodyGeometry): { behind: ArmGeometry[]; front: ArmGeometry[] } {
  const arms = [geo.offArm, geo.mainArm];
  return { behind: arms.filter((arm) => arm.layer === 'behind'), front: arms.filter((arm) => arm.layer === 'front') };
}

/** Pé: o fim da perna, mais um pixel para a frente quando visto de lado. */
export function footBox(leg: LegGeometry): Box[] {
  const boxes = [{ x: leg.foot.x - 1, y: leg.foot.y, width: 3, height: 2 }];
  if (leg.toes !== 0) boxes.push({ x: leg.toes > 0 ? leg.foot.x + 2 : leg.foot.x - 2, y: leg.foot.y, width: 1, height: 2 });
  return boxes;
}

// ---- Corpo ----

function drawArm(b: PartBuilder, arm: ArmGeometry, parte?: string): void {
  const id = b.part('pele', { depth: arm.depth, outlineOver: true, parte });
  b.map.limb(arm.shoulder.x, arm.shoulder.y, arm.hand.x, arm.hand.y, ARM, id);
}

function drawLeg(b: PartBuilder, leg: LegGeometry, parte?: string): void {
  const id = b.part('pele', { depth: leg.depth, outlineOver: true, parte });
  b.map.limb(leg.hip.x, leg.hip.y, leg.foot.x, leg.foot.y, leg.thickness, id);
  if (leg.toes !== 0) b.map.rect(leg.toes > 0 ? leg.foot.x + 2 : leg.foot.x - 2, leg.foot.y, 1, 2, id);
}

export interface BodyParts {
  /** Desenha a roupa de baixo (o short); na pilha de camadas ela vira a parte "roupa-de-baixo". */
  shorts: boolean;
}

/** O corpo na ordem de desenho: braços de trás, pernas, tronco, roupa de baixo, cabeça, braços da frente. */
function drawBody(b: PartBuilder, geo: BodyGeometry, parts: BodyParts): void {
  const arms = armsByLayer(geo);
  for (const arm of arms.behind) drawArm(b, arm, 'corpo');
  for (const leg of geo.legs) drawLeg(b, leg, 'corpo');
  const torsoId = b.part('pele', { round: true, parte: 'corpo' });
  b.map.roundRect(geo.torso.x, geo.torso.y, geo.torso.width, geo.torso.height, 1, torsoId);
  if (parts.shorts) {
    const shortsId = b.part('tecido-secundario', { parte: 'roupa-de-baixo' });
    b.map.rect(geo.shorts.x, geo.shorts.y, geo.shorts.width, geo.shorts.height, shortsId);
  }
  if (geo.crotch) b.map.rect(geo.crotch.x, geo.crotch.y, geo.crotch.width, geo.crotch.height, -1);
  const headId = b.part('pele', { round: true, outlineOver: true, parte: 'corpo' });
  b.map.roundRect(geo.head.x, geo.head.y, geo.head.width, geo.head.height, 2, headId);
  if (geo.nose) b.map.set(geo.nose.x, geo.nose.y, headId);
  for (const arm of arms.front) drawArm(b, arm, 'corpo');
}

// ---- Render ----

/** Tom (0 a 3) de um pixel de parte: base, luz em cima e à esquerda, sombra embaixo e à direita. */
function shade(b: PartBuilder, x: number, y: number, id: number, box: { minX: number; minY: number; maxX: number; maxY: number }): number {
  const part = b.parts[id];
  const same = (dx: number, dy: number) => b.map.get(x + dx, y + dy) === id;
  let tone = 2;
  if (part.round) {
    const nx = box.maxX > box.minX ? (x - box.minX) / (box.maxX - box.minX) : 0.5;
    const ny = box.maxY > box.minY ? (y - box.minY) / (box.maxY - box.minY) : 0.5;
    const score = nx * 0.6 + ny * 0.4;
    if (score > 0.72) tone = 1;
    else if (score < 0.22) tone = 3;
  }
  if (!same(1, 0) || !same(0, 1)) tone = 1;
  else if (!same(-1, 0) || !same(0, -1)) tone = Math.max(tone, 3);
  return Math.max(1, tone + part.depth);
}

export interface Rendered {
  image: IndexedImage;
  /** A parte dona de cada pixel (o contorno é da parte mais alta ao lado); −1 = vazio. */
  owner: Int16Array;
}

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Sombreia e contorna um mapa de partes. */
export function renderParts(b: PartBuilder, options: ManequimOptions): Rendered {
  const { map, parts } = b;
  const image = new IndexedImage(map.width, map.height);
  const owner = new Int16Array(map.width * map.height).fill(-1);
  const boxes = parts.map(() => ({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }));
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const id = map.get(x, y);
      if (id < 0) continue;
      const box = boxes[id];
      box.minX = Math.min(box.minX, x);
      box.minY = Math.min(box.minY, y);
      box.maxX = Math.max(box.maxX, x);
      box.maxY = Math.max(box.maxY, y);
    }
  }
  const put = (x: number, y: number, id: number, tone: number) => {
    const part = parts[id];
    image.set(x, y, paletteIndex(part.channel, part.tones ? part.tones[tone] : tone));
    owner[y * map.width + x] = id;
  };

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const id = map.get(x, y);
      if (id >= 0) {
        if (parts[id].mask) continue;
        let tone = shade(b, x, y, id, boxes[id]);
        const channel = parts[id].channel;
        // Linha interna: uma parte da frente (ou um buraco de máscara) que encosta nesta deixa um contorno sobre ela.
        if (options.innerLines) {
          for (const [dx, dy] of NEIGHBORS) {
            const other = map.get(x + dx, y + dy);
            if (other > id && (parts[other].mask || (parts[other].outlineOver && parts[other].channel === channel))) {
              tone = 0;
              break;
            }
          }
        }
        put(x, y, id, tone);
        continue;
      }
      // Contorno: pixel vazio encostado na peça, na cor mais escura da parte mais alta ao lado.
      let top = -1;
      let lightSide = true;
      for (const [dx, dy] of NEIGHBORS) {
        const other = map.get(x + dx, y + dy);
        if (other < 0 || parts[other].mask) continue;
        if (other > top) top = other;
        // A peça à esquerda ou acima deste pixel quer dizer que ele está do lado da sombra.
        if (dx < 0 || dy < 0) lightSide = false;
      }
      if (top < 0) continue;
      put(x, y, top, options.selectiveOutline && lightSide && x < 16 && y < 20 ? 1 : 0);
    }
  }
  return { image, owner };
}

/** Separa um desenho pelas partes da peça (`Part.parte`): uma imagem por parte. */
export function splitByParte(b: PartBuilder, rendered: Rendered, fallback = 'principal'): Record<string, IndexedImage> {
  const { image, owner } = rendered;
  const result: Record<string, IndexedImage> = {};
  for (const part of b.parts) {
    const name = part.parte ?? fallback;
    if (!part.mask && !result[name]) result[name] = new IndexedImage(image.width, image.height);
  }
  for (let i = 0; i < owner.length; i++) {
    if (owner[i] < 0) continue;
    result[b.parts[owner[i]].parte ?? fallback].data[i] = image.data[i];
  }
  return result;
}

// ---- Olhos ----

/** Onde ficam os olhos numa pose (o pixel de cima do olho aberto); de costas, nenhum. */
export function eyePositions(pose: Pose): Vec[] {
  if (pose.lying) {
    const head = LYING_HEAD_BOX;
    // Deitado de lado: só um olho à vista, virado para cima.
    return [{ x: head.x + 4, y: head.y + 3 + pose.body.y }];
  }
  if (pose.direction === 'up') return [];
  const head = HEAD_BOX[pose.direction];
  const y = head.y + 4 + pose.body.y;
  const xs = pose.direction === 'down' ? [head.x + 3, head.x + 8] : [head.x + 7];
  return xs.map((x) => ({ x: x + pose.body.x, y }));
}

/** Desenha os olhos: aberto (2 pixels, `top` em cima e `bottom` embaixo), fechado (traço) ou em X. */
export function drawEyes(image: IndexedImage, pose: Pose, top: number, bottom: number = top): void {
  for (const { x, y } of eyePositions(pose)) {
    if (pose.eyes === 'open') {
      image.set(x, y, top);
      image.set(x, y + 1, bottom);
    } else if (pose.eyes === 'closed') {
      image.set(x, y + 1, top);
      image.set(x + (x < 16 ? -1 : 1), y + 1, top);
    } else {
      image.set(x - 1, y - 1, top);
      image.set(x + 1, y - 1, top);
      image.set(x, y, top);
      image.set(x - 1, y + 1, top);
      image.set(x + 1, y + 1, top);
    }
  }
}

// ---- Manequim ----

/** O corpo de uma pose como mapa de partes já sombreado, para separar em "corpo" e "roupa-de-baixo". */
export function renderBody(pose: Pose, options: ManequimOptions, parts: BodyParts = { shorts: true }): { builder: PartBuilder; rendered: Rendered } {
  const builder = new PartBuilder();
  drawBody(builder, bodyGeometry(pose, options.silhueta), parts);
  return { builder, rendered: renderParts(builder, options) };
}

/** Um quadro do manequim (32 × 32) para uma pose: o corpo, a roupa de baixo e os olhos, numa imagem só. */
export function drawManequim(pose: Pose, options: ManequimOptions = MANEQUIM_DEFAULTS): IndexedImage {
  const { image } = renderBody(pose, options).rendered;
  drawEyes(image, pose, paletteIndex('olhos', 0));
  return image;
}

/** Monta uma folha no formato do molde a partir de um desenho por pose. */
export function sheetFromPoses(draw: (pose: Pose) => IndexedImage): IndexedImage {
  const sheet = new IndexedImage(MOLDE_SIZE.width, MOLDE_SIZE.height);
  for (const [name, clip] of Object.entries(MOLDE_FORMAT.clips)) {
    MOLDE_POSES[name].forEach((pose, index) => {
      const { x, y } = frameRect(MOLDE_FORMAT, clip, index);
      sheet.blit(draw(pose), x, y);
    });
  }
  return sheet;
}

/** A folha inteira do manequim, no formato do molde (uma animação por linha). */
export function generateManequimSheet(options: ManequimOptions = MANEQUIM_DEFAULTS): IndexedImage {
  return sheetFromPoses((pose) => drawManequim(pose, options));
}
