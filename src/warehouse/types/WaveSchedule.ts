export interface WaveSchedule {
  readonly id: string;
  readonly tenantId: string;
  readonly ruleId: string;
  readonly warehouseId: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate?: string;
  readonly frequencyMinutes: number;
  readonly cutoffTime?: string;
  readonly releaseOffsetMinutes: number;
  readonly active: boolean;
  readonly lastRunAt?: string;
  readonly nextRunAt?: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateWaveScheduleInput {
  tenantId: string;
  ruleId: string;
  warehouseId: string;
  name: string;
  startDate: string;
  frequencyMinutes: number;
  createdBy: string;
  endDate?: string;
  cutoffTime?: string;
  releaseOffsetMinutes?: number;
}
