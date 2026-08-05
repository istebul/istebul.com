export const PICKING_BATCH_STATUSES = [
  "draft",
  "planned",
  "released",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type PickingBatchStatus =
  (typeof PICKING_BATCH_STATUSES)[number];

export interface PickingBatch {
  readonly id: string;
  readonly tenantId: string;
  readonly batchNumber: string;
  readonly warehouseId: string;
  readonly status: PickingBatchStatus;
  readonly pickingIds: readonly string[];
  readonly assignedUserId?: string;
  readonly assignedEquipmentId?: string;
  readonly plannedAt?: string;
  readonly releasedAt?: string;
  readonly completedAt?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePickingBatchInput {
  tenantId: string;
  warehouseId: string;
  pickingIds: readonly string[];
  assignedUserId?: string;
  assignedEquipmentId?: string;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}
