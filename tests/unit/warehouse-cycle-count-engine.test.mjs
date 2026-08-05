import assert from "node:assert/strict";
import test, {
  after,
  before,
} from "node:test";
import {
  build,
} from "esbuild";

const bundlePath =
  "/tmp/warehouse-cycle-count-test-bundle.mjs";

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
    `file://${bundlePath}?v=${Date.now()}`
  );
});

after(async () => {
  const {
    unlink,
  } = await import(
    "node:fs/promises"
  );

  await unlink(bundlePath).catch(
    () => undefined,
  );
});

function createContext(options = {}) {
  const repository =
    new warehouse
      .InMemoryCycleCountRepository();

  const varianceService =
    new warehouse
      .CycleCountVarianceService({
        now:
          options.now ??
          (() =>
            "2026-08-06T00:00:00.000Z"),
      });

  const accuracyService =
    new warehouse
      .CycleCountAccuracyService({
        now:
          options.now ??
          (() =>
            "2026-08-06T00:00:00.000Z"),
      });

  const adjustmentService =
    new warehouse
      .CycleCountAdjustmentService({
        repository,
        now:
          options.now ??
          (() =>
            "2026-08-06T00:00:00.000Z"),
        ...(options.executor
          ? {
              executor:
                options.executor,
            }
          : {}),
        ...(options
          .approvalQuantityThreshold !==
        undefined
          ? {
              approvalQuantityThreshold:
                options
                  .approvalQuantityThreshold,
            }
          : {}),
      });

  const planningService =
    new warehouse
      .CycleCountPlanningService({
        repository,
        now:
          options.now ??
          (() =>
            "2026-08-06T00:00:00.000Z"),
      });

  const service =
    new warehouse.CycleCountService({
      repository,
      varianceService,
      accuracyService,
      adjustmentService,
      planningService,
      now:
        options.now ??
        (() =>
          "2026-08-06T00:00:00.000Z"),
      sequence:
        options.sequence ??
        (() => 1),
    });

  return {
    repository,
    varianceService,
    accuracyService,
    adjustmentService,
    planningService,
    service,
  };
}

async function createBasicCount(
  context,
  overrides = {},
) {
  return context.service.create({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    strategy: "location_based",
    createdBy: "user-1",
    ...overrides,
  });
}

async function addBasicItem(
  context,
  count,
  overrides = {},
) {
  return context.service.addItem({
    tenantId: count.tenantId,
    cycleCountId: count.id,
    warehouseId:
      count.warehouseId,
    locationId: "location-1",
    productId: "product-1",
    unit: "adet",
    expectedQuantity: 10,
    createdBy: "user-1",
    ...overrides,
  });
}

async function prepareStartedCount(
  context,
  itemOverrides = {},
) {
  const count =
    await createBasicCount(context);

  const item =
    await addBasicItem(
      context,
      count,
      itemOverrides,
    );

  await context.service.release({
    tenantId: count.tenantId,
    cycleCountId: count.id,
    releasedBy: "supervisor-1",
  });

  await context.service.createTask({
    tenantId: count.tenantId,
    cycleCountId: count.id,
    cycleCountItemId: item.id,
    warehouseId:
      count.warehouseId,
    locationId: item.locationId,
    productId: item.productId,
    type: "count_location",
    assignedUserId: "counter-1",
    createdBy: "supervisor-1",
  });

  await context.service.start({
    tenantId: count.tenantId,
    cycleCountId: count.id,
    startedBy: "counter-1",
  });

  return {
    count:
      await context.service.get(
        count.tenantId,
        count.id,
      ),
    item:
      (
        await context.service
          .listItems(
            count.tenantId,
            count.id,
          )
      )[0],
  };
}

test(
  "döngüsel sayım oluşturulur ve numara üretilir",
  async () => {
    const context =
      createContext();

    const count =
      await createBasicCount(
        context,
      );

    assert.equal(
      count.cycleCountNumber,
      "SAY-20260806-000001",
    );

    assert.equal(
      count.status,
      "draft",
    );

    assert.equal(
      count.tenantId,
      "tenant-1",
    );
  },
);

test(
  "planlama tarihi bulunan sayım planlandı durumunda oluşturulur",
  async () => {
    const context =
      createContext();

    const count =
      await createBasicCount(
        context,
        {
          plannedAt:
            "2026-08-07T09:00:00Z",
        },
      );

    assert.equal(
      count.status,
      "planned",
    );

    assert.equal(
      count.plannedAt,
      "2026-08-07T09:00:00.000Z",
    );
  },
);

test(
  "aynı referans için ikinci sayım oluşturulamaz",
  async () => {
    const context =
      createContext();

    await createBasicCount(
      context,
      {
        referenceType:
          "inventory_audit",
        referenceId:
          "audit-1",
      },
    );

    await assert.rejects(
      () =>
        createBasicCount(
          context,
          {
            referenceType:
              "inventory_audit",
            referenceId:
              "audit-1",
          },
        ),
      /daha önce döngüsel sayım/,
    );
  },
);

