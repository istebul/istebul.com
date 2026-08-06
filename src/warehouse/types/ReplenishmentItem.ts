import type {
  InventoryTracking,
} from "./InventoryMovement";

export const REPLENISHMENT_ITEM_STATUSES = [
  "pending",
  "allocated",
  "assigned",
  "in_progress",
  "partially_completed",
  "completed",
  "exception",
  "cancelled",
] as const;

export type ReplenishmentItemStatus =
  (typeof REPLENISHMENT_ITEM_STATUSES)[number];

export interface ReplenishmentItem {
  readonly id: string;
  readonly tenantId: string;
  readonly replenishmentId: string;
  readonly lineNumber: number;
  readonly warehouseId: string;
  readonly destinationLocationId: string;
  readonly productId: string;
  readonly skuId?: string;
  readonly stockStatus: string;
  readonly unit: string;
  readonly requestedQuantity: number;
  readonly allocatedQuantity: number;
  readonly transferredQuantity: number;
  readonly remainingQuantity: number;
  readonly minimumQuantity?: number;
  readonly maximumQuantity?: number;
  readonly currentDestinationQuantity: number;
  readonly priority: number;
  readonly status: ReplenishmentItemStatus;
  readonly tracking?: InventoryTracking;
  readonly requiredAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateReplenishmentItemInput {
  tenantId: string;
  replenishmentId: string;
  warehouseId: string;
  destinationLocationId: string;
  productId: string;
  stockStatus: string;
  unit: string;
  requestedQuantity: number;
  currentDestinationQuantity: number;
  createdBy: string;
  skuId?: string;
  minimumQuantity?: number;
  maximumQuantity?: number;
  priority?: number;
  tracking?: InventoryTracking;
  requiredAt?: string;
  notes?: string;
}
