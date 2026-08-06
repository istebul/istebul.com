import assert from "node:assert/strict";
import test, {
  after,
  before,
} from "node:test";
import {
  unlink,
} from "node:fs/promises";
import {
  build,
} from "esbuild";

const bundlePath =
  "/tmp/warehouse-operations-reporting-test.mjs";

let warehouse;

before(async () => {
  await build({
    entryPoints: [
      "src/warehouse/index.ts",
    ],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: bundlePath,
    target: "node20",
    sourcemap: false,
  });

  warehouse = await import(
    `file://${bundlePath}?v=${Date.now()}`,
  );
});

after(async () => {
  await unlink(bundlePath).catch(
    () => undefined,
  );
});

function createContext() {
  let currentNow =
    "2026-08-07T08:00:00.000Z";

  let sequence = 0;

  const repository =
    new warehouse
      .InMemoryOperationsDashboardRepository();

  const dashboardService =
    new warehouse
      .OperationsDashboardService({
        repository,
        now: () => currentNow,
        idFactory: () =>
          `dashboard-${++sequence}`,
      });

  const reportingService =
    new warehouse
      .OperationsReportingService({
        repository,
        now: () =>
          "2026-08-07T10:00:00.000Z",
      });

  return {
    repository,
    dashboardService,
    reportingService,
    setNow(value) {
      currentNow = value;
    },
  };
}

function createInput(
  overrides = {},
) {
  return {
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    periodStart:
      "2026-08-01T00:00:00.000Z",
    periodEnd:
      "2026-08-01T23:59:59.999Z",
    totalOrders: 100,
    completedOrders: 80,
    onTimeOrders: 60,
    delayedOrders: 20,
    totalTasks: 200,
    completedTasks: 160,
    exceptionTasks: 20,
    totalInventoryChecks: 100,
    accurateInventoryChecks: 90,
    usedCapacity: 96,
    totalCapacity: 100,
    productiveMinutes: 360,
    availableLaborMinutes: 480,
    requestedItems: 1000,
    fulfilledItems: 900,
    shortItems: 100,
    ...overrides,
  };
}

test(
  "güncel ve önceki operasyon dönemlerini karşılaştırır",
  async () => {
    const context =
      createContext();

    await context.dashboardService
      .createSnapshot(
        createInput(),
      );

    context.setNow(
      "2026-08-07T09:00:00.000Z",
    );

    await context.dashboardService
      .createSnapshot(
        createInput({
          periodStart:
            "2026-08-07T00:00:00.000Z",
          periodEnd:
            "2026-08-07T23:59:59.999Z",
          completedOrders: 96,
          onTimeOrders: 94,
          delayedOrders: 2,
          completedTasks: 196,
          exceptionTasks: 4,
          accurateInventoryChecks: 99,
          usedCapacity: 89,
          productiveMinutes: 430,
          fulfilledItems: 990,
          shortItems: 10,
        }),
      );

    const comparison =
      await context.reportingService
        .comparePeriods({
          tenantId: "tenant-1",
          warehouseId:
            "warehouse-1",
          currentPeriodStart:
            "2026-08-07T00:00:00.000Z",
          currentPeriodEnd:
            "2026-08-07T23:59:59.999Z",
          previousPeriodStart:
            "2026-08-01T00:00:00.000Z",
          previousPeriodEnd:
            "2026-08-01T23:59:59.999Z",
        });

    assert.equal(
      comparison.current
        .orderCompletionRate,
      96,
    );

    assert.equal(
      comparison.previous
        .orderCompletionRate,
      80,
    );

    assert.equal(
      comparison.improved,
      true,
    );

    assert.ok(
      comparison.improvingMetricCount >
        comparison.decliningMetricCount,
    );

    const shortPick =
      comparison.metrics.find(
        (metric) =>
          metric.key ===
          "short_pick",
      );

    assert.equal(
      shortPick.direction,
      "improving",
    );

    const capacity =
      comparison.metrics.find(
        (metric) =>
          metric.key ===
          "capacity_utilization",
      );

    assert.equal(
      capacity.direction,
      "improving",
    );
  },
);

