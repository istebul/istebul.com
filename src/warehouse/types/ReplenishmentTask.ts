export const REPLENISHMENT_TASK_TYPES = [
  "move_stock",
  "move_case",
  "move_pallet",
  "top_up_location",
  "emergency_replenishment",
] as const;

export type ReplenishmentTaskType =
  (typeof REPLENISHMENT_TASK_TYPES)[number];

export const REPLENISHMENT_TASK_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "exception",
  "cancelled",
] as const;

export type ReplenishmentTaskStatus =
  (typeof REPLENISHMENT_TASK_STATUSES)[number];

export interface ReplenishmentTask {
  readonly id: string;
  readonly tenantId: string;
  readonly replenishmentId: string;
  readonly replenishmentItemId?: string;
  readonly allocationId?: string;
  readonly warehouseId: string;
  readonly sourceLocationId?: string;
  readonly destinationLocationId?: string;
  readonly productId?: string;
  readonly type: ReplenishmentTaskType;
  readonly status: ReplenishmentTaskStatus;
  readonly priority: number;
  readonly sequence: number;
  readonly assignedUserId?: string;
  readonly assignedTeamId?: string;
  readonly assignedEquipmentId?: string;
  readonly plannedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateReplenishmentTaskInput {
  tenantId: string;
  replenishmentId: string;
  warehouseId: string;
  type: ReplenishmentTaskType;
  createdBy: string;
  replenishmentItemId?: string;
  allocationId?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  productId?: string;
  priority?: number;
  sequence?: number;
  assignedUserId?: string;
  assignedTeamId?: string;
  assignedEquipmentId?: string;
  plannedAt?: string;
  notes?: string;
}
