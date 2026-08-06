import type {
  InventoryTracking,
} from "./InventoryMovement";

export const REPLENISHMENT_ALLOCATION_STATUSES = [
  "planned",
  "reserved",
  "in_progress",
  "completed",
  "released",
  "cancelled",
] as const;

export type ReplenishmentAllocationStatus =
  (typeof REPLENISHMENT_ALLOCATION_STATUSES)[number];

export interface ReplenishmentAllocation {
  readonly id: string;
  readonly tenantId: string;
  readonly replenishmentId: string;
  readonly replenishmentItemId: string;
  readonly sourceLocationId: string;
  readonly destinationLocationId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly inventoryBalanceId?: string;
  readonly stockStatus: string;
  readonly unit: string;
  readonly allocatedQuantity: number;
  readonly transferredQuantity: number;
  readonly remainingQuantity: number;
  readonly sequence: number;
  readonly score: number;
  readonly status: ReplenishmentAllocationStatus;
  readonly tracking?: InventoryTracking;
  readonly inventoryReservationId?: string;
  readonly inventoryMovementId?: string;
  readonly reservedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateReplenishmentAllocationInput {
  tenantId: string;
  replenishmentId: string;
  replenishmentItemId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  productId: string;
  stockStatus: string;
  unit: string;
  allocatedQuantity: number;
  sequence: number;
  score: number;
  skuId?: string;
  inventoryBalanceId?: string;
  tracking?: InventoryTracking;
  inventoryReservationId?: string;
}
