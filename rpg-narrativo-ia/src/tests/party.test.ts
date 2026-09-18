import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import {
  INITIAL_COMBAT,
  buildCombatResolution,
  createCombat,
  getEncounter,
  listAvailableEncounters,
  resolveTurn,
} from '../modules/combat';
import { DEFAULT_STARTING_LOCATION_ID } from '../modules/navigation';
import { INITIAL_ORGANIZATIONS } from '../modules/organizations';
import {
  INITIAL_PARTY,
  INITIAL_PARTY_CATALOG,
  PartyError,
  allySnapshots,
  inspectPartyCatalog,
  listCompanionOrderViews,
  planCompanionOrder,
} from '../modules/party';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { asV16, freshState } from './helpers';

function exploringState(): GameState {
  return { ...freshState(), narrativeSession: null };
}

function meetMira(): GameState {
  let state = exploringState();
  state = executeSandboxAction(state, { type: 'exploration.explore' }, { campaign: firstDayCampaign }).current;
  return executeSandboxAction(
    state,
    {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    },
    { campaign: firstDayCampaign },
  ).current;
}

function befriendMira(): GameState {
  const afterTalk = meetMira();
  const honored = executeSandboxAction(afterTalk, { type: 'bond.act', actionId: 'honor-mira-promise' }).current;
  return executeSandboxAction(honored, { type: 'bond.act', actionId: 'form-mira-friendship' }).current;
}

function formParty(): GameState {
  return executeSandboxAction(befriendMira(), { type: 'organization.act', actionId: 'propose-mira-party' }).current;
}

function revealPredatorTracks(state: GameState): GameState {
  let current = state;
  for (let i = 0; i < 5; i += 1) {
    const revealed =
      current.sandbox.exploration.locations.find((location) => location.locationId === DEFAULT_STARTING_LOCATION_ID)
        ?.revealedDiscoveryIds ?? [];
    if (revealed.includes('wary-predator-tracks')) {
      return current;
    }
    current = executeSandboxAction(current, { type: 'exploration.explore' }, { campaign: firstDayCampaign }).current;
  }
  return current;
}

