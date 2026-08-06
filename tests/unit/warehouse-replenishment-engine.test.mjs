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
  "/tmp/warehouse-replenishment-test.mjs";

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
  await unlink(bundlePath).catch(
    () => undefined,
  );
});

function createContext(options = {}) {
  const now =
    options.now ??
    (() =>
      "2026-08-06T12:00:00.000Z");

  const repository =
    new warehouse
      .InMemoryReplenishmentRepository();

  const optimizer =
    new warehouse
      .ReplenishmentOptimizer();

  const demandService =
    new warehouse
      .ReplenishmentDemandService({
        repository,
        now,
      });

  const suggestionService =
    new warehouse
      .ReplenishmentSuggestionService({
        repository,
        now,
      });

  const reservationGateway =
    options.reservationGateway ?? {
      async reserve() {
        return {
          inventoryReservationId:
            "reservation-1",
        };
      },

      async release() {
        return undefined;
      },
    };

  const transferGateway =
    options.transferGateway ?? {
      async transfer() {
        return {
          inventoryMovementId:
            "movement-1",
        };
      },
    };

  const allocationService =
    new warehouse
      .ReplenishmentAllocationService({
        repository,
        optimizer,
        reservationGateway,
        transferGateway,
        now,
      });

  const performanceService =
    new warehouse
      .ReplenishmentPerformanceService({
        now,
      });

  const service =
    new warehouse
      .ReplenishmentService({
        repository,
        demandService,
        suggestionService,
        optimizer,
        allocationService,
        performanceService,
        now,
        sequence:
          options.sequence ??
          (() => 1),
      });

  return {
    repository,
    optimizer,
    demandService,
    suggestionService,
    allocationService,
    performanceService,
    service,
    now,
  };
}

async function createBasicReplenishment(
  context,
  overrides = {},
) {
  return context.service.create({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    strategy: "minimum_maximum",
    source: {
      type: "minimum_stock",
      referenceId:
        "minimum-stock-1",
    },
    createdBy: "user-1",
    ...overrides,
  });
}

async function addBasicItem(
  context,
  replenishment,
  overrides = {},
) {
  return context.service.addItem({
    tenantId:
      replenishment.tenantId,
    replenishmentId:
      replenishment.id,
    warehouseId:
      replenishment.warehouseId,
    destinationLocationId:
      "pick-location-1",
    productId: "product-1",
    stockStatus: "available",
    unit: "adet",
    requestedQuantity: 30,
    currentDestinationQuantity: 10,
    minimumQuantity: 20,
    maximumQuantity: 50,
    createdBy: "user-1",
    ...overrides,
  });
}

async function generateBasicSuggestion(
  context,
  replenishment,
  item,
  overrides = {},
) {
  return context.service
    .generateSuggestions({
      tenantId:
        replenishment.tenantId,
      replenishmentId:
        replenishment.id,
      replenishmentItemId:
        item.id,
      destination: {
        locationId:
          item.destinationLocationId,
        currentQuantity:
          item.currentDestinationQuantity,
        maximumQuantity:
          item.maximumQuantity,
        availableCapacity: 40,
      },
      candidates: [
        {
          tenantId:
            replenishment.tenantId,
          warehouseId:
            replenishment.warehouseId,
          locationId:
            "reserve-location-1",
          productId:
            item.productId,
          skuId:
            item.skuId,
          stockStatus:
            item.stockStatus,
          unit:
            item.unit,
          availableQuantity: 100,
          distance: 5,
          stockAgeDays: 20,
          active: true,
          replenishmentEnabled: true,
          ...overrides,
        },
      ],
    });
}

async function prepareAllocatedReplenishment(
  context,
) {
  const replenishment =
    await createBasicReplenishment(
      context,
    );

  const item =
    await addBasicItem(
      context,
      replenishment,
    );

  await generateBasicSuggestion(
    context,
    replenishment,
    item,
  );

  const result =
    await context.service
      .optimizeAndAllocate({
        tenantId:
          replenishment.tenantId,
        replenishmentId:
          replenishment.id,
      });

  return {
    replenishment:
      await context.service.get(
        replenishment.tenantId,
        replenishment.id,
      ),
    item,
    optimization:
      result.optimization,
    allocations:
      result.allocations,
  };
}

test(
  "ikmal oluşturulur ve numara üretilir",
  async () => {
    const context =
      createContext();

    const replenishment =
      await createBasicReplenishment(
        context,
      );

    assert.equal(
      replenishment
        .replenishmentNumber,
      "IKM-20260806-000001",
    );

    assert.equal(
      replenishment.status,
      "draft",
    );
  },
);

