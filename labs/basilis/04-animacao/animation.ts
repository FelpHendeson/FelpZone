// Núcleo de animação: o formato das folhas de personagem, quadros por tempo e a escolha do estado.

import type { Vec } from '../01-controles/input.ts';

/** Uma animação: uma linha da folha, com quantos quadros, a que velocidade e se repete. */
export interface Clip {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
  /** Quadros (do primeiro ao último, inclusive) em que o golpe acerta. */
  active?: [number, number];
}

/**
 * Formato de uma folha de personagem: quadros de tamanho fixo, uma animação por linha.
 * A âncora é o ponto dos pés dentro do quadro; é ela que fica sobre a posição do personagem no mundo.
 */
export interface SheetFormat {
  frameWidth: number;
  frameHeight: number;
  anchorX: number;
  anchorY: number;
  clips: Record<string, Clip>;
}

export function frameRect(format: SheetFormat, clip: Clip, index: number): { x: number; y: number; width: number; height: number } {
  return { x: index * format.frameWidth, y: clip.row * format.frameHeight, width: format.frameWidth, height: format.frameHeight };
}

/** Tamanho que a folha precisa ter para caber todas as animações do formato. */
export function sheetSize(format: SheetFormat): { width: number; height: number } {
  const clips = Object.values(format.clips);
  return {
    width: Math.max(...clips.map((clip) => clip.frames)) * format.frameWidth,
    height: (Math.max(...clips.map((clip) => clip.row)) + 1) * format.frameHeight,
  };
}

export function clipDuration(clip: Clip): number {
  return clip.frames / clip.fps;
}

/** Quadro da animação depois de `time` segundos. Sem repetição, para no último e avisa que terminou. */
export function clipFrame(clip: Clip, time: number): { index: number; finished: boolean } {
  const raw = Math.floor(Math.max(0, time) * clip.fps + 1e-9);
  if (clip.loop) return { index: raw % clip.frames, finished: false };
  return { index: Math.min(raw, clip.frames - 1), finished: raw >= clip.frames };
}

export function isActiveFrame(clip: Clip, index: number): boolean {
  return clip.active !== undefined && index >= clip.active[0] && index <= clip.active[1];
}

/** Toca uma animação por vez; trocar de animação recomeça do primeiro quadro. */
export class Animator {
  name = '';
  time = 0;

  play(name: string, restart = false): void {
    if (name === this.name && !restart) return;
    this.name = name;
    this.time = 0;
  }

  update(dt: number, speed = 1): void {
    this.time += dt * speed;
  }
}

export type Direction = 'down' | 'up' | 'side';

/** Linha da folha para onde o personagem olha. A esquerda é a direita espelhada. */
export function directionOf(facing: Vec): { direction: Direction; flip: boolean } {
  if (Math.abs(facing.x) > Math.abs(facing.y)) return { direction: 'side', flip: facing.x < 0 };
  return { direction: facing.y < 0 ? 'up' : 'down', flip: false };
}

export type HeroAction = 'idle' | 'walk' | 'attack' | 'hurt' | 'dodge' | 'death';

export interface HeroSnapshot {
  dead: boolean;
  hurt: boolean;
  dodging: boolean;
  attacking: boolean;
  speed: number;
}

/** O que o herói está fazendo, em ordem de prioridade: morrer vence tudo, andar só perde para ficar parado. */
export function heroAction(state: HeroSnapshot): HeroAction {
  if (state.dead) return 'death';
  if (state.hurt) return 'hurt';
  if (state.dodging) return 'dodge';
  if (state.attacking) return 'attack';
  if (state.speed > 0.3) return 'walk';
  return 'idle';
}

/** Nome da animação na folha: ações com direção usam `ação-direção`; morrer é uma só. */
export function heroClipName(action: HeroAction, direction: Direction): string {
  return action === 'death' ? 'death' : `${action}-${direction}`;
}
