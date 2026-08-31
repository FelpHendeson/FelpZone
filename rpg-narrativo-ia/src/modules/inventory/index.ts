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

export function itemQuantity(items: InventoryItem[], itemId: string): number {
  return items.find((item) => item.itemId === itemId)?.quantity ?? 0;
}

export function canRemoveItem(items: InventoryItem[], itemId: string, quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0 && itemQuantity(items, itemId) >= quantity;
}
