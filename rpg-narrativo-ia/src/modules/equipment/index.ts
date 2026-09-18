import type { InventoryItem } from '../../core/state/types';
import { itemQuantity } from '../inventory';
import {
  EQUIPMENT_SLOTS,
  copyItemsState,
  type CombatValueTarget,
  type EquipmentGrant,
  type EquipmentSlot,
  type IndexedItems,
  type ItemsState,
} from '../items';
import { EquipmentError } from './errors';

export { EquipmentError } from './errors';

export interface EquipmentChangeResult {
  previous: ItemsState;
  current: ItemsState;
}

export function equipItem(
  catalog: IndexedItems,
  state: ItemsState,
  inventory: readonly InventoryItem[],
  itemId: string,
  inCombat = false,
): EquipmentChangeResult {
  if (inCombat) {
    throw new EquipmentError('Não é possível alterar o equipamento durante o combate.');
  }
  const definition = catalog.equipmentById.get(itemId);
  if (!definition) {
    throw new EquipmentError('O equipamento não existe.');
  }
  if (itemQuantity(inventory, itemId) < 1) {
    throw new EquipmentError('Você não possui este equipamento.');
  }
  const previous = copyItemsState(state);
  const current = copyItemsState(state);
  current.equipment[definition.slot] = itemId;
  return { previous, current };
}

export function unequipSlot(state: ItemsState, slot: EquipmentSlot, inCombat = false): EquipmentChangeResult {
  if (inCombat) {
    throw new EquipmentError('Não é possível alterar o equipamento durante o combate.');
  }
  if (!EQUIPMENT_SLOTS.includes(slot)) {
    throw new EquipmentError('O espaço de equipamento é inválido.');
  }
  const previous = copyItemsState(state);
  const current = copyItemsState(state);
  current.equipment[slot] = null;
  return { previous, current };
}

export function deriveEquipmentGrants(catalog: IndexedItems, state: ItemsState): EquipmentGrant[] {
  const grants: EquipmentGrant[] = [];
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = state.equipment[slot];
    if (!itemId) {
      continue;
    }
    const definition = catalog.equipmentById.get(itemId);
    if (!definition) {
      throw new EquipmentError('O loadout referencia um equipamento desconhecido.');
    }
    for (const grant of definition.grants) {
      grants.push({ ...grant });
    }
  }
  return grants;
}

export function equipmentModifier(grants: readonly EquipmentGrant[], target: CombatValueTarget): number {
  return grants
    .filter((grant): grant is Extract<EquipmentGrant, { type: 'combat.value.modify' }> => {
      return grant.type === 'combat.value.modify' && grant.target === target;
    })
    .reduce((sum, grant) => sum + grant.amount, 0);
}

export function grantedActionIds(grants: readonly EquipmentGrant[]): string[] {
  return grants
    .filter((grant): grant is Extract<EquipmentGrant, { type: 'combat.action.available' }> => grant.type === 'combat.action.available')
    .map((grant) => grant.actionId);
}

export function buildCombatLoadout(catalog: IndexedItems, state: ItemsState) {
  const grants = deriveEquipmentGrants(catalog, state);
  return {
    loadout: {
      equipment: { ...state.equipment },
      prepared: state.preparation.slots
        .filter((slot) => slot.itemId)
        .map((slot) => ({ index: slot.index, itemId: slot.itemId as string })),
      modifiers: {
        damage: equipmentModifier(grants, 'damage'),
        guard: equipmentModifier(grants, 'guard'),
        healing: equipmentModifier(grants, 'healing'),
      },
      executionModifiers: { prepare: 0, execute: 0, recover: 0, cost: 0, cooldown: 0, speed: 0 },
      grantedActionIds: grantedActionIds(grants),
    },
    prepared: state.preparation.slots.flatMap((slot) => {
      if (!slot.itemId) {
        return [];
      }
      const item = catalog.consumableById.get(slot.itemId);
      if (!item || item.use.type !== 'combat.heal') {
        return [];
      }
      return [{ index: slot.index, itemId: slot.itemId, name: item.name, heal: item.use.amount }];
    }),
  };
}
