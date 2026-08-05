import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

async function loadWarehouseModule() {
  const result = await build({
    entryPoints: ["src/warehouse/index.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    target: "node20",
  });

  const source = result.outputFiles[0].text;
  const encoded = Buffer
    .from(source)
    .toString("base64");

  return import(
    `data:text/javascript;base64,${encoded}`
  );
}

function createContext(module) {
  const inventoryRepository =
    new module.InMemoryInventoryRepository();

  const reservationRepository =
    new module.InMemoryReservationRepository();

  const pickingRepository =
    new module.InMemoryPickingRepository();

  let entitySequence = 0;
  let inventorySequence = 0;
  let reservationSequence = 0;
  let documentSequence = 0;

  const now = () =>
    "2026-08-05T16:20:00.000Z";

  const inventoryService =
    new module.InventoryService({
      repository: inventoryRepository,
      createId: () =>
        `inventory-${++inventorySequence}`,
      now,
    });

  const reservationService =
    new module.ReservationService({
      repository: reservationRepository,
      inventoryRepository,
      createId: () =>
        `reservation-${++reservationSequence}`,
      now,
    });

  const suggestionService =
    new module.PickingSuggestionService({
      repository: pickingRepository,
      createId: () =>
        `suggestion-${++entitySequence}`,
      now,
    });

  const routeOptimizer =
    new module.PickingRouteOptimizer({
      createId: () =>
        `route-${++entitySequence}`,
      now,
    });

  const pickingService =
    new module.PickingService({
      repository: pickingRepository,
      suggestionService,
      routeOptimizer,
      inventoryService,
      reservationService,
      createId: () =>
        `picking-entity-${++entitySequence}`,
      now,
      sequence: () => ++documentSequence,
    });

  return {
    inventoryRepository,
    reservationRepository,
    pickingRepository,
    inventoryService,
    reservationService,
    suggestionService,
    routeOptimizer,
    pickingService,
  };
}

async function seedStock(
  context,
  options = {},
) {
  await context.inventoryService.recordMovement({
    tenantId: "tenant-1",
    movementType: "goods_receipt",
    warehouseId: "warehouse-1",
    locationId:
      options.locationId ??
      "storage-location-1",
    productId:
      options.productId ??
      "product-1",
    quantity:
      options.quantity ?? 20,
    unit: options.unit ?? "piece",
    stockStatus: "available",
    createdBy: "warehouse-user",
    reference: {
      referenceType: "receiving",
      referenceId: "receiving-1",
      referenceNumber:
        "MK-20260805-000001",
    },
    ...(options.skuId !== undefined
      ? { skuId: options.skuId }
      : {}),
    ...(options.tracking !== undefined
      ? { tracking: options.tracking }
      : {}),
  });
}

async function createPickingWithItem(
  module,
  options = {},
) {
  const context = createContext(module);

  await seedStock(context, {
    locationId:
      options.sourceLocationId ??
      "storage-location-1",
    quantity:
      options.stockQuantity ?? 20,
    ...(options.tracking !== undefined
      ? { tracking: options.tracking }
      : {}),
  });

  const picking =
    await context.pickingService.create({
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      destinationLocationId:
        "packing-location-1",
      strategy:
        options.strategy ??
        "single_order",
      orderId:
        options.orderId ??
        "order-1",
      orderNumber:
        options.orderNumber ??
        "SIP-1",
      createdBy: "warehouse-user",
    });

  const item =
    await context.pickingService.addItem({
      tenantId: "tenant-1",
      pickingId: picking.id,
      warehouseId: "warehouse-1",
      productId: "product-1",
      requestedQuantity:
        options.requestedQuantity ?? 10,
      unit: "piece",
      stockStatus: "available",
      strategy:
        options.strategy ??
        "single_order",
      sourceLocationId:
        options.sourceLocationId ??
        "storage-location-1",
      destinationLocationId:
        "packing-location-1",
      createdBy: "warehouse-user",
      ...(options.tracking !== undefined
        ? { tracking: options.tracking }
        : {}),
    });

  return {
    ...context,
    picking,
    item,
  };
}

async function releaseCreateTaskAndStart(
  context,
) {
  await context.pickingService.release(
    "tenant-1",
    context.picking.id,
  );

  const task =
    await context.pickingService.createTask({
      tenantId: "tenant-1",
      pickingId: context.picking.id,
      pickingItemId: context.item.id,
      warehouseId: "warehouse-1",
      sourceLocationId:
        context.item.sourceLocationId ??
        "storage-location-1",
      destinationLocationId:
        "packing-location-1",
      assignedUserId: "picker-1",
      priority: 10,
      sequence: 1,
      createdBy: "warehouse-manager",
    });

  await context.pickingService.start(
    "tenant-1",
    context.picking.id,
  );

  return task;
}

test(
  "toplama oluşturulur, satır eklenir ve operasyona açılır",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module);

    assert.equal(
      context.picking.status,
      "draft",
    );

    assert.match(
      context.picking.pickingNumber,
      /^TPL-20260805-\d{6}$/,
    );

    const released =
      await context.pickingService.release(
        "tenant-1",
        context.picking.id,
      );

    assert.equal(
      released.status,
      "released",
    );
  },
);

