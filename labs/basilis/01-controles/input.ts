// Matemática das entradas: transforma polegar, analógico e teclas em intenção de movimento.

export interface Vec {
  x: number;
  y: number;
}

export type Curve = 'linear' | 'smooth';
export type Directions = 'free' | '8' | '4';

const ZERO: Vec = { x: 0, y: 0 };

export function length(v: Vec): number {
  return Math.hypot(v.x, v.y);
}

/**
 * Converte um deslocamento (do polegar ou do analógico) em intenção de 0 a 1.
 * A zona morta é uma fração do raio; depois dela a escala recomeça do zero para não haver salto.
 */
export function stickVector(dx: number, dy: number, radius: number, deadZone: number, curve: Curve): Vec {
  const distance = Math.hypot(dx, dy);
  if (radius <= 0 || distance === 0) return ZERO;
  const raw = Math.min(distance / radius, 1);
  if (raw <= deadZone) return ZERO;
  let magnitude = deadZone >= 1 ? 0 : (raw - deadZone) / (1 - deadZone);
  if (curve === 'smooth') magnitude *= magnitude;
  return { x: (dx / distance) * magnitude, y: (dy / distance) * magnitude };
}

/** Prende a direção a 4 ou 8 setores, mantendo a intensidade. */
export function snapDirection(v: Vec, mode: Directions): Vec {
  const magnitude = length(v);
  if (mode === 'free' || magnitude === 0) return v;
  const step = (2 * Math.PI) / (mode === '8' ? 8 : 4);
  const angle = Math.round(Math.atan2(v.y, v.x) / step) * step;
  return { x: clean(Math.cos(angle) * magnitude), y: clean(Math.sin(angle) * magnitude) };
}

/** Direção das teclas, normalizada para a diagonal não ser mais rápida. */
export function keysVector(up: boolean, down: boolean, left: boolean, right: boolean): Vec {
  const x = (right ? 1 : 0) - (left ? 1 : 0);
  const y = (down ? 1 : 0) - (up ? 1 : 0);
  if (x === 0 && y === 0) return ZERO;
  const magnitude = Math.hypot(x, y);
  return { x: x / magnitude, y: y / magnitude };
}

function clean(value: number): number {
  return Math.abs(value) < 1e-9 ? 0 : value;
}
