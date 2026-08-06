export interface WavePerformance {
  readonly tenantId: string;
  readonly warehouseId?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalWaves: number;
  readonly completedWaves: number;
  readonly cancelledWaves: number;
  readonly exceptionWaves: number;
  readonly totalOrders: number;
  readonly completedOrders: number;
  readonly totalLines: number;
  readonly completedLines: number;
  readonly totalItems: number;
  readonly pickedItems: number;
  readonly shortItems: number;
  readonly waveCompletionRate: number;
  readonly orderCompletionRate: number;
  readonly lineCompletionRate: number;
  readonly itemFulfillmentRate: number;
  readonly shortPickRate: number;
  readonly averageWaveDurationMinutes: number;
  readonly averageOrderDurationMinutes: number;
  readonly averageTaskDurationMinutes: number;
  readonly laborUtilizationRate: number;
  readonly equipmentUtilizationRate: number;
  readonly calculatedAt: string;
}

export interface WavePerformanceFilter {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  warehouseId?: string;
}
