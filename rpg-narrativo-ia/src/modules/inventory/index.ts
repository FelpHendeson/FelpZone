import type { InventoryItem } from '../../core/state/types';

export type { InventoryItem };

export function addItem(items: InventoryItem[], itemId: string, quantity: number): InventoryItem[] {
  const amount = Math.max(0, Math.round(quantity));
  if (amount === 0) {
    return items;
  }

  const existing = items.find((item) => item.itemId === itemId);
  if (!existing) {
    return [...items, { itemId, quantity: amount }];
  }

  return items.map((item) =>
    item.itemId === itemId ? { ...item, quantity: item.quantity + amount } : item,
  );
}

export function removeItem(items: InventoryItem[], itemId: string, quantity: number): InventoryItem[] {
  const amount = Math.max(0, Math.round(quantity));
  if (amount === 0) {
    return items;
  }

  return items
    .map((item) => {
      if (item.itemId !== itemId) {
        return item;
      }

      return { ...item, quantity: Math.max(0, item.quantity - amount) };
    })
    .filter((item) => item.quantity > 0);
}

export function itemQuantity(items: readonly InventoryItem[], itemId: string): number {
  return items.find((item) => item.itemId === itemId)?.quantity ?? 0;
}

export function canRemoveItem(items: InventoryItem[], itemId: string, quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0 && itemQuantity(items, itemId) >= quantity;
}

/** Copia um item preservando a unidade aberta, quando houver. */
export function copyInventoryItem(item: InventoryItem): InventoryItem {
  return item.openPortions === undefined
    ? { itemId: item.itemId, quantity: item.quantity }
    : { itemId: item.itemId, quantity: item.quantity, openPortions: item.openPortions };
}

/** Porções restantes da unidade aberta do item (ou `undefined` se nenhuma está aberta). */
export function openPortionsOf(items: readonly InventoryItem[], itemId: string): number | undefined {
  return items.find((item) => item.itemId === itemId)?.openPortions;
}

/**
 * Consome `portions` porções de um item com `portionsPerUnit` porções por unidade, começando
 * pela unidade aberta. Unidades terminadas saem do estoque; a última parcial fica aberta.
 */
export function consumePortions(
  items: InventoryItem[],
  itemId: string,
  portions: number,
  portionsPerUnit: number,
): InventoryItem[] {
  const entry = items.find((item) => item.itemId === itemId);
  if (!entry || portions <= 0) return items;
  let remainingInOpen = entry.openPortions ?? portionsPerUnit;
  let quantity = entry.quantity;
  let left = portions;
  while (left > 0 && quantity > 0) {
    const take = Math.min(left, remainingInOpen);
    remainingInOpen -= take;
    left -= take;
    if (remainingInOpen === 0) {
      quantity -= 1;
      remainingInOpen = portionsPerUnit;
    }
  }
  if (quantity <= 0) return items.filter((item) => item.itemId !== itemId);
  return items.map((item) => {
    if (item.itemId !== itemId) return item;
    return remainingInOpen < portionsPerUnit
      ? { itemId, quantity, openPortions: remainingInOpen }
      : { itemId, quantity };
  });
}
