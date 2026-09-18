import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import {
  BondError,
  INITIAL_BONDS,
  PLAYER_ACTOR_ID,
  applyDimensionChange,
  getDimensionValue,
  hasNamedBond,
  inspectBondCatalog,
  listKnownBondActions,
  listRevealedDimensions,
  planBondAction,
  planBondFormation,
  type BondsState,
} from '../modules/bonds';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { asV12, freshState } from './helpers';

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

describe('Sistema 19 — relacionamentos e vínculos', () => {
  it('rejeita dimensão duplicada, vínculo com dimensão inexistente e efeito com valor final', () => {
    expect(
      inspectBondCatalog({
        dimensions: [
          { id: 'trust', name: 'Confiança', minimum: 0, maximum: 10 },
          { id: 'trust', name: 'Outra', minimum: 0, maximum: 10 },
        ],
        bonds: [],
      }).ok,
    ).toBe(false);
    expect(
      inspectBondCatalog({
        dimensions: [{ id: 'trust', name: 'Confiança', minimum: 0, maximum: 10 }],
        bonds: [
          {
            id: 'ghost',
            name: 'X',
            description: 'Y',
            requirements: [{ type: 'dimension.min', actorId: 'player', targetId: 'mira-vale', dimensionId: 'missing', amount: 1 }],
          },
        ],
      }).ok,
    ).toBe(false);
    expect(
      inspectBondCatalog({
        dimensions: [{ id: 'trust', name: 'Confiança', minimum: 0, maximum: 10 }],
        bonds: [],
        actions: [
          {
            id: 'set-final',
            npcId: 'mira-vale',
            label: 'Definir',
            timeCost: { periods: 1 },
            effects: [{ type: 'bond.shift', fromId: 'player', toId: 'mira-vale', dimensionId: 'trust', value: 99 }],
          },
        ],
      }).ok,
    ).toBe(false);
  });

  it('distingue A→B de B→A e não cria vínculo só porque a pontuação cruzou um limite', () => {
    const catalog = INITIAL_BONDS;
    let state: BondsState = { edges: [], consumedActionIds: [] };
    state = applyDimensionChange(catalog, state, {
      fromId: PLAYER_ACTOR_ID,
      toId: 'mira-vale',
      dimensionId: 'trust',
      delta: 80,
    });
    state = applyDimensionChange(catalog, state, {
      fromId: 'mira-vale',
      toId: PLAYER_ACTOR_ID,
      dimensionId: 'affinity',
      delta: 80,
    });
    expect(getDimensionValue(catalog, state, PLAYER_ACTOR_ID, 'mira-vale', 'trust')).toBe(80);
    expect(getDimensionValue(catalog, state, 'mira-vale', PLAYER_ACTOR_ID, 'affinity')).toBe(80);
    expect(getDimensionValue(catalog, state, 'mira-vale', PLAYER_ACTOR_ID, 'trust')).toBe(0);
    expect(hasNamedBond(state, PLAYER_ACTOR_ID, 'mira-vale', 'mira-friendship')).toBe(false);
    expect(() =>
      planBondFormation(catalog, state, freshState(), 'mira-friendship', PLAYER_ACTOR_ID, 'mira-vale'),
    ).toThrow(BondError);
  });

  it('cumprir a promessa altera confiança e afinidade de modo independente e sobrevive a salvar', () => {
    const afterTalk = meetMira();
    expect(afterTalk.flags['mira.promise.made']).toBe(true);
    expect(listRevealedDimensions(INITIAL_BONDS, afterTalk.bonds, PLAYER_ACTOR_ID, 'mira-vale')).toEqual([]);
    expect(listRevealedDimensions(INITIAL_BONDS, afterTalk.bonds, 'mira-vale', PLAYER_ACTOR_ID)).toEqual([]);

    const honored = executeSandboxAction(afterTalk, { type: 'bond.act', actionId: 'honor-mira-promise' });
    expect(honored.current.bonds.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fromId: 'player', toId: 'mira-vale', values: { trust: 25 } }),
        expect.objectContaining({ fromId: 'mira-vale', toId: 'player', values: { affinity: 15 } }),
      ]),
    );
    expect(hasNamedBond(honored.current.bonds, PLAYER_ACTOR_ID, 'mira-vale', 'mira-friendship')).toBe(false);
    expect(honored.current.flags['mira.promise.honored']).toBe(true);
    expect(honored.current.world.period).not.toBe(afterTalk.world.period);

    const formed = executeSandboxAction(honored.current, { type: 'bond.act', actionId: 'form-mira-friendship' });
    expect(hasNamedBond(formed.current.bonds, PLAYER_ACTOR_ID, 'mira-vale', 'mira-friendship')).toBe(true);
    expect(formed.current.objectives.entries.find((entry) => entry.objectiveId === 'mira-bonds')?.completed).toBe(true);

    const loaded = parseGameState(serializeGameState(formed.current));
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.bonds).toEqual(formed.current.bonds);
      expect(hasNamedBond(loaded.state.bonds, PLAYER_ACTOR_ID, 'mira-vale', 'mira-friendship')).toBe(true);
    }
  });

  it('quebrar a promessa não revela o que Mira sente e impede o vínculo automático', () => {
    const broken = executeSandboxAction(meetMira(), { type: 'bond.act', actionId: 'break-mira-promise' });
    expect(getDimensionValue(INITIAL_BONDS, broken.current.bonds, PLAYER_ACTOR_ID, 'mira-vale', 'trust')).toBe(5);
    expect(listRevealedDimensions(INITIAL_BONDS, broken.current.bonds, 'mira-vale', PLAYER_ACTOR_ID)).toEqual([]);
    expect(listKnownBondActions(INITIAL_BONDS, broken.current.bonds, broken.current, 'mira-vale').map((entry) => entry.action.id)).not.toContain(
      'form-mira-friendship',
    );
    expect(() =>
      planBondAction(INITIAL_BONDS, broken.current.bonds, 'form-mira-friendship', broken.current),
    ).toThrow(BondError);
  });

  it('ação inválida não altera o mundo e a UI não envia valor final', () => {
    const afterTalk = meetMira();
    const previous = structuredClone(afterTalk);
    expect(() => executeSandboxAction(afterTalk, { type: 'bond.act', actionId: 'form-mira-friendship' })).toThrow();
    expect(afterTalk).toEqual(previous);
    expect(() =>
      executeSandboxAction(afterTalk, { type: 'bond.act', actionId: 'honor-mira-promise', value: 100 } as never),
    ).not.toThrow();
    const honored = executeSandboxAction(afterTalk, { type: 'bond.act', actionId: 'honor-mira-promise' });
    expect(honored.action).toEqual({ type: 'bond.act', actionId: 'honor-mira-promise' });
    expect(honored.action).not.toHaveProperty('value');
    expect(honored.action).not.toHaveProperty('delta');
  });

  it('migra schema 12 sem conceder dimensões, vínculos ou promessa', () => {
    const loaded = parseGameState(JSON.stringify(asV12(freshState())));
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.bonds).toEqual({ edges: [], consumedActionIds: [] });
      expect(loaded.state.flags['mira.promise.made']).toBeUndefined();
    }
  });

  it('o motor aceita outro vínculo sem código específico da Mira', () => {
    const inspected = inspectBondCatalog({
      dimensions: [
        { id: 'respect', name: 'Respeito', minimum: 0, maximum: 50 },
        { id: 'trust', name: 'Confiança', minimum: 0, maximum: 50 },
      ],
      bonds: [
        {
          id: 'rivalry',
          name: 'Rivalidade',
          description: 'Dois sobreviventes que se medem.',
          requirements: [{ type: 'dimension.min', actorId: 'player', targetId: 'other', dimensionId: 'respect', amount: 10 }],
        },
      ],
      actions: [
        {
          id: 'challenge',
          npcId: 'other',
          label: 'Desafiar',
          timeCost: { periods: 1 },
          effects: [{ type: 'bond.shift', fromId: 'player', toId: 'other', dimensionId: 'respect', delta: 10 }],
        },
      ],
    });
    expect(inspected.ok).toBe(true);
  });
});
