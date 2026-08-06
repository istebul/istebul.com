export const WAVE_TASK_TYPES = [
  "pick",
  "batch_pick",
  "zone_pick",
  "case_pick",
  "pallet_pick",
  "consolidate",
  "replenish",
  "stage",
  "quality_check",
] as const;

export type WaveTaskType =
  (typeof WAVE_TASK_TYPES)[number];

export const WAVE_TASK_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
  "partially_completed",
  "completed",
  "exception",
  "cancelled",
] as const;

export type WaveTaskStatus =
  (typeof WAVE_TASK_STATUSES)[number];

export interface WaveTask {
  readonly id: string;
  readonly tenantId: string;
  readonly waveId: string;
  readonly waveOrderId?: string;
  readonly waveItemId?: string;
  readonly allocationId?: string;
  readonly warehouseId: string;
  readonly zoneId?: string;
  readonly sourceLocationId?: string;
  readonly destinationLocationId?: string;
  readonly productId?: string;
  readonly type: WaveTaskType;
  readonly status: WaveTaskStatus;
  readonly priority: number;
  readonly sequence: number;
  readonly estimatedMinutes?: number;
  readonly actualMinutes?: number;
  readonly assignedUserId?: string;
  readonly assignedTeamId?: string;
  readonly assignedEquipmentId?: string;
  readonly plannedAt?: string;
  readonly releasedAt?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWaveTaskInput {
  tenantId: string;
  waveId: string;
  warehouseId: string;
  type: WaveTaskType;
  createdBy: string;
  waveOrderId?: string;
  waveItemId?: string;
  allocationId?: string;
  zoneId?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  productId?: string;
  priority?: number;
  sequence?: number;
  estimatedMinutes?: number;
  assignedUserId?: string;
  assignedTeamId?: string;
  assignedEquipmentId?: string;
  plannedAt?: string;
  notes?: string;
}
