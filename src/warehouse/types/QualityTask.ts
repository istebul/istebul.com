export const QUALITY_TASK_TYPES = [
  "sampling",
  "visual_inspection",
  "measurement",
  "temperature_check",
  "document_review",
  "laboratory_test",
  "final_approval",
] as const;

export type QualityTaskType =
  (typeof QUALITY_TASK_TYPES)[number];

export const QUALITY_TASK_TYPE_LABELS: Record<
  QualityTaskType,
  string
> = {
  sampling: "Numune Alma",
  visual_inspection: "Görsel Kontrol",
  measurement: "Ölçüm",
  temperature_check: "Sıcaklık Kontrolü",
  document_review: "Belge İnceleme",
  laboratory_test: "Laboratuvar Testi",
  final_approval: "Nihai Onay",
};

export const QUALITY_TASK_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type QualityTaskStatus =
  (typeof QUALITY_TASK_STATUSES)[number];

export interface QualityTask {
  readonly id: string;
  readonly tenantId: string;
  readonly inspectionId: string;
  readonly inspectionItemId?: string;
  readonly type: QualityTaskType;
  readonly status: QualityTaskStatus;
  readonly assignedUserId?: string;
  readonly priority: number;
  readonly plannedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateQualityTaskInput {
  tenantId: string;
  inspectionId: string;
  inspectionItemId?: string;
  type: QualityTaskType;
  assignedUserId?: string;
  priority?: number;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}
