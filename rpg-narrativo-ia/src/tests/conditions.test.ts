import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice, startGame } from '../core/engine';
import { evaluateCondition, evaluateConditions } from '../core/events';
import type { GameState } from '../core/state';
import { FLAG_ABILITY_PERCEPTION, ITEM_WATER, NPC_MIRA } from '../campaigns/first-day/ids';
import { reopenNarrativeSession } from './helpers';

function createState(): GameState {
  return startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, () => '2026-08-31T12:00:00.000Z');
}

describe('condições', () => {
  it('considera verdadeiro um conjunto vazio de condições', () => {
    expect(evaluateConditions(undefined, createState())).toBe(true);
    expect(evaluateConditions([], createState())).toBe(true);
  });

  it('habilita um evento apenas quando a flag existe', () => {
    const base = createState();
    const withFlag: GameState = {
      ...base,
      flags: { ...base.flags, [FLAG_ABILITY_PERCEPTION]: true },
    };

    expect(evaluateCondition({ type: 'flag.is', flag: FLAG_ABILITY_PERCEPTION, value: true }, base)).toBe(false);
    expect(evaluateCondition({ type: 'flag.is', flag: FLAG_ABILITY_PERCEPTION, value: true }, withFlag)).toBe(true);
  });

  it('bloqueia escolhas que exigem item ausente e libera depois da obtenção', () => {
    const withoutWater = createState();
    const withWater = applyChoice(
      applyChoice(
        applyChoice(withoutWater, firstDayCampaign, 'awake-calm', () => 't'),
        firstDayCampaign,
        'system-touch',
        () => 't',
      ),
      firstDayCampaign,
      'ability-perception',
      () => 't',
    );
    const afterWater = applyChoice(
      reopenNarrativeSession(withWater, 'first-priority'),
      firstDayCampaign,
      'seek-water',
      () => 't',
    );

    expect(evaluateCondition({ type: 'inventory.has', itemId: ITEM_WATER, quantity: 1 }, withWater)).toBe(false);
    expect(evaluateCondition({ type: 'inventory.has', itemId: ITEM_WATER, quantity: 1 }, afterWater)).toBe(true);
  });

  it('avalia atributo mínimo, máximo e relação', () => {
    const state: GameState = {
      ...createState(),
      attributes: { ...createState().attributes, cautela: 40, saude: 10 },
      relationships: [{ characterId: NPC_MIRA, trust: 20 }],
    };

    expect(evaluateCondition({ type: 'attribute.min', attribute: 'cautela', amount: 40 }, state)).toBe(true);
    expect(evaluateCondition({ type: 'attribute.max', attribute: 'saude', amount: 10 }, state)).toBe(true);
    expect(evaluateCondition({ type: 'attribute.min', attribute: 'saude', amount: 11 }, state)).toBe(false);
    expect(evaluateCondition({ type: 'relationship.min', characterId: NPC_MIRA, amount: 20 }, state)).toBe(true);
    expect(evaluateCondition({ type: 'relationship.min', characterId: NPC_MIRA, amount: 21 }, state)).toBe(false);
  });
});
