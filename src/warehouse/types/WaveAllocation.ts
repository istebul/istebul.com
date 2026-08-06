import type {
  InventoryTracking,
} from "./InventoryMovement";

export const WAVE_ALLOCATION_STATUSES = [
  "planned",
  "reserved",
  "released",
  "in_progress",
  "completed",
  "short",
  "cancelled",
] as const;

export type WaveAllocationStatus =
  (typeof WAVE_ALLOCATION_STATUSES)[number];

export interface WaveAllocation {
  readonly id: string;
  readonly tenantId: string;
  readonly waveId: string;
  readonly waveOrderId: string;
  readonly waveItemId: string;
  readonly warehouseId: string;
  readonly sourceLocationId: string;
  readonly destinationLocationId?: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly inventoryBalanceId?: string;
  readonly inventoryReservationId?: string;
  readonly stockStatus: string;
  readonly unit: string;
  readonly allocatedQuantity: number;
  readonly pickedQuantity: number;
  readonly shortQuantity: number;
  readonly remainingQuantity: number;
  readonly sequence: number;
  readonly score: number;
  readonly status: WaveAllocationStatus;
  readonly tracking?: InventoryTracking;
  readonly reservedAt?: string;
  readonly releasedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
