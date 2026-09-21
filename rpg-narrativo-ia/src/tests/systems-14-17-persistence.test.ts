import { describe, expect, it } from 'vitest';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { firstDayCampaign } from '../campaigns/first-day';
import { SCHEMA_VERSION, inspectGameState } from '../core/state';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { createInitialItemsState } from '../modules/items';
import { asV7, asV8, asV9, asV10, freshState } from './helpers';

describe('Persistência dos Sistemas 14 a 17 — schema 11', () => {
  it('novas partidas começam no schema 11 com estados vazios', () => {
    const state = freshState();
    expect(SCHEMA_VERSION).toBe(24);
    expect(state.items).toEqual(createInitialItemsState());
    expect(state.lingering.entries).toEqual([]);
    expect(state.garden).toEqual({ cultivationPoints: 0, completedRecipeIds: [] });
    expect(state.sandbox.npcs.entries).toEqual([]);
  });

  it.each([
    ['v7', asV7],
    ['v8', asV8],
    ['v9', asV9],
    ['v10', asV10],
  ] as const)('migra %s sem conceder item, cultivo ou memória', (_label, downgrade) => {
    const loaded = parseGameState(JSON.stringify(downgrade(freshState())));
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.items.equipment['main-hand']).toBeNull();
      expect(loaded.state.garden.cultivationPoints).toBe(0);
      expect(loaded.state.sandbox.npcs.entries).toEqual([]);
    }
  });

  it('rejeita save atual sem itens, jardim ou NPCs', () => {
    const raw = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    delete raw.items;
    expect(parseGameState(JSON.stringify(raw)).status).toBe('corrupt');
  });

  it('conversar com Mira registra fatos persistidos após reload', () => {
    const exploring = { ...freshState(), narrativeSession: null };
    const revealed = executeSandboxAction(exploring, { type: 'exploration.explore' }).current;
    const talked = executeSandboxAction(
      revealed,
      {
        type: 'presence.interact',
        presenceId: 'mira-awakening-clearing',
        interactionId: 'talk-mira-awakening-clearing',
      },
      { campaign: firstDayCampaign },
    );
    const loaded = parseGameState(serializeGameState(talked.current));
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.sandbox.npcs.entries[0]?.memoryFactIds).toEqual(['mira-first-talk', 'mira-seeks-water']);
      expect(inspectGameState(loaded.state).ok).toBe(true);
    }
  });
});