test(
  "planlanan tarih varsa ikmal planlandı durumunda açılır",
  async () => {
    const context =
      createContext();

    const replenishment =
      await createBasicReplenishment(
        context,
        {
          plannedAt:
            "2026-08-07T09:00:00Z",
        },
      );

    assert.equal(
      replenishment.status,
      "planned",
    );

    assert.equal(
      replenishment.plannedAt,
      "2026-08-07T09:00:00.000Z",
    );
  },
);

test(
  "aynı kaynak referansı için ikinci ikmal oluşturulamaz",
  async () => {
    const context =
      createContext();

    await createBasicReplenishment(
      context,
    );

    await assert.rejects(
      () =>
        createBasicReplenishment(
          context,
        ),
      /daha önce ikmal kaydı/,
    );
  },
);

test(
  "aynı hedef lokasyon ve ürün ikinci kez eklenemez",
  async () => {
    const context =
      createContext();

    const replenishment =
      await createBasicReplenishment(
        context,
      );

    await addBasicItem(
      context,
      replenishment,
    );

    await assert.rejects(
      () =>
        addBasicItem(
          context,
          replenishment,
        ),
      /ikmal satırı zaten bulunmaktadır/,
    );
  },
);

test(
  "minimum ve maksimum stok sınırı doğrulanır",
  async () => {
    const context =
      createContext();

    const replenishment =
      await createBasicReplenishment(
        context,
      );

    await assert.rejects(
      () =>
        addBasicItem(
          context,
          replenishment,
          {
            requestedQuantity: 50,
            currentDestinationQuantity:
              10,
            maximumQuantity: 40,
          },
        ),
      /maksimum stok sınırını aşmaktadır/,
    );
  },
);

test(
  "ikmal talebi gerekli miktarı hesaplar",
  async () => {
    const context =
      createContext();

    const replenishment =
      await createBasicReplenishment(
        context,
      );

    const demand =
      await context.service
        .createDemand({
          tenantId:
            replenishment.tenantId,
          replenishmentId:
            replenishment.id,
          warehouseId:
            replenishment.warehouseId,
          destinationLocationId:
            "pick-location-1",
          productId:
            "product-1",
          stockStatus: "available",
          unit: "adet",
          currentQuantity: 10,
          minimumQuantity: 20,
          maximumQuantity: 50,
          orderDemandQuantity: 30,
          safetyStockQuantity: 10,
          source: {
            type: "minimum_stock",
          },
        });

    assert.equal(
      demand.requiredQuantity,
      30,
    );

    assert.ok(
      demand.urgencyScore > 0,
    );
  },
);

test(
  "talep özeti toplam miktarları hesaplar",
  () => {
    const context =
      createContext();

    const summary =
      context.demandService.summarize([
        {
          id: "demand-1",
          tenantId: "tenant-1",
          replenishmentId:
            "replenishment-1",
          warehouseId:
            "warehouse-1",
          destinationLocationId:
            "pick-1",
          productId: "product-1",
          stockStatus: "available",
          unit: "adet",
          currentQuantity: 10,
          orderDemandQuantity: 20,
          forecastDemandQuantity: 5,
          safetyStockQuantity: 5,
          requiredQuantity: 20,
          urgencyScore: 80,
          priority: 50,
          source: {
            type: "minimum_stock",
          },
          createdAt:
            "2026-08-06T12:00:00.000Z",
        },
      ]);

    assert.equal(
      summary.totalDemands,
      1,
    );

    assert.equal(
      summary.totalRequiredQuantity,
      20,
    );

    assert.equal(
      summary.urgentDemandCount,
      1,
    );
  },
);

test(
  "uygun kaynak lokasyon için öneri oluşturulur",
  async () => {
    const context =
      createContext();

    const replenishment =
      await createBasicReplenishment(
        context,
      );

    const item =
      await addBasicItem(
        context,
        replenishment,
      );

    const suggestions =
      await generateBasicSuggestion(
        context,
        replenishment,
        item,
      );

    assert.equal(
      suggestions.length,
      1,
    );

    assert.equal(
      suggestions[0]
        .suggestedQuantity,
      30,
    );

    assert.ok(
      suggestions[0].totalScore > 0,
    );
  },
);

test(
  "bloke kaynak lokasyon önerilemez",
  async () => {
    const context =
      createContext();

    const replenishment =
      await createBasicReplenishment(
        context,
      );

    const item =
      await addBasicItem(
        context,
        replenishment,
      );

    await assert.rejects(
      () =>
        generateBasicSuggestion(
          context,
          replenishment,
          item,
          {
            blocked: true,
          },
        ),
      /uygun kaynak lokasyon bulunamadı/,
    );
  },
);

