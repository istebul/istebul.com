import assert from "node:assert/strict";
import test from "node:test";

import {
  SupabaseOperationsDashboardRepository,
} from "../../src/warehouse/services/SupabaseOperationsDashboardRepository.ts";
import {
  SupabaseOperationsExceptionRepository,
} from "../../src/warehouse/services/SupabaseOperationsExceptionRepository.ts";

class FakeQuery {
  constructor(
    calls,
    result,
  ) {
    this.calls = calls;
    this.result = result;
  }

  record(method, ...args) {
    this.calls.push({
      method,
      args,
    });
    return this;
  }

  select(...args) {
    return this.record("select", ...args);
  }

  insert(...args) {
    return this.record("insert", ...args);
  }

  upsert(...args) {
    return this.record("upsert", ...args);
  }

  eq(...args) {
    return this.record("eq", ...args);
  }

  gte(...args) {
    return this.record("gte", ...args);
  }

  lte(...args) {
    return this.record("lte", ...args);
  }

  is(...args) {
    return this.record("is", ...args);
  }

  order(...args) {
    return this.record("order", ...args);
  }

  limit(...args) {
    return this.record("limit", ...args);
  }

  single() {
    this.record("single");
    return Promise.resolve(this.result);
  }

  maybeSingle() {
    this.record("maybeSingle");
    return Promise.resolve(this.result);
  }

  then(resolve, reject) {
    return Promise.resolve(this.result)
      .then(resolve, reject);
  }
}

class FakeSupabaseClient {
  constructor(results) {
    this.results = [...results];
    this.calls = [];
  }

  from(table) {
    this.calls.push({
      method: "from",
      args: [table],
    });

    const result =
      this.results.shift() ?? {
        data: null,
        error: null,
      };

    return new FakeQuery(
      this.calls,
      result,
    );
  }
}

function dashboardRow(
  overrides = {},
) {
  return {
    id: "snap-1",
    account_id: "tenant-1",
    warehouse_id: "warehouse-1",
    period_start: "2026-08-07T00:00:00.000Z",
    period_end: "2026-08-07T23:59:59.999Z",
    total_orders: 100,
    completed_orders: 95,
    on_time_orders: 92,
    delayed_orders: 3,
    total_tasks: 200,
    completed_tasks: 190,
    exception_tasks: 5,
    total_inventory_checks: 100,
    accurate_inventory_checks: 99,
    used_capacity: 80,
    total_capacity: 100,
    productive_minutes: 420,
    available_labor_minutes: 480,
    requested_items: 1000,
    fulfilled_items: 980,
    short_items: 20,
    order_completion_rate: 95,
    on_time_dispatch_rate: 96.84,
    task_completion_rate: 95,
    task_exception_rate: 2.5,
    inventory_accuracy_rate: 99,
    capacity_utilization_rate: 80,
    labor_utilization_rate: 87.5,
    item_fulfillment_rate: 98,
    short_pick_rate: 2,
    health_score: 93,
    health_status: "healthy",
    kpis: [],
    alerts: [],
    calculated_at: "2026-08-07T20:00:00.000Z",
    ...overrides,
  };
}

function exceptionRow(
  overrides = {},
) {
  return {
    id: "exc-1",
    account_id: "tenant-1",
    warehouse_id: "warehouse-1",
    process: "picking",
    category: "delay",
    code: "PICK_DELAY",
    severity: "critical",
    root_cause: "Yoğunluk",
    description: "Toplama gecikmesi",
    occurred_at: "2026-08-07T10:00:00.000Z",
    resolved_at: null,
    resolution_note: null,
    delay_minutes: 25,
    impacted_orders: 4,
    impacted_tasks: 8,
    impacted_items: 32,
    created_at: "2026-08-07T10:05:00.000Z",
    ...overrides,
  };
}

test(
  "Supabase dashboard repository kayıt satırını domain modeline dönüştürür",
  async () => {
    const row = dashboardRow();

    const client =
      new FakeSupabaseClient([
        {
          data: row,
          error: null,
        },
      ]);

    const repository =
      new SupabaseOperationsDashboardRepository(
        client,
      );

    const saved =
      await repository.save({
        id: row.id,
        tenantId: row.account_id,
        warehouseId: row.warehouse_id,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        totalOrders: row.total_orders,
        completedOrders: row.completed_orders,
        onTimeOrders: row.on_time_orders,
        delayedOrders: row.delayed_orders,
        totalTasks: row.total_tasks,
        completedTasks: row.completed_tasks,
        exceptionTasks: row.exception_tasks,
        totalInventoryChecks:
          row.total_inventory_checks,
        accurateInventoryChecks:
          row.accurate_inventory_checks,
        usedCapacity: row.used_capacity,
        totalCapacity: row.total_capacity,
        productiveMinutes:
          row.productive_minutes,
        availableLaborMinutes:
          row.available_labor_minutes,
        requestedItems: row.requested_items,
        fulfilledItems: row.fulfilled_items,
        shortItems: row.short_items,
        orderCompletionRate:
          row.order_completion_rate,
        onTimeDispatchRate:
          row.on_time_dispatch_rate,
        taskCompletionRate:
          row.task_completion_rate,
        taskExceptionRate:
          row.task_exception_rate,
        inventoryAccuracyRate:
          row.inventory_accuracy_rate,
        capacityUtilizationRate:
          row.capacity_utilization_rate,
        laborUtilizationRate:
          row.labor_utilization_rate,
        itemFulfillmentRate:
          row.item_fulfillment_rate,
        shortPickRate: row.short_pick_rate,
        healthScore: row.health_score,
        healthStatus: row.health_status,
        kpis: [],
        alerts: [],
        calculatedAt: row.calculated_at,
      });

    assert.equal(saved.tenantId, "tenant-1");
    assert.equal(
      saved.warehouseId,
      "warehouse-1",
    );
    assert.equal(saved.healthScore, 93);

    const insert =
      client.calls.find(
        (call) =>
          call.method === "insert",
      );

    assert.ok(insert);
    assert.equal(
      insert.args[0].account_id,
      "tenant-1",
    );
    assert.equal(
      insert.args[0].warehouse_id,
      "warehouse-1",
    );

    assert.equal(
      client.calls.some(
        (call) =>
          call.method === "upsert",
      ),
      false,
    );
  },
);

