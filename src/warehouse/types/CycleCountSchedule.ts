export const CYCLE_COUNT_SCHEDULE_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;

export type CycleCountScheduleStatus =
  (typeof CYCLE_COUNT_SCHEDULE_STATUSES)[number];

export const CYCLE_COUNT_SCHEDULE_STATUS_LABELS: Record<
  CycleCountScheduleStatus,
  string
> = {
  draft: "Taslak",
  active: "Aktif",
  paused: "Duraklatıldı",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export interface CycleCountSchedule {
  readonly id: string;
  readonly tenantId: string;
  readonly ruleId: string;
  readonly warehouseId: string;
  readonly name: string;
  readonly status: CycleCountScheduleStatus;
  readonly startDate: string;
  readonly endDate?: string;
  readonly nextRunAt?: string;
  readonly lastRunAt?: string;
  readonly frequencyDays: number;
  readonly maximumItemsPerRun?: number;
  readonly assignedUserIds: readonly string[];
  readonly assignedTeamId?: string;
  readonly automaticRelease: boolean;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateCycleCountScheduleInput {
  tenantId: string;
  ruleId: string;
  warehouseId: string;
  name: string;
  startDate: string;
  endDate?: string;
  frequencyDays: number;
  maximumItemsPerRun?: number;
  assignedUserIds?: string[];
  assignedTeamId?: string;
  automaticRelease?: boolean;
  createdBy: string;
}

export function isCycleCountScheduleStatus(
  value: unknown,
): value is CycleCountScheduleStatus {
  return (
    typeof value === "string" &&
    CYCLE_COUNT_SCHEDULE_STATUSES.includes(
      value as CycleCountScheduleStatus,
    )
  );
}
