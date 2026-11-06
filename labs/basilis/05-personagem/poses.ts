// Poses do molde: para cada animação e quadro, onde ficam o corpo, as mãos, os pés e a arma.
// O manequim é desenhado a partir das poses e os pontos por quadro saem delas, então o desenho
// e os pontos nunca se desencontram. Coordenadas no quadro de 32 × 32, em cantos de pixel
// (a âncora dos pés, (16, 28), é a linha entre os pixels 15 e 16 e o pé do pixel 27).

import type { Vec } from '../01-controles/input.ts';
import { MOLDE_ACTIONS, MOLDE_FORMAT, moldeClipName, DIRECTIONS, type Direction, type MoldeAction } from './molde.ts';

export type Layer = 'front' | 'behind';
export type Eyes = 'open' | 'closed' | 'x';

export interface Pose {
  direction: Direction;
  /** Deslocamento de cabeça, tronco e ombros: respiração, agachamento, inclinação. */
  body: Vec;
  /** Mão principal (direita do personagem), em cantos de pixel; a mão é o 2 × 2 em volta do ponto. */
  mainHand: Vec;
  offHand: Vec;
  /** Se o braço é desenhado na frente ou atrás do tronco e da cabeça. */
  mainArm: Layer;
  offArm: Layer;
  /** Centro do pé (pixel do meio da perna) de cada lado. */
  mainFoot: Vec;
  offFoot: Vec;
  /** Orientação da arma (0 a 15; 0 = direita, 4 = baixo, 8 = esquerda, 12 = cima) e se vai na frente do corpo. */
  weapon: { orientation: number; front: boolean };
  eyes: Eyes;
  /** Deitado no chão (fim da morte): desenho próprio. */
  lying?: boolean;
}

/** Esqueleto em pé de cada direção, sem deslocamento: ombros, mãos em repouso e pés. */
export const SKELETON: Record<
  Direction,
  { mainShoulder: Vec; offShoulder: Vec; mainHand: Vec; offHand: Vec; mainFoot: Vec; offFoot: Vec; mainArm: Layer; offArm: Layer }
> = {
  // De frente, a direita do personagem fica à esquerda da tela.
  down: {
    mainShoulder: { x: 10, y: 16 },
    offShoulder: { x: 22, y: 16 },
    mainHand: { x: 10, y: 21 },
    offHand: { x: 22, y: 21 },
    mainFoot: { x: 13, y: 25 },
    offFoot: { x: 18, y: 25 },
    mainArm: 'front',
    offArm: 'front',
  },
  up: {
    mainShoulder: { x: 22, y: 16 },
    offShoulder: { x: 10, y: 16 },
    mainHand: { x: 22, y: 21 },
    offHand: { x: 10, y: 21 },
    mainFoot: { x: 18, y: 25 },
    offFoot: { x: 13, y: 25 },
    mainArm: 'front',
    offArm: 'front',
  },
  // Olhando para a direita, a direita do personagem é o lado de perto (o de baixo da tela).
  side: {
    mainShoulder: { x: 16, y: 16 },
    offShoulder: { x: 15, y: 16 },
    mainHand: { x: 17, y: 21 },
    offHand: { x: 14, y: 21 },
    mainFoot: { x: 17, y: 25 },
    offFoot: { x: 15, y: 25 },
    mainArm: 'front',
    offArm: 'behind',
  },
};

/** Orientação da arma em repouso: ponta para baixo, ao lado do corpo (lâmina longa). */
const REST_ORIENTATION: Record<Direction, number> = { down: 5, up: 3, side: 3 };

interface PoseOptions {
  body?: Vec;
  /** Desvio das mãos (somado à posição de repouso mais o corpo). */
  mainSwing?: Vec;
  offSwing?: Vec;
  /** Posição absoluta da mão principal (golpes). */
  mainHandAt?: Vec;
  mainFoot?: Vec;
  offFoot?: Vec;
  orientation?: number;
  front?: boolean;
  mainArm?: Layer;
  eyes?: Eyes;
}