test(
  "Supabase dashboard repository tenant, depo ve dönem kesişimini filtreler",
  async () => {
    const client =
      new FakeSupabaseClient([
        {
          data: [dashboardRow()],
          error: null,
        },
      ]);

    const repository =
      new SupabaseOperationsDashboardRepository(
        client,
      );

    const rows =
      await repository.list({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        periodStart:
          "2026-08-01T00:00:00.000Z",
        periodEnd:
          "2026-08-07T23:59:59.999Z",
      });

    assert.equal(rows.length, 1);

    assert.ok(
      client.calls.some(
        (call) =>
          call.method === "eq" &&
          call.args[0] === "account_id" &&
          call.args[1] === "tenant-1",
      ),
    );

    assert.ok(
      client.calls.some(
        (call) =>
          call.method === "gte" &&
          call.args[0] === "period_end",
      ),
    );

    assert.ok(
      client.calls.some(
        (call) =>
          call.method === "lte" &&
          call.args[0] === "period_start",
      ),
    );
  },
);

test(
  "Supabase dashboard repository güncel kayıt yoksa null döndürür",
  async () => {
    const client =
      new FakeSupabaseClient([
        {
          data: null,
          error: null,
        },
      ]);

    const repository =
      new SupabaseOperationsDashboardRepository(
        client,
      );

    const result =
      await repository.findLatest({
        tenantId: "tenant-1",
      });

    assert.equal(result, null);

    assert.ok(
      client.calls.some(
        (call) =>
          call.method === "limit" &&
          call.args[0] === 1,
      ),
    );
  },
);

test(
  "Supabase exception repository nullable çözüm alanlarını korur",
  async () => {
    const row = exceptionRow();

    const client =
      new FakeSupabaseClient([
        {
          data: row,
          error: null,
        },
      ]);

    const repository =
      new SupabaseOperationsExceptionRepository(
        client,
      );

    const saved =
      await repository.save({
        id: row.id,
        tenantId: row.account_id,
        warehouseId: row.warehouse_id,
        process: row.process,
        category: row.category,
        code: row.code,
        severity: row.severity,
        rootCause: row.root_cause,
        description: row.description,
        occurredAt: row.occurred_at,
        delayMinutes: row.delay_minutes,
        impactedOrders: row.impacted_orders,
        impactedTasks: row.impacted_tasks,
        impactedItems: row.impacted_items,
        createdAt: row.created_at,
      });

    assert.equal(saved.resolvedAt, undefined);
    assert.equal(
      saved.resolutionNote,
      undefined,
    );

    const upsert =
      client.calls.find(
        (call) =>
          call.method === "upsert",
      );

    assert.equal(
      upsert.args[0].resolved_at,
      null,
    );
    assert.equal(
      upsert.args[0].resolution_note,
      null,
    );
  },
);

test(
  "Supabase exception repository süreç, önem ve açık kayıt filtrelerini uygular",
  async () => {
    const client =
      new FakeSupabaseClient([
        {
          data: [exceptionRow()],
          error: null,
        },
      ]);

    const repository =
      new SupabaseOperationsExceptionRepository(
        client,
      );

    const rows =
      await repository.list({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        periodStart:
          "2026-08-01T00:00:00.000Z",
        periodEnd:
          "2026-08-07T23:59:59.999Z",
        process: "picking",
        severity: "critical",
        unresolvedOnly: true,
      });

    assert.equal(rows.length, 1);

    assert.ok(
      client.calls.some(
        (call) =>
          call.method === "eq" &&
          call.args[0] === "process" &&
          call.args[1] === "picking",
      ),
    );

    assert.ok(
      client.calls.some(
        (call) =>
          call.method === "eq" &&
          call.args[0] === "severity" &&
          call.args[1] === "critical",
      ),
    );

    assert.ok(
      client.calls.some(
        (call) =>
          call.method === "is" &&
          call.args[0] === "resolved_at" &&
          call.args[1] === null,
      ),
    );
  },
);

test(
  "Supabase repository veritabanı hatasını Türkçe bağlamla yükseltir",
  async () => {
    const client =
      new FakeSupabaseClient([
        {
          data: null,
          error: {
            message: "RLS engeli",
          },
        },
      ]);

    const repository =
      new SupabaseOperationsDashboardRepository(
        client,
      );

    await assert.rejects(
      repository.findById(
        "tenant-1",
        "snap-1",
      ),
      /Operasyon dashboard kaydı okunamadı: RLS engeli/,
    );
  },
);
