import { describe, expect, it } from 'vitest';
import { applyEffects } from '../core/effects';
import { EngineError } from '../core/engine';
import { createInitialState } from '../core/state';
import { ITEM_FRUIT, NPC_MIRA } from '../campaigns/first-day/ids';

function baseState() {
  return createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, 'awakening', () => 't0');
}

describe('efeitos', () => {
  it('produz um novo estado sem mutar o anterior', () => {
    const original = baseState();
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
    const state = baseState();
    const drained = applyEffects(state, [{ type: 'attribute.change', attribute: 'fome', amount: -999 }]);
    const filled = applyEffects(state, [{ type: 'attribute.change', attribute: 'saude', amount: 999 }]);

    expect(drained.attributes.fome).toBe(0);
    expect(filled.attributes.saude).toBe(100);
  });

  it('falha de forma controlada e imutável ao remover item insuficiente', () => {
    const state = applyEffects(baseState(), [{ type: 'inventory.add', itemId: ITEM_FRUIT, quantity: 1 }]);
    const snapshot = structuredClone(state);

    expect(() => applyEffects(state, [{ type: 'inventory.remove', itemId: ITEM_FRUIT, quantity: 8 }])).toThrow(
      EngineError,
    );
    expect(state).toEqual(snapshot);
  });

  it('falha ao remover um recurso inexistente sem alterar o estado', () => {
    const state = baseState();
    const snapshot = structuredClone(state);

    expect(() => applyEffects(state, [{ type: 'inventory.remove', itemId: ITEM_FRUIT, quantity: 1 }])).toThrow(
      EngineError,
    );
    expect(state).toEqual(snapshot);
  });

  it('rejeita quantidades e variações não finitas ou não inteiras sem mutar o estado', () => {
    const state = baseState();
    const snapshot = structuredClone(state);

    expect(() => applyEffects(state, [{ type: 'attribute.change', attribute: 'saude', amount: Number.NaN }])).toThrow(
      EngineError,
    );
    expect(() => applyEffects(state, [{ type: 'attribute.change', attribute: 'saude', amount: Number.POSITIVE_INFINITY }])).toThrow(
      EngineError,
    );
    expect(() => applyEffects(state, [{ type: 'inventory.add', itemId: ITEM_FRUIT, quantity: 0 }])).toThrow(EngineError);
    expect(() => applyEffects(state, [{ type: 'inventory.add', itemId: ITEM_FRUIT, quantity: 1.5 }])).toThrow(
      EngineError,
    );
    expect(state).toEqual(snapshot);
  });

  it('altera relação e progressão sem reutilizar o mesmo array', () => {
    const state = baseState();
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

  it('não duplica relações, capacidades ou títulos', () => {
    const state = baseState();
    const once = applyEffects(state, [
      { type: 'relationship.change', characterId: NPC_MIRA, amount: 8 },
      { type: 'progression.ability', abilityId: 'olhar-atento' },
      { type: 'progression.title', titleId: 'despertar' },
    ]);
    const twice = applyEffects(once, [
      { type: 'relationship.change', characterId: NPC_MIRA, amount: 4 },
      { type: 'progression.ability', abilityId: 'olhar-atento' },
      { type: 'progression.title', titleId: 'despertar' },
    ]);

    expect(twice.relationships).toHaveLength(1);
    expect(twice.relationships[0]).toEqual({ characterId: NPC_MIRA, trust: 12 });
    expect(twice.progression.abilityIds).toEqual(['olhar-atento']);
    expect(twice.progression.titleIds).toEqual(['despertar']);
  });
});
