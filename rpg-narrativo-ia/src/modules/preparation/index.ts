import type { InventoryItem } from '../../core/state/types';
import { itemQuantity } from '../inventory';
import {
  PREPARATION_SLOT_COUNT,
  copyItemsState,
  reservedQuantity,
  type ConsumableDefinition,
  type IndexedItems,
  type ItemsState,
} from '../items';
import { PreparationError } from './errors';

export { PreparationError } from './errors';

export interface PreparationChangeResult {
  previous: ItemsState;
  current: ItemsState;
}

export function assignPreparation(
  catalog: IndexedItems,
  state: ItemsState,
  inventory: readonly InventoryItem[],
  slot: number,
  itemId: string,
  inCombat = false,
): PreparationChangeResult {
  if (inCombat) {
    throw new PreparationError('Não é possível alterar a preparação durante o combate.');
  }
  if (!Number.isInteger(slot) || slot < 0 || slot >= PREPARATION_SLOT_COUNT) {
    throw new PreparationError('O espaço de preparação é inválido.');
  }
  const consumable = catalog.consumableById.get(itemId);
  if (!consumable || consumable.use.type !== 'combat.heal') {
    throw new PreparationError('Só é possível preparar um consumível de combate conhecido.');
  }
  const previous = copyItemsState(state);
  const withoutSlot = copyItemsState(state);
  withoutSlot.preparation.slots[slot].itemId = null;
  const alreadyReserved = reservedQuantity(withoutSlot, itemId);
  if (itemQuantity(inventory, itemId) <= alreadyReserved) {
    throw new PreparationError('Não há unidades disponíveis para reservar.');
  }
  const current = copyItemsState(state);
  current.preparation.slots[slot].itemId = itemId;
  return { previous, current };
}

export function clearPreparation(state: ItemsState, slot: number, inCombat = false): PreparationChangeResult {
  if (inCombat) {
    throw new PreparationError('Não é possível alterar a preparação durante o combate.');
  }
  if (!Number.isInteger(slot) || slot < 0 || slot >= PREPARATION_SLOT_COUNT) {
    throw new PreparationError('O espaço de preparação é inválido.');
  }
  const previous = copyItemsState(state);
  const current = copyItemsState(state);
  current.preparation.slots[slot].itemId = null;
  return { previous, current };
}

export function consumePreparedSlot(state: ItemsState, slot: number): ItemsState {
  if (!Number.isInteger(slot) || slot < 0 || slot >= PREPARATION_SLOT_COUNT) {
    throw new PreparationError('O espaço de preparação é inválido.');
  }
  const current = copyItemsState(state);
  current.preparation.slots[slot].itemId = null;
  return current;
}

export function preparedConsumable(
  catalog: IndexedItems,
  state: ItemsState,
  slot: number,
): ConsumableDefinition | null {
  const itemId = state.preparation.slots.find((entry) => entry.index === slot)?.itemId;
  if (!itemId) {
    return null;
  }
  return catalog.consumableById.get(itemId) ?? null;
}
