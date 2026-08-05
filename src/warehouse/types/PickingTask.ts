export const PICKING_TASK_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "partially_completed",
  "completed",
  "cancelled",
] as const;

export type PickingTaskStatus =
  (typeof PICKING_TASK_STATUSES)[number];

export const PICKING_TASK_STATUS_LABELS: Record<
  PickingTaskStatus,
  string
> = {
  pending: "Bekliyor",
  assigned: "Atandı",
  in_progress: "Devam Ediyor",
  partially_completed: "Kısmen Tamamlandı",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export interface PickingTask {
  readonly id: string;
  readonly tenantId: string;
  readonly pickingId: string;
  readonly pickingItemId?: string;
  readonly warehouseId: string;
  readonly sourceLocationId: string;
  readonly destinationLocationId?: string;
  readonly assignedUserId?: string;
  readonly assignedEquipmentId?: string;
  readonly status: PickingTaskStatus;
  readonly priority: number;
  readonly sequence: number;
  readonly plannedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePickingTaskInput {
  tenantId: string;
  pickingId: string;
  pickingItemId?: string;
  warehouseId: string;
  sourceLocationId: string;
  destinationLocationId?: string;
  assignedUserId?: string;
  assignedEquipmentId?: string;
  priority?: number;
  sequence?: number;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}

export function isPickingTaskStatus(
  value: unknown,
): value is PickingTaskStatus {
  return (
    typeof value === "string" &&
    PICKING_TASK_STATUSES.includes(
      value as PickingTaskStatus,
    )
  );
}