test(
  "aynı sipariş için ikinci toplama oluşturulamaz",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module);

    await assert.rejects(
      context.pickingService.create({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        destinationLocationId:
          "packing-location-1",
        strategy: "single_order",
        orderId: "order-1",
        createdBy: "warehouse-user",
      }),
      /daha önce toplama kaydı/,
    );
  },
);

test(
  "toplama görev olmadan başlatılamaz",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module);

    await context.pickingService.release(
      "tenant-1",
      context.picking.id,
    );

    await assert.rejects(
      context.pickingService.start(
        "tenant-1",
        context.picking.id,
      ),
      /en az bir toplama görevi/,
    );
  },
);

test(
  "stok önerileri yeterli miktarı lokasyonlara dağıtır",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module, {
        requestedQuantity: 15,
        stockQuantity: 10,
        strategy: "nearest_location",
      });

    await seedStock(context, {
      locationId: "storage-location-2",
      quantity: 10,
    });

    const balances =
      await context.inventoryService
        .listBalances({
          tenantId: "tenant-1",
          warehouseId: "warehouse-1",
          productId: "product-1",
          stockStatus: "available",
        });

    const suggestions =
      await context.pickingService
        .generateSuggestions({
          tenantId: "tenant-1",
          pickingId: context.picking.id,
          pickingItemId: context.item.id,
          balances,
          locationDistances: {
            "storage-location-1": 4,
            "storage-location-2": 12,
          },
        });

    assert.equal(
      suggestions.length,
      2,
    );

    assert.equal(
      suggestions[0].locationId,
      "storage-location-1",
    );

    assert.equal(
      suggestions.reduce(
        (total, suggestion) =>
          total +
          suggestion.suggestedQuantity,
        0,
      ),
      15,
    );
  },
);

test(
  "rota optimize edilir ve lokasyonlar mesafeye göre sıralanır",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module);

    await context.pickingService.release(
      "tenant-1",
      context.picking.id,
    );

    await context.pickingService.createTask({
      tenantId: "tenant-1",
      pickingId: context.picking.id,
      pickingItemId: context.item.id,
      warehouseId: "warehouse-1",
      sourceLocationId:
        "storage-location-1",
      destinationLocationId:
        "packing-location-1",
      priority: 10,
      sequence: 1,
      createdBy: "manager",
    });

    await context.pickingService.createTask({
      tenantId: "tenant-1",
      pickingId: context.picking.id,
      warehouseId: "warehouse-1",
      sourceLocationId:
        "storage-location-2",
      destinationLocationId:
        "packing-location-1",
      priority: 20,
      sequence: 2,
      createdBy: "manager",
    });

    const route =
      await context.pickingService
        .createOptimizedRoute({
          tenantId: "tenant-1",
          pickingId: context.picking.id,
          startLocationId: "start",
          locations: [
            {
              locationId: "start",
              x: 0,
              y: 0,
            },
            {
              locationId:
                "storage-location-1",
              x: 2,
              y: 0,
            },
            {
              locationId:
                "storage-location-2",
              x: 10,
              y: 0,
            },
          ],
        });

    assert.equal(
      route.steps.length,
      2,
    );

    assert.equal(
      route.steps[0].locationId,
      "storage-location-1",
    );
  },
);

test(
  "toplama onayı stok transferi oluşturur",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module);

    await releaseCreateTaskAndStart(
      context,
    );

    const item =
      await context.pickingService.confirmItem({
        tenantId: "tenant-1",
        pickingId: context.picking.id,
        pickingItemId: context.item.id,
        sourceLocationId:
          "storage-location-1",
        destinationLocationId:
          "packing-location-1",
        quantity: 6,
        pickedBy: "picker-1",
      });

    assert.equal(
      item.pickedQuantity,
      6,
    );

    assert.equal(
      item.remainingQuantity,
      4,
    );

    assert.equal(
      item.inventoryMovementIds.length,
      2,
    );

    const source =
      await context.inventoryService
        .listBalances({
          tenantId: "tenant-1",
          warehouseId: "warehouse-1",
          locationId:
            "storage-location-1",
          productId: "product-1",
        });

    const destination =
      await context.inventoryService
        .listBalances({
          tenantId: "tenant-1",
          warehouseId: "warehouse-1",
          locationId:
            "packing-location-1",
          productId: "product-1",
        });

    assert.equal(
      source[0]?.quantity,
      14,
    );

    assert.equal(
      destination[0]?.quantity,
      6,
    );
  },
);

