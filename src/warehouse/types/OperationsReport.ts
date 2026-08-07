import type {
  OperationsDashboardHealthStatus,
  OperationsDashboardKpiKey,
} from "./OperationsDashboard";

export type OperationsReportMetricKey =
  | OperationsDashboardKpiKey
  | "health_score"
  | "task_exception"
  | "short_pick";

export type OperationsTrendDirection =
  | "improving"
  | "stable"
  | "declining";

export interface OperationsReportFilter {
  tenantId: string;
  warehouseId?: string;
  periodStart: string;
  periodEnd: string;
}

export interface OperationsPeriodComparisonFilter {
  tenantId: string;
  warehouseId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  previousPeriodStart: string;
  previousPeriodEnd: string;
}

export interface OperationsTrendFilter
  extends OperationsReportFilter
{
  metric: OperationsReportMetricKey;
}

export interface OperationsPeriodSummary {
  readonly tenantId: string;
  readonly warehouseId?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly snapshotCount: number;
  readonly totalOrders: number;
  readonly completedOrders: number;
  readonly totalTasks: number;
  readonly completedTasks: number;
  readonly requestedItems: number;
  readonly fulfilledItems: number;
  readonly orderCompletionRate: number;
  readonly onTimeDispatchRate: number;
  readonly taskCompletionRate: number;
  readonly taskExceptionRate: number;
  readonly inventoryAccuracyRate: number;
  readonly capacityUtilizationRate: number;
  readonly laborUtilizationRate: number;
  readonly itemFulfillmentRate: number;
  readonly shortPickRate: number;
  readonly healthScore: number;
  readonly healthStatus: OperationsDashboardHealthStatus;
}

export interface OperationsMetricComparison {
  readonly key: OperationsReportMetricKey;
  readonly label: string;
  readonly currentValue: number;
  readonly previousValue: number;
  readonly change: number;
  readonly changeRate: number;
  readonly direction: OperationsTrendDirection;
  readonly improved: boolean;
}

export interface OperationsPeriodComparison {
  readonly current: OperationsPeriodSummary;
  readonly previous: OperationsPeriodSummary;
  readonly metrics: readonly OperationsMetricComparison[];
  readonly improvingMetricCount: number;
  readonly decliningMetricCount: number;
  readonly improved: boolean;
  readonly calculatedAt: string;
}

export interface OperationsTrendPoint {
  readonly snapshotId: string;
  readonly warehouseId?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly value: number;
  readonly healthStatus: OperationsDashboardHealthStatus;
}

export interface OperationsKpiTrend {
  readonly tenantId: string;
  readonly warehouseId?: string;
  readonly metric: OperationsReportMetricKey;
  readonly label: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly points: readonly OperationsTrendPoint[];
  readonly firstValue: number;
  readonly lastValue: number;
  readonly change: number;
  readonly direction: OperationsTrendDirection;
  readonly calculatedAt: string;
}

export interface WarehouseOperationsPerformance {
  readonly rank: number;
  readonly warehouseId: string;
  readonly summary: OperationsPeriodSummary;
}

export interface OperationsWarehouseReport {
  readonly tenantId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly warehouseCount: number;
  readonly warehouses:
    readonly WarehouseOperationsPerformance[];
  readonly calculatedAt: string;
}
