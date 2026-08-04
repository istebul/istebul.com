import type { InventoryBalance } from "./InventoryBalance";

export interface InventoryAvailabilityFilter {
  tenantId: string;
  warehouseId?: string;
  locationId?: string;
  productId: string;
  skuId?: string;
  lotNumber?: string;
  serialNumber?: string;
}

export interface InventoryAvailability {
  readonly tenantId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly warehouseId?: string;
  readonly locationId?: string;
  readonly lotNumber?: string;
  readonly serialNumber?: string;
  readonly physicalQuantity: number;
  readonly reservedQuantity: number;
  readonly availableQuantity: number;
  readonly unit: string;
  readonly balances: readonly InventoryBalance[];
}