test(
  "ürün uyuşmazlığı olan kaynak önerilemez",
  async () => {
    const context =
      createContext();

    const replenishment =
      await createBasicReplenishment(
        context,
      );

    const item =
      await addBasicItem(
        context,
        replenishment,
      );

    await assert.rejects(
      () =>
        generateBasicSuggestion(
          context,
          replenishment,
          item,
          {
            productId:
              "wrong-product",
          },
        ),
      /uygun kaynak lokasyon bulunamadı/,
    );
  },
);

test(
  "optimizer en uygun kaynağı seçer",
  async () => {
    const context =
      createContext();

    const {
      optimization,
    } =
      await prepareAllocatedReplenishment(
        context,
      );

    assert.equal(
      optimization
        .totalAllocatedQuantity,
      30,
    );

    assert.equal(
      optimization
        .totalRemainingQuantity,
      0,
    );

    assert.equal(
      optimization.fulfillmentRate,
      100,
    );
  },
);

test(
  "optimizer kaynak stok miktarını mükerrer kullanmaz",
  () => {
    const context =
      createContext();

    const itemOne = {
      id: "item-1",
      tenantId: "tenant-1",
      replenishmentId:
        "replenishment-1",
      lineNumber: 1,
      warehouseId:
        "warehouse-1",
      destinationLocationId:
        "pick-1",
      productId: "product-1",
      stockStatus: "available",
      unit: "adet",
      requestedQuantity: 30,
      allocatedQuantity: 0,
      transferredQuantity: 0,
      remainingQuantity: 30,
      currentDestinationQuantity:
        0,
      priority: 80,
      status: "pending",
      createdBy: "user-1",
      createdAt:
        "2026-08-06T12:00:00.000Z",
      updatedAt:
        "2026-08-06T12:00:00.000Z",
    };

    const itemTwo = {
      ...itemOne,
      id: "item-2",
      lineNumber: 2,
      destinationLocationId:
        "pick-2",
    };

    const suggestionBase = {
      tenantId: "tenant-1",
      replenishmentId:
        "replenishment-1",
      sourceLocationId:
        "reserve-1",
      productId: "product-1",
      stockStatus: "available",
      unit: "adet",
      suggestedQuantity: 30,
      availableQuantity: 40,
      sourceRemainingQuantity: 10,
      sourceDistance: 5,
      capacityScore: 100,
      distanceScore: 95,
      stockAgeScore: 50,
      compatibilityScore: 100,
      totalScore: 90,
      reasons: [],
      warnings: [],
      createdAt:
        "2026-08-06T12:00:00.000Z",
    };

    const result =
      context.optimizer.optimize({
        items: [
          itemOne,
          itemTwo,
        ],
        suggestions: [
          {
            ...suggestionBase,
            id: "suggestion-1",
            replenishmentItemId:
              "item-1",
            destinationLocationId:
              "pick-1",
          },
          {
            ...suggestionBase,
            id: "suggestion-2",
            replenishmentItemId:
              "item-2",
            destinationLocationId:
              "pick-2",
          },
        ],
      });

    assert.equal(
      result.totalAllocatedQuantity,
      40,
    );

    assert.equal(
      result.totalRemainingQuantity,
      20,
    );
  },
);

test(
  "transfer katına göre miktar yuvarlanır",
  () => {
    const context =
      createContext();

    const quantity =
      context.optimizer
        .normalizeTransferQuantity({
          quantity: 27,
          remainingDemand: 30,
          transferMultiple: 5,
          allowPartialAllocation: true,
        });

    assert.equal(quantity, 25);
  },
);

test(
  "optimizasyon sonucu tahsis oluşturur",
  async () => {
    const context =
      createContext();

    const {
      allocations,
    } =
      await prepareAllocatedReplenishment(
        context,
      );

    assert.equal(
      allocations.length,
      1,
    );

    assert.equal(
      allocations[0]
        .allocatedQuantity,
      30,
    );

    assert.equal(
      allocations[0].status,
      "planned",
    );
  },
);

test(
  "tahsis olmadan ikmal işleme açılamaz",
  async () => {
    const context =
      createContext();

    const replenishment =
      await createBasicReplenishment(
        context,
      );

    await addBasicItem(
      context,
      replenishment,
    );

    await assert.rejects(
      () =>
        context.service.release({
          tenantId:
            replenishment.tenantId,
          replenishmentId:
            replenishment.id,
          releasedBy:
            "supervisor-1",
        }),
      /Tahsis oluşturulmadan/,
    );
  },
);

