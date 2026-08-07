export type OperationsDashboardHealthStatus =
  | "healthy"
  | "attention"
  | "critical";

export type OperationsDashboardAlertSeverity =
  | "info"
  | "warning"
  | "critical";

export type OperationsDashboardKpiStatus =
  | "good"
  | "warning"
  | "critical";

export type OperationsDashboardKpiKey =
  | "order_completion"
  | "on_time_dispatch"
  | "task_completion"
  | "inventory_accuracy"
  | "capacity_utilization"
  | "labor_utilization"
  | "item_fulfillment";

export interface OperationsDashboardKpi {
  readonly key: OperationsDashboardKpiKey;
  readonly label: string;
  readonly value: number;
  readonly unit: "percent";
  readonly target: number;
  readonly status: OperationsDashboardKpiStatus;
}

export interface OperationsDashboardAlert {
  readonly id: string;
  readonly tenantId: string;
  readonly warehouseId?: string;
  readonly code: string;
  readonly severity: OperationsDashboardAlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly metricValue: number;
  readonly threshold: number;
  readonly createdAt: string;
}

export interface OperationsDashboardSnapshot {
  readonly id: string;
  readonly tenantId: string;
  readonly warehouseId?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalOrders: number;
  readonly completedOrders: number;
  readonly onTimeOrders: number;
  readonly delayedOrders: number;
  readonly totalTasks: number;
  readonly completedTasks: number;
  readonly exceptionTasks: number;
  readonly totalInventoryChecks: number;
  readonly accurateInventoryChecks: number;
  readonly usedCapacity: number;
  readonly totalCapacity: number;
  readonly productiveMinutes: number;
  readonly availableLaborMinutes: number;
  readonly requestedItems: number;
  readonly fulfilledItems: number;
  readonly shortItems: number;
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
  readonly kpis: readonly OperationsDashboardKpi[];
  readonly alerts: readonly OperationsDashboardAlert[];
  readonly calculatedAt: string;
}

export interface OperationsDashboardInput {
  tenantId: string;
  warehouseId?: string;
  periodStart: string;
  periodEnd: string;
  totalOrders: number;
  completedOrders: number;
  onTimeOrders: number;
  delayedOrders: number;
  totalTasks: number;
  completedTasks: number;
  exceptionTasks: number;
  totalInventoryChecks: number;
  accurateInventoryChecks: number;
  usedCapacity: number;
  totalCapacity: number;
  productiveMinutes: number;
  availableLaborMinutes: number;
  requestedItems: number;
  fulfilledItems: number;
  shortItems: number;
}

export interface OperationsDashboardFilter {
  tenantId: string;
  warehouseId?: string;
  periodStart?: string;
  periodEnd?: string;
}
