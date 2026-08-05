import type { InventoryTracking } from "./InventoryMovement";
import type { InventoryStockStatus } from "./InventoryStockStatus";
import type { PutawayStrategy } from "./PutawayStrategy";

export interface PutawayItem {
  readonly id: string;
  readonly tenantId: string;
  readonly putawayId: string;
  readonly lineNumber: number;
  readonly warehouseId: string;
  readonly sourceLocationId: string;
  readonly targetLocationId?: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly requestedQuantity: number;
  readonly placedQuantity: number;
  readonly remainingQuantity: number;
  readonly unit: string;
  readonly stockStatus: InventoryStockStatus;
  readonly strategy: PutawayStrategy;
  readonly tracking?: InventoryTracking;
  readonly suggestionId?: string;
  readonly inventoryMovementIds: readonly string[];
  readonly transactionGroupIds: readonly string[];
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePutawayItemInput {
  tenantId: string;
  putawayId: string;
  warehouseId: string;
  sourceLocationId: string;
  targetLocationId?: string;
  productId: string;
  skuId?: string;
  requestedQuantity: number;
  unit: string;
  stockStatus?: InventoryStockStatus;
  strategy: PutawayStrategy;
  tracking?: InventoryTracking;
  suggestionId?: string;
  notes?: string;
  createdBy: string;
}

export interface ExecutePutawayItemInput {
  tenantId: string;
  putawayId: string;
  putawayItemId: string;
  targetLocationId: string;
  quantity: number;
  executedBy: string;
  notes?: string;
}

export interface PutawayItemQuantitySummary {
  readonly requestedQuantity: number;
  readonly placedQuantity: number;
  readonly remainingQuantity: number;
}

export function calculatePutawayItemQuantitySummary(
  item: PutawayItem,
): PutawayItemQuantitySummary {
  return {
    requestedQuantity: item.requestedQuantity,
    placedQuantity: item.placedQuantity,
    remainingQuantity: Math.max(
      0,
      item.requestedQuantity - item.placedQuantity,
    ),
  };
}
