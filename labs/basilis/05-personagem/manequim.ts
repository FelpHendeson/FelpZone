// O manequim: o corpo base do molde, gerado por código a partir das poses.
// Desenhado em tons-índice (canal + tom), com contorno colorido (o tom mais escuro da rampa de cada parte),
// contorno seletivo mais leve do lado da luz, luz do alto à esquerda e linhas internas onde uma parte
// passa por cima de outra. Tudo em `IndexedImage`, sem canvas.

import { frameRect } from '../04-animacao/animation.ts';
import { MOLDE_FORMAT, MOLDE_SIZE, paletteIndex, type Channel } from './molde.ts';
import { HEAD_BOX, LYING_HEAD_BOX, MOLDE_POSES, SKELETON, TORSO_BOX, type Pose } from './poses.ts';
import { IndexedImage, PartMap } from './raster.ts';

interface Part {
  channel: Channel;
  /** −1 escurece um tom (o braço e a perna do lado de longe). */
  depth: number;
  /** Sombreado por posição dentro da parte (cabeça, tronco), além das bordas. */
  round: boolean;
  /** Desenha uma linha de contorno sobre as partes que ficam atrás dela. */
  outlineOver: boolean;
}

export interface ManequimOptions {
  /** Contorno do lado da luz (em cima e à esquerda) um tom mais claro. */
  selectiveOutline: boolean;
  /** Linhas de contorno onde uma parte passa por cima de outra. */
  innerLines: boolean;
}

export const MANEQUIM_DEFAULTS: ManequimOptions = { selectiveOutline: true, innerLines: true };

class Builder {
  readonly map: PartMap;
  readonly parts: Part[] = [];

  constructor(width: number, height: number) {
    this.map = new PartMap(width, height);
  }

  part(channel: Channel, options: Partial<Omit<Part, 'channel'>> = {}): number {
    this.parts.push({ channel, depth: 0, round: false, outlineOver: false, ...options });
    return this.parts.length - 1;
  }
}

const LEG = 3;
const ARM = 2;

function drawArm(b: Builder, shoulder: { x: number; y: number }, hand: { x: number; y: number }, depth: number): void {
  const id = b.part('pele', { depth, outlineOver: true });
  b.map.limb(shoulder.x, shoulder.y, hand.x, hand.y, ARM, id);
}

function drawLeg(b: Builder, hipX: number, hipY: number, foot: { x: number; y: number }, depth: number, toes: number): void {
  const id = b.part('pele', { depth, outlineOver: true });
  b.map.limb(hipX, hipY, foot.x, foot.y, LEG, id);
  // Pé: um pixel a mais para a frente quando visto de lado.
  if (toes !== 0) b.map.rect(toes > 0 ? foot.x + 2 : foot.x - 2, foot.y, 1, 2, id);
}

function standing(b: Builder, pose: Pose): void {
  const { direction, body } = pose;
  const skeleton = SKELETON[direction];
  const head = HEAD_BOX[direction];
  const torso = TORSO_BOX[direction];
  const side = direction === 'side';
  const shoulder = (s: { x: number; y: number }) => ({ x: s.x + body.x, y: s.y + body.y });
  const hipY = 21 + body.y;

  // Braços atrás do corpo primeiro.
  if (pose.offArm === 'behind') drawArm(b, shoulder(skeleton.offShoulder), pose.offHand, side ? -1 : 0);
  if (pose.mainArm === 'behind') drawArm(b, shoulder(skeleton.mainShoulder), pose.mainHand, 0);

  // Pernas: de lado, a de longe fica atrás e um tom mais escura.
  if (side) {
    drawLeg(b, skeleton.offFoot.x + body.x, hipY, pose.offFoot, -1, 1);
    drawLeg(b, skeleton.mainFoot.x + body.x, hipY, pose.mainFoot, 0, 1);
  } else {
    drawLeg(b, skeleton.mainFoot.x + body.x, hipY, pose.mainFoot, 0, 0);
    drawLeg(b, skeleton.offFoot.x + body.x, hipY, pose.offFoot, 0, 0);
  }

  const torsoId = b.part('pele', { round: true });
  b.map.roundRect(torso.x + body.x, torso.y + body.y, torso.width, torso.height, 1, torsoId);
  const shortsId = b.part('tecido');
  b.map.rect(torso.x + body.x, torso.y + torso.height - 1 + body.y, torso.width, 3, shortsId);
  if (!side) b.map.rect(15 + body.x, torso.y + torso.height + 1 + body.y, 2, 1, -1);

  const headId = b.part('pele', { round: true, outlineOver: true });
  b.map.roundRect(head.x + body.x, head.y + body.y, head.width, head.height, 2, headId);
  if (side) b.map.set(head.x + head.width + body.x, head.y + 5 + body.y, headId);

  if (pose.offArm === 'front') drawArm(b, shoulder(skeleton.offShoulder), pose.offHand, 0);
  if (pose.mainArm === 'front') drawArm(b, shoulder(skeleton.mainShoulder), pose.mainHand, 0);
}