const add = (a: Vec, b: Vec = { x: 0, y: 0 }): Vec => ({ x: a.x + b.x, y: a.y + b.y });

function pose(direction: Direction, options: PoseOptions = {}): Pose {
  const skeleton = SKELETON[direction];
  const body = options.body ?? { x: 0, y: 0 };
  return {
    direction,
    body,
    mainHand: options.mainHandAt ?? add(add(skeleton.mainHand, body), options.mainSwing),
    offHand: add(add(skeleton.offHand, body), options.offSwing),
    mainArm: options.mainArm ?? skeleton.mainArm,
    offArm: skeleton.offArm,
    mainFoot: add(skeleton.mainFoot, options.mainFoot),
    offFoot: add(skeleton.offFoot, options.offFoot),
    weapon: { orientation: options.orientation ?? REST_ORIENTATION[direction], front: options.front ?? true },
    eyes: options.eyes ?? 'open',
  };
}

/** "Para a frente" de cada direção, em pixels de tela. */
const FORWARD: Record<Direction, Vec> = { down: { x: 0, y: 1 }, up: { x: 0, y: -1 }, side: { x: 1, y: 0 } };
const scale = (v: Vec, k: number): Vec => ({ x: v.x * k, y: v.y * k });

function idle(direction: Direction): Pose[] {
  // Respira: os ombros e a cabeça descem um pixel na metade do ciclo.
  return [0, 0, 1, 1].map((dy) => pose(direction, { body: { x: 0, y: dy } }));
}

function walk(direction: Direction): Pose[] {
  // Contato, desce, passa; e o mesmo com o outro pé.
  const bob = [0, 1, -1, 0, 1, -1];
  if (direction === 'side') {
    const step = [2, 1, 0, -2, -1, 0];
    const lift = [0, 0, 0, 0, 0, -1];
    const offLift = [0, 0, -1, 0, 0, 0];
    return step.map((s, i) =>
      pose(direction, {
        body: { x: 0, y: bob[i] },
        mainFoot: { x: s, y: lift[i] },
        offFoot: { x: -s, y: offLift[i] },
        mainSwing: { x: -s, y: 0 },
        offSwing: { x: s, y: 0 },
        orientation: s > 0 ? 2 : s < 0 ? 4 : 3,
      }),
    );
  }
  // De frente e de costas o pé da frente desce um pixel na tela (de costas, sobe) e o de trás sobe.
  const toward = direction === 'down' ? 1 : -1;
  const step = [1, 0, 0, -1, 0, 0];
  const mainLift = [0, 0, 0, 0, 0, -1];
  const offLift = [0, 0, -1, 0, 0, 0];
  const swing = [-1, -1, 0, 1, 1, 0];
  return step.map((s, i) =>
    pose(direction, {
      body: { x: 0, y: bob[i] },
      mainFoot: { x: 0, y: s * toward + mainLift[i] },
      offFoot: { x: 0, y: -s * toward + offLift[i] },
      mainSwing: { x: 0, y: swing[i] * toward },
      offSwing: { x: 0, y: -swing[i] * toward },
    }),
  );
}

function dash(direction: Direction): Pose[] {
  // Arranque (abaixa e inclina), deslize (baixo, pernas abertas, braços para trás), freio (inclina para trás).
  const f = FORWARD[direction];
  const lean = [1, 2, -1];
  const crouch = [1, 2, 1];
  const feet = [1, 3, 2];
  return lean.map((l, i) =>
    pose(direction, {
      body: add(scale(f, direction === 'side' ? l : 0), { x: 0, y: crouch[i] }),
      mainFoot: scale(f, i === 2 ? feet[i] : -feet[i] + 1),
      offFoot: scale(f, i === 2 ? -1 : feet[i]),
      mainSwing: scale(f, i === 2 ? 1 : -2),
      offSwing: scale(f, i === 2 ? 1 : -2),
      orientation: REST_ORIENTATION[direction] + (direction === 'down' ? 1 : direction === 'up' ? -1 : 1) * (i === 1 ? 2 : 0),
      eyes: i === 1 ? 'closed' : 'open',
    }),
  );
}

