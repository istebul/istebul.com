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
  "/tmp/warehouse-wave-planning-test.mjs";

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

function createContext(options = {}) {
  let currentNow =
    options.initialNow ??
    "2026-08-06T08:00:00.000Z";

  const now = () => currentNow;

  const setNow = (value) => {
    currentNow = value;
  };

  const repository =
    new warehouse
      .InMemoryWaveRepository();

  const optimizer =
    new warehouse.WaveOptimizer({
      now,
    });

  const capacityService =
    new warehouse
      .WaveCapacityService({
        repository,
        now,
      });

  let allocationSequence = 0;

  const allocationService =
    new warehouse
      .WaveAllocationService({
        repository,
        now,
        idFactory: () =>
          `allocation-${++allocationSequence}`,
      });

  let taskSequence = 0;

  const planningService =
    new warehouse
      .WavePlanningService({
        repository,
        optimizer,
        now,
        idFactory: () =>
          `task-${++taskSequence}`,
      });

  let releaseSequence = 0;

  const releaseService =
    new warehouse
      .WaveReleaseService({
        repository,
        now,
        idFactory: () =>
          `release-${++releaseSequence}`,
      });

  const performanceService =
    new warehouse
      .WavePerformanceService({
        repository,
        now,
      });

  const entitySequences =
    new Map();

  const nextEntityId =
    (entity) => {
      const current =
        entitySequences.get(entity) ??
        0;

      const next = current + 1;

      entitySequences.set(
        entity,
        next,
      );

      return `${entity}-${next}`;
    };

  let waveNumberSequence = 0;

  const service =
    new warehouse.WaveService({
      repository,
      optimizer,
      capacityService,
      allocationService,
      planningService,
      releaseService,
      performanceService,
      now,
      idFactory:
        options.idFactory ??
        nextEntityId,
      waveNumberFactory:
        options.waveNumberFactory ??
        (() =>
          `WAVE-TEST-${String(
            ++waveNumberSequence,
          ).padStart(4, "0")}`),
    });

  return {
    repository,
    optimizer,
    capacityService,
    allocationService,
    planningService,
    releaseService,
    performanceService,
    service,
    now,
    setNow,
  };
}

async function createBasicWave(
  context,
  overrides = {},
) {
  return context.service.createWave({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    name: "Sabah Sevkiyat Dalgası",
    strategy: "priority_based",
    createdBy: "planner-1",
    ...overrides,
  });
}

async function addBasicOrder(
  context,
  wave,
  overrides = {},
) {
  return context.service.addOrder({
    tenantId: wave.tenantId,
    waveId: wave.id,
    orderId: "order-source-1",
    orderNumber: "ORD-0001",
    warehouseId:
      wave.warehouseId,
    priority: 80,
    lineCount: 1,
    itemQuantity: 10,
    ...overrides,
  });
}

async function addBasicItem(
  context,
  wave,
  order,
  overrides = {},
) {
  return context.service.addItem({
    tenantId: wave.tenantId,
    waveId: wave.id,
    waveOrderId: order.id,
    orderId: order.orderId,
    orderLineId:
      "order-line-1",
    warehouseId:
      wave.warehouseId,
    productId: "product-1",
    skuId: "sku-1",
    stockStatus: "available",
    unit: "adet",
    requestedQuantity: 10,
    zoneId: "zone-a",
    priority: 80,
    sequence: 1,
    ...overrides,
  });
}

function createCandidate(
  overrides = {},
) {
  return {
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    locationId: "location-a",
    productId: "product-1",
    skuId: "sku-1",
    stockStatus: "available",
    unit: "adet",
    availableQuantity: 20,
    locationPriority: 10,
    distanceScore: 90,
    receivedAt:
      "2026-08-01T08:00:00.000Z",
    expiresAt:
      "2026-09-01T08:00:00.000Z",
    equipmentCompatible: true,
    blocked: false,
    ...overrides,
  };
}

