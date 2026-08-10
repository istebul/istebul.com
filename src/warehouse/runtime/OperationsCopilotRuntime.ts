import type {
  OperationsDashboardAlert,
  OperationsDashboardFilter,
  OperationsDashboardKpi,
  OperationsDashboardSnapshot,
} from "../types/OperationsDashboard";
import type {
  OperationsExceptionFilter,
  OperationsExceptionRecord,
  OperationsProcessVolume,
} from "../types/OperationsExceptionAnalytics";
import type {
  OperationsDashboardRepository,
} from "../services/OperationsDashboardRepository";
import type {
  OperationsExceptionRepository,
} from "../services/OperationsExceptionRepository";
import {
  OperationsCopilotService,
} from "../services/OperationsCopilotService";
import {
  OperationsExceptionAnalyticsService,
} from "../services/OperationsExceptionAnalyticsService";
import {
  OperationsReportingService,
} from "../services/OperationsReportingService";

interface DashboardRow {
  id: string;
  account_id: string;
  warehouse_id: string | null;
  period_start: string;
  period_end: string;
  total_orders: number;
  completed_orders: number;
  on_time_orders: number;
  delayed_orders: number;
  total_tasks: number;
  completed_tasks: number;
  exception_tasks: number;
  total_inventory_checks: number;
  accurate_inventory_checks: number;
  used_capacity: number;
  total_capacity: number;
  productive_minutes: number;
  available_labor_minutes: number;
  requested_items: number;
  fulfilled_items: number;
  short_items: number;
  order_completion_rate: number;
  on_time_dispatch_rate: number;
  task_completion_rate: number;
  task_exception_rate: number;
  inventory_accuracy_rate: number;
  capacity_utilization_rate: number;
  labor_utilization_rate: number;
  item_fulfillment_rate: number;
  short_pick_rate: number;
  health_score: number;
  health_status: OperationsDashboardSnapshot["healthStatus"];
  kpis?: readonly OperationsDashboardKpi[] | null;
  alerts?: readonly OperationsDashboardAlert[] | null;
  calculated_at: string;
}

interface ExceptionRow {
  id: string;
  account_id: string;
  warehouse_id: string | null;
  process: OperationsExceptionRecord["process"];
  category: OperationsExceptionRecord["category"];
  code: string;
  severity: OperationsExceptionRecord["severity"];
  root_cause: string;
  description: string;
  occurred_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
  delay_minutes: number;
  impacted_orders: number;
  impacted_tasks: number;
  impacted_items: number;
  created_at: string;
}

interface ProcessVolumeRow {
  process: OperationsProcessVolume["process"];
  operation_count: number;
}

export interface WarehouseOperationsCopilotRuntimeInput {
  readonly accountId: string;
  readonly warehouseId?: string | null;
  readonly snapshot: DashboardRow | null;
  readonly trend?: readonly DashboardRow[];
  readonly exceptions?: readonly ExceptionRow[];
  readonly processVolumes?: readonly ProcessVolumeRow[];
  readonly generatedAt?: string;
}

function numberValue(value: number): number {
  return Number(value);
}

