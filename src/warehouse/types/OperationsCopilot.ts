import type {
  OperationsDashboardHealthStatus,
  OperationsDashboardKpiKey,
} from "./OperationsDashboard";
import type {
  OperationsActionPriority,
  WarehouseOperationProcess,
} from "./OperationsExceptionAnalytics";

export type OperationsCopilotPriority =
  | OperationsActionPriority
  | "low";

export type OperationsCopilotSignalSource =
  | "dashboard"
  | "exception_analytics"
  | "comparison";

export type OperationsCopilotConfidenceLevel =
  | "high"
  | "medium"
  | "low";

export interface OperationsCopilotHealth {
  readonly score: number;
  readonly status: OperationsDashboardHealthStatus;
  readonly statusLabel: string;
}

export interface OperationsCopilotSignal {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priority: OperationsCopilotPriority;
  readonly source: OperationsCopilotSignalSource;
  readonly metricKey?: OperationsDashboardKpiKey;
  readonly process?: WarehouseOperationProcess;
}

export interface OperationsCopilotAction {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priority: OperationsCopilotPriority;
  readonly source: OperationsCopilotSignalSource;
  readonly dueLabel: string;
  readonly metricKey?: OperationsDashboardKpiKey;
  readonly process?: WarehouseOperationProcess;
}

export interface OperationsCopilotConfidence {
  readonly score: number;
  readonly level: OperationsCopilotConfidenceLevel;
  readonly label: string;
  readonly reasons: readonly string[];
}

export interface OperationsCopilotResult {
  readonly generatedAt: string;
  readonly tenantId: string;
  readonly warehouseId?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly health: OperationsCopilotHealth;
  readonly dailySummary: string;
  readonly topRisk?: OperationsCopilotSignal;
  readonly topOpportunity?: OperationsCopilotSignal;
  readonly actions: readonly OperationsCopilotAction[];
  readonly confidence: OperationsCopilotConfidence;
  readonly grounding: {
    readonly snapshotId: string;
    readonly snapshotCalculatedAt: string;
    readonly exceptionAnalyticsCalculatedAt?: string;
    readonly comparisonCalculatedAt?: string;
  };
  readonly disclosure: string;
}