test(
  "toplama onayı bağlı rezervasyonu tüketir",
  async () => {
    const module =
      await loadWarehouseModule();

    const context = createContext(module);

    await seedStock(context, {
      quantity: 20,
    });

    const reservation =
      await context.reservationService.create({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        locationId:
          "storage-location-1",
        productId: "product-1",
        quantity: 10,
        unit: "piece",
        createdBy: "warehouse-user",
      });

    const picking =
      await context.pickingService.create({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        destinationLocationId:
          "packing-location-1",
        strategy: "single_order",
        orderId: "order-reservation",
        createdBy: "warehouse-user",
      });

    const item =
      await context.pickingService.addItem({
        tenantId: "tenant-1",
        pickingId: picking.id,
        warehouseId: "warehouse-1",
        productId: "product-1",
        requestedQuantity: 10,
        unit: "piece",
        strategy: "single_order",
        sourceLocationId:
          "storage-location-1",
        destinationLocationId:
          "packing-location-1",
        reservationId: reservation.id,
        createdBy: "warehouse-user",
      });

    const seeded = {
      ...context,
      picking,
      item,
    };

    await releaseCreateTaskAndStart(
      seeded,
    );

    await context.pickingService.confirmItem({
      tenantId: "tenant-1",
      pickingId: picking.id,
      pickingItemId: item.id,
      sourceLocationId:
        "storage-location-1",
      destinationLocationId:
        "packing-location-1",
      quantity: 4,
      pickedBy: "picker-1",
    });

    const updatedReservation =
      await context.reservationService.get(
        "tenant-1",
        reservation.id,
      );

    assert.equal(
      updatedReservation.consumedQuantity,
      4,
    );

    assert.equal(
      updatedReservation.status,
      "partially_consumed",
    );
  },
);

test(
  "lot takipli ürün yanlış lot ile toplanamaz",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module, {
        tracking: {
          lotNumber: "LOT-001",
        },
      });

    await releaseCreateTaskAndStart(
      context,
    );

    await assert.rejects(
      context.pickingService.confirmItem({
        tenantId: "tenant-1",
        pickingId: context.picking.id,
        pickingItemId: context.item.id,
        sourceLocationId:
          "storage-location-1",
        destinationLocationId:
          "packing-location-1",
        quantity: 2,
        lotNumber: "LOT-999",
        pickedBy: "picker-1",
      }),
      /lot numarası.*uyuşmamaktadır/i,
    );
  },
);

test(
  "tam short-pick stok hareketi oluşturmadan istisna üretir",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module, {
        requestedQuantity: 10,
      });

    await releaseCreateTaskAndStart(
      context,
    );

    const item =
      await context.pickingService.confirmItem({
        tenantId: "tenant-1",
        pickingId: context.picking.id,
        pickingItemId: context.item.id,
        sourceLocationId:
          "storage-location-1",
        destinationLocationId:
          "packing-location-1",
        quantity: 0,
        shortQuantity: 10,
        pickedBy: "picker-1",
      });

    assert.equal(
      item.pickedQuantity,
      0,
    );

    assert.equal(
      item.shortQuantity,
      10,
    );

    assert.equal(
      item.remainingQuantity,
      0,
    );

    assert.equal(
      item.inventoryMovementIds.length,
      0,
    );

    const exceptions =
      await context.pickingService
        .listExceptions(
          "tenant-1",
          context.picking.id,
        );

    assert.equal(
      exceptions.length,
      1,
    );

    assert.equal(
      exceptions[0].type,
      "short_pick",
    );
  },
);

test(
  "çözülmemiş short-pick istisnası tamamlamayı engeller",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module);

    await releaseCreateTaskAndStart(
      context,
    );

    await context.pickingService.confirmItem({
      tenantId: "tenant-1",
      pickingId: context.picking.id,
      pickingItemId: context.item.id,
      sourceLocationId:
        "storage-location-1",
      destinationLocationId:
        "packing-location-1",
      quantity: 0,
      shortQuantity: 10,
      pickedBy: "picker-1",
    });

    await assert.rejects(
      context.pickingService.complete(
        "tenant-1",
        context.picking.id,
        "manager",
      ),
      /Çözülmemiş toplama istisnaları/,
    );
  },
);

