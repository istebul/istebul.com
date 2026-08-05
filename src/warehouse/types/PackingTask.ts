export const PACKING_TASK_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "partially_completed",
  "completed",
  "cancelled",
] as const;

export type PackingTaskStatus =
  (typeof PACKING_TASK_STATUSES)[number];

export const PACKING_TASK_STATUS_LABELS: Record<
  PackingTaskStatus,
  string
> = {
  pending: "Bekliyor",
  assigned: "Atandı",
  in_progress: "Devam Ediyor",
  partially_completed: "Kısmen Tamamlandı",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export interface PackingTask {
  readonly id: string;
  readonly tenantId: string;
  readonly packingId: string;
  readonly packingItemId?: string;
  readonly packageId?: string;
  readonly warehouseId: string;
  readonly packingLocationId: string;
  readonly assignedUserId?: string;
  readonly assignedEquipmentId?: string;
  readonly stationId?: string;
  readonly status: PackingTaskStatus;
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

export interface CreatePackingTaskInput {
  tenantId: string;
  packingId: string;
  packingItemId?: string;
  packageId?: string;
  warehouseId: string;
  packingLocationId: string;
  assignedUserId?: string;
  assignedEquipmentId?: string;
  stationId?: string;
  priority?: number;
  sequence?: number;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}

export function isPackingTaskStatus(
  value: unknown,
): value is PackingTaskStatus {
  return (
    typeof value === "string" &&
    PACKING_TASK_STATUSES.includes(
      value as PackingTaskStatus,
    )
  );
}
