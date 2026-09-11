import {
  SCHEMA_VERSION,
  SCHEMA_VERSION_V1,
  SCHEMA_VERSION_V2,
  SCHEMA_VERSION_V3,
  SCHEMA_VERSION_V4,
  SCHEMA_VERSION_V5,
  inspectGameState,
  inspectGameStateV1,
  inspectGameStateV2,
  inspectGameStateV3,
  inspectGameStateV4,
  inspectGameStateV5,
  migrateGameStateV1,
  migrateGameStateV2,
  migrateGameStateV3,
  migrateGameStateV4,
  migrateGameStateV5,
  type GameState,
} from '../../core/state';
import type { SandboxContext } from '../../modules/sandbox';
import { INITIAL_OBJECTIVES, synchronizeObjectives, type IndexedObjectives } from '../../modules/objectives';

export const SAVE_KEY = 'reset.mvp.save';

export class PersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PersistenceError';
  }
}

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

export function serializeGameState(
  state: GameState,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): string {
  const inspected = inspectGameState(state, context, objectiveCatalog);
  if (!inspected.ok) {
    throw new PersistenceError(inspected.reason);
  }

  return JSON.stringify(inspected.state);
}

export function parseGameState(
  raw: string,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): LoadResult {
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

    if (parsed.schemaVersion === SCHEMA_VERSION_V1) {
      const previous = inspectGameStateV1(parsed);
      if (!previous.ok) {
        return { status: 'corrupt', reason: previous.reason };
      }

      const migrated = inspectGameState(
        migrateGameStateV1(previous.state, context, objectiveCatalog),
        context,
        objectiveCatalog,
      );
      if (!migrated.ok) {
        return { status: 'corrupt', reason: migrated.reason };
      }

      return { status: 'ok', state: migrated.state };
    }

    if (parsed.schemaVersion === SCHEMA_VERSION_V2) {
      const previous = inspectGameStateV2(parsed, context);
      if (!previous.ok) {
        return { status: 'corrupt', reason: previous.reason };
      }

      const migrated = inspectGameState(
        migrateGameStateV2(previous.state, context, objectiveCatalog),
        context,
        objectiveCatalog,
      );
      if (!migrated.ok) {
        return { status: 'corrupt', reason: migrated.reason };
      }

      return { status: 'ok', state: migrated.state };
    }

    if (parsed.schemaVersion === SCHEMA_VERSION_V3) {
      const previous = inspectGameStateV3(parsed, context);
      if (!previous.ok) {
        return { status: 'corrupt', reason: previous.reason };
      }

      const migrated = inspectGameState(
        migrateGameStateV3(previous.state, context, objectiveCatalog),
        context,
        objectiveCatalog,
      );
      if (!migrated.ok) {
        return { status: 'corrupt', reason: migrated.reason };
      }

      return { status: 'ok', state: migrated.state };
    }

    if (parsed.schemaVersion === SCHEMA_VERSION_V4) {
      const previous = inspectGameStateV4(parsed, context);
      if (!previous.ok) {
        return { status: 'corrupt', reason: previous.reason };
      }

      const migrated = inspectGameState(
        migrateGameStateV4(previous.state, context, objectiveCatalog),
        context,
        objectiveCatalog,
      );
      if (!migrated.ok) {
        return { status: 'corrupt', reason: migrated.reason };
      }

      return { status: 'ok', state: migrated.state };
    }

    if (parsed.schemaVersion === SCHEMA_VERSION_V5) {
      const previous = inspectGameStateV5(parsed, context);
      if (!previous.ok) {
        return { status: 'corrupt', reason: previous.reason };
      }

      const migrated = inspectGameState(
        migrateGameStateV5(previous.state, context, objectiveCatalog),
        context,
        objectiveCatalog,
      );
      if (!migrated.ok) {
        return { status: 'corrupt', reason: migrated.reason };
      }

      return { status: 'ok', state: migrated.state };
    }

    if (parsed.schemaVersion !== SCHEMA_VERSION) {
      return { status: 'incompatible', foundVersion: parsed.schemaVersion };
    }

    const inspected = inspectGameState(parsed, context, objectiveCatalog);
    if (!inspected.ok) {
      return { status: 'corrupt', reason: inspected.reason };
    }

    const catalog = objectiveCatalog ?? INITIAL_OBJECTIVES;
    return {
      status: 'ok',
      state: {
        ...inspected.state,
        objectives: synchronizeObjectives(catalog, inspected.state.objectives, inspected.state).current,
      },
    };
  } catch {
    return { status: 'corrupt', reason: 'O salvamento está corrompido.' };
  }
}

export function createPersistence(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GamePersistence {
  return {
    load() {
      const raw = storage.getItem(SAVE_KEY);
      if (raw === null) {
        return { status: 'empty' };
      }

      return parseGameState(raw, context, objectiveCatalog);
    },
    save(state) {
      storage.setItem(SAVE_KEY, serializeGameState(state, context, objectiveCatalog));
    },
    clear() {
      storage.removeItem(SAVE_KEY);
    },
  };
}

export function createMemoryPersistence(
  initial?: string,
  context?: SandboxContext,
  objectiveCatalog?: IndexedObjectives,
): GamePersistence {
  const memory = new Map<string, string>();
  if (initial) {
    memory.set(SAVE_KEY, initial);
  }

  return createPersistence(
    {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => {
        memory.set(key, value);
      },
      removeItem: (key) => {
        memory.delete(key);
      },
    },
    context,
    objectiveCatalog,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
