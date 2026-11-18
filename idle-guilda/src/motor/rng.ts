import type { Estado } from './tipos';

/**
 * Gerador pseudoaleatório (mulberry32) com a semente guardada no estado:
 * a mesma situação sempre produz o mesmo resultado, inclusive offline.
 */
export function aleatorio(e: Estado): number {
  e.semente = (e.semente + 0x6d2b79f5) | 0;
  let t = e.semente;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function sortear<T>(e: Estado, lista: readonly T[]): T {
  return lista[Math.floor(aleatorio(e) * lista.length) % lista.length];
}

/** Sorteia um índice com pesos. */
export function sortearPeso(e: Estado, pesos: readonly number[]): number {
  const total = pesos.reduce((s, p) => s + p, 0);
  let r = aleatorio(e) * total;
  for (let i = 0; i < pesos.length; i++) {
    r -= pesos[i];
    if (r < 0) return i;
  }
  return pesos.length - 1;
}
