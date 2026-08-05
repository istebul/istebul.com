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
  const encoded = Buffer.from(source).toString("base64");

  return import(
    `data:text/javascript;base64,${encoded}`
  );
}

function createContext(module) {
  const inventoryRepository =
    new module.InMemoryInventoryRepository();

  let inventoryId = 0;

  const inventoryService =
    new module.InventoryService({
      repository: inventoryRepository,
      createId: () =>
        `inventory-movement-${++inventoryId}`,
      now: () =>
        "2026-08-05T14:00:00.000Z",
    });

  const putawayRepository =
    new module.InMemoryPutawayRepository();

  let putawayId = 0;

  const createId = () =>
    `putaway-entity-${++putawayId}`;

  const now = () =>
    "2026-08-05T14:00:00.000Z";

  const suggestionService =
    new module.PutawaySuggestionService({
      repository: putawayRepository,
      createId,
      now,
    });

  const putawayService =
    new module.PutawayService({
      repository: putawayRepository,
      suggestionService,
      inventoryService,
      createId,
      now,
      sequence: () => putawayId + 1,
    });

  return {
    inventoryRepository,
    inventoryService,
    putawayRepository,
    suggestionService,
    putawayService,
  };
}

async function seedSourceStock(
  context,
  module,
  quantity = 20,
) {
  await context.inventoryService.recordMovement({
    tenantId: "tenant-1",
    movementType: "goods_receipt",
    warehouseId: "warehouse-1",
    locationId: "receiving-location-1",
    productId: "product-1",
    quantity,
    unit: "piece",
    stockStatus: "available",
    createdBy: "warehouse-user",
    reference: {
      referenceType: "receiving",
      referenceId: "receiving-1",
      referenceNumber: "MK-20260805-000001",
    },
  });
}

async function createPutawayWithItem(
  module,
  options = {},
) {
  const context = createContext(module);

  await seedSourceStock(
    context,
    module,
    options.stockQuantity ?? 20,
  );

  const putaway =
    await context.putawayService.create({
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      sourceLocationId:
        "receiving-location-1",
      strategy:
        options.strategy ?? "nearest_location",
      receivingId: "receiving-1",
      qualityInspectionId: "quality-1",
      referenceType: "receiving",
      referenceId: "receiving-1",
      referenceNumber: "MK-20260805-000001",
      createdBy: "warehouse-user",
    });

  const item =
    await context.putawayService.addItem({
      tenantId: "tenant-1",
      putawayId: putaway.id,
      warehouseId: "warehouse-1",
      sourceLocationId:
        "receiving-location-1",
      productId: "product-1",
      requestedQuantity:
        options.requestedQuantity ?? 10,
      unit: "piece",
      stockStatus: "available",
      strategy:
        options.strategy ?? "nearest_location",
      createdBy: "warehouse-user",
    });

  return {
    ...context,
    putaway,
    item,
  };
}

test(
  "yerleştirme oluşturulur, satır eklenir ve başlatılır",
  async () => {
    const module = await loadWarehouseModule();
    const context =
      await createPutawayWithItem(module);

    assert.equal(
      context.putaway.status,
      "draft",
    );

    assert.match(
      context.putaway.putawayNumber,
      /^YRL-20260805-\d{6}$/,
    );

    const started =
      await context.putawayService.start(
        "tenant-1",
        context.putaway.id,
      );

    assert.equal(
      started.status,
      "in_progress",
    );

    assert.equal(
      started.startedAt,
      "2026-08-05T14:00:00.000Z",
    );
  },
);

test(
  "lokasyon değerlendirici bloke ve yetersiz lokasyonu eler",
  async () => {
    const module = await loadWarehouseModule();

    const blocked =
      module.evaluatePutawayLocation({
        warehouseId: "warehouse-1",
        sourceLocationId: "source-1",
        productId: "product-1",
        requestedQuantity: 10,
        strategy: "capacity_based",
        candidate: {
          locationId: "blocked-location",
          warehouseId: "warehouse-1",
          active: true,
          blocked: true,
          availableCapacity: 100,
        },
      });

    assert.equal(blocked.eligible, false);

    const insufficient =
      module.evaluatePutawayLocation({
        warehouseId: "warehouse-1",
        sourceLocationId: "source-1",
        productId: "product-1",
        requestedQuantity: 10,
        strategy: "capacity_based",
        candidate: {
          locationId: "small-location",
          warehouseId: "warehouse-1",
          active: true,
          availableCapacity: 5,
        },
      });

    assert.equal(
      insufficient.eligible,
      false,
    );
  },
);

