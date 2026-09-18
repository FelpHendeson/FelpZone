import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import { addItem } from '../modules/inventory';
import {
  INITIAL_SETTLEMENTS,
  INITIAL_SETTLEMENTS_CATALOG,
  SettlementError,
  inspectSettlementsCatalog,
  planSettlementAction,
} from '../modules/settlements';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { asV21, freshState } from './helpers';

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
  return executeSandboxAction(honored, { type: 'bond.act', actionId: 'form-mira-friendship' }).current;
}

function claimCache(state: GameState): GameState {
  const withStock = { ...state, inventory: addItem(state.inventory, 'fallen-branch', 1) };
  const sold = executeSandboxAction(withStock, { type: 'economy.act', actionId: 'sell-fallen-branch' }).current;
  const bought = executeSandboxAction(sold, { type: 'economy.act', actionId: 'buy-improvised-tool' }).current;
  return executeSandboxAction(bought, { type: 'economy.act', actionId: 'claim-clearing-cache' }).current;
}

describe('Sistema 28 — bases, territórios e assentamentos', () => {
  it('rejeita catálogo hostil e índice mutável', () => {
    expect(inspectSettlementsCatalog({ ...structuredClone(INITIAL_SETTLEMENTS_CATALOG), territories: [] }).ok).toBe(false);
    expect(() => (INITIAL_SETTLEMENTS.territoryById as Map<string, never>).set('ghost', {} as never)).toThrow(SettlementError);
  });

  it('reivindica, constrói com custo atômico, atribui vigia e produz só quando o relógio avança', () => {
    const ready = claimCache(befriendMira());
    expect(() => planSettlementAction(INITIAL_SETTLEMENTS, ready.settlements, 'start-lean-to', ready)).toThrow(SettlementError);

    const claimed = executeSandboxAction(ready, { type: 'settlement.act', actionId: 'claim-awakening-camp' }).current;
    expect(claimed.settlements.claims).toEqual([{ territoryId: 'awakening-camp', claimantId: 'player' }]);

    const started = executeSandboxAction(claimed, { type: 'settlement.act', actionId: 'start-lean-to' }).current;
    const beforeSupply = structuredClone(started);
    expect(() =>
      planSettlementAction(INITIAL_SETTLEMENTS, started.settlements, 'supply-lean-to', started),
    ).toThrow(SettlementError);
    expect(started).toEqual(beforeSupply);

    const supplied = executeSandboxAction(
      { ...started, inventory: addItem(started.inventory, 'fallen-branch', 2) },
      { type: 'settlement.act', actionId: 'supply-lean-to' },
    ).current;
    const finishedSupply = executeSandboxAction(supplied, { type: 'settlement.act', actionId: 'supply-lean-to' }).current;
    expect(finishedSupply.settlements.projects[0]?.supplied).toEqual([{ itemId: 'fallen-branch', quantity: 2 }]);
    expect(finishedSupply.settlements.structures).toEqual([]);

    const built = executeSandboxAction(finishedSupply, { type: 'needs.rest', mode: 'simple' }).current;
    expect(built.settlements.projects).toEqual([]);
    expect(built.settlements.structures).toEqual([{ territoryId: 'awakening-camp', structureTypeId: 'lean-to' }]);

    const assigned = executeSandboxAction(built, { type: 'settlement.act', actionId: 'assign-mira-watcher' }).current;
    expect(assigned.settlements.assignments).toEqual([
      { territoryId: 'awakening-camp', npcId: 'mira-vale', roleId: 'watcher' },
    ]);
    expect(assigned.settlements.storage).toEqual([
      { territoryId: 'awakening-camp', itemId: 'fallen-branch', quantity: 1 },
    ]);

    const capped = executeSandboxAction(assigned, { type: 'needs.rest', mode: 'simple' }).current;
    expect(capped.settlements.storage[0]?.quantity).toBe(3);
    const stillCapped = executeSandboxAction(capped, { type: 'needs.rest', mode: 'simple' }).current;
    expect(stillCapped.settlements.storage[0]?.quantity).toBe(3);

    const raw = serializeGameState(stillCapped);
    const loaded = parseGameState(raw);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.settlements.storage[0]?.quantity).toBe(3);
    }
  });

  it('persiste settlements no schema 22 e migra v21 sem conceder território', () => {
    const claimed = executeSandboxAction(claimCache(befriendMira()), {
      type: 'settlement.act',
      actionId: 'claim-awakening-camp',
    }).current;
    const raw = serializeGameState(claimed);
    expect(raw).not.toContain('Acampamento da Clareira');
    const loaded = parseGameState(raw);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.settlements).toEqual(claimed.settlements);
    }

    const migrated = parseGameState(JSON.stringify(asV21(freshState())));
    expect(migrated.status).toBe('ok');
    if (migrated.status === 'ok') {
      expect(migrated.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(migrated.state.settlements.claims).toEqual([]);
      expect(migrated.state.settlements.structures).toEqual([]);
    }
    const missing = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    delete missing.settlements;
    expect(parseGameState(JSON.stringify(missing)).status).toBe('corrupt');
  });
});