function mapDashboardRow(
  row: DashboardRow,
): OperationsDashboardSnapshot {
  return {
    id: row.id,
    tenantId: row.account_id,
    ...(row.warehouse_id !== null
      ? { warehouseId: row.warehouse_id }
      : {}),
    periodStart: row.period_start,
    periodEnd: row.period_end,
    totalOrders: numberValue(row.total_orders),
    completedOrders: numberValue(row.completed_orders),
    onTimeOrders: numberValue(row.on_time_orders),
    delayedOrders: numberValue(row.delayed_orders),
    totalTasks: numberValue(row.total_tasks),
    completedTasks: numberValue(row.completed_tasks),
    exceptionTasks: numberValue(row.exception_tasks),
    totalInventoryChecks:
      numberValue(row.total_inventory_checks),
    accurateInventoryChecks:
      numberValue(row.accurate_inventory_checks),
    usedCapacity: numberValue(row.used_capacity),
    totalCapacity: numberValue(row.total_capacity),
    productiveMinutes:
      numberValue(row.productive_minutes),
    availableLaborMinutes:
      numberValue(row.available_labor_minutes),
    requestedItems:
      numberValue(row.requested_items),
    fulfilledItems:
      numberValue(row.fulfilled_items),
    shortItems: numberValue(row.short_items),
    orderCompletionRate:
      numberValue(row.order_completion_rate),
    onTimeDispatchRate:
      numberValue(row.on_time_dispatch_rate),
    taskCompletionRate:
      numberValue(row.task_completion_rate),
    taskExceptionRate:
      numberValue(row.task_exception_rate),
    inventoryAccuracyRate:
      numberValue(row.inventory_accuracy_rate),
    capacityUtilizationRate:
      numberValue(row.capacity_utilization_rate),
    laborUtilizationRate:
      numberValue(row.labor_utilization_rate),
    itemFulfillmentRate:
      numberValue(row.item_fulfillment_rate),
    shortPickRate:
      numberValue(row.short_pick_rate),
    healthScore: numberValue(row.health_score),
    healthStatus: row.health_status,
    kpis: Array.isArray(row.kpis)
      ? row.kpis
      : [],
    alerts: Array.isArray(row.alerts)
      ? row.alerts
      : [],
    calculatedAt: row.calculated_at,
  };
}

function mapExceptionRow(
  row: ExceptionRow,
): OperationsExceptionRecord {
  return {
    id: row.id,
    tenantId: row.account_id,
    ...(row.warehouse_id !== null
      ? { warehouseId: row.warehouse_id }
      : {}),
    process: row.process,
    category: row.category,
    code: row.code,
    severity: row.severity,
    rootCause: row.root_cause,
    description: row.description,
    occurredAt: row.occurred_at,
    ...(row.resolved_at !== null
      ? { resolvedAt: row.resolved_at }
      : {}),
    ...(row.resolution_note !== null
      ? { resolutionNote: row.resolution_note }
      : {}),
    delayMinutes: numberValue(row.delay_minutes),
    impactedOrders: numberValue(row.impacted_orders),
    impactedTasks: numberValue(row.impacted_tasks),
    impactedItems: numberValue(row.impacted_items),
    createdAt: row.created_at,
  };
}

function sameWarehouse(
  snapshotWarehouseId: string | undefined,
  filterWarehouseId: string | undefined,
): boolean {
  return snapshotWarehouseId === filterWarehouseId;
}

function dashboardMatches(
  snapshot: OperationsDashboardSnapshot,
  filter: OperationsDashboardFilter,
): boolean {
  if (snapshot.tenantId !== filter.tenantId) {
    return false;
  }

  if (
    !sameWarehouse(
      snapshot.warehouseId,
      filter.warehouseId,
    )
  ) {
    return false;
  }

  if (
    filter.periodStart !== undefined &&
    snapshot.periodEnd < filter.periodStart
  ) {
    return false;
  }

  if (
    filter.periodEnd !== undefined &&
    snapshot.periodStart > filter.periodEnd
  ) {
    return false;
  }

  return true;
}

function exceptionMatches(
  record: OperationsExceptionRecord,
  filter: OperationsExceptionFilter,
): boolean {
  if (
    record.tenantId !== filter.tenantId ||
    !sameWarehouse(
      record.warehouseId,
      filter.warehouseId,
    )
  ) {
    return false;
  }

  if (
    record.occurredAt < filter.periodStart ||
    record.occurredAt > filter.periodEnd
  ) {
    return false;
  }

  if (
    filter.process !== undefined &&
    record.process !== filter.process
  ) {
    return false;
  }

  if (
    filter.severity !== undefined &&
    record.severity !== filter.severity
  ) {
    return false;
  }

  if (
    filter.unresolvedOnly === true &&
    record.resolvedAt !== undefined
  ) {
    return false;
  }

  return true;
}

function uniqueSnapshots(
  snapshots: readonly OperationsDashboardSnapshot[],
): OperationsDashboardSnapshot[] {
  const byId =
    new Map<string, OperationsDashboardSnapshot>();

  for (const snapshot of snapshots) {
    byId.set(snapshot.id, snapshot);
  }

  return [...byId.values()];
}