test(
  "öneri servisi uygun lokasyonları puana göre sıralar",
  async () => {
    const module = await loadWarehouseModule();
    const context =
      await createPutawayWithItem(module);

    const suggestions =
      await context.putawayService
        .generateSuggestions({
          tenantId: "tenant-1",
          putawayId: context.putaway.id,
          putawayItemId: context.item.id,
          candidates: [
            {
              locationId: "location-far",
              warehouseId: "warehouse-1",
              active: true,
              availableCapacity: 50,
              distance: 60,
            },
            {
              locationId: "location-near",
              warehouseId: "warehouse-1",
              active: true,
              availableCapacity: 15,
              distance: 5,
            },
            {
              locationId:
                "receiving-location-1",
              warehouseId: "warehouse-1",
              active: true,
              availableCapacity: 100,
              distance: 0,
            },
          ],
        });

    assert.equal(suggestions.length, 2);

    assert.equal(
      suggestions[0].targetLocationId,
      "location-near",
    );

    assert.equal(
      suggestions[0].selected,
      true,
    );

    assert.ok(
      suggestions[0].score.totalScore >=
        suggestions[1].score.totalScore,
    );
  },
);

test(
  "kısmi yerleştirme stok transferi oluşturur",
  async () => {
    const module = await loadWarehouseModule();
    const context =
      await createPutawayWithItem(module);

    await context.putawayService.start(
      "tenant-1",
      context.putaway.id,
    );

    const item =
      await context.putawayService.executeItem({
        tenantId: "tenant-1",
        putawayId: context.putaway.id,
        putawayItemId: context.item.id,
        targetLocationId: "storage-location-1",
        quantity: 4,
        executedBy: "forklift-user",
      });

    assert.equal(item.placedQuantity, 4);
    assert.equal(item.remainingQuantity, 6);
    assert.equal(
      item.inventoryMovementIds.length,
      2,
    );

    assert.equal(
      item.transactionGroupIds.length,
      1,
    );

    const refreshed =
      await context.putawayService.get(
        "tenant-1",
        context.putaway.id,
      );

    assert.equal(
      refreshed.status,
      "partially_completed",
    );

    const sourceBalances =
      await context.inventoryService.listBalances({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        locationId: "receiving-location-1",
        productId: "product-1",
      });

    const targetBalances =
      await context.inventoryService.listBalances({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        locationId: "storage-location-1",
        productId: "product-1",
      });

    assert.equal(
      sourceBalances[0]?.quantity,
      16,
    );

    assert.equal(
      targetBalances[0]?.quantity,
      4,
    );
  },
);

test(
  "tam yerleştirme sonrası kayıt tamamlanabilir",
  async () => {
    const module = await loadWarehouseModule();
    const context =
      await createPutawayWithItem(module);

    await context.putawayService.start(
      "tenant-1",
      context.putaway.id,
    );

    await context.putawayService.executeItem({
      tenantId: "tenant-1",
      putawayId: context.putaway.id,
      putawayItemId: context.item.id,
      targetLocationId: "storage-location-1",
      quantity: 10,
      executedBy: "forklift-user",
    });

    const completed =
      await context.putawayService.complete(
        "tenant-1",
        context.putaway.id,
        "warehouse-manager",
      );

    assert.equal(
      completed.status,
      "completed",
    );

    assert.equal(
      completed.completedAt,
      "2026-08-05T14:00:00.000Z",
    );
  },
);

test(
  "kalan miktarı aşan yerleştirme engellenir",
  async () => {
    const module = await loadWarehouseModule();
    const context =
      await createPutawayWithItem(module);

    await context.putawayService.start(
      "tenant-1",
      context.putaway.id,
    );

    await assert.rejects(
      context.putawayService.executeItem({
        tenantId: "tenant-1",
        putawayId: context.putaway.id,
        putawayItemId: context.item.id,
        targetLocationId: "storage-location-1",
        quantity: 11,
        executedBy: "forklift-user",
      }),
      /kalan miktarı aşamaz/,
    );
  },
);

test(
  "kısmi yerleştirme tamamlanamaz",
  async () => {
    const module = await loadWarehouseModule();
    const context =
      await createPutawayWithItem(module);

    await context.putawayService.start(
      "tenant-1",
      context.putaway.id,
    );

    await context.putawayService.executeItem({
      tenantId: "tenant-1",
      putawayId: context.putaway.id,
      putawayItemId: context.item.id,
      targetLocationId: "storage-location-1",
      quantity: 4,
      executedBy: "forklift-user",
    });

    await assert.rejects(
      context.putawayService.complete(
        "tenant-1",
        context.putaway.id,
        "warehouse-manager",
      ),
      /Tüm ürünler yerleştirilmeden/,
    );
  },
);

