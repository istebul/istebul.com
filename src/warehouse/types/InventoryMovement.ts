import type { InventoryDirection } from "./InventoryDirection";
import type { InventoryMovementType } from "./InventoryMovementType";
import type { InventoryStockStatus } from "./InventoryStockStatus";

export interface InventoryReference {
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
}

export interface InventoryTracking {
  lotNumber?: string;
  serialNumber?: string;
  productionDate?: string;
  expiryDate?: string;
}

export interface InventoryMovement {
  readonly id: string;
  readonly tenantId: string;
  readonly movementNumber: string;
  readonly movementType: InventoryMovementType;
  readonly direction: InventoryDirection;

  readonly warehouseId: string;
  readonly locationId: string;
  readonly productId: string;
  readonly skuId?: string;

  readonly sourceWarehouseId?: string;
  readonly sourceLocationId?: string;
  readonly destinationWarehouseId?: string;
  readonly destinationLocationId?: string;

  readonly stockStatus: InventoryStockStatus;
  readonly quantity: number;
  readonly unit: string;

  readonly tracking?: InventoryTracking;
  readonly reference?: InventoryReference;

  readonly reason?: string;
  readonly notes?: string;

  readonly reversalOfMovementId?: string;
  readonly transactionGroupId?: string;

  readonly occurredAt: string;
  readonly createdBy: string;
  readonly createdAt: string;
}

export interface CreateInventoryMovementInput {
  tenantId: string;
  movementType: InventoryMovementType;

  warehouseId: string;
  locationId: string;
  productId: string;
  skuId?: string;

  sourceWarehouseId?: string;
  sourceLocationId?: string;
  destinationWarehouseId?: string;
  destinationLocationId?: string;

  stockStatus?: InventoryStockStatus;
  quantity: number;
  unit: string;

  tracking?: InventoryTracking;
  reference?: InventoryReference;

  reason?: string;
  notes?: string;

  reversalOfMovementId?: string;
  transactionGroupId?: string;

  occurredAt?: string;
  createdBy: string;
}
