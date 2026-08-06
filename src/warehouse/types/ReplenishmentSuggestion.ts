import type {
  InventoryTracking,
} from "./InventoryMovement";

export interface ReplenishmentSuggestion {
  readonly id: string;
  readonly tenantId: string;
  readonly replenishmentId: string;
  readonly replenishmentItemId: string;
  readonly sourceLocationId: string;
  readonly destinationLocationId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly inventoryBalanceId?: string;
  readonly stockStatus: string;
  readonly unit: string;
  readonly suggestedQuantity: number;
  readonly availableQuantity: number;
  readonly sourceRemainingQuantity: number;
  readonly sourceDistance: number;
  readonly capacityScore: number;
  readonly distanceScore: number;
  readonly stockAgeScore: number;
  readonly compatibilityScore: number;
  readonly totalScore: number;
  readonly reasons: readonly string[];
  readonly warnings: readonly string[];
  readonly tracking?: InventoryTracking;
  readonly createdAt: string;
}
