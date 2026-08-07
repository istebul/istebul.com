export type WarehouseOperationProcess =
  | "receiving"
  | "quality_control"
  | "putaway"
  | "replenishment"
  | "picking"
  | "wave_planning"
  | "packing"
  | "shipping"
  | "cycle_count"
  | "inventory";

export type OperationsExceptionCategory =
  | "delay"
  | "quality"
  | "inventory"
  | "capacity"
  | "equipment"
  | "labor"
  | "system"
  | "carrier"
  | "other";

export type OperationsExceptionSeverity =
  | "info"
  | "warning"
  | "critical";

export type OperationsActionPriority =
  | "immediate"
  | "high"
  | "medium";

export interface OperationsExceptionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly warehouseId?: string;
  readonly process: WarehouseOperationProcess;
  readonly category: OperationsExceptionCategory;
  readonly code: string;
  readonly severity: OperationsExceptionSeverity;
  readonly rootCause: string;
  readonly description: string;
  readonly occurredAt: string;
  readonly resolvedAt?: string;
  readonly resolutionNote?: string;
  readonly delayMinutes: number;
  readonly impactedOrders: number;
  readonly impactedTasks: number;
  readonly impactedItems: number;
  readonly createdAt: string;
}

export interface OperationsExceptionInput {
  tenantId: string;
  warehouseId?: string;
  process: WarehouseOperationProcess;
  category: OperationsExceptionCategory;
  code: string;
  severity: OperationsExceptionSeverity;
  rootCause: string;
  description: string;
  occurredAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  delayMinutes?: number;
  impactedOrders?: number;
  impactedTasks?: number;
  impactedItems?: number;
}

export interface OperationsExceptionFilter {
  tenantId: string;
  warehouseId?: string;
  periodStart: string;
  periodEnd: string;
  process?: WarehouseOperationProcess;
  severity?: OperationsExceptionSeverity;
  unresolvedOnly?: boolean;
}

export interface OperationsProcessVolume {
  process: WarehouseOperationProcess;
  operationCount: number;
}

export interface OperationsProcessExceptionSummary {
  readonly process: WarehouseOperationProcess;
  readonly label: string;
  readonly operationCount: number;
  readonly exceptionCount: number;
  readonly unresolvedCount: number;
  readonly criticalCount: number;
  readonly totalDelayMinutes: number;
  readonly averageDelayMinutes: number;
  readonly averageResolutionMinutes: number;
  readonly impactedOrders: number;
  readonly impactedTasks: number;
  readonly impactedItems: number;
  readonly errorRate: number;
}

export interface OperationsRootCauseParetoItem {
  readonly rank: number;
  readonly rootCause: string;
  readonly exceptionCount: number;
  readonly percentage: number;
  readonly cumulativePercentage: number;
  readonly totalDelayMinutes: number;
  readonly impactedOrders: number;
  readonly withinPrimary80Percent: boolean;
}

export interface OperationsBottleneck {
  readonly rank: number;
  readonly process: WarehouseOperationProcess;
  readonly label: string;
  readonly score: number;
  readonly errorRate: number;
  readonly unresolvedCount: number;
  readonly criticalCount: number;
  readonly totalDelayMinutes: number;
  readonly explanation: string;
}

export interface OperationsManagementAction {
  readonly code: string;
  readonly priority: OperationsActionPriority;
  readonly title: string;
  readonly description: string;
  readonly process?: WarehouseOperationProcess;
}

export interface OperationsExceptionAnalyticsReport {
  readonly tenantId: string;
  readonly warehouseId?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalExceptions: number;
  readonly unresolvedExceptions: number;
  readonly criticalExceptions: number;
  readonly totalDelayMinutes: number;
  readonly impactedOrders: number;
  readonly impactedTasks: number;
  readonly impactedItems: number;
  readonly processSummaries:
    readonly OperationsProcessExceptionSummary[];
  readonly rootCausePareto:
    readonly OperationsRootCauseParetoItem[];
  readonly bottlenecks:
    readonly OperationsBottleneck[];
  readonly managementActions:
    readonly OperationsManagementAction[];
  readonly calculatedAt: string;
}
