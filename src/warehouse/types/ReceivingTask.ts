export const RECEIVING_TASK_TYPES = [
  "vehicle_check_in",
  "document_check",
  "unloading",
  "quantity_control",
  "quality_control",
  "labeling",
  "palletizing",
  "inventory_posting",
] as const;

export type ReceivingTaskType =
  (typeof RECEIVING_TASK_TYPES)[number];

export const RECEIVING_TASK_TYPE_LABELS: Record<
  ReceivingTaskType,
  string
> = {
  vehicle_check_in: "Araç Giriş Kontrolü",
  document_check: "Belge Kontrolü",
  unloading: "Boşaltma",
  quantity_control: "Miktar Kontrolü",
  quality_control: "Kalite Kontrol",
  labeling: "Etiketleme",
  palletizing: "Paletleme",
  inventory_posting: "Stoğa İşleme",
};

export const RECEIVING_TASK_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type ReceivingTaskStatus =
  (typeof RECEIVING_TASK_STATUSES)[number];

export const RECEIVING_TASK_STATUS_LABELS: Record<
  ReceivingTaskStatus,
  string
> = {
  pending: "Bekliyor",
  assigned: "Atandı",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export interface ReceivingTask {
  readonly id: string;
  readonly tenantId: string;
  readonly receivingId: string;
  readonly receivingItemId?: string;
  readonly type: ReceivingTaskType;
  readonly status: ReceivingTaskStatus;
  readonly assignedUserId?: string;
  readonly assignedEquipmentId?: string;
  readonly priority: number;
  readonly plannedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateReceivingTaskInput {
  tenantId: string;
  receivingId: string;
  receivingItemId?: string;
  type: ReceivingTaskType;
  assignedUserId?: string;
  assignedEquipmentId?: string;
  priority?: number;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}

export function isReceivingTaskType(
  value: unknown,
): value is ReceivingTaskType {
  return (
    typeof value === "string" &&
    RECEIVING_TASK_TYPES.includes(value as ReceivingTaskType)
  );
}

export function isReceivingTaskStatus(
  value: unknown,
): value is ReceivingTaskStatus {
  return (
    typeof value === "string" &&
    RECEIVING_TASK_STATUSES.includes(
      value as ReceivingTaskStatus,
    )
  );
}