test(
  "ikmal işleme açılır ve görev oluşturulur",
  async () => {
    const context =
      createContext();

    const {
      replenishment,
      allocations,
    } =
      await prepareAllocatedReplenishment(
        context,
      );

    const released =
      await context.service.release({
        tenantId:
          replenishment.tenantId,
        replenishmentId:
          replenishment.id,
        releasedBy:
          "supervisor-1",
      });

    assert.equal(
      released.status,
      "released",
    );

    const item =
      (
        await context.service.listItems(
          replenishment.tenantId,
          replenishment.id,
        )
      )[0];

    const task =
      await context.service.createTask({
        tenantId:
          replenishment.tenantId,
        replenishmentId:
          replenishment.id,
        replenishmentItemId:
          item.id,
        allocationId:
          allocations[0].id,
        warehouseId:
          replenishment.warehouseId,
        sourceLocationId:
          allocations[0]
            .sourceLocationId,
        destinationLocationId:
          item.destinationLocationId,
        productId:
          item.productId,
        type: "move_stock",
        assignedUserId:
          "operator-1",
        createdBy:
          "supervisor-1",
      });

    assert.equal(
      task.status,
      "assigned",
    );
  },
);

test(
  "atanmış görevle ikmal başlatılır",
  async () => {
    const context =
      createContext();

    const {
      replenishment,
      allocations,
    } =
      await prepareAllocatedReplenishment(
        context,
      );

    await context.service.release({
      tenantId:
        replenishment.tenantId,
      replenishmentId:
        replenishment.id,
      releasedBy:
        "supervisor-1",
    });

    const item =
      (
        await context.service.listItems(
          replenishment.tenantId,
          replenishment.id,
        )
      )[0];

    await context.service.createTask({
      tenantId:
        replenishment.tenantId,
      replenishmentId:
        replenishment.id,
      replenishmentItemId:
        item.id,
      allocationId:
        allocations[0].id,
      warehouseId:
        replenishment.warehouseId,
      type: "move_stock",
      assignedUserId:
        "operator-1",
      createdBy:
        "supervisor-1",
    });

    const started =
      await context.service.start({
        tenantId:
          replenishment.tenantId,
        replenishmentId:
          replenishment.id,
        startedBy:
          "operator-1",
      });

    assert.equal(
      started.status,
      "in_progress",
    );
  },
);

test(
  "tahsis rezerve edilir",
  async () => {
    const context =
      createContext();

    const {
      replenishment,
      allocations,
    } =
      await prepareAllocatedReplenishment(
        context,
      );

    const reserved =
      await context.allocationService
        .reserve({
          tenantId:
            replenishment.tenantId,
          replenishmentId:
            replenishment.id,
          allocationId:
            allocations[0].id,
          requestedBy:
            "operator-1",
        });

    assert.equal(
      reserved.status,
      "reserved",
    );

    assert.equal(
      reserved.inventoryReservationId,
      "reservation-1",
    );
  },
);

test(
  "kısmi stok transferi işlenir",
  async () => {
    const context =
      createContext();

    const {
      replenishment,
      allocations,
    } =
      await prepareAllocatedReplenishment(
        context,
      );

    const started =
      await context.allocationService
        .start({
          tenantId:
            replenishment.tenantId,
          replenishmentId:
            replenishment.id,
          allocationId:
            allocations[0].id,
          startedBy:
            "operator-1",
        });

    const transferred =
      await context.allocationService
        .transfer({
          tenantId:
            replenishment.tenantId,
          replenishmentId:
            replenishment.id,
          allocationId:
            started.id,
          quantity: 10,
          transferredBy:
            "operator-1",
        });

    assert.equal(
      transferred.status,
      "in_progress",
    );

    assert.equal(
      transferred.transferredQuantity,
      10,
    );

    assert.equal(
      transferred.remainingQuantity,
      20,
    );
  },
);

test(
  "kalan miktarı aşan transfer engellenir",
  async () => {
    const context =
      createContext();

    const {
      replenishment,
      allocations,
    } =
      await prepareAllocatedReplenishment(
        context,
      );

    await context.allocationService
      .start({
        tenantId:
          replenishment.tenantId,
        replenishmentId:
          replenishment.id,
        allocationId:
          allocations[0].id,
        startedBy:
          "operator-1",
      });

    await assert.rejects(
      () =>
        context.allocationService
          .transfer({
            tenantId:
              replenishment.tenantId,
            replenishmentId:
              replenishment.id,
            allocationId:
              allocations[0].id,
            quantity: 31,
            transferredBy:
              "operator-1",
          }),
      /kalan miktarını aşamaz/,
    );
  },
);

