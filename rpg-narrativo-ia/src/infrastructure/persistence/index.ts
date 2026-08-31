import { SCHEMA_VERSION, inspectGameState, type GameState } from '../../core/state';

export const SAVE_KEY = 'reset.mvp.save';

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: GameState }
  | { status: 'incompatible'; foundVersion: unknown }
  | { status: 'corrupt'; reason: string };

export interface GamePersistence {
  load(): LoadResult;
  save(state: GameState): void;
  clear(): void;
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

export function parseGameState(raw: string): LoadResult {
  if (!raw || raw.trim() === '') {
    return { status: 'empty' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { status: 'corrupt', reason: 'O salvamento não pôde ser lido.' };
  }

  try {
    if (!isRecord(parsed)) {
      return { status: 'corrupt', reason: 'O salvamento não contém um objeto válido.' };
    }

    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      return { status: 'incompatible', foundVersion: parsed.schemaVersion };
    }

    const inspected = inspectGameState(parsed);
    if (!inspected.ok) {
      return { status: 'corrupt', reason: inspected.reason };
    }

    return { status: 'ok', state: inspected.state };
  } catch {
    return { status: 'corrupt', reason: 'O salvamento está corrompido.' };
  }
}

export function createPersistence(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): GamePersistence {
  return {
    load() {
      const raw = storage.getItem(SAVE_KEY);
      if (raw === null) {
        return { status: 'empty' };
      }

      return parseGameState(raw);
    },
    save(state) {
      storage.setItem(SAVE_KEY, serializeGameState(state));
    },
    clear() {
      storage.removeItem(SAVE_KEY);
    },
  };
}

export function createMemoryPersistence(initial?: string): GamePersistence {
  const memory = new Map<string, string>();
  if (initial) {
    memory.set(SAVE_KEY, initial);
  }

  return createPersistence({
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
    },
    removeItem: (key) => {
      memory.delete(key);
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
