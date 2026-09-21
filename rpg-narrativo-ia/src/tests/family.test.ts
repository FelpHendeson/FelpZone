import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import {
  FamilyError,
  INITIAL_FAMILY,
  INITIAL_FAMILY_CATALOG,
  inspectFamilyCatalog,
  planFamilyAction,
  synchronizeFamilyStages,
} from '../modules/family';
import { INITIAL_CALENDAR } from '../modules/calendar';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { asV18, freshState, keepNpcAtCurrentLocation, revealMiraForTest, grantMiraPromiseForTest } from './helpers';

function exploringState(): GameState {
  return { ...freshState(), narrativeSession: null };
}

function befriendMira(): GameState {
  let state = exploringState();
  state = revealMiraForTest(state);
  const talked = executeSandboxAction(
    state,
    {
      type: 'presence.interact',
      presenceId: 'mira-awakening-clearing',
      interactionId: 'talk-mira-awakening-clearing',
    },
    { campaign: firstDayCampaign },
  ).current;
  const honored = executeSandboxAction(grantMiraPromiseForTest(talked), { type: 'bond.act', actionId: 'honor-mira-promise' }).current;
  return keepNpcAtCurrentLocation(
    executeSandboxAction(honored, { type: 'bond.act', actionId: 'form-mira-friendship' }).current,
    'mira-vale',
  );
}

describe('Sistema 25 — família, lar e linhagem', () => {
  it('rejeita catálogo hostil, parentesco exclusivo duplicado e ciclo impossível', () => {
    expect(inspectFamilyCatalog({ ...structuredClone(INITIAL_FAMILY_CATALOG), kinshipTypes: [] }).ok).toBe(false);
    expect(() => (INITIAL_FAMILY.kinshipById as Map<string, never>).set('ghost', {} as never)).toThrow(FamilyError);

    const friends = befriendMira();
    const partnered = executeSandboxAction(friends, { type: 'family.act', actionId: 'form-mira-partnership' }).current;
    expect(() => planFamilyAction(INITIAL_FAMILY, partnered.family, 'form-mira-partnership', partnered)).toThrow(FamilyError);
  });

  it('forma parceria, lar compartilhado e responsabilidade por dependente sem tratar criança como item', () => {
    const friends = befriendMira();
    const partnered = executeSandboxAction(friends, { type: 'family.act', actionId: 'form-mira-partnership' }).current;
    expect(partnered.flags['family.mira-partnership.formed']).toBe(true);
    expect(partnered.family.ties).toEqual(
      expect.arrayContaining([
        { fromId: 'player', toId: 'mira-vale', kinshipTypeId: 'partner' },
        { fromId: 'mira-vale', toId: 'player', kinshipTypeId: 'partner' },
      ]),
    );

    const housed = executeSandboxAction(partnered, { type: 'family.act', actionId: 'found-clearing-camp' }).current;
    expect(housed.family.households[0]).toEqual(
      expect.objectContaining({
        id: 'clearing-camp',
        residentIds: expect.arrayContaining(['player', 'mira-vale']),
      }),
    );

    const sheltered = executeSandboxAction(housed, { type: 'family.act', actionId: 'shelter-rowan' }).current;
    expect(sheltered.flags['family.rowan.sheltered']).toBe(true);
    expect(sheltered.family.ties.some((tie) => tie.toId === 'rowan-vale' && tie.kinshipTypeId === 'parent')).toBe(true);
    expect(sheltered.family.households[0].residentIds).toContain('rowan-vale');
    expect(JSON.stringify(sheltered.inventory)).not.toContain('rowan-vale');
  });

  it('crescimento por estágio é idempotente e usa a idade do calendário', () => {
    const first = synchronizeFamilyStages(INITIAL_CALENDAR, { ties: [], households: [], stageMarks: [], consumedActionIds: [] }, 1);
    expect(first.current.stageMarks).toEqual([{ actorId: 'player', stageId: 'adult' }]);
    expect(first.flags).toEqual({});

    const again = synchronizeFamilyStages(INITIAL_CALENDAR, first.current, 1);
    expect(again.flags).toEqual({});
    expect(again.current.stageMarks).toEqual(first.current.stageMarks);
  });

  it('persiste família no schema 19 e migra v18 sem conceder parentesco', () => {
    const housed = executeSandboxAction(
      executeSandboxAction(befriendMira(), { type: 'family.act', actionId: 'form-mira-partnership' }).current,
      { type: 'family.act', actionId: 'found-clearing-camp' },
    ).current;
    const raw = serializeGameState(housed);
    expect(raw).not.toContain('Acampamento da Clareira');
    const loaded = parseGameState(raw);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.family).toEqual(housed.family);
    }

    const migrated = parseGameState(JSON.stringify(asV18(freshState())));
    expect(migrated.status).toBe('ok');
    if (migrated.status === 'ok') {
      expect(migrated.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(migrated.state.family).toEqual({ ties: [], households: [], stageMarks: [], consumedActionIds: [] });
    }
    const missing = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    delete missing.family;
    expect(parseGameState(JSON.stringify(missing)).status).toBe('corrupt');
  });
});
