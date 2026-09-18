import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import {
  CivicError,
  INITIAL_CIVIC,
  INITIAL_CIVIC_CATALOG,
  inspectCivicCatalog,
  planCivicAction,
} from '../modules/civic';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { asV19, freshState, keepNpcAtCurrentLocation } from './helpers';

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

describe('Sistema 26 — profissões, cidadania e posição social', () => {
  it('rejeita catálogo hostil e índice mutável', () => {
    expect(inspectCivicCatalog({ ...structuredClone(INITIAL_CIVIC_CATALOG), scopes: [] }).ok).toBe(false);
    expect(() => (INITIAL_CIVIC.scopeById as Map<string, never>).set('ghost', {} as never)).toThrow(CivicError);
  });

  it('concede cidadania, inicia ofício, registra prática e usa benefício só no escopo', () => {
    const friends = befriendMira();
    const citizen = executeSandboxAction(friends, { type: 'civic.act', actionId: 'request-clearing-citizenship' }).current;
    expect(citizen.flags['civic.clearing-resident.granted']).toBe(true);
    expect(citizen.civic.grants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'citizenship',
          definitionId: 'clearing-resident',
          actorId: 'player',
          scopeId: 'awakening-clearing',
          active: true,
        }),
      ]),
    );

    const forager = executeSandboxAction(citizen, { type: 'civic.act', actionId: 'start-forager-profession' }).current;
    expect(forager.flags['civic.clearing-forager.started']).toBe(true);
    expect(() => planCivicAction(INITIAL_CIVIC, forager.civic, 'start-warden-profession', forager)).toThrow(CivicError);

    const practiced = executeSandboxAction(forager, { type: 'civic.act', actionId: 'practice-foraging' }).current;
    expect(practiced.civic.progress).toEqual([
      expect.objectContaining({ professionId: 'clearing-forager', value: 1, sources: ['practice-foraging'] }),
    ]);

    const used = executeSandboxAction(practiced, { type: 'civic.act', actionId: 'use-clearing-gather-right' }).current;
    expect(used.flags['civic.clearing-gather.used']).toBe(true);

    const elsewhere: GameState = {
      ...forager,
      sandbox: {
        ...forager.sandbox,
        navigation: { ...forager.sandbox.navigation, currentLocationId: 'great-tree' },
      },
    };
    expect(() => planCivicAction(INITIAL_CIVIC, elsewhere.civic, 'use-clearing-gather-right', elsewhere)).toThrow(CivicError);
  });

  it('revoga cidadania sem apagar histórico nem deixar privilégio ativo', () => {
    const friends = befriendMira();
    const citizen = executeSandboxAction(friends, { type: 'civic.act', actionId: 'request-clearing-citizenship' }).current;
    const practiced = executeSandboxAction(
      executeSandboxAction(citizen, { type: 'civic.act', actionId: 'start-forager-profession' }).current,
      { type: 'civic.act', actionId: 'practice-foraging' },
    ).current;
    const revoked = executeSandboxAction(practiced, { type: 'civic.act', actionId: 'revoke-clearing-citizenship' }).current;
    expect(revoked.civic.grants.some((grant) => grant.kind === 'citizenship' && grant.definitionId === 'clearing-resident' && !grant.active)).toBe(true);
    expect(revoked.civic.progress[0]?.value).toBe(1);
    expect(() => planCivicAction(INITIAL_CIVIC, revoked.civic, 'use-clearing-gather-right', revoked)).toThrow(CivicError);
  });

  it('persiste civic no schema 20 e migra v19 sem conceder cidadania', () => {
    const citizen = executeSandboxAction(befriendMira(), { type: 'civic.act', actionId: 'request-clearing-citizenship' }).current;
    const raw = serializeGameState(citizen);
    expect(raw).not.toContain('Residente da Clareira');
    const loaded = parseGameState(raw);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.civic).toEqual(citizen.civic);
    }

    const migrated = parseGameState(JSON.stringify(asV19(freshState())));
    expect(migrated.status).toBe('ok');
    if (migrated.status === 'ok') {
      expect(migrated.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(migrated.state.civic).toEqual({ grants: [], progress: [], usedPermissionIds: [], consumedActionIds: [] });
      expect(migrated.state.family).toEqual({ ties: [], households: [], stageMarks: [], consumedActionIds: [] });
    }
    const missing = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    delete missing.civic;
    expect(parseGameState(JSON.stringify(missing)).status).toBe('corrupt');
  });
});