test(
  "istisna çözüldükten sonra short-pick operasyonu tamamlanabilir",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module);

    await releaseCreateTaskAndStart(
      context,
    );

    await context.pickingService.confirmItem({
      tenantId: "tenant-1",
      pickingId: context.picking.id,
      pickingItemId: context.item.id,
      sourceLocationId:
        "storage-location-1",
      destinationLocationId:
        "packing-location-1",
      quantity: 0,
      shortQuantity: 10,
      pickedBy: "picker-1",
    });

    const [exception] =
      await context.pickingService
        .listExceptions(
          "tenant-1",
          context.picking.id,
        );

    await context.pickingService
      .resolveException({
        tenantId: "tenant-1",
        pickingId: context.picking.id,
        exceptionId: exception.id,
        resolvedBy: "supervisor-1",
        resolutionNotes:
          "Eksik miktar backorder olarak yönetilecek.",
      });

    const completed =
      await context.pickingService.complete(
        "tenant-1",
        context.picking.id,
        "manager",
      );

    assert.equal(
      completed.status,
      "completed",
    );
  },
);

test(
  "stok hareketi başlamamış toplama iptal edilebilir",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module);

    const cancelled =
      await context.pickingService.cancel(
        "tenant-1",
        context.picking.id,
        "Sipariş müşteri tarafından iptal edildi.",
      );

    assert.equal(
      cancelled.status,
      "cancelled",
    );
  },
);

test(
  "stok hareketi bulunan toplama doğrudan iptal edilemez",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module);

    await releaseCreateTaskAndStart(
      context,
    );

    await context.pickingService.confirmItem({
      tenantId: "tenant-1",
      pickingId: context.picking.id,
      pickingItemId: context.item.id,
      sourceLocationId:
        "storage-location-1",
      destinationLocationId:
        "packing-location-1",
      quantity: 4,
      pickedBy: "picker-1",
    });

    await assert.rejects(
      context.pickingService.cancel(
        "tenant-1",
        context.picking.id,
        "İptal",
      ),
      /kontrollü ters kayıtla/,
    );
  },
);

test(
  "wave oluşturulur ve bağlı toplamalar operasyona açılır",
  async () => {
    const module =
      await loadWarehouseModule();

    const context = createContext(module);

    const first =
      await context.pickingService.create({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        destinationLocationId:
          "packing-location-1",
        strategy: "wave",
        orderId: "order-wave-1",
        createdBy: "manager",
      });

    const second =
      await context.pickingService.create({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        destinationLocationId:
          "packing-location-1",
        strategy: "wave",
        orderId: "order-wave-2",
        createdBy: "manager",
      });

    for (const picking of [first, second]) {
      await context.pickingService.addItem({
        tenantId: "tenant-1",
        pickingId: picking.id,
        warehouseId: "warehouse-1",
        productId: "product-1",
        requestedQuantity: 2,
        unit: "piece",
        strategy: "wave",
        createdBy: "manager",
      });
    }

    const wave =
      await context.pickingService.createWave({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        pickingIds: [
          first.id,
          second.id,
        ],
        createdBy: "manager",
      });

    const released =
      await context.pickingService.releaseWave(
        "tenant-1",
        wave.id,
      );

    assert.equal(
      released.status,
      "released",
    );

    assert.equal(
      (
        await context.pickingService.get(
          "tenant-1",
          first.id,
        )
      ).status,
      "released",
    );
  },
);

test(
  "batch oluşturulur ve mükerrer picking kimlikleri temizlenir",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module, {
        strategy: "batch",
        orderId: "order-batch-1",
      });

    const batch =
      await context.pickingService.createBatch({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        pickingIds: [
          context.picking.id,
          context.picking.id,
        ],
        assignedUserId: "picker-1",
        createdBy: "manager",
      });

    assert.equal(
      batch.pickingIds.length,
      1,
    );

    assert.match(
      batch.batchNumber,
      /^PRT-20260805-\d{6}$/,
    );
  },
);

test(
  "geçersiz görev tarihi Türkçe doğrulama hatası üretir",
  async () => {
    const module =
      await loadWarehouseModule();

    const context =
      await createPickingWithItem(module);

    await assert.rejects(
      context.pickingService.createTask({
        tenantId: "tenant-1",
        pickingId: context.picking.id,
        warehouseId: "warehouse-1",
        sourceLocationId:
          "storage-location-1",
        destinationLocationId:
          "packing-location-1",
        plannedAt: "geçersiz-tarih",
        createdBy: "manager",
      }),
      /Görev planlama tarihi geçerli bir tarih olmalıdır/,
    );
  },
);