describe('Sistema 23 — party e combate coletivo', () => {
  it('rejeita companheiro duplicado, ação desconhecida e orientação sem o NPC no grupo', () => {
    expect(
      inspectPartyCatalog({
        ...structuredClone(INITIAL_PARTY_CATALOG),
        companions: [INITIAL_PARTY_CATALOG.companions[0], INITIAL_PARTY_CATALOG.companions[0]],
      }).ok,
    ).toBe(false);
    expect(
      inspectPartyCatalog({
        ...structuredClone(INITIAL_PARTY_CATALOG),
        companionOrders: [
          {
            id: 'ghost-order',
            npcId: 'mira-vale',
            label: 'X',
            hint: 'X',
            actionId: 'missing-action',
            requirements: [],
          },
        ],
      }).ok,
    ).toBe(false);
    expect(() => (INITIAL_PARTY.companionByNpcId as Map<string, never>).set('ghost', {} as never)).toThrow(PartyError);

    const friends = befriendMira();
    expect(() =>
      planCompanionOrder(INITIAL_PARTY, INITIAL_ORGANIZATIONS, friends.organizations, 'mira-strike', friends),
    ).toThrow(PartyError);
  });

  it('1v1 permanece disponível sem Mira e o confronto em dupla exige a party ativa', () => {
    const tracks = ['wary-predator-tracks'];
    const solo = listAvailableEncounters(INITIAL_COMBAT, DEFAULT_STARTING_LOCATION_ID, {}, tracks);
    expect(solo.map((encounter) => encounter.id)).toContain('clearing-predator');
    expect(solo.map((encounter) => encounter.id)).not.toContain('clearing-pair');

    const formed = formParty();
    const grouped = listAvailableEncounters(
      INITIAL_COMBAT,
      DEFAULT_STARTING_LOCATION_ID,
      formed.flags,
      tracks,
      formed.organizations.entries.map((entry) => entry.id),
    );
    expect(grouped.map((encounter) => encounter.id)).toEqual(expect.arrayContaining(['clearing-predator', 'clearing-pair']));
  });

  it('Mira entra como aliada, aceita só a orientação permitida e o tempo avança uma vez', () => {
    const formed = revealPredatorTracks(formParty());
    const ready: GameState = {
      ...formed,
      attributes: { ...formed.attributes, saude: 80 },
    };
    const worldBefore = ready.world;
    const allies = allySnapshots(INITIAL_PARTY, INITIAL_ORGANIZATIONS, ready.organizations, ready.party);
    expect(allies).toEqual([
      expect.objectContaining({ id: 'mira-vale', name: 'Mira Vale', actionIds: ['attack', 'guard'] }),
    ]);

    const views = listCompanionOrderViews(INITIAL_PARTY, INITIAL_ORGANIZATIONS, ready.organizations, ready);
    expect(views.find((view) => view.order.id === 'mira-strike')?.available).toBe(true);

    let combat = createCombat(INITIAL_COMBAT, 'clearing-pair', {
      playerName: 'Ana Cruz',
      playerMaxHealth: ready.attributes.saude,
      allies,
    });
    expect(combat.allies.map((entry) => entry.id)).toEqual(['mira-vale']);
    expect(combat.foes.map((entry) => entry.id)).toEqual(['wary-scout']);
    expect(combat.opponent.id).toBe('wary-predator');

    combat = resolveTurn(INITIAL_COMBAT, combat, 'attack', [{ actorId: 'mira-vale', actionId: 'attack' }]);
    expect(combat.log.some((entry) => entry.actorId === 'mira-vale' && entry.actionId === 'attack')).toBe(true);
    expect(combat.log.some((entry) => entry.actorId === 'wary-scout')).toBe(true);
    expect(combat.companionOrderLog).toEqual([[{ actorId: 'mira-vale', actionId: 'attack' }]]);

    expect(() => resolveTurn(INITIAL_COMBAT, combat, 'attack', [{ actorId: 'mira-vale', actionId: 'numen-spark' }])).toThrow();

    let safety = 0;
    while (combat.outcome === 'ongoing' && safety < 80) {
      combat = resolveTurn(INITIAL_COMBAT, combat, 'attack', [{ actorId: 'mira-vale', actionId: 'attack' }]);
      safety += 1;
    }
    expect(combat.outcome).toBe('victory');
    const resolution = buildCombatResolution(combat, getEncounter(INITIAL_COMBAT, 'clearing-pair'));
    const result = executeSandboxAction(ready, { type: 'combat.resolve', resolution });
    expect(result.timeCost).toEqual({ periods: 1 });
    expect(result.current.world.day).toBe(worldBefore.day);
    expect(result.current.party.vitals.find((entry) => entry.actorId === 'mira-vale')?.health).toBeGreaterThanOrEqual(1);
    expect(result.current.party.vitals.find((entry) => entry.actorId === 'mira-vale')?.health).toBe(
      Math.max(1, resolution.allyVitals[0]?.health ?? 0),
    );
  });

  it('persiste party no schema 19 e migra v16 sem conceder companhia', () => {
    const formed = formParty();
    const raw = serializeGameState(formed);
    expect(raw).not.toContain('Mira Vale');
    const loaded = parseGameState(raw);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.party).toEqual(formed.party);
      expect(loaded.state.organizations).toEqual(formed.organizations);
    }

    const migrated = parseGameState(JSON.stringify(asV16(freshState())));
    expect(migrated.status).toBe('ok');
    if (migrated.status === 'ok') {
      expect(migrated.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(migrated.state.party).toEqual({ tacticId: null, vitals: [] });
    }
    const missing = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    delete missing.party;
    expect(parseGameState(JSON.stringify(missing)).status).toBe('corrupt');
  });
});
