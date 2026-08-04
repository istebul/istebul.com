import type { InventoryStockStatus } from "./InventoryStockStatus";

export interface InventoryBalanceKey {
  tenantId: string;
  warehouseId: string;
  locationId: string;
  productId: string;
  skuId?: string;
  lotNumber?: string;
  serialNumber?: string;
  stockStatus: InventoryStockStatus;
}

export interface InventoryBalance extends InventoryBalanceKey {
  quantity: number;
  unit: string;
  lastMovementId?: string;
  lastMovementAt?: string;
}

export interface InventoryBalanceFilter {
  tenantId: string;
  warehouseId?: string;
  locationId?: string;
  productId?: string;
  skuId?: string;
  lotNumber?: string;
  serialNumber?: string;
  stockStatus?: InventoryStockStatus;
}