function createCapacityInput(
  wave,
  overrides = {},
) {
  return {
    tenantId: wave.tenantId,
    warehouseId:
      wave.warehouseId,
    waveId: wave.id,
    availableLaborMinutes: 120,
    requiredLaborMinutes: 30,
    availableEquipmentMinutes: 120,
    requiredEquipmentMinutes: 20,
    availableOrderCapacity: 10,
    requiredOrderCapacity: 1,
    availableLineCapacity: 20,
    requiredLineCapacity: 1,
    availableItemCapacity: 100,
    requiredItemCapacity: 10,
    availableWeightCapacity: 1000,
    requiredWeightCapacity: 100,
    availableVolumeCapacity: 100,
    requiredVolumeCapacity: 10,
    ...overrides,
  };
}

async function createReadyWave(
  context,
  overrides = {},
) {
  const wave =
    await createBasicWave(
      context,
      overrides.wave ?? {},
    );

  const order =
    await addBasicOrder(
      context,
      wave,
      overrides.order ?? {},
    );

  const item =
    await addBasicItem(
      context,
      wave,
      order,
      overrides.item ?? {},
    );

  const capacity =
    await context.service
      .calculateAndSaveCapacity(
        createCapacityInput(
          wave,
          overrides.capacity ?? {},
        ),
      );

  const planning =
    await context.service.plan({
      tenantId: wave.tenantId,
      waveId: wave.id,
    });

  const allocation =
    await context.service.allocateItem({
      tenantId: wave.tenantId,
      waveId: wave.id,
      waveItemId: item.id,
      strategy:
        overrides.strategy ??
        "balanced",
      allowPartial: false,
      candidates: [
        createCandidate(
          overrides.candidate ?? {},
        ),
      ],
    });

  const tasks =
    await context.service.generateTasks({
      tenantId: wave.tenantId,
      waveId: wave.id,
      createdBy: "planner-1",
    });

  return {
    wave,
    order,
    item,
    capacity,
    planning,
    allocation,
    tasks,
  };
}

async function releaseReadyWave(
  context,
  ready,
) {
  const requested =
    await context.service
      .requestRelease({
        tenantId:
          ready.wave.tenantId,
        waveId:
          ready.wave.id,
        requestedBy:
          "planner-1",
      });

  const approved =
    await context.service
      .approveRelease({
        tenantId:
          ready.wave.tenantId,
        waveId:
          ready.wave.id,
        releaseId:
          requested.release.id,
        approvedBy:
          "supervisor-1",
      });

  const released =
    await context.service.release({
      tenantId:
        ready.wave.tenantId,
      waveId:
        ready.wave.id,
      releaseId:
        approved.release.id,
      releasedBy:
        "supervisor-1",
    });

  return {
    requested,
    approved,
    released,
  };
}

test(
  "Wave Planning dışa aktarımları kullanılabilir",
  () => {
    assert.equal(
      typeof warehouse.WaveService,
      "function",
    );

    assert.equal(
      typeof warehouse
        .InMemoryWaveRepository,
      "function",
    );

    assert.equal(
      typeof warehouse.WaveOptimizer,
      "function",
    );

    assert.equal(
      typeof warehouse
        .WaveReleaseService,
      "function",
    );

    assert.ok(
      warehouse.WAVE_STATUSES
        .includes("ready"),
    );

    assert.ok(
      warehouse.WAVE_STRATEGIES
        .includes("predictive"),
    );

    assert.ok(
      warehouse.WAVE_TASK_TYPES
        .includes("zone_pick"),
    );

    assert.equal(
      warehouse
        .WAVE_STATUS_LABELS.ready,
      "Serbest Bırakmaya Hazır",
    );
  },
);

test(
  "taslak dalga oluşturulur",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(
        context,
        {
          name:
            "  Öncelikli Siparişler  ",
        },
      );

    assert.equal(
      wave.status,
      "draft",
    );

    assert.equal(
      wave.name,
      "Öncelikli Siparişler",
    );

    assert.equal(
      wave.waveNumber,
      "WAVE-TEST-0001",
    );

    assert.equal(
      wave.orders.length,
      0,
    );

    assert.equal(
      wave.items.length,
      0,
    );

    assert.equal(
      wave.createdAt,
      "2026-08-06T08:00:00.000Z",
    );
  },
);