function hurt(direction: Direction): Pose[] {
  // Empurrado para trás com os braços abertos, depois se recompõe.
  const back = scale(FORWARD[direction], -1);
  return [
    pose(direction, {
      body: add(back, { x: 0, y: direction === 'side' ? 1 : 0 }),
      mainSwing: { x: direction === 'down' ? -1 : direction === 'up' ? 1 : -1, y: -2 },
      offSwing: { x: direction === 'down' ? 1 : direction === 'up' ? -1 : -1, y: -2 },
      orientation: REST_ORIENTATION[direction] + (direction === 'down' ? 2 : -2),
      eyes: 'x',
    }),
    pose(direction, { body: { x: 0, y: 1 }, orientation: REST_ORIENTATION[direction] + (direction === 'down' ? 1 : -1), eyes: 'closed' }),
  ];
}

interface SwingKey {
  hand: Vec;
  orientation: number;
  front: boolean;
  arm?: Layer;
  body?: Vec;
}

/**
 * Família "cortar": prepara, corta, acerta, volta. A ida varre do lado da mão principal para o outro;
 * a volta varre de volta, para o combo. A arma passa para trás do corpo quando está erguida ou
 * quando o personagem corta de costas.
 */
const SLASH: Record<'slash-a' | 'slash-b', Record<Direction, SwingKey[]>> = {
  'slash-a': {
    down: [
      { hand: { x: 8, y: 14 }, orientation: 11, front: false, body: { x: 0, y: 1 } },
      { hand: { x: 9, y: 22 }, orientation: 6, front: true, body: { x: 0, y: 1 } },
      { hand: { x: 16, y: 23 }, orientation: 3, front: true, body: { x: 0, y: 1 } },
      { hand: { x: 12, y: 22 }, orientation: 4, front: true },
    ],
    up: [
      { hand: { x: 24, y: 20 }, orientation: 2, front: true, body: { x: 0, y: 1 } },
      { hand: { x: 23, y: 12 }, orientation: 13, front: false, arm: 'behind', body: { x: 0, y: -1 } },
      { hand: { x: 15, y: 11 }, orientation: 10, front: false, arm: 'behind', body: { x: 0, y: -1 } },
      { hand: { x: 21, y: 20 }, orientation: 3, front: true },
    ],
    side: [
      { hand: { x: 12, y: 13 }, orientation: 10, front: false, body: { x: -1, y: 1 } },
      { hand: { x: 21, y: 14 }, orientation: 15, front: true, body: { x: 1, y: 0 } },
      { hand: { x: 21, y: 20 }, orientation: 2, front: true, body: { x: 1, y: 1 } },
      { hand: { x: 18, y: 21 }, orientation: 3, front: true },
    ],
  },
  'slash-b': {
    down: [
      { hand: { x: 21, y: 18 }, orientation: 1, front: true, body: { x: 0, y: 1 } },
      { hand: { x: 15, y: 23 }, orientation: 4, front: true, body: { x: 0, y: 1 } },
      { hand: { x: 9, y: 22 }, orientation: 7, front: true, body: { x: 0, y: 1 } },
      { hand: { x: 10, y: 21 }, orientation: 5, front: true },
    ],
    up: [
      { hand: { x: 12, y: 13 }, orientation: 10, front: false, arm: 'behind', body: { x: 0, y: 1 } },
      { hand: { x: 16, y: 11 }, orientation: 12, front: false, arm: 'behind', body: { x: 0, y: -1 } },
      { hand: { x: 23, y: 12 }, orientation: 14, front: false, arm: 'behind', body: { x: 0, y: -1 } },
      { hand: { x: 22, y: 21 }, orientation: 3, front: true },
    ],
    side: [
      { hand: { x: 20, y: 21 }, orientation: 3, front: true, body: { x: 1, y: 1 } },
      { hand: { x: 22, y: 16 }, orientation: 0, front: true, body: { x: 1, y: 0 } },
      { hand: { x: 19, y: 11 }, orientation: 13, front: false, body: { x: 0, y: -1 } },
      { hand: { x: 17, y: 21 }, orientation: 3, front: true },
    ],
  },
};

