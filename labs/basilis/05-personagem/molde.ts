// O molde do personagem: o formato da folha (quadros, linhas, âncora) que todas as camadas seguem,
// e as cores do manequim em tons-índice (canal + tom), prontas para a troca de paleta da parte 2.
// Usa o formato de folha do Lab 04 (`animation.ts`).

import { sheetSize, type Clip, type Direction, type SheetFormat } from '../04-animacao/animation.ts';

export type { Direction };

/** Direções desenhadas na folha. A esquerda é o lado espelhado. */
export const DIRECTIONS: Direction[] = ['down', 'up', 'side'];

/** Direção para onde o personagem olha na tela, incluindo a esquerda (que é o lado espelhado). */
export type Facing = Direction | 'left';
export const FACINGS: Facing[] = ['down', 'up', 'side', 'left'];

export const FACING_LABELS: Record<Facing, string> = {
  down: 'Baixo',
  up: 'Cima',
  side: 'Direita',
  left: 'Esquerda',
};

/** Linha desenhada e espelhamento para cada direção da tela. */
export function facingRow(facing: Facing): { direction: Direction; flip: boolean } {
  return facing === 'left' ? { direction: 'side', flip: true } : { direction: facing, flip: false };
}

/**
 * Ações do molde. As ações de arma entram como famílias de poses; a parte 1 prova só "cortar",
 * em duas linhas (ida e volta) para o combo. As próximas famílias (estocar, golpe pesado, puxar o arco,
 * arremessar, conjurar) acrescentam linhas depois da última, sem mexer nas que já existem.
 */
export type MoldeAction = 'idle' | 'walk' | 'dash' | 'hurt' | 'slash-a' | 'slash-b' | 'death';

export interface ActionInfo {
  action: MoldeAction;
  label: string;
  frames: number;
  fps: number;
  loop: boolean;
  /** Ações sem direção ocupam uma linha só (morrer). */
  directional: boolean;
  /** Quadros em que o golpe acerta. */
  active?: [number, number];
}

/** A tabela de linhas da folha, na ordem em que aparecem. Todas as camadas seguem esta tabela. */
export const MOLDE_ACTIONS: ActionInfo[] = [
  { action: 'idle', label: 'Parado', frames: 4, fps: 3, loop: true, directional: true },
  { action: 'walk', label: 'Andar', frames: 6, fps: 10, loop: true, directional: true },
  { action: 'dash', label: 'Dash', frames: 3, fps: 12, loop: false, directional: true },
  { action: 'hurt', label: 'Levar dano', frames: 2, fps: 10, loop: false, directional: true },
  { action: 'slash-a', label: 'Cortar (ida)', frames: 4, fps: 16, loop: false, directional: true, active: [1, 2] },
  { action: 'slash-b', label: 'Cortar (volta)', frames: 4, fps: 16, loop: false, directional: true, active: [1, 2] },
  { action: 'death', label: 'Morrer', frames: 4, fps: 6, loop: false, directional: false },
];

/** Nome da animação na folha: `ação-direção`; ações sem direção usam só o nome da ação. */
export function moldeClipName(action: MoldeAction, direction: Direction): string {
  const info = MOLDE_ACTIONS.find((entry) => entry.action === action)!;
  return info.directional ? `${action}-${direction}` : action;
}

function buildClips(): Record<string, Clip> {
  const clips: Record<string, Clip> = {};
  let row = 0;
  for (const info of MOLDE_ACTIONS) {
    const clip = (r: number): Clip => ({ row: r, frames: info.frames, fps: info.fps, loop: info.loop, active: info.active });
    if (!info.directional) {
      clips[info.action] = clip(row++);
      continue;
    }
    for (const direction of DIRECTIONS) clips[`${info.action}-${direction}`] = clip(row++);
  }
  return clips;
}

/** Quadros de 32 × 32 com âncora nos pés em (16, 28), como no Lab 04. */
export const MOLDE_FORMAT: SheetFormat = {
  frameWidth: 32,
  frameHeight: 32,
  anchorX: 16,
  anchorY: 28,
  clips: buildClips(),
};

export const MOLDE_SIZE = sheetSize(MOLDE_FORMAT);

// ---- Cores em tons-índice ----

/**
 * Canais de cor. Cada pixel do molde é um tom de um canal; a parte 2 troca a rampa de cada canal
 * pela paleta-mestra. O tom 0 é sempre o mais escuro, que serve de contorno daquela parte.
 */
export type Channel = 'pele' | 'tecido' | 'olhos';

export interface PaletteEntry {
  channel: Channel;
  tone: number;
  color: string;
}

/** Rampas do manequim: contorno, sombra, base e luz (luz sempre do alto à esquerda). */
export const MANEQUIM_RAMPS: Record<Channel, string[]> = {
  pele: ['#5c2f2a', '#b06a4c', '#dc9c74', '#f5cfa4'],
  tecido: ['#2a2a4a', '#45507a', '#6676a4', '#8fa0c8'],
  olhos: ['#2b1d2e'],
};

/** Paleta indexada do manequim: o índice 0 é transparente; os demais são (canal, tom). */
export const MANEQUIM_PALETTE: (PaletteEntry | null)[] = [
  null,
  ...(Object.entries(MANEQUIM_RAMPS) as [Channel, string[]][]).flatMap(([channel, ramp]) =>
    ramp.map((color, tone) => ({ channel, tone, color })),
  ),
];

/** Índice da paleta para um tom de um canal. */
export function paletteIndex(channel: Channel, tone: number): number {
  const ramp = MANEQUIM_RAMPS[channel];
  const clamped = Math.max(0, Math.min(ramp.length - 1, tone));
  return MANEQUIM_PALETTE.findIndex((entry) => entry !== null && entry.channel === channel && entry.tone === clamped);
}
