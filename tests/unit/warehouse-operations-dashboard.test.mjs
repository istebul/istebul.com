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
  "/tmp/warehouse-operations-dashboard-test.mjs";

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
  const repository =
    new warehouse
      .InMemoryOperationsDashboardRepository();

  const service =
    new warehouse
      .OperationsDashboardService({
        repository,
        now: () =>
          "2026-08-07T06:00:00.000Z",
        idFactory: () =>
          "dashboard-1",
      });

  return {
    repository,
    service,
  };
}

function createInput(
  overrides = {},
) {
  return {
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    periodStart:
      "2026-08-07T00:00:00.000Z",
    periodEnd:
      "2026-08-07T23:59:59.999Z",
    totalOrders: 100,
    completedOrders: 90,
    onTimeOrders: 70,
    delayedOrders: 20,
    totalTasks: 200,
    completedTasks: 180,
    exceptionTasks: 20,
    totalInventoryChecks: 100,
    accurateInventoryChecks: 92,
    usedCapacity: 95,
    totalCapacity: 100,
    productiveMinutes: 420,
    availableLaborMinutes: 480,
    requestedItems: 1000,
    fulfilledItems: 940,
    shortItems: 60,
    ...overrides,
  };
}

test(
  "operasyon dashboard KPI, sağlık skoru ve Türkçe uyarılar üretir",
  async () => {
    const context =
      createContext();

    const snapshot =
      await context.service
        .createSnapshot(
          createInput(),
        );

    assert.equal(
      snapshot.id,
      "dashboard-1",
    );

    assert.equal(
      snapshot.orderCompletionRate,
      90,
    );

    assert.equal(
      snapshot.onTimeDispatchRate,
      77.78,
    );

    assert.equal(
      snapshot.inventoryAccuracyRate,
      92,
    );

    assert.equal(
      snapshot.capacityUtilizationRate,
      95,
    );

    assert.equal(
      snapshot.itemFulfillmentRate,
      94,
    );

    assert.equal(
      snapshot.shortPickRate,
      6,
    );

    assert.equal(
      snapshot.kpis.length,
      7,
    );

    assert.equal(
      snapshot.healthStatus,
      "attention",
    );

    assert.ok(
      snapshot.alerts.some(
        (alert) =>
          alert.code ===
          "INVENTORY_ACCURACY_WARNING",
      ),
    );

    assert.ok(
      snapshot.alerts.some(
        (alert) =>
          alert.code ===
          "CAPACITY_WARNING",
      ),
    );

    assert.ok(
      snapshot.alerts.some(
        (alert) =>
          alert.title.includes(
            "Zamanında sevkiyat",
          ),
      ),
    );
  },
);

test(
  "repository firma ve depo izolasyonunu korur",
  async () => {
    const context =
      createContext();

    await context.service
      .createSnapshot(
        createInput(),
      );

    const tenantResult =
      await context.service
        .getLatest({
          tenantId: "tenant-1",
          warehouseId:
            "warehouse-1",
        });

    const otherTenantResult =
      await context.service
        .getLatest({
          tenantId: "tenant-2",
          warehouseId:
            "warehouse-1",
        });

    const otherWarehouseResult =
      await context.service
        .getLatest({
          tenantId: "tenant-1",
          warehouseId:
            "warehouse-2",
        });

    assert.equal(
      tenantResult?.id,
      "dashboard-1",
    );

    assert.equal(
      otherTenantResult,
      null,
    );

    assert.equal(
      otherWarehouseResult,
      null,
    );

    const firstTitle =
      tenantResult.alerts[0].title;

    tenantResult.alerts[0].title =
      "Değiştirildi";

    const reloaded =
      await context.service
        .getLatest({
          tenantId: "tenant-1",
          warehouseId:
            "warehouse-1",
        });

    assert.equal(
      reloaded.alerts[0].title,
      firstTitle,
    );
  },
);

test(
  "geçersiz operasyon verisini reddeder",
  async () => {
    const context =
      createContext();

    await assert.rejects(
      () =>
        context.service
          .createSnapshot(
            createInput({
              completedOrders: 101,
            }),
          ),
      /Tamamlanan sipariş, toplam siparişi aşamaz/,
    );

    await assert.rejects(
      () =>
        context.service
          .createSnapshot(
            createInput({
              periodStart:
                "2026-08-08T00:00:00.000Z",
              periodEnd:
                "2026-08-07T00:00:00.000Z",
            }),
          ),
      /Dönem başlangıcı, dönem bitişinden sonra olamaz/,
    );
  },
);
