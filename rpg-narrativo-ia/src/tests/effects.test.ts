import { describe, expect, it } from 'vitest';
import { applyEffects } from '../core/effects';
import { createInitialState } from '../core/state';
import { ITEM_FRUIT, NPC_MIRA } from '../campaigns/first-day/ids';

describe('efeitos', () => {
  it('produz um novo estado sem mutar o anterior', () => {
    const original = createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, 'awakening', () => 't0');
    const snapshot = structuredClone(original);

    const next = applyEffects(original, [
      { type: 'attribute.change', attribute: 'energia', amount: -10 },
      { type: 'inventory.add', itemId: ITEM_FRUIT, quantity: 1 },
      { type: 'flag.set', flag: 'tested', value: true },
    ]);

    expect(next).not.toBe(original);
    expect(original).toEqual(snapshot);
    expect(next.attributes.energia).toBe(60);
    expect(next.inventory).toEqual([{ itemId: ITEM_FRUIT, quantity: 1 }]);
    expect(next.flags.tested).toBe(true);
  });

  it('não deixa atributos abaixo de zero nem acima de 100', () => {
    const state = createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, 'awakening', () => 't0');
    const drained = applyEffects(state, [{ type: 'attribute.change', attribute: 'fome', amount: -999 }]);
    const filled = applyEffects(state, [{ type: 'attribute.change', attribute: 'saude', amount: 999 }]);

    expect(drained.attributes.fome).toBe(0);
    expect(filled.attributes.saude).toBe(100);
  });

  it('não deixa quantidade de item negativa', () => {
    const withItem = applyEffects(
      createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, 'awakening', () => 't0'),
      [{ type: 'inventory.add', itemId: ITEM_FRUIT, quantity: 1 }],
    );
    const removed = applyEffects(withItem, [{ type: 'inventory.remove', itemId: ITEM_FRUIT, quantity: 8 }]);

    expect(removed.inventory.find((item) => item.itemId === ITEM_FRUIT)).toBeUndefined();
    expect(removed.inventory.every((item) => item.quantity > 0)).toBe(true);
  });

  it('altera relação e progressão sem reutilizar o mesmo array', () => {
    const state = createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, 'awakening', () => 't0');
    const next = applyEffects(state, [
      { type: 'relationship.change', characterId: NPC_MIRA, amount: 15 },
      { type: 'progression.ability', abilityId: 'olhar-atento' },
      { type: 'game.complete' },
    ]);

    expect(next.relationships).not.toBe(state.relationships);
    expect(next.progression).not.toBe(state.progression);
    expect(next.relationships[0]).toMatchObject({ characterId: NPC_MIRA, trust: 15 });
    expect(next.progression.abilityIds).toEqual(['olhar-atento']);
    expect(next.status).toBe('completed');
    expect(state.status).toBe('playing');
  });
});