test(
  "kesim tarihi planlama tarihinden sonra olamaz",
  async () => {
    const context =
      createContext();

    await assert.rejects(
      () =>
        createBasicWave(
          context,
          {
            plannedAt:
              "2026-08-06T10:00:00Z",
            cutoffAt:
              "2026-08-06T11:00:00Z",
          },
        ),
      /Dalga kesim tarihi planlanan dalga tarihinden sonra olamaz/,
    );
  },
);

test(
  "dalga kuralı varsayılan değerlerle oluşturulur",
  async () => {
    const context =
      createContext();

    const rule =
      await context.service.createRule({
        tenantId: "tenant-1",
        code: " rota-01 ",
        name: "Rota Bazlı Kural",
        strategy: "route_based",
        warehouseId:
          "warehouse-1",
        routeId: "route-1",
        maximumOrders: 20,
        createdBy: "planner-1",
      });

    assert.equal(
      rule.code,
      "ROTA-01",
    );

    assert.equal(
      rule.active,
      true,
    );

    assert.equal(
      rule.automaticPlanning,
      false,
    );

    assert.equal(
      rule.allowPartialRelease,
      true,
    );
  },
);

test(
  "aynı dalga kuralı kodu tekrar kullanılamaz",
  async () => {
    const context =
      createContext();

    await context.service.createRule({
      tenantId: "tenant-1",
      code: "RULE-01",
      name: "Birinci Kural",
      strategy: "batch_order",
      createdBy: "planner-1",
    });

    await assert.rejects(
      () =>
        context.service.createRule({
          tenantId: "tenant-1",
          code: " rule-01 ",
          name: "İkinci Kural",
          strategy: "dynamic",
          createdBy: "planner-1",
        }),
      /Dalga kuralı kodu zaten kullanılıyor/,
    );
  },
);

test(
  "aktif dalga kuralı için takvim oluşturulur",
  async () => {
    const context =
      createContext();

    const rule =
      await context.service.createRule({
        tenantId: "tenant-1",
        code: "SCHEDULE-01",
        name: "Takvim Kuralı",
        strategy: "cutoff_based",
        warehouseId:
          "warehouse-1",
        createdBy: "planner-1",
      });

    const schedule =
      await context.service
        .createSchedule({
          tenantId: "tenant-1",
          ruleId: rule.id,
          warehouseId:
            "warehouse-1",
          name: "Saatlik Dalga",
          startDate:
            "2026-08-07T08:00:00Z",
          frequencyMinutes: 60,
          releaseOffsetMinutes: 15,
          createdBy: "planner-1",
        });

    assert.equal(
      schedule.active,
      true,
    );

    assert.equal(
      schedule.startDate,
      "2026-08-07T08:00:00.000Z",
    );

    assert.equal(
      schedule.nextRunAt,
      schedule.startDate,
    );

    assert.equal(
      schedule.releaseOffsetMinutes,
      15,
    );
  },
);

test(
  "sipariş dalgaya eklenir ve tekrar eklenemez",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(context);

    const order =
      await addBasicOrder(
        context,
        wave,
      );

    assert.equal(
      order.status,
      "pending",
    );

    assert.equal(
      order.priority,
      80,
    );

    await assert.rejects(
      () =>
        addBasicOrder(
          context,
          wave,
        ),
      /Sipariş zaten dalgaya eklenmiş/,
    );
  },
);

test(
  "sipariş satırı dalgaya eklenir ve tekrar eklenemez",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(context);

    const order =
      await addBasicOrder(
        context,
        wave,
      );

    const item =
      await addBasicItem(
        context,
        wave,
        order,
      );

    assert.equal(
      item.status,
      "pending",
    );

    assert.equal(
      item.remainingQuantity,
      10,
    );

    await assert.rejects(
      () =>
        addBasicItem(
          context,
          wave,
          order,
        ),
      /Sipariş satırı dalgada zaten mevcut/,
    );
  },
);

