import type { InventoryTracking } from "./InventoryMovement";
import type { InventoryStockStatus } from "./InventoryStockStatus";

export interface ReceivingItemQuantitySummary {
  readonly expectedQuantity: number;
  readonly receivedQuantity: number;
  readonly acceptedQuantity: number;
  readonly rejectedQuantity: number;
  readonly damagedQuantity: number;
  readonly remainingQuantity: number;
  readonly overDeliveryQuantity: number;
}

export interface ReceivingItem {
  readonly id: string;
  readonly tenantId: string;
  readonly receivingId: string;
  readonly lineNumber: number;

  readonly warehouseId: string;
  readonly receivingLocationId: string;
  readonly productId: string;
  readonly skuId?: string;

  readonly expectedQuantity: number;
  readonly receivedQuantity: number;
  readonly acceptedQuantity: number;
  readonly rejectedQuantity: number;
  readonly damagedQuantity: number;
  readonly unit: string;

  readonly stockStatus: InventoryStockStatus;
  readonly tracking?: InventoryTracking;

  readonly qualityControlRequired: boolean;
  readonly unexpectedProduct: boolean;
  readonly overDeliveryAllowed: boolean;

  readonly rejectionReason?: string;
  readonly notes?: string;

  readonly inventoryMovementId?: string;

  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateReceivingItemInput {
  tenantId: string;
  receivingId: string;
  warehouseId: string;
  receivingLocationId: string;
  productId: string;
  skuId?: string;
  expectedQuantity: number;
  unit: string;
  stockStatus?: InventoryStockStatus;
  tracking?: InventoryTracking;
  qualityControlRequired?: boolean;
  unexpectedProduct?: boolean;
  overDeliveryAllowed?: boolean;
  notes?: string;
  createdBy: string;
}

export interface ReceiveItemQuantityInput {
  tenantId: string;
  receivingId: string;
  receivingItemId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity?: number;
  damagedQuantity?: number;
  rejectionReason?: string;
  tracking?: InventoryTracking;
  updatedBy: string;
}

export function calculateReceivingItemQuantitySummary(
  item: ReceivingItem,
): ReceivingItemQuantitySummary {
  const remainingQuantity = Math.max(
    0,
    item.expectedQuantity - item.receivedQuantity,
  );

  const overDeliveryQuantity = Math.max(
    0,
    item.receivedQuantity - item.expectedQuantity,
  );

  return {
    expectedQuantity: item.expectedQuantity,
    receivedQuantity: item.receivedQuantity,
    acceptedQuantity: item.acceptedQuantity,
    rejectedQuantity: item.rejectedQuantity,
    damagedQuantity: item.damagedQuantity,
    remainingQuantity,
    overDeliveryQuantity,
  };
}
