import { describe, expect, it } from 'vitest';
import {
  ItemError,
  INITIAL_ITEMS,
  createInitialItemsState,
  getConsumable,
  getEquipment,
  getItem,
  indexItemsCatalog,
  inspectItemsAgainstInventory,
  inspectItemsCatalog,
  inspectItemsState,
  reservedQuantity,
} from '../modules/items';

describe('Fatia 14.1 — catálogo puro de itens', () => {
  it('indexa o catálogo inicial com materiais, equipamento e consumíveis', () => {
    expect(getItem(INITIAL_ITEMS, 'fallen-branch').kind).toBe('material');
    expect(getEquipment(INITIAL_ITEMS, 'improvised-tool').slot).toBe('main-hand');
    expect(getConsumable(INITIAL_ITEMS, 'improvised-salve').use).toEqual({ type: 'combat.heal', amount: 8 });
  });

  it('congela o índice e rejeita mutação', () => {
    expect(() => (INITIAL_ITEMS.byId as Map<string, never>).set('x', null as never)).toThrow(ItemError);
    expect(() => {
      const grant = getEquipment(INITIAL_ITEMS, 'improvised-tool').grants[0];
      if (grant.type === 'combat.value.modify') {
        (grant as { amount: number }).amount = 99;
      }
    }).not.toThrow();
    expect(getEquipment(INITIAL_ITEMS, 'improvised-tool').grants[0]).toMatchObject({ amount: 2 });
  });

  it('rejeita catálogo hostil, duplicado ou com referência inválida', () => {
    expect(inspectItemsCatalog(null).ok).toBe(false);
    expect(inspectItemsCatalog({ items: [{ ...INITIAL_ITEMS.items[0], id: '' }] }).ok).toBe(false);
    expect(
      inspectItemsCatalog({
        items: [
          { id: 'a', name: 'A', description: 'd', kind: 'material', stackLimit: 2, tags: [] },
          { id: 'a', name: 'B', description: 'd', kind: 'material', stackLimit: 2, tags: [] },
        ],
      }).ok,
    ).toBe(false);
    expect(
      inspectItemsCatalog({
        items: [{ id: 'tool', name: 'T', description: 'd', kind: 'equipment', stackLimit: 2, tags: [], slot: 'main-hand', grants: [{ type: 'combat.value.modify', target: 'damage', amount: 1 }] }],
      }).ok,
    ).toBe(false);
    expect(() => indexItemsCatalog({ items: [] })).not.toThrow();
  });

  it('rejeita estado persistido com equipamento ou reserva impossível', () => {
    const empty = createInitialItemsState();
    expect(inspectItemsState(empty).ok).toBe(true);
    expect(
      inspectItemsState({
        equipment: { 'main-hand': 'ghost', body: null, accessory: null },
        preparation: { slots: [{ index: 0, itemId: null }, { index: 1, itemId: null }] },
      }).ok,
    ).toBe(false);
    expect(
      inspectItemsAgainstInventory(
        {
          equipment: { 'main-hand': 'improvised-tool', body: null, accessory: null },
          preparation: { slots: [{ index: 0, itemId: 'improvised-salve' }, { index: 1, itemId: null }] },
        },
        [],
      ).ok,
    ).toBe(false);
    expect(
      inspectItemsAgainstInventory(
        {
          equipment: { 'main-hand': 'improvised-tool', body: null, accessory: null },
          preparation: { slots: [{ index: 0, itemId: 'improvised-salve' }, { index: 1, itemId: null }] },
        },
        [
          { itemId: 'improvised-tool', quantity: 1 },
          { itemId: 'improvised-salve', quantity: 1 },
        ],
      ).ok,
    ).toBe(true);
    expect(inspectItemsAgainstInventory(empty, [{ itemId: 'ghost-item', quantity: 1 }]).ok).toBe(false);
    const branch = getItem(INITIAL_ITEMS, 'fallen-branch');
    expect(
      inspectItemsAgainstInventory(empty, [{ itemId: branch.id, quantity: branch.stackLimit + 1 }]).ok,
    ).toBe(false);
    expect(
      reservedQuantity(
        {
          equipment: { 'main-hand': 'improvised-tool', body: null, accessory: null },
          preparation: { slots: [{ index: 0, itemId: 'improvised-salve' }, { index: 1, itemId: 'improvised-salve' }] },
        },
        'improvised-salve',
      ),
    ).toBe(2);
  });
});
