import type { ChanceBand, ChanceInspection, ChanceState } from './types';

export type { ChanceBand, ChanceInspection, ChanceState } from './types';

const UINT32 = 0x1_0000_0000;

/** FNV-1a de 32 bits: semente estável a partir de dados já conhecidos (sem relógio nem Math.random). */
export function seedFromText(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function createChanceState(seedSource: string): ChanceState {
  return { seed: seedFromText(seedSource), cursor: 0 };
}

/** Valor em [0, 1) para a posição atual do cursor (mulberry32 sobre seed + cursor). Pura. */
export function chanceUnit(state: ChanceState): number {
  let t = (state.seed + Math.imul(state.cursor + 1, 0x6d2b79f5)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / UINT32;
}

/** Consome uma posição do cursor e devolve o índice sorteado entre pesos inteiros positivos. */
export function drawWeighted(state: ChanceState, weights: readonly number[]): { index: number; next: ChanceState } {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (weights.length === 0 || total <= 0 || weights.some((weight) => !Number.isInteger(weight) || weight < 0)) {
    throw new Error('Os pesos do sorteio são inválidos.');
  }
  const target = chanceUnit(state) * total;
  let accumulated = 0;
  let index = weights.length - 1;
  for (let candidate = 0; candidate < weights.length; candidate += 1) {
    accumulated += weights[candidate]!;
    if (target < accumulated) {
      index = candidate;
      break;
    }
  }
  return { index, next: { seed: state.seed, cursor: state.cursor + 1 } };
}

/** Classifica a chance do desfecho favorável: ≥ 70% alta, ≥ 40% incerta, abaixo disso arriscada. */
export function chanceBand(favorable: number, total: number): ChanceBand {
  const ratio = total > 0 ? favorable / total : 0;
  if (ratio >= 0.7) return 'alta';
  if (ratio >= 0.4) return 'incerta';
  return 'arriscada';
}

export function inspectChanceState(value: unknown): ChanceInspection<ChanceState> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !isUint32((value as Record<string, unknown>).seed) ||
    !isCursor((value as Record<string, unknown>).cursor)
  ) {
    return { ok: false, reason: 'O estado de sorte do salvamento é inválido.' };
  }
  const record = value as { seed: number; cursor: number };
  return { ok: true, value: { seed: record.seed, cursor: record.cursor } };
}

function isUint32(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < UINT32;
}

function isCursor(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
