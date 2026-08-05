export const PUTAWAY_TASK_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type PutawayTaskStatus =
  (typeof PUTAWAY_TASK_STATUSES)[number];

export const PUTAWAY_TASK_STATUS_LABELS: Record<
  PutawayTaskStatus,
  string
> = {
  pending: "Bekliyor",
  assigned: "Atandı",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export interface PutawayTask {
  readonly id: string;
  readonly tenantId: string;
  readonly putawayId: string;
  readonly putawayItemId?: string;
  readonly sourceLocationId: string;
  readonly targetLocationId: string;
  readonly assignedUserId?: string;
  readonly assignedEquipmentId?: string;
  readonly status: PutawayTaskStatus;
  readonly priority: number;
  readonly plannedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePutawayTaskInput {
  tenantId: string;
  putawayId: string;
  putawayItemId?: string;
  sourceLocationId: string;
  targetLocationId: string;
  assignedUserId?: string;
  assignedEquipmentId?: string;
  priority?: number;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}

export function isPutawayTaskStatus(
  value: unknown,
): value is PutawayTaskStatus {
  return (
    typeof value === "string" &&
    PUTAWAY_TASK_STATUSES.includes(
      value as PutawayTaskStatus,
    )
  );
}