function slash(action: 'slash-a' | 'slash-b', direction: Direction): Pose[] {
  return SLASH[action][direction].map((key) =>
    pose(direction, {
      body: key.body,
      mainHandAt: key.hand,
      orientation: key.orientation,
      front: key.front,
      mainArm: key.arm,
      eyes: 'open',
    }),
  );
}

/** Morrer: uma só, de frente. Ajoelha, cai e fica deitado. */
function death(): Pose[] {
  const lying: Pose = {
    direction: 'down',
    body: { x: 0, y: 0 },
    mainHand: { x: 11, y: 28 },
    offHand: { x: 21, y: 28 },
    mainArm: 'front',
    offArm: 'front',
    mainFoot: { x: 27, y: 23 },
    offFoot: { x: 27, y: 25 },
    weapon: { orientation: 8, front: true },
    eyes: 'x',
    lying: true,
  };
  return [
    pose('down', { body: { x: 0, y: 2 }, mainSwing: { x: 0, y: 1 }, offSwing: { x: 0, y: 1 }, orientation: 5, eyes: 'x' }),
    pose('down', { body: { x: 0, y: 4 }, mainSwing: { x: -1, y: 1 }, offSwing: { x: 1, y: 1 }, orientation: 6, eyes: 'x' }),
    lying,
    { ...lying, body: { x: 0, y: 1 }, eyes: 'closed' },
  ];
}

function posesFor(action: MoldeAction, direction: Direction): Pose[] {
  switch (action) {
    case 'idle':
      return idle(direction);
    case 'walk':
      return walk(direction);
    case 'dash':
      return dash(direction);
    case 'hurt':
      return hurt(direction);
    case 'slash-a':
    case 'slash-b':
      return slash(action, direction);
    case 'death':
      return death();
  }
}

/** Todas as poses do molde, por nome de animação (o mesmo nome das linhas da folha). */
export const MOLDE_POSES: Record<string, Pose[]> = (() => {
  const table: Record<string, Pose[]> = {};
  for (const info of MOLDE_ACTIONS) {
    for (const direction of info.directional ? DIRECTIONS : (['down'] as Direction[])) {
      table[moldeClipName(info.action, direction)] = posesFor(info.action, direction);
    }
  }
  return table;
})();

/** Garante que a tabela de poses cobre exatamente as animações do formato. */
export function missingPoses(): string[] {
  return Object.entries(MOLDE_FORMAT.clips)
    .filter(([name, clip]) => MOLDE_POSES[name]?.length !== clip.frames)
    .map(([name]) => name);
}

/** Caixas (em pixels) da cabeça e do tronco em pé, sem deslocamento; o manequim e os pontos usam as mesmas. */
export const HEAD_BOX: Record<Direction, { x: number; y: number; width: number; height: number }> = {
  down: { x: 10, y: 5, width: 12, height: 9 },
  up: { x: 10, y: 5, width: 12, height: 9 },
  side: { x: 11, y: 5, width: 10, height: 9 },
};

export const TORSO_BOX: Record<Direction, { x: number; y: number; width: number; height: number }> = {
  down: { x: 12, y: 14, width: 8, height: 7 },
  up: { x: 12, y: 14, width: 8, height: 7 },
  side: { x: 13, y: 14, width: 6, height: 7 },
};

/** Cabeça do corpo deitado (fim da morte). */
export const LYING_HEAD_BOX = { x: 4, y: 19, width: 9, height: 8 };
