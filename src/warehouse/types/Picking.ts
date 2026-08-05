import type { PickingException } from "./PickingException";
import type { PickingItem } from "./PickingItem";
import type { PickingRoute } from "./PickingRoute";
import type { PickingStatus } from "./PickingStatus";
import type { PickingStrategy } from "./PickingStrategy";
import type { PickingSuggestion } from "./PickingSuggestion";

export interface PickingTotals {
  readonly requestedQuantity: number;
  readonly pickedQuantity: number;
  readonly shortQuantity: number;
  readonly remainingQuantity: number;
}

export interface Picking {
  readonly id: string;
  readonly tenantId: string;
  readonly pickingNumber: string;

  readonly warehouseId: string;
  readonly destinationLocationId: string;

  readonly strategy: PickingStrategy;
  readonly status: PickingStatus;

  readonly orderId?: string;
  readonly orderNumber?: string;
  readonly waveId?: string;
  readonly batchId?: string;

  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly referenceNumber?: string;

  readonly priority: number;
  readonly plannedAt?: string;
  readonly releasedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly cancelledAt?: string;

  readonly cancellationReason?: string;
  readonly notes?: string;

  readonly items: readonly PickingItem[];
  readonly suggestions: readonly PickingSuggestion[];
  readonly exceptions: readonly PickingException[];
  readonly routes: readonly PickingRoute[];

  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePickingInput {
  tenantId: string;
  warehouseId: string;
  destinationLocationId: string;
  strategy: PickingStrategy;
  orderId?: string;
  orderNumber?: string;
  waveId?: string;
  batchId?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  priority?: number;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}

export interface PickingListFilter {
  tenantId: string;
  warehouseId?: string;
  destinationLocationId?: string;
  strategy?: PickingStrategy;
  status?: PickingStatus;
  orderId?: string;
  waveId?: string;
  batchId?: string;
  referenceType?: string;
  referenceId?: string;
  search?: string;
}

export function calculatePickingTotals(
  picking: Pick<Picking, "items">,
): PickingTotals {
  return picking.items.reduce<PickingTotals>(
    (totals, item) => ({
      requestedQuantity:
        totals.requestedQuantity + item.requestedQuantity,
      pickedQuantity:
        totals.pickedQuantity + item.pickedQuantity,
      shortQuantity:
        totals.shortQuantity + item.shortQuantity,
      remainingQuantity:
        totals.remainingQuantity +
        Math.max(
          0,
          item.requestedQuantity -
            item.pickedQuantity -
            item.shortQuantity,
        ),
    }),
    {
      requestedQuantity: 0,
      pickedQuantity: 0,
      shortQuantity: 0,
      remainingQuantity: 0,
    },
  );
}