test(
  "manuel istisna oluşturulur ve çözülür",
  async () => {
    const context =
      createContext();

    const replenishment =
      await createBasicReplenishment(
        context,
      );

    const exception =
      await context.service
        .createException({
          tenantId:
            replenishment.tenantId,
          replenishmentId:
            replenishment.id,
          type:
            "source_location_blocked",
          message:
            "Kaynak lokasyon bloke.",
        });

    assert.equal(
      exception.resolved,
      false,
    );

    const resolved =
      await context.service
        .resolveException({
          tenantId:
            replenishment.tenantId,
          replenishmentId:
            replenishment.id,
          exceptionId:
            exception.id,
          resolvedBy:
            "supervisor-1",
          resolutionNotes:
            "Lokasyon açıldı.",
        });

    assert.equal(
      resolved.resolved,
      true,
    );
  },
);

test(
  "performans servisi KPI hesaplar",
  () => {
    const context =
      createContext();

    const performance =
      context.performanceService
        .calculate({
          filter: {
            tenantId: "tenant-1",
            periodStart:
              "2026-08-01T00:00:00Z",
            periodEnd:
              "2026-08-31T23:59:59Z",
          },
          replenishments: [
            {
              id: "replenishment-1",
              tenantId: "tenant-1",
              replenishmentNumber:
                "IKM-1",
              warehouseId:
                "warehouse-1",
              strategy:
                "minimum_maximum",
              source: {
                type:
                  "minimum_stock",
              },
              status: "completed",
              priority: 50,
              startedAt:
                "2026-08-06T10:00:00Z",
              completedAt:
                "2026-08-06T11:00:00Z",
              items: [
                {
                  id: "item-1",
                  tenantId:
                    "tenant-1",
                  replenishmentId:
                    "replenishment-1",
                  lineNumber: 1,
                  warehouseId:
                    "warehouse-1",
                  destinationLocationId:
                    "pick-1",
                  productId:
                    "product-1",
                  stockStatus:
                    "available",
                  unit: "adet",
                  requestedQuantity: 20,
                  allocatedQuantity: 20,
                  transferredQuantity: 20,
                  remainingQuantity: 0,
                  maximumQuantity: 40,
                  currentDestinationQuantity:
                    20,
                  priority: 50,
                  status: "completed",
                  createdBy: "user-1",
                  createdAt:
                    "2026-08-06T09:00:00Z",
                  updatedAt:
                    "2026-08-06T11:00:00Z",
                },
              ],
              allocations: [],
              suggestions: [],
              exceptions: [],
              createdBy: "user-1",
              createdAt:
                "2026-08-06T09:00:00Z",
              updatedAt:
                "2026-08-06T11:00:00Z",
            },
          ],
          tasks: [],
          allocations: [
            {
              id: "allocation-1",
              tenantId: "tenant-1",
              replenishmentId:
                "replenishment-1",
              replenishmentItemId:
                "item-1",
              sourceLocationId:
                "reserve-1",
              destinationLocationId:
                "pick-1",
              productId: "product-1",
              stockStatus: "available",
              unit: "adet",
              allocatedQuantity: 20,
              transferredQuantity: 20,
              remainingQuantity: 0,
              sequence: 1,
              score: 90,
              status: "completed",
              createdAt:
                "2026-08-06T09:00:00Z",
              updatedAt:
                "2026-08-06T11:00:00Z",
            },
          ],
        });

    assert.equal(
      performance
        .totalReplenishments,
      1,
    );

    assert.equal(
      performance.completionRate,
      100,
    );

    assert.equal(
      performance.fulfillmentRate,
      100,
    );

    assert.equal(
      performance
        .averageCompletionMinutes,
      60,
    );
  },
);

test(
  "başlamamış ikmal iptal edilebilir",
  async () => {
    const context =
      createContext();

    const replenishment =
      await createBasicReplenishment(
        context,
      );

    const cancelled =
      await context.service.cancel({
        tenantId:
          replenishment.tenantId,
        replenishmentId:
          replenishment.id,
        cancelledBy:
          "supervisor-1",
        reason:
          "Operasyon planı değişti.",
      });

    assert.equal(
      cancelled.status,
      "cancelled",
    );

    assert.equal(
      cancelled.cancellationReason,
      "Operasyon planı değişti.",
    );
  },
);

test(
  "geçersiz planlama tarihi Türkçe hata üretir",
  async () => {
    const context =
      createContext();

    await assert.rejects(
      () =>
        createBasicReplenishment(
          context,
          {
            plannedAt:
              "geçersiz-tarih",
          },
        ),
      /Planlanan ikmal tarihi geçerli bir tarih olmalıdır/,
    );
  },
);
