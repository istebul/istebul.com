export const PICKING_WAVE_STATUSES = [
  "draft",
  "planned",
  "released",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type PickingWaveStatus =
  (typeof PICKING_WAVE_STATUSES)[number];

export interface PickingWave {
  readonly id: string;
  readonly tenantId: string;
  readonly waveNumber: string;
  readonly warehouseId: string;
  readonly status: PickingWaveStatus;
  readonly pickingIds: readonly string[];
  readonly plannedAt?: string;
  readonly releasedAt?: string;
  readonly completedAt?: string;
  readonly notes?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePickingWaveInput {
  tenantId: string;
  warehouseId: string;
  pickingIds: readonly string[];
  plannedAt?: string;
  notes?: string;
  createdBy: string;
}
