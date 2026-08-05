import type { PutawayException } from "./PutawayException";
import type { PutawayItem } from "./PutawayItem";
import type { PutawayStatus } from "./PutawayStatus";
import type { PutawayStrategy } from "./PutawayStrategy";
import type { PutawaySuggestion } from "./PutawaySuggestion";

export interface PutawayTotals {
  readonly requestedQuantity: number;
  readonly placedQuantity: number;
  readonly remainingQuantity: number;
}

export interface Putaway {
  readonly id: string;
  readonly tenantId: string;
  readonly putawayNumber: string;
  readonly warehouseId: string;
  readonly sourceLocationId: string;
  readonly strategy: PutawayStrategy;
  readonly status: PutawayStatus;
  readonly receivingId?: string;
  readonly qualityInspectionId?: string;
  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly referenceNumber?: string;
  readonly plannedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly cancelledAt?: string;
  readonly cancellationReason?: string;
  readonly notes?: string;
  readonly items: readonly PutawayItem[];
  readonly suggestions: readonly PutawaySuggestion[];
  readonly exceptions: readonly PutawayException[];
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePutawayInput {
  tenantId: string;
  warehouseId: string;
  sourceLocationId: string;
  strategy: PutawayStrategy;
  receivingId?: string;
  qualityInspectionId?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}

export interface PutawayListFilter {
  tenantId: string;
  warehouseId?: string;
  sourceLocationId?: string;
  strategy?: PutawayStrategy;
  status?: PutawayStatus;
  receivingId?: string;
  qualityInspectionId?: string;
  referenceType?: string;
  referenceId?: string;
  search?: string;
}

export function calculatePutawayTotals(
  putaway: Pick<Putaway, "items">,
): PutawayTotals {
  return putaway.items.reduce<PutawayTotals>(
    (totals, item) => ({
      requestedQuantity:
        totals.requestedQuantity + item.requestedQuantity,
      placedQuantity:
        totals.placedQuantity + item.placedQuantity,
      remainingQuantity:
        totals.remainingQuantity +
        Math.max(
          0,
          item.requestedQuantity - item.placedQuantity,
        ),
    }),
    {
      requestedQuantity: 0,
      placedQuantity: 0,
      remainingQuantity: 0,
    },
  );
}