test(
  "optimizasyon öncelikli siparişi kapasiteye seçer",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(context);

    const highPriority =
      await addBasicOrder(
        context,
        wave,
        {
          orderId: "source-high",
          orderNumber: "ORD-HIGH",
          priority: 95,
        },
      );

    await addBasicOrder(
      context,
      wave,
      {
        orderId: "source-low",
        orderNumber: "ORD-LOW",
        priority: 20,
      },
    );

    const rule =
      await context.service.createRule({
        tenantId: "tenant-1",
        code: "MAX-ONE",
        name: "Tek Sipariş",
        strategy:
          "priority_based",
        warehouseId:
          "warehouse-1",
        maximumOrders: 1,
        createdBy: "planner-1",
      });

    const orders =
      await context.repository
        .listOrders(
          wave.tenantId,
          wave.id,
        );

    const result =
      context.optimizer.optimize({
        orders,
        rule,
      });

    assert.equal(
      result.selectedOrderCount,
      1,
    );

    assert.equal(
      result.rejectedOrderCount,
      1,
    );

    assert.equal(
      result.selectedOrders[0]
        .order.id,
      highPriority.id,
    );
  },
);

test(
  "optimizasyon kural rota uyuşmazlığını reddeder",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(context);

    const order =
      await addBasicOrder(
        context,
        wave,
        {
          routeId: "route-b",
        },
      );

    const rule =
      await context.service.createRule({
        tenantId: "tenant-1",
        code: "ROUTE-A",
        name: "A Rotası",
        strategy: "route_based",
        warehouseId:
          "warehouse-1",
        routeId: "route-a",
        createdBy: "planner-1",
      });

    const evaluation =
      context.optimizer
        .evaluateOrder({
          order,
          rule,
          evaluatedAt:
            "2026-08-06T08:00:00.000Z",
        });

    assert.equal(
      evaluation.eligible,
      false,
    );

    assert.ok(
      evaluation.rejectionReasons
        .some(
          (reason) =>
            reason.includes(
              "Sipariş rotası",
            ),
        ),
    );
  },
);

test(
  "kapasite servisi uygulanabilir kapasiteyi hesaplar",
  () => {
    const context =
      createContext();

    const capacity =
      context.service
        .calculateCapacity({
          tenantId: "tenant-1",
          warehouseId:
            "warehouse-1",
          availableLaborMinutes: 100,
          requiredLaborMinutes: 95,
          availableEquipmentMinutes: 100,
          requiredEquipmentMinutes: 50,
          availableOrderCapacity: 10,
          requiredOrderCapacity: 5,
          availableLineCapacity: 20,
          requiredLineCapacity: 10,
          availableItemCapacity: 100,
          requiredItemCapacity: 50,
        });

    assert.equal(
      capacity.feasible,
      true,
    );

    assert.equal(
      capacity.laborUtilizationRate,
      95,
    );

    assert.ok(
      capacity.warnings.some(
        (warning) =>
          warning.includes(
            "Personel kapasitesi kritik",
          ),
      ),
    );
  },
);

test(
  "yetersiz kapasite bloke nedeni üretir",
  () => {
    const context =
      createContext();

    const capacity =
      context.service
        .calculateCapacity({
          tenantId: "tenant-1",
          warehouseId:
            "warehouse-1",
          availableLaborMinutes: 100,
          requiredLaborMinutes: 120,
          availableEquipmentMinutes: 100,
          requiredEquipmentMinutes: 20,
          availableOrderCapacity: 10,
          requiredOrderCapacity: 2,
          availableLineCapacity: 20,
          requiredLineCapacity: 2,
          availableItemCapacity: 100,
          requiredItemCapacity: 20,
        });

    assert.equal(
      capacity.feasible,
      false,
    );

    assert.ok(
      capacity.blockingReasons
        .some(
          (reason) =>
            reason.startsWith(
              "Personel kapasitesi yetersiz",
            ),
        ),
    );
  },
);

test(
  "kapasite sonucu dalga kaydına yazılır",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(context);

    const capacity =
      await context.service
        .calculateAndSaveCapacity(
          createCapacityInput(wave),
        );

    const savedWave =
      await context.service.getWave(
        wave.tenantId,
        wave.id,
      );

    assert.equal(
      capacity.waveId,
      wave.id,
    );

    assert.equal(
      savedWave.capacity
        ?.feasible,
      true,
    );
  },
);

