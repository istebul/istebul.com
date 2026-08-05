import type { InventoryTracking } from "./InventoryMovement";
import type { InventoryStockStatus } from "./InventoryStockStatus";
import type { PickingStrategy } from "./PickingStrategy";

export interface PickingItem {
  readonly id: string;
  readonly tenantId: string;
  readonly pickingId: string;
  readonly lineNumber: number;

  readonly warehouseId: string;
  readonly productId: string;
  readonly skuId?: string;

  readonly requestedQuantity: number;
  readonly pickedQuantity: number;
  readonly shortQuantity: number;
  readonly remainingQuantity: number;
  readonly unit: string;

  readonly stockStatus: InventoryStockStatus;
  readonly strategy: PickingStrategy;
  readonly tracking?: InventoryTracking;

  readonly sourceLocationId?: string;
  readonly destinationLocationId?: string;
  readonly suggestionId?: string;
  readonly reservationId?: string;

  readonly inventoryMovementIds: readonly string[];
  readonly transactionGroupIds: readonly string[];

  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePickingItemInput {
  tenantId: string;
  pickingId: string;
  warehouseId: string;
  productId: string;
  skuId?: string;
  requestedQuantity: number;
  unit: string;
  stockStatus?: InventoryStockStatus;
  strategy: PickingStrategy;
  tracking?: InventoryTracking;
  sourceLocationId?: string;
  destinationLocationId?: string;
  suggestionId?: string;
  reservationId?: string;
  notes?: string;
  createdBy: string;
}

export interface ConfirmPickingItemInput {
  tenantId: string;
  pickingId: string;
  pickingItemId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number;
  shortQuantity?: number;
  barcode?: string;
  lotNumber?: string;
  serialNumber?: string;
  pickedBy: string;
  notes?: string;
}

export interface PickingItemQuantitySummary {
  readonly requestedQuantity: number;
  readonly pickedQuantity: number;
  readonly shortQuantity: number;
  readonly remainingQuantity: number;
}

export function calculatePickingItemQuantitySummary(
  item: PickingItem,
): PickingItemQuantitySummary {
  return {
    requestedQuantity: item.requestedQuantity,
    pickedQuantity: item.pickedQuantity,
    shortQuantity: item.shortQuantity,
    remainingQuantity: Math.max(
      0,
      item.requestedQuantity -
        item.pickedQuantity -
        item.shortQuantity,
    ),
  };
}
