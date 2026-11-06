// A lógica do personagem na arena (parte 4), sem DOM: que animação do molde toca para cada estado do
// movimento do Lab 01, com a prioridade do Lab 04 (esquiva > corte > andar > parado). O corte alterna
// ida e volta a cada golpe (as duas linhas do molde, o começo do combo). A esquiva é a do Lab 04; como o
// molde não tem a linha de rolar, ela usa a linha do dash como desenho (o dash de verdade é do Lab 08).

import { clipDuration, directionOf, type Direction } from '../04-animacao/animation.ts';
import type { Vec } from '../01-controles/input.ts';
import { MOLDE_FORMAT, moldeClipName, type MoldeAction } from './molde.ts';

/** Abaixo desta velocidade (tiles/s) o personagem está parado, como no Lab 04. */
export const WALK_THRESHOLD = 0.3;

export interface EstadoNaArena {
  dodging: boolean;
  attacking: boolean;
  speed: number;
  /** Quantos golpes já saíram (o par corta na ida, o ímpar na volta). */
  golpes: number;
}

export function acaoNaArena(estado: EstadoNaArena): MoldeAction {
  if (estado.dodging) return 'dash';
  if (estado.attacking) return estado.golpes % 2 === 1 ? 'slash-a' : 'slash-b';
  if (estado.speed > WALK_THRESHOLD) return 'walk';
  return 'idle';
}

/** A linha da folha e o espelhamento para onde o personagem olha. */
export function clipNaArena(estado: EstadoNaArena, facing: Vec): { name: string; direction: Direction; flip: boolean } {
  const { direction, flip } = directionOf(facing);
  return { name: moldeClipName(acaoNaArena(estado), direction), direction, flip };
}

/** A duração do corte (ida e volta têm a mesma), que vira a duração do ataque no movimento. */
export const DURACAO_DO_CORTE = clipDuration(MOLDE_FORMAT.clips['slash-a-down']);