test(
  "FEFO tahsisi en yakın son kullanma tarihini seçer",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(context);

    const order =
      await addBasicOrder(
        context,
        wave,
      );

    const item =
      await addBasicItem(
        context,
        wave,
        order,
      );

    const result =
      await context.service
        .allocateItem({
          tenantId: wave.tenantId,
          waveId: wave.id,
          waveItemId: item.id,
          strategy: "fefo",
          allowPartial: false,
          candidates: [
            createCandidate({
              locationId:
                "late-expiry",
              expiresAt:
                "2026-09-20T08:00:00Z",
            }),
            createCandidate({
              locationId:
                "early-expiry",
              expiresAt:
                "2026-08-20T08:00:00Z",
            }),
          ],
        });

    assert.equal(
      result.fullyAllocated,
      true,
    );

    assert.equal(
      result.allocations[0]
        .sourceLocationId,
      "early-expiry",
    );
  },
);

test(
  "kısmi tahsis eksik miktarı hesaplar",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(context);

    const order =
      await addBasicOrder(
        context,
        wave,
      );

    const item =
      await addBasicItem(
        context,
        wave,
        order,
      );

    const result =
      await context.service
        .allocateItem({
          tenantId: wave.tenantId,
          waveId: wave.id,
          waveItemId: item.id,
          strategy: "balanced",
          allowPartial: true,
          candidates: [
            createCandidate({
              availableQuantity: 4,
            }),
          ],
        });

    assert.equal(
      result.newlyAllocatedQuantity,
      4,
    );

    assert.equal(
      result.shortQuantity,
      6,
    );

    assert.equal(
      result.item.status,
      "short",
    );
  },
);

test(
  "kısmi tahsis kapalıysa eksik stok hata üretir",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(context);

    const order =
      await addBasicOrder(
        context,
        wave,
      );

    const item =
      await addBasicItem(
        context,
        wave,
        order,
      );

    await assert.rejects(
      () =>
        context.service.allocateItem({
          tenantId: wave.tenantId,
          waveId: wave.id,
          waveItemId: item.id,
          strategy: "balanced",
          allowPartial: false,
          candidates: [
            createCandidate({
              availableQuantity: 4,
            }),
          ],
        }),
      /Dalga satırı tamamen tahsis edilemedi/,
    );
  },
);

test(
  "planlama kapasite sınırına göre sipariş seçer",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(context);

    await addBasicOrder(
      context,
      wave,
      {
        orderId: "source-1",
        orderNumber: "ORD-1",
        priority: 90,
      },
    );

    await addBasicOrder(
      context,
      wave,
      {
        orderId: "source-2",
        orderNumber: "ORD-2",
        priority: 40,
      },
    );

    const rule =
      await context.service.createRule({
        tenantId: "tenant-1",
        code: "PLAN-MAX-1",
        name: "Tek Sipariş Planı",
        strategy:
          "priority_based",
        warehouseId:
          "warehouse-1",
        maximumOrders: 1,
        createdBy: "planner-1",
      });

    const result =
      await context.service.plan({
        tenantId: wave.tenantId,
        waveId: wave.id,
        ruleId: rule.id,
      });

    assert.equal(
      result.optimization
        .selectedOrderCount,
      1,
    );

    assert.equal(
      result.optimization
        .rejectedOrderCount,
      1,
    );

    assert.equal(
      result.wave.status,
      "planned",
    );

    assert.equal(
      result.selectedOrders[0]
        .status,
      "eligible",
    );
  },
);

test(
  "tahsislerden toplama görevleri oluşturulur",
  async () => {
    const context =
      createContext();

    const ready =
      await createReadyWave(
        context,
      );

    assert.equal(
      ready.tasks
        .createdTaskCount,
      1,
    );

    assert.equal(
      ready.tasks
        .readyForRelease,
      true,
    );

    assert.equal(
      ready.tasks.wave.status,
      "ready",
    );

    assert.equal(
      ready.tasks
        .createdTasks[0].type,
      "zone_pick",
    );
  },
);

