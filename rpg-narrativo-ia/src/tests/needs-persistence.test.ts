import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTE_IDS,
  SCHEMA_VERSION,
  SCHEMA_VERSION_V4,
  inspectGameState,
  inspectGameStateV4,
} from '../core/state';
import { createPersistence, parseGameState, SAVE_KEY, serializeGameState } from '../infrastructure/persistence';
import { INITIAL_NEEDS_SNAPSHOT } from '../modules/needs';
import { asV1, asV2, asV3, asV4, freshState } from './helpers';

describe('Fatia 9.2 — estado principal e migração', () => {
  it('mantém sede inicial no schema atual sem mudar a interface', () => {
    const state = freshState();

    expect(SCHEMA_VERSION).toBe(7);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.attributes.sede).toBe(INITIAL_NEEDS_SNAPSHOT.sede);
    expect(Object.keys(state.attributes)).toEqual([...ATTRIBUTE_IDS]);
    expect(inspectGameState(state).ok).toBe(true);
  });

  it('persiste sede no roundtrip exato do schema atual', () => {
    const state = {
      ...freshState(),
      attributes: {
        ...freshState().attributes,
        sede: 73,
      },
    };

    expect(parseGameState(serializeGameState(state))).toEqual({ status: 'ok', state });
  });

  it.each([
    ['ausente', undefined],
    ['fracionária', 12.5],
    ['negativa', -1],
    ['acima do máximo', 101],
    ['não numérica', '25'],
  ])('rejeita sede %s no schema atual', (_label, value) => {
    const raw = JSON.parse(serializeGameState(freshState())) as {
      attributes: Record<string, unknown>;
    };

    if (value === undefined) {
      delete raw.attributes.sede;
    } else {
      raw.attributes.sede = value;
    }

    expect(parseGameState(JSON.stringify(raw)).status).toBe('corrupt');
  });

  it.each([
    ['v1', asV1],
    ['v2', asV2],
    ['v3', asV3],
    ['v4', asV4],
  ])('migra save %s para schema 5 com sede 25 e preserva o restante', (_label, toLegacy) => {
    const source = {
      ...freshState(),
      attributes: {
        saude: 61,
        energia: 42,
        fome: 67,
        sede: 88,
        humanidade: 53,
        cautela: 37,
      },
      inventory: [{ itemId: 'raw-water', quantity: 2 }],
      flags: { ready: true },
      world: { day: 4, period: 'tarde' as const },
      updatedAt: '2026-09-10T12:00:00.000Z',
    };
    const legacy = toLegacy(source);
    const snapshot = structuredClone(legacy);
    const parsed = parseGameState(JSON.stringify(legacy));

    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') {
      return;
    }

    expect(parsed.state).toMatchObject({
      schemaVersion: SCHEMA_VERSION,
      character: source.character,
      status: source.status,
      narrativeSession: source.narrativeSession,
      inventory: source.inventory,
      flags: source.flags,
      world: source.world,
      progression: source.progression,
      sandbox: source.sandbox,
      updatedAt: source.updatedAt,
    });
    expect(parsed.state.attributes).toEqual({
      saude: 61,
      energia: 42,
      fome: 67,
      humanidade: 53,
      cautela: 37,
      sede: INITIAL_NEEDS_SNAPSHOT.sede,
    });
    expect(legacy).toEqual(snapshot);
  });

  it('valida schema 4 pelo contrato legado e rejeita estruturas adulteradas', () => {
    const valid = asV4(freshState());
    expect(valid.schemaVersion).toBe(SCHEMA_VERSION_V4);
    expect(inspectGameStateV4(valid).ok).toBe(true);

    const withThirst = structuredClone(valid);
    (withThirst.attributes as Record<string, unknown>).sede = 25;
    expect(inspectGameStateV4(withThirst).ok).toBe(false);

    const withoutPresences = structuredClone(valid);
    delete (withoutPresences.sandbox as Record<string, unknown>).presences;
    expect(parseGameState(JSON.stringify(withoutPresences)).status).toBe('corrupt');
  });

  it('carregar um save v4 não executa gameplay nem regrava o armazenamento', () => {
    const current = {
      ...freshState(),
      inventory: [{ itemId: 'raw-water', quantity: 1 }],
      world: { day: 3, period: 'noite' as const },
      updatedAt: '2026-09-10T12:00:00.000Z',
    };
    const raw = JSON.stringify(asV4(current));
    const memory = new Map<string, string>([[SAVE_KEY, raw]]);
    const writes: string[] = [];
    const persistence = createPersistence({
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => {
        writes.push(key);
        memory.set(key, value);
      },
      removeItem: (key) => memory.delete(key),
    });

    const loaded = persistence.load();

    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.world).toEqual(current.world);
      expect(loaded.state.inventory).toEqual(current.inventory);
      expect(loaded.state.sandbox).toEqual(current.sandbox);
      expect(loaded.state.attributes.sede).toBe(25);
    }
    expect(writes).toEqual([]);
    expect(memory.get(SAVE_KEY)).toBe(raw);
  });
});