test(
  "aynı lokasyon ve ürün ikinci kez eklenemez",
  async () => {
    const context =
      createContext();

    const count =
      await createBasicCount(
        context,
      );

    await addBasicItem(
      context,
      count,
    );

    await assert.rejects(
      () =>
        addBasicItem(
          context,
          count,
        ),
      /sayım satırı zaten bulunmaktadır/,
    );
  },
);

test(
  "satırı olmayan sayım sayıma açılamaz",
  async () => {
    const context =
      createContext();

    const count =
      await createBasicCount(
        context,
      );

    await assert.rejects(
      () =>
        context.service.release({
          tenantId:
            count.tenantId,
          cycleCountId:
            count.id,
          releasedBy:
            "supervisor-1",
        }),
      /Satırı bulunmayan/,
    );
  },
);

test(
  "görev oluşturulmadan sayım başlatılamaz",
  async () => {
    const context =
      createContext();

    const count =
      await createBasicCount(
        context,
      );

    await addBasicItem(
      context,
      count,
    );

    await context.service.release({
      tenantId: count.tenantId,
      cycleCountId: count.id,
      releasedBy: "supervisor-1",
    });

    await assert.rejects(
      () =>
        context.service.start({
          tenantId:
            count.tenantId,
          cycleCountId:
            count.id,
          startedBy:
            "counter-1",
        }),
      /Sayım görevi oluşturulmadan/,
    );
  },
);

test(
  "atanmış görevle sayım başlatılır",
  async () => {
    const context =
      createContext();

    const {
      count,
      item,
    } =
      await prepareStartedCount(
        context,
      );

    assert.equal(
      count.status,
      "in_progress",
    );

    assert.equal(
      item.status,
      "in_progress",
    );

    const tasks =
      await context.service
        .listTasks(
          count.tenantId,
          count.id,
        );

    assert.equal(
      tasks[0].status,
      "in_progress",
    );
  },
);

test(
  "eşleşen miktar fark oluşturmadan sayılır",
  async () => {
    const context =
      createContext();

    const {
      count,
      item,
    } =
      await prepareStartedCount(
        context,
      );

    const confirmed =
      await context.service
        .confirmItem({
          tenantId:
            count.tenantId,
          cycleCountId:
            count.id,
          cycleCountItemId:
            item.id,
          countedQuantity: 10,
          countedBy:
            "counter-1",
        });

    assert.equal(
      confirmed.status,
      "counted",
    );

    assert.equal(
      confirmed.varianceQuantity,
      0,
    );

    assert.equal(
      confirmed.recountRequired,
      false,
    );

    const updatedCount =
      await context.service.get(
        count.tenantId,
        count.id,
      );

    assert.equal(
      updatedCount.status,
      "counted",
    );
  },
);

test(
  "tolerans dışı fark yeniden sayım gerektirir",
  async () => {
    const context =
      createContext();

    const {
      count,
      item,
    } =
      await prepareStartedCount(
        context,
        {
          toleranceQuantity: 1,
        },
      );

    const confirmed =
      await context.service
        .confirmItem({
          tenantId:
            count.tenantId,
          cycleCountId:
            count.id,
          cycleCountItemId:
            item.id,
          countedQuantity: 7,
          countedBy:
            "counter-1",
        });

    assert.equal(
      confirmed.status,
      "recount_required",
    );

    assert.equal(
      confirmed.varianceQuantity,
      -3,
    );

    assert.equal(
      confirmed.recountRequired,
      true,
    );

    const exceptions =
      await context.service
        .listExceptions(
          count.tenantId,
          count.id,
        );

    assert.equal(
      exceptions.length,
      1,
    );

    assert.equal(
      exceptions[0].type,
      "recount_required",
    );
  },
);

test(
  "yeniden sayım farkı giderirse satır sonuçlanır",
  async () => {
    const context =
      createContext();

    const {
      count,
      item,
    } =
      await prepareStartedCount(
        context,
        {
          toleranceQuantity: 0,
        },
      );

    await context.service
      .confirmItem({
        tenantId:
          count.tenantId,
        cycleCountId:
          count.id,
        cycleCountItemId:
          item.id,
        countedQuantity: 8,
        countedBy:
          "counter-1",
      });

    const recounted =
      await context.service
        .recountItem({
          tenantId:
            count.tenantId,
          cycleCountId:
            count.id,
          cycleCountItemId:
            item.id,
          countedQuantity: 10,
          recountedBy:
            "counter-2",
        });

    assert.equal(
      recounted.status,
      "counted",
    );

    assert.equal(
      recounted.secondCountQuantity,
      10,
    );

    assert.equal(
      recounted.recountRequired,
      false,
    );
  },
);

