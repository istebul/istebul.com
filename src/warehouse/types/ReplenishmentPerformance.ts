export interface ReplenishmentPerformance {
  readonly tenantId: string;
  readonly warehouseId?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalReplenishments: number;
  readonly completedReplenishments: number;
  readonly cancelledReplenishments: number;
  readonly exceptionReplenishments: number;
  readonly totalRequestedQuantity: number;
  readonly totalTransferredQuantity: number;
  readonly completionRate: number;
  readonly fulfillmentRate: number;
  readonly averageCompletionMinutes: number;
  readonly averageTaskMinutes: number;
  readonly sourceUtilizationRate: number;
  readonly destinationFillRate: number;
  readonly emergencyReplenishmentRate: number;
  readonly calculatedAt: string;
}

export interface ReplenishmentPerformanceFilter {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  warehouseId?: string;
}
