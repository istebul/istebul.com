import type { InventoryTracking } from "./InventoryMovement";

export interface PackingItem {
  readonly id: string;
  readonly tenantId: string;
  readonly packingId: string;
  readonly lineNumber: number;
  readonly pickingId?: string;
  readonly pickingItemId?: string;
  readonly warehouseId: string;
  readonly packingLocationId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly requestedQuantity: number;
  readonly packedQuantity: number;
  readonly damagedQuantity: number;
  readonly missingQuantity: number;
  readonly remainingQuantity: number;
  readonly unit: string;
  readonly tracking?: InventoryTracking;
  readonly barcode?: string;
  readonly unitWeight?: number;
  readonly unitVolume?: number;
  readonly weightUnit?: "g" | "kg";
  readonly volumeUnit?: "cm3" | "m3";
  readonly temperatureControlled: boolean;
  readonly hazardousMaterial: boolean;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePackingItemInput {
  tenantId: string;
  packingId: string;
  pickingId?: string;
  pickingItemId?: string;
  warehouseId: string;
  packingLocationId: string;
  productId: string;
  skuId?: string;
  requestedQuantity: number;
  unit: string;
  tracking?: InventoryTracking;
  barcode?: string;
  unitWeight?: number;
  unitVolume?: number;
  weightUnit?: "g" | "kg";
  volumeUnit?: "cm3" | "m3";
  temperatureControlled?: boolean;
  hazardousMaterial?: boolean;
  notes?: string;
  createdBy: string;
}

export interface ConfirmPackingItemInput {
  tenantId: string;
  packingId: string;
  packingItemId: string;
  packageId: string;
  quantity: number;
  damagedQuantity?: number;
  missingQuantity?: number;
  barcode?: string;
  lotNumber?: string;
  serialNumber?: string;
  packedBy: string;
  notes?: string;
}

export interface PackingItemQuantitySummary {
  readonly requestedQuantity: number;
  readonly packedQuantity: number;
  readonly damagedQuantity: number;
  readonly missingQuantity: number;
  readonly remainingQuantity: number;
}

export function calculatePackingItemQuantitySummary(
  item: PackingItem,
): PackingItemQuantitySummary {
  return {
    requestedQuantity: item.requestedQuantity,
    packedQuantity: item.packedQuantity,
    damagedQuantity: item.damagedQuantity,
    missingQuantity: item.missingQuantity,
    remainingQuantity: Math.max(
      0,
      item.requestedQuantity -
        item.packedQuantity -
        item.damagedQuantity -
        item.missingQuantity,
    ),
  };
}
