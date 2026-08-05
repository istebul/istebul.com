import type {
  InventoryTracking,
} from "./InventoryMovement";

export interface ShippingItem {
  readonly id: string;
  readonly tenantId: string;
  readonly shippingId: string;
  readonly lineNumber: number;

  readonly packingId?: string;
  readonly packingItemId?: string;
  readonly orderId?: string;
  readonly orderItemId?: string;

  readonly warehouseId: string;
  readonly productId: string;
  readonly skuId?: string;

  readonly requestedQuantity: number;
  readonly loadedQuantity: number;
  readonly deliveredQuantity: number;
  readonly returnedQuantity: number;
  readonly damagedQuantity: number;
  readonly missingQuantity: number;
  readonly remainingQuantity: number;

  readonly unit: string;
  readonly tracking?: InventoryTracking;

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

export interface CreateShippingItemInput {
  tenantId: string;
  shippingId: string;
  packingId?: string;
  packingItemId?: string;
  orderId?: string;
  orderItemId?: string;
  warehouseId: string;
  productId: string;
  skuId?: string;
  requestedQuantity: number;
  unit: string;
  tracking?: InventoryTracking;
  unitWeight?: number;
  unitVolume?: number;
  weightUnit?: "g" | "kg";
  volumeUnit?: "cm3" | "m3";
  temperatureControlled?: boolean;
  hazardousMaterial?: boolean;
  notes?: string;
  createdBy: string;
}

export interface ConfirmShippingItemLoadInput {
  tenantId: string;
  shippingId: string;
  shippingItemId: string;
  shippingPackageId?: string;
  quantity: number;
  damagedQuantity?: number;
  missingQuantity?: number;
  loadedBy: string;
  notes?: string;
}

export interface ShippingItemQuantitySummary {
  readonly requestedQuantity: number;
  readonly loadedQuantity: number;
  readonly deliveredQuantity: number;
  readonly returnedQuantity: number;
  readonly damagedQuantity: number;
  readonly missingQuantity: number;
  readonly remainingQuantity: number;
}

export function calculateShippingItemQuantitySummary(
  item: ShippingItem,
): ShippingItemQuantitySummary {
  return {
    requestedQuantity:
      item.requestedQuantity,
    loadedQuantity:
      item.loadedQuantity,
    deliveredQuantity:
      item.deliveredQuantity,
    returnedQuantity:
      item.returnedQuantity,
    damagedQuantity:
      item.damagedQuantity,
    missingQuantity:
      item.missingQuantity,
    remainingQuantity: Math.max(
      0,
      item.requestedQuantity -
        item.loadedQuantity -
        item.damagedQuantity -
        item.missingQuantity,
    ),
  };
}
