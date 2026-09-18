import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import { addItem } from '../modules/inventory';
import {
  EconomyError,
  INITIAL_ECONOMY,
  INITIAL_ECONOMY_CATALOG,
  inspectEconomyCatalog,
  planEconomyAction,
} from '../modules/economy';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { asV20, freshState, keepNpcAtCurrentLocation } from './helpers';

function exploringState(): GameState {
  return { ...freshState(), narrativeSession: null };
}

function befriendMira(): GameState {
  let state = exploringState();
  state = executeSandboxAction(state, { type: 'exploration.explore' }, { campaign: firstDayCampaign }).current;
  const talked = executeSandboxAction(
    state,
    {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    },
    { campaign: firstDayCampaign },
  ).current;
  const honored = executeSandboxAction(talked, { type: 'bond.act', actionId: 'honor-mira-promise' }).current;
  return keepNpcAtCurrentLocation(
    executeSandboxAction(honored, { type: 'bond.act', actionId: 'form-mira-friendship' }).current,
    'mira-vale',
  );
}

describe('Sistema 27 — economia, comércio e propriedade', () => {
  it('rejeita catálogo hostil e índice mutável', () => {
    expect(inspectEconomyCatalog({ ...structuredClone(INITIAL_ECONOMY_CATALOG), currencies: [] }).ok).toBe(false);
    expect(() => (INITIAL_ECONOMY.currencyById as Map<string, never>).set('ghost', {} as never)).toThrow(EconomyError);
  });

  it('vende material, compra estoque limitado e registra direito de uso na mesma transação atômica', () => {
    const friends = { ...befriendMira(), inventory: addItem([], 'fallen-branch', 1) };
    expect(() => planEconomyAction(INITIAL_ECONOMY, friends.economy, 'buy-improvised-tool', friends)).toThrow(EconomyError);

    const sold = executeSandboxAction(friends, { type: 'economy.act', actionId: 'sell-fallen-branch' }).current;
    expect(sold.inventory.some((item) => item.itemId === 'fallen-branch')).toBe(false);
    expect(sold.economy.wallets).toEqual([{ currencyId: 'ember-mark', amount: 2 }]);

    const bought = executeSandboxAction(sold, { type: 'economy.act', actionId: 'buy-improvised-tool' }).current;
    expect(bought.economy.wallets[0]?.amount).toBe(0);
    expect(bought.inventory.some((item) => item.itemId === 'improvised-tool' && item.quantity === 1)).toBe(true);
    expect(bought.economy.stocks.find((entry) => entry.offerId === 'buy-improvised-tool')?.remaining).toBe(0);
    expect(() => planEconomyAction(INITIAL_ECONOMY, bought.economy, 'buy-improvised-tool', bought)).toThrow(EconomyError);

    const claimed = executeSandboxAction(bought, { type: 'economy.act', actionId: 'claim-clearing-cache' }).current;
    expect(claimed.economy.properties).toEqual([{ propertyId: 'clearing-cache', ownerId: 'player' }]);
    expect(JSON.stringify(claimed.inventory)).not.toContain('clearing-cache');
  });

  it('persiste economy no schema 21 e migra v20 sem conceder saldo', () => {
    const sold = executeSandboxAction(
      { ...befriendMira(), inventory: addItem([], 'fallen-branch', 1) },
      { type: 'economy.act', actionId: 'sell-fallen-branch' },
    ).current;
    const raw = serializeGameState(sold);
    expect(raw).not.toContain('Marca de brasa');
    const loaded = parseGameState(raw);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.economy).toEqual(sold.economy);
    }

    const migrated = parseGameState(JSON.stringify(asV20(freshState())));
    expect(migrated.status).toBe('ok');
    if (migrated.status === 'ok') {
      expect(migrated.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(migrated.state.economy.wallets).toEqual([]);
      expect(migrated.state.economy.properties).toEqual([]);
    }
    const missing = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    delete missing.economy;
    expect(parseGameState(JSON.stringify(missing)).status).toBe('corrupt');
  });

  it('bloqueia uma ação de NPC quando ele está em outro local', () => {
    const friends = keepNpcAtCurrentLocation(befriendMira(), 'mira-vale');
    const remote: GameState = {
      ...friends,
      inventory: addItem([], 'fallen-branch', 1),
      sandbox: {
        ...friends.sandbox,
        npcs: {
          entries: (friends.sandbox.npcs?.entries ?? []).map((entry) =>
            entry.npcId === 'mira-vale' ? { ...entry, locationOverrideId: 'spring-lake' } : entry,
          ),
        },
      },
    };

    expect(() =>
      executeSandboxAction(remote, { type: 'economy.act', actionId: 'sell-fallen-branch' }),
    ).toThrow('O NPC não está disponível neste local agora.');
  });
});
