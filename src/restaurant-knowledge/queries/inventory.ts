import type { InventoryItemFact } from '../types/source.ts';
import type { RestaurantSnapshot } from '../types/snapshot.ts';

export function listInventory(snapshot: RestaurantSnapshot): InventoryItemFact[] {
  return snapshot.inventory;
}

export function listLowStock(snapshot: RestaurantSnapshot): InventoryItemFact[] {
  return snapshot.inventory.filter((i) => {
    if (i.stockStatus === 'low' || i.stockStatus === 'out') return true;
    if (
      i.minStock !== undefined &&
      i.quantityOnHand !== undefined &&
      i.quantityOnHand <= i.minStock
    ) {
      return true;
    }
    return false;
  });
}

export function findInventoryByMenuItem(
  snapshot: RestaurantSnapshot,
  menuItemId: string,
): InventoryItemFact | undefined {
  return snapshot.inventory.find((i) => i.menuItemId === menuItemId);
}