function findPreviousPeriodSnapshot(
  current: OperationsDashboardSnapshot,
  snapshots: readonly OperationsDashboardSnapshot[],
): OperationsDashboardSnapshot | undefined {
  return [...snapshots]
    .filter(
      (snapshot) =>
        snapshot.id !== current.id &&
        snapshot.tenantId === current.tenantId &&
        snapshot.warehouseId === current.warehouseId &&
        (
          snapshot.periodStart !== current.periodStart ||
          snapshot.periodEnd !== current.periodEnd
        ),
    )
    .sort(
      (left, right) =>
        right.calculatedAt.localeCompare(
          left.calculatedAt,
        ),
    )[0];
}

/**
 * Cloudflare runtime için yalnız veri eşleme ve servis orkestrasyonu yapar.
 * Copilot karar kuralları OperationsCopilotService içinde tek otorite olarak kalır.
 */
export async function buildWarehouseOperationsCopilotRuntime(
  input: WarehouseOperationsCopilotRuntimeInput,
) {
  if (input.snapshot === null) {
    return null;
  }

  const generatedAt =
    input.generatedAt ??
    new Date().toISOString();

  const current =
    mapDashboardRow(input.snapshot);

  if (
    current.tenantId !== input.accountId ||
    current.warehouseId !==
      (input.warehouseId ?? undefined)
  ) {
    throw new Error(
      "Copilot runtime snapshot kapsamı seçili firma ve depo ile eşleşmiyor.",
    );
  }

  const snapshots =
    uniqueSnapshots([
      current,
      ...(input.trend ?? [])
        .map(mapDashboardRow),
    ]);

  const exceptionRecords =
    (input.exceptions ?? [])
      .map(mapExceptionRow);

  const processVolumes:
    OperationsProcessVolume[] =
    (input.processVolumes ?? [])
      .map((row) => ({
        process: row.process,
        operationCount:
          numberValue(row.operation_count),
      }));

  const dashboardRepository = {
    async list(
      filter: OperationsDashboardFilter,
    ) {
      return snapshots.filter(
        (snapshot) =>
          dashboardMatches(
            snapshot,
            filter,
          ),
      );
    },
  } as OperationsDashboardRepository;

  const exceptionRepository = {
    async list(
      filter: OperationsExceptionFilter,
    ) {
      return exceptionRecords.filter(
        (record) =>
          exceptionMatches(
            record,
            filter,
          ),
      );
    },
  } as OperationsExceptionRepository;

  const analyticsService =
    new OperationsExceptionAnalyticsService({
      repository: exceptionRepository,
      now: () => generatedAt,
    });

  const exceptionAnalytics =
    await analyticsService.analyze(
      {
        tenantId: current.tenantId,
        ...(current.warehouseId !== undefined
          ? {
              warehouseId:
                current.warehouseId,
            }
          : {}),
        periodStart: current.periodStart,
        periodEnd: current.periodEnd,
      },
      processVolumes,
    );

  const previous =
    findPreviousPeriodSnapshot(
      current,
      snapshots,
    );

  let comparison;

  if (previous !== undefined) {
    const reportingService =
      new OperationsReportingService({
        repository: dashboardRepository,
        now: () => generatedAt,
      });

    comparison =
      await reportingService.comparePeriods({
        tenantId: current.tenantId,
        ...(current.warehouseId !== undefined
          ? {
              warehouseId:
                current.warehouseId,
            }
          : {}),
        currentPeriodStart:
          current.periodStart,
        currentPeriodEnd:
          current.periodEnd,
        previousPeriodStart:
          previous.periodStart,
        previousPeriodEnd:
          previous.periodEnd,
      });
  }

  return new OperationsCopilotService().build({
    snapshot: current,
    exceptionAnalytics,
    ...(comparison !== undefined
      ? { comparison }
      : {}),
    generatedAt,
  });
}

export default buildWarehouseOperationsCopilotRuntime;
