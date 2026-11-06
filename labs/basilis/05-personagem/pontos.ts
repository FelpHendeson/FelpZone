// Pontos por quadro do molde: onde cada camada que não é desenhada quadro a quadro se prende.
// Saem das poses (`poses.ts`), as mesmas que desenham o manequim.

import type { Vec } from '../01-controles/input.ts';
import { MOLDE_FORMAT } from './molde.ts';
import { HEAD_BOX, LYING_HEAD_BOX, MOLDE_POSES, TORSO_BOX, type Pose } from './poses.ts';

export type PointName = 'mao-principal' | 'mao-secundaria' | 'cabeca' | 'costas' | 'pes';

export const POINT_NAMES: PointName[] = ['mao-principal', 'mao-secundaria', 'cabeca', 'costas', 'pes'];

export const POINT_LABELS: Record<PointName, string> = {
  'mao-principal': 'Mão principal',
  'mao-secundaria': 'Mão secundária',
  cabeca: 'Cabeça',
  costas: 'Costas',
  pes: 'Pés (âncora)',
};

/** Número de orientações desenhadas de uma arma. 0 = direita, 4 = baixo, 8 = esquerda, 12 = cima (sentido horário na tela). */
export const ORIENTATIONS = 16;

export interface Point extends Vec {
  /** Se o que se prende aqui vai na frente do corpo (true) ou atrás (false). */
  front: boolean;
}

export interface HandPoint extends Point {
  /** Orientação da arma neste quadro, de 0 a 15. */
  orientation: number;
}

export interface FramePoints {
  'mao-principal': HandPoint;
  'mao-secundaria': Point;
  cabeca: Point;
  costas: Point;
  pes: Point;
}

/** Os pontos de uma pose. Coordenadas em cantos de pixel do quadro de 32 × 32. */
export function pointsOfPose(pose: Pose): FramePoints {
  const pes = { x: MOLDE_FORMAT.anchorX, y: MOLDE_FORMAT.anchorY, front: true };
  if (pose.lying) {
    const head = LYING_HEAD_BOX;
    return {
      'mao-principal': { ...pose.mainHand, front: pose.weapon.front, orientation: pose.weapon.orientation },
      'mao-secundaria': { ...pose.offHand, front: true },
      cabeca: { x: head.x - 1, y: head.y + Math.floor(head.height / 2) + pose.body.y, front: true },
      costas: { x: 17, y: 26 + pose.body.y, front: false },
      pes,
    };
  }
  const head = HEAD_BOX[pose.direction];
  const torso = TORSO_BOX[pose.direction];
  const back = pose.direction === 'up';
  return {
    'mao-principal': { ...pose.mainHand, front: pose.weapon.front, orientation: pose.weapon.orientation },
    'mao-secundaria': { ...pose.offHand, front: pose.offArm === 'front' },
    // Topo da cabeça: a linha de cima do contorno, no meio da cabeça.
    cabeca: { x: head.x + head.width / 2 + pose.body.x, y: head.y - 1 + pose.body.y, front: true },
    // Meio das costas. De lado as costas ficam do lado de trás do tronco; de costas, à vista.
    costas: {
      x: (pose.direction === 'side' ? torso.x : torso.x + torso.width / 2) + pose.body.x,
      y: torso.y + 3 + pose.body.y,
      front: back,
    },
    pes,
  };
}

/** Pontos de todas as animações, por nome de animação e quadro. */
export const MOLDE_POINTS: Record<string, FramePoints[]> = Object.fromEntries(
  Object.entries(MOLDE_POSES).map(([name, poses]) => [name, poses.map(pointsOfPose)]),
);

/** Orientação espelhada na horizontal: direita vira esquerda, cima e baixo ficam. */
export function mirrorOrientation(orientation: number): number {
  return (((ORIENTATIONS / 2 - orientation) % ORIENTATIONS) + ORIENTATIONS) % ORIENTATIONS;
}

/** Pontos do quadro espelhado (a esquerda é a direita espelhada): x vira largura − x. */
export function mirrorPoints(points: FramePoints, frameWidth = MOLDE_FORMAT.frameWidth): FramePoints {
  const flip = <T extends Point>(point: T): T => ({ ...point, x: frameWidth - point.x });
  const hand = points['mao-principal'];
  return {
    'mao-principal': { ...flip(hand), orientation: mirrorOrientation(hand.orientation) },
    'mao-secundaria': flip(points['mao-secundaria']),
    cabeca: flip(points.cabeca),
    costas: flip(points.costas),
    pes: flip(points.pes),
  };
}

/** Pontos de um quadro, já espelhados quando o personagem olha para a esquerda. */
export function pointsAt(clipName: string, frame: number, flip = false): FramePoints {
  const points = MOLDE_POINTS[clipName][frame];
  return flip ? mirrorPoints(points) : points;
}

/** Vetor unitário de uma orientação (y para baixo, como na tela). */
export function orientationVector(orientation: number): Vec {
  const angle = (orientation / ORIENTATIONS) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/** A tabela de pontos em JSON, para quem for desenhar camadas e armas fora do código. */
export function pointsJSON(): string {
  return JSON.stringify(
    {
      formato: {
        quadro: [MOLDE_FORMAT.frameWidth, MOLDE_FORMAT.frameHeight],
        ancora: [MOLDE_FORMAT.anchorX, MOLDE_FORMAT.anchorY],
        coordenadas: 'cantos de pixel; a esquerda é o lado espelhado (x vira 32 − x, orientação vira 8 − o)',
        orientacoes: '16; 0 = direita, 4 = baixo, 8 = esquerda, 12 = cima',
      },
      animacoes: Object.fromEntries(
        Object.entries(MOLDE_FORMAT.clips).map(([name, clip]) => [name, { linha: clip.row, quadros: MOLDE_POINTS[name] }]),
      ),
    },
    null,
    1,
  );
}
