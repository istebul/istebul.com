import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  OperationsDashboardAlert,
  OperationsDashboardFilter,
  OperationsDashboardKpi,
  OperationsDashboardSnapshot,
} from "../types/OperationsDashboard";
import type {
  OperationsDashboardRepository,
} from "./OperationsDashboardRepository";

const TABLE =
  "warehouse_operations_dashboard_snapshots";

const SELECT = [
  "id",
  "account_id",
  "warehouse_id",
  "period_start",
  "period_end",
  "total_orders",
  "completed_orders",
  "on_time_orders",
  "delayed_orders",
  "total_tasks",
  "completed_tasks",
  "exception_tasks",
  "total_inventory_checks",
  "accurate_inventory_checks",
  "used_capacity",
  "total_capacity",
  "productive_minutes",
  "available_labor_minutes",
  "requested_items",
  "fulfilled_items",
  "short_items",
  "order_completion_rate",
  "on_time_dispatch_rate",
  "task_completion_rate",
  "task_exception_rate",
  "inventory_accuracy_rate",
  "capacity_utilization_rate",
  "labor_utilization_rate",
  "item_fulfillment_rate",
  "short_pick_rate",
  "health_score",
  "health_status",
  "kpis",
  "alerts",
  "calculated_at",
].join(",");

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
  kpis: readonly OperationsDashboardKpi[];
  alerts: readonly OperationsDashboardAlert[];
  calculated_at: string;
}

interface SupabaseErrorLike {
  message: string;
}

function numberValue(
  value: number,
): number {
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
    completedOrders:
      numberValue(row.completed_orders),
    onTimeOrders: numberValue(row.on_time_orders),
    delayedOrders: numberValue(row.delayed_orders),
    totalTasks: numberValue(row.total_tasks),
    completedTasks:
      numberValue(row.completed_tasks),
    exceptionTasks:
      numberValue(row.exception_tasks),
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
    kpis: row.kpis,
    alerts: row.alerts,
    calculatedAt: row.calculated_at,
  };
}

function toDashboardRow(
  snapshot: OperationsDashboardSnapshot,
) {
  return {
    id: snapshot.id,
    account_id: snapshot.tenantId,
    warehouse_id:
      snapshot.warehouseId ?? null,
    period_start: snapshot.periodStart,
    period_end: snapshot.periodEnd,
    total_orders: snapshot.totalOrders,
    completed_orders: snapshot.completedOrders,
    on_time_orders: snapshot.onTimeOrders,
    delayed_orders: snapshot.delayedOrders,
    total_tasks: snapshot.totalTasks,
    completed_tasks: snapshot.completedTasks,
    exception_tasks: snapshot.exceptionTasks,
    total_inventory_checks:
      snapshot.totalInventoryChecks,
    accurate_inventory_checks:
      snapshot.accurateInventoryChecks,
    used_capacity: snapshot.usedCapacity,
    total_capacity: snapshot.totalCapacity,
    productive_minutes:
      snapshot.productiveMinutes,
    available_labor_minutes:
      snapshot.availableLaborMinutes,
    requested_items: snapshot.requestedItems,
    fulfilled_items: snapshot.fulfilledItems,
    short_items: snapshot.shortItems,
    order_completion_rate:
      snapshot.orderCompletionRate,
    on_time_dispatch_rate:
      snapshot.onTimeDispatchRate,
    task_completion_rate:
      snapshot.taskCompletionRate,
    task_exception_rate:
      snapshot.taskExceptionRate,
    inventory_accuracy_rate:
      snapshot.inventoryAccuracyRate,
    capacity_utilization_rate:
      snapshot.capacityUtilizationRate,
    labor_utilization_rate:
      snapshot.laborUtilizationRate,
    item_fulfillment_rate:
      snapshot.itemFulfillmentRate,
    short_pick_rate: snapshot.shortPickRate,
    health_score: snapshot.healthScore,
    health_status: snapshot.healthStatus,
    kpis: snapshot.kpis,
    alerts: snapshot.alerts,
    calculated_at: snapshot.calculatedAt,
  };
}

export class SupabaseOperationsDashboardRepository
  implements OperationsDashboardRepository
{
  private readonly client: SupabaseClient;

  constructor(
    client: SupabaseClient,
  ) {
    this.client = client;
  }

  async save(
    snapshot: OperationsDashboardSnapshot,
  ): Promise<OperationsDashboardSnapshot> {
    const { data, error } =
      await this.client
        .from(TABLE)
        .upsert(
          toDashboardRow(snapshot),
          { onConflict: "id" },
        )
        .select(SELECT)
        .single();

    if (error || !data) {
      this.throwError(
        "Operasyon dashboard kaydı saklanamadı",
        error,
      );
    }

    return mapDashboardRow(
      data as unknown as DashboardRow,
    );
  }

  async findById(
    tenantId: string,
    snapshotId: string,
  ): Promise<OperationsDashboardSnapshot | null> {
    const { data, error } =
      await this.client
        .from(TABLE)
        .select(SELECT)
        .eq("account_id", tenantId)
        .eq("id", snapshotId)
        .maybeSingle();

    if (error) {
      this.throwError(
        "Operasyon dashboard kaydı okunamadı",
        error,
      );
    }

    return data
      ? mapDashboardRow(
          data as unknown as DashboardRow,
        )
      : null;
  }

  async findLatest(
    filter: OperationsDashboardFilter,
  ): Promise<OperationsDashboardSnapshot | null> {
    let query =
      this.client
        .from(TABLE)
        .select(SELECT)
        .eq("account_id", filter.tenantId);

    if (filter.warehouseId !== undefined) {
      query =
        query.eq(
          "warehouse_id",
          filter.warehouseId,
        );
    }

    if (filter.periodStart !== undefined) {
      query =
        query.gte(
          "period_end",
          filter.periodStart,
        );
    }

    if (filter.periodEnd !== undefined) {
      query =
        query.lte(
          "period_start",
          filter.periodEnd,
        );
    }

    const { data, error } =
      await query
        .order(
          "calculated_at",
          { ascending: false },
        )
        .limit(1)
        .maybeSingle();

    if (error) {
      this.throwError(
        "Güncel operasyon dashboard kaydı okunamadı",
        error,
      );
    }

    return data
      ? mapDashboardRow(
          data as unknown as DashboardRow,
        )
      : null;
  }

  async list(
    filter: OperationsDashboardFilter,
  ): Promise<OperationsDashboardSnapshot[]> {
    let query =
      this.client
        .from(TABLE)
        .select(SELECT)
        .eq("account_id", filter.tenantId);

    if (filter.warehouseId !== undefined) {
      query =
        query.eq(
          "warehouse_id",
          filter.warehouseId,
        );
    }

    if (filter.periodStart !== undefined) {
      query =
        query.gte(
          "period_end",
          filter.periodStart,
        );
    }

    if (filter.periodEnd !== undefined) {
      query =
        query.lte(
          "period_start",
          filter.periodEnd,
        );
    }

    const { data, error } =
      await query.order(
        "calculated_at",
        { ascending: false },
      );

    if (error) {
      this.throwError(
        "Operasyon dashboard kayıtları listelenemedi",
        error,
      );
    }

    return (data ?? []).map(
      (row) =>
        mapDashboardRow(
          row as unknown as DashboardRow,
        ),
    );
  }

  private throwError(
    message: string,
    error:
      | SupabaseErrorLike
      | null,
  ): never {
    throw new Error(
      `${message}: ${
        error?.message ?? "Bilinmeyen veritabanı hatası."
      }`,
    );
  }
}
