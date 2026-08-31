import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION } from '../core/state';
import { firstDayCampaign } from '../campaigns/first-day';
import { startGame } from '../core/engine';
import {
  createMemoryPersistence,
  parseGameState,
  serializeGameState,
} from '../infrastructure/persistence';

const now = () => '2026-08-31T12:00:00.000Z';

describe('persistência', () => {
  it('salva e carrega o mesmo estado, incluindo schemaVersion', () => {
    const state = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
    const storage = createMemoryPersistence();

    storage.save(state);
    const loaded = storage.load();

    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded).toEqual({ status: 'ok', state });
  });

  it('serializa um estado que pode ser relido integralmente', () => {
    const state = startGame({ firstName: 'Lia', lastName: 'Nunes' }, firstDayCampaign, now);
    const parsed = parseGameState(serializeGameState(state));

    expect(parsed).toEqual({ status: 'ok', state });
  });

  it('falha de forma controlada quando a versão do esquema é incompatível', () => {
    const parsed = parseGameState(JSON.stringify({ schemaVersion: 99, character: { firstName: 'Ana' } }));
    const storage = createMemoryPersistence(JSON.stringify({ schemaVersion: 0 }));

    expect(parsed).toEqual({ status: 'incompatible', foundVersion: 99 });
    expect(storage.load()).toEqual({ status: 'incompatible', foundVersion: 0 });
  });

  it('trata salvamento vazio, corrompido e limpeza', () => {
    expect(parseGameState('')).toEqual({ status: 'empty' });
    expect(parseGameState('{')).toEqual({ status: 'corrupt', reason: 'O salvamento não pôde ser lido.' });

    const storage = createMemoryPersistence();
    storage.save(startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now));
    storage.clear();

    expect(storage.load()).toEqual({ status: 'empty' });
  });
});
