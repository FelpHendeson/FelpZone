import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import { addItem } from '../modules/inventory';
import {
  INITIAL_POLITICS,
  INITIAL_POLITICS_CATALOG,
  PoliticsError,
  inspectPoliticsCatalog,
  planPoliticsAction,
} from '../modules/politics';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { asV22, freshState } from './helpers';

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

function claimCamp(state: GameState): GameState {
  const withStock = { ...state, inventory: addItem(state.inventory, 'fallen-branch', 1) };
  const sold = executeSandboxAction(withStock, { type: 'economy.act', actionId: 'sell-fallen-branch' }).current;
  const bought = executeSandboxAction(sold, { type: 'economy.act', actionId: 'buy-improvised-tool' }).current;
  const cache = executeSandboxAction(bought, { type: 'economy.act', actionId: 'claim-clearing-cache' }).current;
  return executeSandboxAction(cache, { type: 'settlement.act', actionId: 'claim-awakening-camp' }).current;
}

describe('Sistema 29 — facções, diplomacia e poder político', () => {
  it('rejeita catálogo hostil e índice mutável', () => {
    expect(inspectPoliticsCatalog({ ...structuredClone(INITIAL_POLITICS_CATALOG), factions: [] }).ok).toBe(false);
    expect(() => (INITIAL_POLITICS.factionById as Map<string, never>).set('ghost', {} as never)).toThrow(PoliticsError);
  });

  it('exige mandato, aceita pacto de forma atômica e recusa sem deixar obrigação parcial', () => {
    const friends = befriendMira();
    expect(() => planPoliticsAction(INITIAL_POLITICS, friends.politics, 'take-camp-mandate', friends)).toThrow(PoliticsError);
    expect(() => planPoliticsAction(INITIAL_POLITICS, friends.politics, 'propose-shared-watch', friends)).toThrow(PoliticsError);

    const camp = claimCamp(friends);
    const mandated = executeSandboxAction(camp, { type: 'politics.act', actionId: 'take-camp-mandate' }).current;
    expect(mandated.politics.mandates).toEqual([
      { actorId: 'player', factionId: 'camp-circle', officeId: 'envoy' },
    ]);

    const proposed = executeSandboxAction(mandated, { type: 'politics.act', actionId: 'propose-shared-watch' }).current;
    expect(proposed.politics.agreements).toEqual([{ agreementId: 'shared-watch-pact', status: 'proposed' }]);
    expect(proposed.politics.laws).toEqual([]);

    const accepted = executeSandboxAction(proposed, { type: 'politics.act', actionId: 'mira-accept-watch-pact' }).current;
    expect(accepted.politics.agreements[0]?.status).toBe('active');
    expect(accepted.politics.relations).toEqual([
      { fromFactionId: 'camp-circle', toFactionId: 'clearing-circle', stanceId: 'cordial' },
      { fromFactionId: 'clearing-circle', toFactionId: 'camp-circle', stanceId: 'wary' },
    ]);
    expect(accepted.politics.laws).toEqual([{ lawId: 'clearing-shared-watch' }]);
    expect(accepted.politics.influence).toEqual([{ factionId: 'camp-circle', amount: 1 }]);
    expect(() => planPoliticsAction(INITIAL_POLITICS, accepted.politics, 'mira-refuse-watch-pact', accepted)).toThrow(
      PoliticsError,
    );

    const refusedBase = executeSandboxAction(mandated, { type: 'politics.act', actionId: 'propose-shared-watch' }).current;
    const refused = executeSandboxAction(refusedBase, { type: 'politics.act', actionId: 'mira-refuse-watch-pact' }).current;
    expect(refused.politics.agreements[0]?.status).toBe('refused');
    expect(refused.politics.laws).toEqual([]);
    expect(refused.politics.influence).toEqual([]);
    expect(refused.politics.relations).toEqual([
      { fromFactionId: 'clearing-circle', toFactionId: 'camp-circle', stanceId: 'strained' },
    ]);
  });

  it('persiste politics no schema 23 e migra v22 sem conceder mandato', () => {
    const mandated = executeSandboxAction(claimCamp(befriendMira()), {
      type: 'politics.act',
      actionId: 'take-camp-mandate',
    }).current;
    const raw = serializeGameState(mandated);
    expect(raw).not.toContain('Círculo do Acampamento');
    const loaded = parseGameState(raw);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.politics).toEqual(mandated.politics);
    }

    const migrated = parseGameState(JSON.stringify(asV22(freshState())));
    expect(migrated.status).toBe('ok');
    if (migrated.status === 'ok') {
      expect(migrated.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(migrated.state.politics.mandates).toEqual([]);
      expect(migrated.state.politics.agreements).toEqual([]);
    }
    const missing = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    delete missing.politics;
    expect(parseGameState(JSON.stringify(missing)).status).toBe('corrupt');
  });
});
