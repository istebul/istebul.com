import type { ReceivingException } from "./ReceivingException";
import type { ReceivingItem } from "./ReceivingItem";
import type { ReceivingSource } from "./ReceivingSource";
import type { ReceivingStatus } from "./ReceivingStatus";

export interface ReceivingTotals {
  readonly expectedQuantity: number;
  readonly receivedQuantity: number;
  readonly acceptedQuantity: number;
  readonly rejectedQuantity: number;
  readonly damagedQuantity: number;
  readonly remainingQuantity: number;
  readonly overDeliveryQuantity: number;
}

export interface Receiving {
  readonly id: string;
  readonly tenantId: string;
  readonly receivingNumber: string;

  readonly warehouseId: string;
  readonly receivingLocationId: string;

  readonly source: ReceivingSource;
  readonly status: ReceivingStatus;

  readonly supplierId?: string;
  readonly supplierName?: string;

  readonly referenceType?: string;
  readonly referenceId?: string;
  readonly referenceNumber?: string;

  readonly vehiclePlate?: string;
  readonly deliveryNoteNumber?: string;

  readonly plannedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly cancelledAt?: string;

  readonly notes?: string;
  readonly cancellationReason?: string;

  readonly items: readonly ReceivingItem[];
  readonly exceptions: readonly ReceivingException[];

  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateReceivingInput {
  tenantId: string;
  warehouseId: string;
  receivingLocationId: string;
  source: ReceivingSource;
  supplierId?: string;
  supplierName?: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  vehiclePlate?: string;
  deliveryNoteNumber?: string;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}

export interface ReceivingListFilter {
  tenantId: string;
  warehouseId?: string;
  receivingLocationId?: string;
  source?: ReceivingSource;
  status?: ReceivingStatus;
  supplierId?: string;
  referenceType?: string;
  referenceId?: string;
  search?: string;
}

export function calculateReceivingTotals(
  receiving: Pick<Receiving, "items">,
): ReceivingTotals {
  return receiving.items.reduce<ReceivingTotals>(
    (totals, item) => {
      const remainingQuantity = Math.max(
        0,
        item.expectedQuantity - item.receivedQuantity,
      );

      const overDeliveryQuantity = Math.max(
        0,
        item.receivedQuantity - item.expectedQuantity,
      );

      return {
        expectedQuantity:
          totals.expectedQuantity + item.expectedQuantity,
        receivedQuantity:
          totals.receivedQuantity + item.receivedQuantity,
        acceptedQuantity:
          totals.acceptedQuantity + item.acceptedQuantity,
        rejectedQuantity:
          totals.rejectedQuantity + item.rejectedQuantity,
        damagedQuantity:
          totals.damagedQuantity + item.damagedQuantity,
        remainingQuantity:
          totals.remainingQuantity + remainingQuantity,
        overDeliveryQuantity:
          totals.overDeliveryQuantity + overDeliveryQuantity,
      };
    },
    {
      expectedQuantity: 0,
      receivedQuantity: 0,
      acceptedQuantity: 0,
      rejectedQuantity: 0,
      damagedQuantity: 0,
      remainingQuantity: 0,
      overDeliveryQuantity: 0,
    },
  );
}
