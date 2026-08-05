import type { InventoryBalance } from "./InventoryBalance";
import type { PickingStrategy } from "./PickingStrategy";

export interface PickingSuggestionScore {
  readonly quantityScore: number;
  readonly distanceScore: number;
  readonly expiryScore: number;
  readonly fifoScore: number;
  readonly compatibilityScore: number;
  readonly totalScore: number;
}

export interface PickingSuggestion {
  readonly id: string;
  readonly tenantId: string;
  readonly pickingId: string;
  readonly pickingItemId: string;
  readonly warehouseId: string;
  readonly locationId: string;
  readonly strategy: PickingStrategy;
  readonly suggestedQuantity: number;
  readonly unit: string;
  readonly balance: InventoryBalance;
  readonly score: PickingSuggestionScore;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
  readonly selected: boolean;
  readonly createdAt: string;
}

export interface CreatePickingSuggestionInput {
  tenantId: string;
  pickingId: string;
  pickingItemId: string;
  warehouseId: string;
  strategy: PickingStrategy;
  requestedQuantity: number;
  unit: string;
  balances: readonly InventoryBalance[];
}