test(
  "KPI trendini kronolojik sırada üretir",
  async () => {
    const context =
      createContext();

    await context.dashboardService
      .createSnapshot(
        createInput(),
      );

    context.setNow(
      "2026-08-02T08:00:00.000Z",
    );

    await context.dashboardService
      .createSnapshot(
        createInput({
          periodStart:
            "2026-08-02T00:00:00.000Z",
          periodEnd:
            "2026-08-02T23:59:59.999Z",
          accurateInventoryChecks: 94,
        }),
      );

    context.setNow(
      "2026-08-03T08:00:00.000Z",
    );

    await context.dashboardService
      .createSnapshot(
        createInput({
          periodStart:
            "2026-08-03T00:00:00.000Z",
          periodEnd:
            "2026-08-03T23:59:59.999Z",
          accurateInventoryChecks: 99,
        }),
      );

    const trend =
      await context.reportingService
        .buildTrend({
          tenantId: "tenant-1",
          warehouseId:
            "warehouse-1",
          periodStart:
            "2026-08-01T00:00:00.000Z",
          periodEnd:
            "2026-08-03T23:59:59.999Z",
          metric:
            "inventory_accuracy",
        });

    assert.equal(
      trend.points.length,
      3,
    );

    assert.deepEqual(
      trend.points.map(
        (point) => point.value,
      ),
      [90, 94, 99],
    );

    assert.equal(
      trend.direction,
      "improving",
    );

    assert.equal(
      trend.change,
      9,
    );
  },
);

test(
  "depo performansını sağlık skoruna göre sıralar ve firma izolasyonu uygular",
  async () => {
    const context =
      createContext();

    await context.dashboardService
      .createSnapshot(
        createInput({
          warehouseId:
            "warehouse-1",
          completedOrders: 98,
          onTimeOrders: 96,
          completedTasks: 198,
          exceptionTasks: 2,
          accurateInventoryChecks: 99,
          usedCapacity: 88,
          productiveMinutes: 440,
          fulfilledItems: 995,
          shortItems: 5,
        }),
      );

    context.setNow(
      "2026-08-07T08:10:00.000Z",
    );

    await context.dashboardService
      .createSnapshot(
        createInput({
          warehouseId:
            "warehouse-2",
          completedOrders: 70,
          onTimeOrders: 45,
          completedTasks: 140,
          exceptionTasks: 40,
          accurateInventoryChecks: 82,
          usedCapacity: 110,
          productiveMinutes: 300,
          fulfilledItems: 800,
          shortItems: 200,
        }),
      );

    context.setNow(
      "2026-08-07T08:20:00.000Z",
    );

    await context.dashboardService
      .createSnapshot(
        createInput({
          tenantId:
            "tenant-2",
          warehouseId:
            "warehouse-9",
          completedOrders: 100,
          onTimeOrders: 100,
          completedTasks: 200,
          exceptionTasks: 0,
          accurateInventoryChecks: 100,
          usedCapacity: 85,
          productiveMinutes: 450,
          fulfilledItems: 1000,
          shortItems: 0,
        }),
      );

    const report =
      await context.reportingService
        .buildWarehouseReport({
          tenantId: "tenant-1",
          periodStart:
            "2026-08-01T00:00:00.000Z",
          periodEnd:
            "2026-08-01T23:59:59.999Z",
        });

    assert.equal(
      report.warehouseCount,
      2,
    );

    assert.equal(
      report.warehouses[0]
        .warehouseId,
      "warehouse-1",
    );

    assert.equal(
      report.warehouses[0].rank,
      1,
    );

    assert.equal(
      report.warehouses[1]
        .warehouseId,
      "warehouse-2",
    );

    assert.ok(
      report.warehouses.every(
        (item) =>
          item.warehouseId !==
          "warehouse-9",
      ),
    );
  },
);

test(
  "verisi olmayan ve geçersiz rapor dönemlerini reddeder",
  async () => {
    const context =
      createContext();

    await assert.rejects(
      () =>
        context.reportingService
          .buildTrend({
            tenantId: "tenant-1",
            warehouseId:
              "warehouse-1",
            periodStart:
              "2026-08-01T00:00:00.000Z",
            periodEnd:
              "2026-08-02T00:00:00.000Z",
            metric:
              "health_score",
          }),
      /Trend dönemi için dashboard verisi bulunamadı/,
    );

    await assert.rejects(
      () =>
        context.reportingService
          .buildWarehouseReport({
            tenantId: "tenant-1",
            periodStart:
              "2026-08-02T00:00:00.000Z",
            periodEnd:
              "2026-08-01T00:00:00.000Z",
          }),
      /Rapor dönemi başlangıcı, bitişinden sonra olamaz/,
    );
  },
);