test(
  "tahsis ve görev olmadan release doğrulaması başarısızdır",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(context);

    const order =
      await addBasicOrder(
        context,
        wave,
      );

    await addBasicItem(
      context,
      wave,
      order,
    );

    await context.service.plan({
      tenantId: wave.tenantId,
      waveId: wave.id,
    });

    const validation =
      await context.service
        .validateRelease(
          wave.tenantId,
          wave.id,
        );

    assert.equal(
      validation.valid,
      false,
    );

    assert.ok(
      validation.errors.some(
        (error) =>
          error.includes(
            "aktif stok tahsisi",
          ) ||
          error.includes(
            "aktif toplama görevi",
          ),
      ),
    );
  },
);

test(
  "hazır dalga için release talebi oluşturulur ve onaylanır",
  async () => {
    const context =
      createContext();

    const ready =
      await createReadyWave(
        context,
      );

    const requested =
      await context.service
        .requestRelease({
          tenantId:
            ready.wave.tenantId,
          waveId:
            ready.wave.id,
          requestedBy:
            "planner-1",
        });

    assert.equal(
      requested.success,
      true,
    );

    assert.equal(
      requested.release.status,
      "pending",
    );

    const approved =
      await context.service
        .approveRelease({
          tenantId:
            ready.wave.tenantId,
          waveId:
            ready.wave.id,
          releaseId:
            requested.release.id,
          approvedBy:
            "supervisor-1",
        });

    assert.equal(
      approved.success,
      true,
    );

    assert.equal(
      approved.release.status,
      "approved",
    );
  },
);

test(
  "onaylanan dalga operasyona açılır",
  async () => {
    const context =
      createContext();

    const ready =
      await createReadyWave(
        context,
      );

    const lifecycle =
      await releaseReadyWave(
        context,
        ready,
      );

    assert.equal(
      lifecycle.released.success,
      true,
    );

    assert.equal(
      lifecycle.released
        .wave.status,
      "released",
    );

    const snapshot =
      await context.service
        .getSnapshot(
          ready.wave.tenantId,
          ready.wave.id,
        );

    assert.equal(
      snapshot.orders[0].status,
      "released",
    );

    assert.equal(
      snapshot.items[0].status,
      "released",
    );

    assert.equal(
      snapshot.allocations[0]
        .status,
      "released",
    );

    assert.ok(
      snapshot.tasks[0]
        .releasedAt,
    );
  },
);

test(
  "operasyondaki dalga duraklatılır ve devam ettirilir",
  async () => {
    const context =
      createContext();

    const ready =
      await createReadyWave(
        context,
      );

    const lifecycle =
      await releaseReadyWave(
        context,
        ready,
      );

    const paused =
      await context.service.pause({
        tenantId:
          ready.wave.tenantId,
        waveId:
          ready.wave.id,
        releaseId:
          lifecycle.released
            .release.id,
        pausedBy:
          "supervisor-1",
      });

    assert.equal(
      paused.wave.status,
      "paused",
    );

    assert.equal(
      paused.release.status,
      "paused",
    );

    const resumed =
      await context.service.resume({
        tenantId:
          ready.wave.tenantId,
        waveId:
          ready.wave.id,
        releaseId:
          paused.release.id,
        resumedBy:
          "supervisor-1",
      });

    assert.equal(
      resumed.wave.status,
      "released",
    );

    assert.equal(
      resumed.release.status,
      "released",
    );
  },
);

