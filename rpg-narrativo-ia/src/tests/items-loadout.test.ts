import { describe, expect, it } from 'vitest';
import { EquipmentError, deriveEquipmentGrants, equipItem, equipmentModifier, unequipSlot } from '../modules/equipment';
import { INITIAL_ITEMS, createInitialItemsState } from '../modules/items';
import { PreparationError, assignPreparation, clearPreparation, consumePreparedSlot } from '../modules/preparation';

describe('Fatia 14.2 — equipamento e preparação puros', () => {
  it('equipa e desequipa sem mutar o estado anterior', () => {
    const before = createInitialItemsState();
    const inventory = [{ itemId: 'improvised-tool', quantity: 1 }];
    const equipped = equipItem(INITIAL_ITEMS, before, inventory, 'improvised-tool');

    expect(before.equipment['main-hand']).toBeNull();
    expect(equipped.current.equipment['main-hand']).toBe('improvised-tool');
    expect(deriveEquipmentGrants(INITIAL_ITEMS, equipped.current)).toEqual([
      { type: 'combat.value.modify', target: 'damage', amount: 2 },
    ]);
    expect(equipmentModifier(deriveEquipmentGrants(INITIAL_ITEMS, equipped.current), 'damage')).toBe(2);

    const cleared = unequipSlot(equipped.current, 'main-hand');
    expect(cleared.current.equipment['main-hand']).toBeNull();
    expect(equipped.current.equipment['main-hand']).toBe('improvised-tool');
  });

  it('rejeita equipamento ausente, tipo errado e troca durante combate', () => {
    const state = createInitialItemsState();
    expect(() => equipItem(INITIAL_ITEMS, state, [], 'improvised-tool')).toThrow(EquipmentError);
    expect(() => equipItem(INITIAL_ITEMS, state, [{ itemId: 'fallen-branch', quantity: 1 }], 'fallen-branch')).toThrow(
      EquipmentError,
    );
    expect(() =>
      equipItem(INITIAL_ITEMS, state, [{ itemId: 'improvised-tool', quantity: 1 }], 'improvised-tool', true),
    ).toThrow(EquipmentError);
  });

  it('reserva consumível de combate sem duplicar a posse', () => {
    const state = createInitialItemsState();
    const inventory = [{ itemId: 'improvised-salve', quantity: 1 }];
    const assigned = assignPreparation(INITIAL_ITEMS, state, inventory, 0, 'improvised-salve');

    expect(assigned.current.preparation.slots[0].itemId).toBe('improvised-salve');
    expect(() => assignPreparation(INITIAL_ITEMS, assigned.current, inventory, 1, 'improvised-salve')).toThrow(
      PreparationError,
    );
    expect(() => assignPreparation(INITIAL_ITEMS, state, inventory, 0, 'cooked-horned-rabbit-meat')).toThrow(
      PreparationError,
    );

    const cleared = clearPreparation(assigned.current, 0);
    expect(cleared.current.preparation.slots[0].itemId).toBeNull();
    const consumed = consumePreparedSlot(assigned.current, 0);
    expect(consumed.preparation.slots[0].itemId).toBeNull();
    expect(assigned.current.preparation.slots[0].itemId).toBe('improvised-salve');
  });
});
