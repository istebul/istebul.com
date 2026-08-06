import type {
  InventoryTracking,
} from "./InventoryMovement";

export const WAVE_ITEM_STATUSES = [
  "pending",
  "allocated",
  "released",
  "in_progress",
  "partially_picked",
  "picked",
  "short",
  "exception",
  "cancelled",
] as const;

export type WaveItemStatus =
  (typeof WAVE_ITEM_STATUSES)[number];

export interface WaveItem {
  readonly id: string;
  readonly tenantId: string;
  readonly waveId: string;
  readonly waveOrderId: string;
  readonly orderId: string;
  readonly orderLineId: string;
  readonly warehouseId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly stockStatus: string;
  readonly unit: string;
  readonly requestedQuantity: number;
  readonly allocatedQuantity: number;
  readonly pickedQuantity: number;
  readonly shortQuantity: number;
  readonly remainingQuantity: number;
  readonly zoneId?: string;
  readonly sourceLocationId?: string;
  readonly destinationLocationId?: string;
  readonly tracking?: InventoryTracking;
  readonly priority: number;
  readonly sequence: number;
  readonly status: WaveItemStatus;
  readonly releasedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWaveItemInput {
  tenantId: string;
  waveId: string;
  waveOrderId: string;
  orderId: string;
  orderLineId: string;
  warehouseId: string;
  productId: string;
  stockStatus: string;
  unit: string;
  requestedQuantity: number;
  skuId?: string;
  zoneId?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  tracking?: InventoryTracking;
  priority?: number;
  sequence?: number;
}