test(
  "dalga istisnası oluşturulur ve çözülür",
  async () => {
    const context =
      createContext();

    const wave =
      await createBasicWave(context);

    const exception =
      await context.service
        .createException({
          tenantId: wave.tenantId,
          waveId: wave.id,
          type:
            "inventory_shortage",
          message:
            "Toplama lokasyonunda stok bulunamadı.",
          productId:
            "product-1",
        });

    assert.equal(
      exception.resolved,
      false,
    );

    const exceptionWave =
      await context.service.getWave(
        wave.tenantId,
        wave.id,
      );

    assert.equal(
      exceptionWave.status,
      "exception",
    );

    const resolved =
      await context.service
        .resolveException({
          tenantId: wave.tenantId,
          waveId: wave.id,
          exceptionId:
            exception.id,
          resolvedBy:
            "supervisor-1",
          resolutionNotes:
            "Rezerv lokasyondan stok aktarıldı.",
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
  "başlamamış dalga operasyon kayıtlarıyla birlikte iptal edilir",
  async () => {
    const context =
      createContext();

    const ready =
      await createReadyWave(
        context,
      );

    const cancelled =
      await context.service.cancel({
        tenantId:
          ready.wave.tenantId,
        waveId:
          ready.wave.id,
        cancelledBy:
          "supervisor-1",
        reason:
          "Sevkiyat planı değişti.",
      });

    assert.equal(
      cancelled.wave.status,
      "cancelled",
    );

    assert.equal(
      cancelled.release.status,
      "cancelled",
    );

    assert.equal(
      cancelled.wave
        .cancellationReason,
      "Sevkiyat planı değişti.",
    );

    const snapshot =
      await context.service
        .getSnapshot(
          ready.wave.tenantId,
          ready.wave.id,
        );

    assert.equal(
      snapshot.orders[0].status,
      "removed",
    );

    assert.equal(
      snapshot.items[0].status,
      "cancelled",
    );

    assert.equal(
      snapshot.allocations[0]
        .status,
      "cancelled",
    );

    assert.equal(
      snapshot.tasks[0].status,
      "cancelled",
    );
  },
);

test(
  "tamamlanan dalganın performansı hesaplanır",
  async () => {
    const context =
      createContext();

    const ready =
      await createReadyWave(
        context,
      );

    context.setNow(
      "2026-08-06T09:00:00.000Z",
    );

    const lifecycle =
      await releaseReadyWave(
        context,
        ready,
      );

    const releasedSnapshot =
      await context.service
        .getSnapshot(
          ready.wave.tenantId,
          ready.wave.id,
        );

    const completedAt =
      "2026-08-06T09:30:00.000Z";

    for (
      const task
      of releasedSnapshot.tasks
    ) {
      await context.repository
        .saveTask({
          ...task,
          status: "completed",
          startedAt:
            "2026-08-06T09:00:00.000Z",
          completedAt,
          actualMinutes: 30,
          updatedAt: completedAt,
        });
    }

    for (
      const item
      of releasedSnapshot.items
    ) {
      await context.repository
        .saveItem({
          ...item,
          status: "picked",
          pickedQuantity:
            item.requestedQuantity,
          shortQuantity: 0,
          remainingQuantity: 0,
          startedAt:
            "2026-08-06T09:00:00.000Z",
          completedAt,
          updatedAt: completedAt,
        });
    }

    for (
      const order
      of releasedSnapshot.orders
    ) {
      await context.repository
        .saveOrder({
          ...order,
          status: "completed",
          startedAt:
            "2026-08-06T09:00:00.000Z",
          completedAt,
          updatedAt: completedAt,
        });
    }

    context.setNow(completedAt);

    const completed =
      await context.service.complete({
        tenantId:
          ready.wave.tenantId,
        waveId:
          ready.wave.id,
        releaseId:
          lifecycle.released
            .release.id,
        completedBy:
          "supervisor-1",
      });

    assert.equal(
      completed.wave.status,
      "completed",
    );

    const performance =
      await context.service
        .calculatePerformance({
          tenantId:
            ready.wave.tenantId,
          warehouseId:
            ready.wave.warehouseId,
          periodStart:
            "2026-08-06T00:00:00Z",
          periodEnd:
            "2026-08-06T23:59:59Z",
        });

    assert.equal(
      performance.totalWaves,
      1,
    );

    assert.equal(
      performance.completedWaves,
      1,
    );

    assert.equal(
      performance.waveCompletionRate,
      100,
    );

    assert.equal(
      performance.orderCompletionRate,
      100,
    );

    assert.equal(
      performance.lineCompletionRate,
      100,
    );

    assert.equal(
      performance.itemFulfillmentRate,
      100,
    );

    assert.equal(
      performance.shortPickRate,
      0,
    );

    assert.equal(
      performance
        .averageWaveDurationMinutes,
      30,
    );
  },
);
