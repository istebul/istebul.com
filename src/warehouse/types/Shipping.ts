import type {
  ShippingAddress,
} from "./ShippingAddress";
import type {
  ShippingException,
} from "./ShippingException";
import type {
  ShippingItem,
} from "./ShippingItem";
import type {
  ShippingPackage,
} from "./ShippingPackage";
import type {
  ShippingStatus,
} from "./ShippingStatus";
import type {
  ShippingStrategy,
} from "./ShippingStrategy";

export interface ShippingTotals {
  readonly requestedQuantity: number;
  readonly loadedQuantity: number;
  readonly deliveredQuantity: number;
  readonly returnedQuantity: number;
  readonly damagedQuantity: number;
  readonly missingQuantity: number;
  readonly remainingQuantity: number;
  readonly packageCount: number;
  readonly loadedPackageCount: number;
}

export interface Shipping {
  readonly id: string;
  readonly tenantId: string;
  readonly shippingNumber: string;

  readonly warehouseId: string;
  readonly shippingLocationId: string;

  readonly strategy: ShippingStrategy;
  readonly status: ShippingStatus;

  readonly packingId?: string;
  readonly orderId?: string;
  readonly orderNumber?: string;

  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly referenceNumber?: string;

  readonly carrierId?: string;
  readonly serviceLevelId?: string;
  readonly vehicleId?: string;
  readonly dockId?: string;

  readonly driverId?: string;
  readonly driverName?: string;
  readonly driverPhone?: string;

  readonly trackingNumber?: string;
  readonly manifestId?: string;
  readonly asnId?: string;

  readonly shipFromAddress: ShippingAddress;
  readonly shipToAddress: ShippingAddress;

  readonly priority: number;

  readonly plannedAt?: string;
  readonly releasedAt?: string;
  readonly loadingReadyAt?: string;
  readonly loadingStartedAt?: string;
  readonly loadedAt?: string;
  readonly dispatchedAt?: string;
  readonly inTransitAt?: string;
  readonly deliveredAt?: string;
  readonly cancelledAt?: string;

  readonly expectedDeliveryAt?: string;
  readonly actualDeliveryAt?: string;

  readonly cancellationReason?: string;
  readonly deliveryFailureReason?: string;
  readonly notes?: string;

  readonly temperatureControlled: boolean;
  readonly hazardousMaterial: boolean;

  readonly items: readonly ShippingItem[];
  readonly packages: readonly ShippingPackage[];
  readonly exceptions: readonly ShippingException[];

  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateShippingInput {
  tenantId: string;
  warehouseId: string;
  shippingLocationId: string;

  strategy: ShippingStrategy;

  packingId?: string;
  orderId?: string;
  orderNumber?: string;

  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;

  carrierId?: string;
  serviceLevelId?: string;
  vehicleId?: string;
  dockId?: string;

  driverId?: string;
  driverName?: string;
  driverPhone?: string;

  shipFromAddress: ShippingAddress;
  shipToAddress: ShippingAddress;

  priority?: number;
  plannedAt?: string;
  expectedDeliveryAt?: string;

  temperatureControlled?: boolean;
  hazardousMaterial?: boolean;

  notes?: string;
  createdBy: string;
}

export interface ShippingListFilter {
  tenantId: string;
  warehouseId?: string;
  shippingLocationId?: string;
  strategy?: ShippingStrategy;
  status?: ShippingStatus;
  packingId?: string;
  orderId?: string;
  carrierId?: string;
  serviceLevelId?: string;
  vehicleId?: string;
  dockId?: string;
  referenceType?: string;
  referenceId?: string;
  search?: string;
}

export function calculateShippingTotals(
  shipping: Pick<
    Shipping,
    "items" | "packages"
  >,
): ShippingTotals {
  const itemTotals =
    shipping.items.reduce(
      (totals, item) => ({
        requestedQuantity:
          totals.requestedQuantity +
          item.requestedQuantity,
        loadedQuantity:
          totals.loadedQuantity +
          item.loadedQuantity,
        deliveredQuantity:
          totals.deliveredQuantity +
          item.deliveredQuantity,
        returnedQuantity:
          totals.returnedQuantity +
          item.returnedQuantity,
        damagedQuantity:
          totals.damagedQuantity +
          item.damagedQuantity,
        missingQuantity:
          totals.missingQuantity +
          item.missingQuantity,
        remainingQuantity:
          totals.remainingQuantity +
          Math.max(
            0,
            item.requestedQuantity -
              item.loadedQuantity -
              item.damagedQuantity -
              item.missingQuantity,
          ),
      }),
      {
        requestedQuantity: 0,
        loadedQuantity: 0,
        deliveredQuantity: 0,
        returnedQuantity: 0,
        damagedQuantity: 0,
        missingQuantity: 0,
        remainingQuantity: 0,
      },
    );

  return {
    ...itemTotals,
    packageCount:
      shipping.packages.length,
    loadedPackageCount:
      shipping.packages.filter(
        (shippingPackage) =>
          shippingPackage.status ===
            "loaded" ||
          shippingPackage.status ===
            "dispatched" ||
          shippingPackage.status ===
            "in_transit" ||
          shippingPackage.status ===
            "delivered",
      ).length,
  };
}
