export const CYCLE_COUNT_TASK_TYPES = [
  "count_location",
  "count_product",
  "count_lot",
  "count_serial",
  "blind_count",
  "recount",
  "variance_review",
  "adjustment_review",
] as const;

export type CycleCountTaskType =
  (typeof CYCLE_COUNT_TASK_TYPES)[number];

export const CYCLE_COUNT_TASK_TYPE_LABELS: Record<
  CycleCountTaskType,
  string
> = {
  count_location: "Lokasyon Sayımı",
  count_product: "Ürün Sayımı",
  count_lot: "Lot Sayımı",
  count_serial: "Seri Numarası Sayımı",
  blind_count: "Kör Sayım",
  recount: "Yeniden Sayım",
  variance_review: "Sayım Farkı İncelemesi",
  adjustment_review: "Stok Düzeltme İncelemesi",
};

export const CYCLE_COUNT_TASK_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type CycleCountTaskStatus =
  (typeof CYCLE_COUNT_TASK_STATUSES)[number];

export interface CycleCountTask {
  readonly id: string;
  readonly tenantId: string;
  readonly cycleCountId: string;
  readonly cycleCountItemId?: string;
  readonly warehouseId: string;
  readonly locationId?: string;
  readonly productId?: string;
  readonly type: CycleCountTaskType;
  readonly status: CycleCountTaskStatus;
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

export interface CreateCycleCountTaskInput {
  tenantId: string;
  cycleCountId: string;
  cycleCountItemId?: string;
  warehouseId: string;
  locationId?: string;
  productId?: string;
  type: CycleCountTaskType;
  priority?: number;
  sequence?: number;
  assignedUserId?: string;
  assignedTeamId?: string;
  assignedEquipmentId?: string;
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}