function lying(b: Builder, pose: Pose): void {
  const dy = pose.body.y;
  const head = LYING_HEAD_BOX;
  drawArm(b, { x: 19, y: 25 + dy }, pose.offHand, -1);
  const legs = b.part('pele', { outlineOver: true });
  b.map.limb(22, 23 + dy, pose.mainFoot.x, pose.mainFoot.y + dy, 2, legs);
  const leg2 = b.part('pele', { outlineOver: true, depth: -1 });
  b.map.limb(22, 25 + dy, pose.offFoot.x, pose.offFoot.y + dy, 2, leg2);
  const torsoId = b.part('pele', { round: true });
  b.map.roundRect(13, 21 + dy, 8, 6, 1, torsoId);
  const shortsId = b.part('tecido');
  b.map.rect(20, 21 + dy, 3, 6, shortsId);
  const headId = b.part('pele', { round: true, outlineOver: true });
  b.map.roundRect(head.x, head.y + dy, head.width, head.height, 2, headId);
  drawArm(b, { x: 15, y: 25 + dy }, pose.mainHand, 0);
}

/** Tom (0 a 3) de um pixel de parte: base, luz em cima e à esquerda, sombra embaixo e à direita. */
function shade(b: Builder, x: number, y: number, id: number, box: { minX: number; minY: number; maxX: number; maxY: number }): number {
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

function render(b: Builder, pose: Pose, options: ManequimOptions): IndexedImage {
  const { map, parts } = b;
  const image = new IndexedImage(map.width, map.height);
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

  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const id = map.get(x, y);
      if (id >= 0) {
        let tone = shade(b, x, y, id, boxes[id]);
        let channel = parts[id].channel;
        // Linha interna: uma parte da frente que encosta nesta deixa um contorno sobre ela.
        if (options.innerLines) {
          for (const [dx, dy] of neighbors) {
            const other = map.get(x + dx, y + dy);
            if (other > id && parts[other].outlineOver && parts[other].channel === channel) {
              tone = 0;
              break;
            }
          }
        }
        image.set(x, y, paletteIndex(channel, tone));
        continue;
      }
      // Contorno: pixel vazio encostado no corpo, na cor mais escura da parte mais alta ao lado.
      let top = -1;
      let lightSide = true;
      for (const [dx, dy] of neighbors) {
        const other = map.get(x + dx, y + dy);
        if (other < 0) continue;
        if (other > top) top = other;
        // O corpo à esquerda ou acima deste pixel quer dizer que ele está do lado da sombra.
        if (dx < 0 || dy < 0) lightSide = false;
      }
      if (top < 0) continue;
      const tone = options.selectiveOutline && lightSide && x < 16 && y < 20 ? 1 : 0;
      image.set(x, y, paletteIndex(parts[top].channel, tone));
    }
  }
  drawEyes(image, pose);
  return image;
}

function drawEyes(image: IndexedImage, pose: Pose): void {
  const eye = paletteIndex('olhos', 0);
  const dot = (x: number, y: number) => image.set(x, y, eye);
  let cy: number;
  let xs: number[];
  if (pose.lying) {
    const head = LYING_HEAD_BOX;
    cy = head.y + 3 + pose.body.y;
    xs = [head.x + 4];
    // Deitado de lado: só um olho à vista, virado para cima.
  } else if (pose.direction === 'up') {
    return;
  } else {
    const head = HEAD_BOX[pose.direction];
    cy = head.y + 4 + pose.body.y;
    xs = pose.direction === 'down' ? [head.x + 3 + pose.body.x, head.x + 8 + pose.body.x] : [head.x + 7 + pose.body.x];
  }
  for (const x of xs) {
    if (pose.eyes === 'open') {
      dot(x, cy);
      dot(x, cy + 1);
    } else if (pose.eyes === 'closed') {
      dot(x, cy + 1);
      dot(x + (x < 16 ? -1 : 1), cy + 1);
    } else {
      dot(x - 1, cy - 1);
      dot(x + 1, cy - 1);
      dot(x, cy);
      dot(x - 1, cy + 1);
      dot(x + 1, cy + 1);
    }
  }
}

/** Um quadro do manequim (32 × 32) para uma pose. */
export function drawManequim(pose: Pose, options: ManequimOptions = MANEQUIM_DEFAULTS): IndexedImage {
  const b = new Builder(MOLDE_FORMAT.frameWidth, MOLDE_FORMAT.frameHeight);
  if (pose.lying) lying(b, pose);
  else standing(b, pose);
  return render(b, pose, options);
}

/** A folha inteira do manequim, no formato do molde (uma animação por linha). */
export function generateManequimSheet(options: ManequimOptions = MANEQUIM_DEFAULTS): IndexedImage {
  const sheet = new IndexedImage(MOLDE_SIZE.width, MOLDE_SIZE.height);
  for (const [name, clip] of Object.entries(MOLDE_FORMAT.clips)) {
    MOLDE_POSES[name].forEach((pose, index) => {
      const { x, y } = frameRect(MOLDE_FORMAT, clip, index);
      sheet.blit(drawManequim(pose, options), x, y);
    });
  }
  return sheet;
}