test(
  "stok hareketi bulunan yerleştirme doğrudan iptal edilemez",
  async () => {
    const module = await loadWarehouseModule();
    const context =
      await createPutawayWithItem(module);

    await context.putawayService.start(
      "tenant-1",
      context.putaway.id,
    );

    await context.putawayService.executeItem({
      tenantId: "tenant-1",
      putawayId: context.putaway.id,
      putawayItemId: context.item.id,
      targetLocationId: "storage-location-1",
      quantity: 4,
      executedBy: "forklift-user",
    });

    await assert.rejects(
      context.putawayService.cancel(
        "tenant-1",
        context.putaway.id,
        "İşlem iptal edildi.",
      ),
      /ters kayıtla kapatılmalıdır/,
    );
  },
);

test(
  "stok hareketi başlamamış yerleştirme iptal edilebilir",
  async () => {
    const module = await loadWarehouseModule();
    const context =
      await createPutawayWithItem(module);

    const cancelled =
      await context.putawayService.cancel(
        "tenant-1",
        context.putaway.id,
        "Operasyon planı değişti.",
      );

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
  "yerleştirme görevi oluşturulur ve listelenir",
  async () => {
    const module = await loadWarehouseModule();
    const context =
      await createPutawayWithItem(module);

    const task =
      await context.putawayService.createTask({
        tenantId: "tenant-1",
        putawayId: context.putaway.id,
        putawayItemId: context.item.id,
        sourceLocationId:
          "receiving-location-1",
        targetLocationId:
          "storage-location-1",
        assignedUserId: "forklift-user",
        assignedEquipmentId: "forklift-1",
        priority: 10,
        createdBy: "warehouse-manager",
      });

    assert.equal(task.status, "assigned");
    assert.equal(task.priority, 10);

    const tasks =
      await context.putawayService.listTasks(
        "tenant-1",
        context.putaway.id,
      );

    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].id, task.id);
  },
);

test(
  "yerleştirme istisnası oluşturulur ve çözülür",
  async () => {
    const module = await loadWarehouseModule();
    const context =
      await createPutawayWithItem(module);

    const exception =
      await context.putawayService
        .createException({
          tenantId: "tenant-1",
          putawayId: context.putaway.id,
          putawayItemId: context.item.id,
          type: "target_location_blocked",
          message:
            "Önerilen hedef lokasyon bloke.",
          sourceLocationId:
            "receiving-location-1",
          targetLocationId:
            "storage-location-1",
        });

    assert.equal(
      exception.resolved,
      false,
    );

    const resolved =
      await context.putawayService
        .resolveException({
          tenantId: "tenant-1",
          putawayId: context.putaway.id,
          exceptionId: exception.id,
          resolvedBy: "warehouse-manager",
          resolutionNotes:
            "Alternatif lokasyon seçildi.",
        });

    assert.equal(
      resolved.resolved,
      true,
    );

    assert.equal(
      resolved.resolvedBy,
      "warehouse-manager",
    );

    const exceptions =
      await context.putawayService
        .listExceptions(
          "tenant-1",
          context.putaway.id,
        );

    assert.equal(exceptions.length, 1);
    assert.equal(
      exceptions[0].resolved,
      true,
    );
  },
);

test(
  "aynı kalite kontrol için ikinci yerleştirme oluşturulamaz",
  async () => {
    const module = await loadWarehouseModule();
    const context = createContext(module);

    const input = {
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      sourceLocationId:
        "receiving-location-1",
      strategy: "dynamic_location",
      receivingId: "receiving-1",
      qualityInspectionId: "quality-1",
      createdBy: "warehouse-user",
    };

    await context.putawayService.create(input);

    await assert.rejects(
      context.putawayService.create(input),
      /daha önce yerleştirme oluşturulmuş/,
    );
  },
);

test(
  "geçersiz görev tarihi Türkçe doğrulama hatası üretir",
  async () => {
    const module = await loadWarehouseModule();
    const context =
      await createPutawayWithItem(module);

    await assert.rejects(
      context.putawayService.createTask({
        tenantId: "tenant-1",
        putawayId: context.putaway.id,
        sourceLocationId:
          "receiving-location-1",
        targetLocationId:
          "storage-location-1",
        plannedAt: "geçersiz-tarih",
        createdBy: "warehouse-manager",
      }),
      /Görev planlama tarihi geçerli bir tarih olmalıdır/,
    );
  },
);
