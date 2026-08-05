import type {
  PackingException,
} from "./PackingException";
import type {
  PackingItem,
} from "./PackingItem";
import type {
  PackingLabel,
} from "./PackingLabel";
import type {
  PackingPackage,
} from "./PackingPackage";
import type {
  PackingStatus,
} from "./PackingStatus";
import type {
  PackingStrategy,
} from "./PackingStrategy";
import type {
  PackingSuggestion,
} from "./PackingSuggestion";

export interface PackingTotals {
  readonly requestedQuantity: number;
  readonly packedQuantity: number;
  readonly damagedQuantity: number;
  readonly missingQuantity: number;
  readonly remainingQuantity: number;
  readonly packageCount: number;
}

export interface Packing {
  readonly id: string;
  readonly tenantId: string;
  readonly packingNumber: string;
  readonly warehouseId: string;
  readonly packingLocationId: string;
  readonly shippingLocationId?: string;
  readonly strategy: PackingStrategy;
  readonly status: PackingStatus;
  readonly pickingId?: string;
  readonly orderId?: string;
  readonly orderNumber?: string;
  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly referenceNumber?: string;
  readonly priority: number;
  readonly plannedAt?: string;
  readonly releasedAt?: string;
  readonly startedAt?: string;
  readonly packedAt?: string;
  readonly shippingReadyAt?: string;
  readonly cancelledAt?: string;
  readonly cancellationReason?: string;
  readonly notes?: string;
  readonly items: readonly PackingItem[];
  readonly packages: readonly PackingPackage[];
  readonly labels: readonly PackingLabel[];
  readonly suggestions: readonly PackingSuggestion[];
  readonly exceptions: readonly PackingException[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePackingInput {
  tenantId: string;
  warehouseId: string;
  packingLocationId: string;
  shippingLocationId?: string;
  strategy: PackingStrategy;
  pickingId?: string;
  orderId?: string;
  orderNumber?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  priority?: number;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}

export interface PackingListFilter {
  tenantId: string;
  warehouseId?: string;
  packingLocationId?: string;
  shippingLocationId?: string;
  strategy?: PackingStrategy;
  status?: PackingStatus;
  pickingId?: string;
  orderId?: string;
  referenceType?: string;
  referenceId?: string;
  search?: string;
}

export function calculatePackingTotals(
  packing: Pick<Packing, "items" | "packages">,
): PackingTotals {
  const itemTotals =
    packing.items.reduce(
      (totals, item) => ({
        requestedQuantity:
          totals.requestedQuantity +
          item.requestedQuantity,
        packedQuantity:
          totals.packedQuantity +
          item.packedQuantity,
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
              item.packedQuantity -
              item.damagedQuantity -
              item.missingQuantity,
          ),
      }),
      {
        requestedQuantity: 0,
        packedQuantity: 0,
        damagedQuantity: 0,
        missingQuantity: 0,
        remainingQuantity: 0,
      },
    );

  return {
    ...itemTotals,
    packageCount: packing.packages.length,
  };
}