test(
  "lot takipli ürün yanlış lotla sayılamaz",
  async () => {
    const context =
      createContext();

    const {
      count,
      item,
    } =
      await prepareStartedCount(
        context,
        {
          tracking: {
            lotNumber:
              "LOT-001",
          },
        },
      );

    await assert.rejects(
      () =>
        context.service
          .confirmItem({
            tenantId:
              count.tenantId,
            cycleCountId:
              count.id,
            cycleCountItemId:
              item.id,
            countedQuantity: 10,
            lotNumber:
              "LOT-999",
            countedBy:
              "counter-1",
          }),
      /lot numarası beklenen lotla uyuşmuyor/,
    );
  },
);

test(
  "variance servisi eksik stok sonucunu hesaplar",
  () => {
    const context =
      createContext();

    const result =
      context.varianceService
        .calculate({
          tenantId:
            "tenant-1",
          cycleCountId:
            "count-1",
          cycleCountItemId:
            "item-1",
          expectedQuantity: 10,
          countedQuantity: 8,
          toleranceQuantity: 3,
        });

    assert.equal(
      result.type,
      "shortage",
    );

    assert.equal(
      result.varianceQuantity,
      -2,
    );

    assert.equal(
      result.withinTolerance,
      true,
    );

    assert.equal(
      result.adjustmentRequired,
      true,
    );
  },
);

test(
  "variance servisi sıfır beklenen stokta beklenmeyen stok tespit eder",
  () => {
    const context =
      createContext();

    const result =
      context.varianceService
        .calculate({
          tenantId:
            "tenant-1",
          cycleCountId:
            "count-1",
          cycleCountItemId:
            "item-1",
          expectedQuantity: 0,
          countedQuantity: 5,
        });

    assert.equal(
      result.type,
      "unexpected_stock",
    );

    assert.equal(
      result.variancePercentage,
      100,
    );
  },
);

test(
  "hasarlı miktar hasarlı stok sonucu üretir",
  () => {
    const context =
      createContext();

    const result =
      context.varianceService
        .calculate({
          tenantId:
            "tenant-1",
          cycleCountId:
            "count-1",
          cycleCountItemId:
            "item-1",
          expectedQuantity: 10,
          countedQuantity: 10,
          damagedQuantity: 2,
        });

    assert.equal(
      result.type,
      "damaged",
    );

    assert.equal(
      result.adjustmentRequired,
      true,
    );
  },
);

test(
  "variance özeti satır doğruluk oranını hesaplar",
  () => {
    const context =
      createContext();

    const match =
      context.varianceService
        .calculate({
          tenantId:
            "tenant-1",
          cycleCountId:
            "count-1",
          cycleCountItemId:
            "item-1",
          expectedQuantity: 10,
          countedQuantity: 10,
        });

    const shortage =
      context.varianceService
        .calculate({
          tenantId:
            "tenant-1",
          cycleCountId:
            "count-1",
          cycleCountItemId:
            "item-2",
          expectedQuantity: 10,
          countedQuantity: 8,
          toleranceQuantity: 3,
        });

    const summary =
      context.varianceService
        .summarize([
          match,
          shortage,
        ]);

    assert.equal(
      summary.totalItems,
      2,
    );

    assert.equal(
      summary.matchedItems,
      1,
    );

    assert.equal(
      summary.lineAccuracyRate,
      50,
    );
  },
);

test(
  "manuel istisna oluşturulur ve çözülür",
  async () => {
    const context =
      createContext();

    const count =
      await createBasicCount(
        context,
      );

    const exception =
      await context.service
        .createException({
          tenantId:
            count.tenantId,
          cycleCountId:
            count.id,
          type:
            "location_blocked",
          message:
            "Lokasyona erişilemiyor.",
        });

    assert.equal(
      exception.resolved,
      false,
    );

    const resolved =
      await context.service
        .resolveException({
          tenantId:
            count.tenantId,
          cycleCountId:
            count.id,
          exceptionId:
            exception.id,
          resolvedBy:
            "supervisor-1",
          resolutionNotes:
            "Lokasyon erişime açıldı.",
        });

    assert.equal(
      resolved.resolved,
      true,
    );

    assert.equal(
      resolved.resolvedBy,
      "supervisor-1",
    );
  },
);

test(
  "başlamamış sayım iptal edilebilir",
  async () => {
    const context =
      createContext();

    const count =
      await createBasicCount(
        context,
      );

    const cancelled =
      await context.service.cancel({
        tenantId:
          count.tenantId,
        cycleCountId:
          count.id,
        cancelledBy:
          "supervisor-1",
        reason:
          "Sayım planı değiştirildi.",
      });

    assert.equal(
      cancelled.status,
      "cancelled",
    );

    assert.equal(
      cancelled.cancellationReason,
      "Sayım planı değiştirildi.",
    );
  },
);

test(
  "geçersiz planlama tarihi Türkçe doğrulama hatası üretir",
  async () => {
    const context =
      createContext();

    await assert.rejects(
      () =>
        createBasicCount(
          context,
          {
            plannedAt:
              "geçersiz-tarih",
          },
        ),
      /Planlanan sayım tarihi geçerli bir tarih olmalıdır/,
    );
  },
);
