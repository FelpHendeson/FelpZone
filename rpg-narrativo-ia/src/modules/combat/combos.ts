import type { IndexedCombat } from './types';

/** Combos que o jogador já descobriu em confrontos do mundo (opcional e aditivo no save). */
export interface ComboDiscoveryState {
  discovered: string[];
}

export function createInitialComboDiscovery(): ComboDiscoveryState {
  return { discovered: [] };
}

export function copyComboDiscovery(state: ComboDiscoveryState): ComboDiscoveryState {
  return { discovered: [...state.discovered] };
}

export function inspectComboDiscovery(
  value: unknown,
  catalog: IndexedCombat,
): { ok: true; value: ComboDiscoveryState } | { ok: false; reason: string } {
  const fail = { ok: false as const, reason: 'Os combos descobertos do salvamento são inválidos.' };
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail;
  const discovered = (value as Record<string, unknown>).discovered;
  if (!Array.isArray(discovered) || discovered.length > catalog.combos.length) return fail;
  const known = new Set(catalog.combos.map((combo) => combo.id));
  const seen = new Set<string>();
  for (const id of discovered) {
    if (typeof id !== 'string' || seen.has(id) || !known.has(id)) return fail;
    seen.add(id);
  }
  return { ok: true, value: { discovered: [...seen] } };
}

/** Acrescenta os combos acionados, mantendo a ordem de descoberta; devolve também os novos. */
export function discoverCombos(
  state: ComboDiscoveryState | undefined,
  triggered: readonly string[],
): { current: ComboDiscoveryState; added: string[] } {
  const discovered = [...(state?.discovered ?? [])];
  const added: string[] = [];
  for (const id of triggered) {
    if (!discovered.includes(id)) {
      discovered.push(id);
      added.push(id);
    }
  }
  return { current: { discovered }, added };
}
