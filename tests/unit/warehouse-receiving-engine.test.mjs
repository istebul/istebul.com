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
  const url =
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

  return import(url);
}

function createInventoryContext(module) {
  const repository = new module.InMemoryInventoryRepository();
  let movementId = 0;

  const service = new module.InventoryService({
    repository,
    createId: () => `movement-${++movementId}`,
    now: () => "2026-08-05T00:00:00.000Z",
  });

  return { repository, service };
}

function createReceivingContext(module) {
  const inventory = createInventoryContext(module);
  const repository = new module.InMemoryReceivingRepository();
  let entityId = 0;

  const service = new module.ReceivingService({
    repository,
    inventoryService: inventory.service,
    createId: () => `receiving-entity-${++entityId}`,
    now: () => "2026-08-05T00:00:00.000Z",
    sequence: () => 1,
  });

  return {
    inventory,
    repository,
    service,
  };
}

async function createReceivingWithItem(
  module,
  overrides = {},
) {
  const context = createReceivingContext(module);

  const receiving = await context.service.create({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    receivingLocationId: "receiving-location-1",
    source: "purchase_order",
    referenceType: "purchase_order",
    referenceId: "purchase-order-1",
    referenceNumber: "SAS-0001",
    supplierId: "supplier-1",
    supplierName: "Örnek Tedarikçi",
    createdBy: "user-1",
    ...overrides.receiving,
  });

  const item = await context.service.addItem({
    tenantId: "tenant-1",
    receivingId: receiving.id,
    warehouseId: "warehouse-1",
    receivingLocationId: "receiving-location-1",
    productId: "product-1",
    expectedQuantity: 10,
    unit: "piece",
    createdBy: "user-1",
    ...overrides.item,
  });

  return {
    ...context,
    receiving,
    item,
  };
}

test("mal kabul oluşturulur, satır eklenir ve başlatılır", async () => {
  const module = await loadWarehouseModule();
  const context = await createReceivingWithItem(module);

  assert.equal(context.receiving.status, "draft");
  assert.equal(
    context.receiving.receivingNumber,
    "MK-20260805-000001",
  );

  const started = await context.service.start(
    "tenant-1",
    context.receiving.id,
  );

  assert.equal(started.status, "in_progress");
  assert.equal(
    started.startedAt,
    "2026-08-05T00:00:00.000Z",
  );

  const refreshed = await context.service.get(
    "tenant-1",
    context.receiving.id,
  );

  assert.equal(refreshed.items.length, 1);
  assert.equal(refreshed.items[0].expectedQuantity, 10);
});

test("kısmi miktar girişi mal kabulü kısmi duruma geçirir", async () => {
  const module = await loadWarehouseModule();
  const context = await createReceivingWithItem(module);

  await context.service.start(
    "tenant-1",
    context.receiving.id,
  );

  const item = await context.service.receiveQuantity({
    tenantId: "tenant-1",
    receivingId: context.receiving.id,
    receivingItemId: context.item.id,
    receivedQuantity: 4,
    acceptedQuantity: 3,
    rejectedQuantity: 1,
    damagedQuantity: 0,
    rejectionReason: "Ambalaj uygun değil",
    updatedBy: "user-2",
  });

  assert.equal(item.receivedQuantity, 4);
  assert.equal(item.acceptedQuantity, 3);
  assert.equal(item.rejectedQuantity, 1);

  const refreshed = await context.service.get(
    "tenant-1",
    context.receiving.id,
  );

  assert.equal(refreshed.status, "partially_received");
});

test("tamamlanan satın alma kabulü stok hareketi oluşturur", async () => {
  const module = await loadWarehouseModule();
  const context = await createReceivingWithItem(module);

  await context.service.start(
    "tenant-1",
    context.receiving.id,
  );

  await context.service.receiveQuantity({
    tenantId: "tenant-1",
    receivingId: context.receiving.id,
    receivingItemId: context.item.id,
    receivedQuantity: 10,
    acceptedQuantity: 8,
    rejectedQuantity: 1,
    damagedQuantity: 1,
    updatedBy: "user-2",
  });

  const completed = await context.service.complete(
    "tenant-1",
    context.receiving.id,
    "user-3",
  );

  assert.equal(completed.status, "completed");
  assert.equal(
    completed.completedAt,
    "2026-08-05T00:00:00.000Z",
  );

  const movements =
    await context.inventory.repository.listMovements({
      tenantId: "tenant-1",
    });

  assert.equal(movements.length, 1);
  assert.equal(movements[0].movementType, "purchase_receipt");
  assert.equal(movements[0].quantity, 8);
  assert.equal(
    movements[0].reference.referenceId,
    context.receiving.id,
  );

  const balances =
    await context.inventory.repository.listBalances({
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      locationId: "receiving-location-1",
      productId: "product-1",
    });

  assert.equal(balances.length, 1);
  assert.equal(balances[0].quantity, 8);
});

test("fazla teslimata izin verilmeyen satır beklenen miktarı aşamaz", async () => {
  const module = await loadWarehouseModule();
  const context = await createReceivingWithItem(module);

  await context.service.start(
    "tenant-1",
    context.receiving.id,
  );

  await assert.rejects(
    context.service.receiveQuantity({
      tenantId: "tenant-1",
      receivingId: context.receiving.id,
      receivingItemId: context.item.id,
      receivedQuantity: 11,
      acceptedQuantity: 11,
      rejectedQuantity: 0,
      damagedQuantity: 0,
      updatedBy: "user-2",
    }),
    /Fazla teslimata izin verilmediği/,
  );
});

test("kalite kontrol gereken mal kabul önce kalite kontrol durumuna geçer", async () => {
  const module = await loadWarehouseModule();
  const context = await createReceivingWithItem(module, {
    receiving: {
      referenceId: "purchase-order-quality-1",
    },
    item: {
      qualityControlRequired: true,
      tracking: {
        lotNumber: "LOT-2026-001",
        expiryDate: "2027-08-05T00:00:00.000Z",
      },
    },
  });

  await context.service.start(
    "tenant-1",
    context.receiving.id,
  );

  await context.service.receiveQuantity({
    tenantId: "tenant-1",
    receivingId: context.receiving.id,
    receivingItemId: context.item.id,
    receivedQuantity: 10,
    acceptedQuantity: 10,
    rejectedQuantity: 0,
    damagedQuantity: 0,
    updatedBy: "quality-user",
  });

  const qualityControl = await context.service.complete(
    "tenant-1",
    context.receiving.id,
    "quality-user",
  );

  assert.equal(qualityControl.status, "quality_control");

  const beforeMovements =
    await context.inventory.repository.listMovements({
      tenantId: "tenant-1",
    });

  assert.equal(beforeMovements.length, 0);

  const completed =
    await context.service.completeQualityControl(
      "tenant-1",
      context.receiving.id,
      "quality-manager",
    );

  assert.equal(completed.status, "completed");

  const movements =
    await context.inventory.repository.listMovements({
      tenantId: "tenant-1",
    });

  assert.equal(movements.length, 1);
  assert.equal(movements[0].quantity, 10);
  assert.equal(
    movements[0].tracking.lotNumber,
    "LOT-2026-001",
  );
});

test("aynı referans belge için ikinci mal kabul oluşturulamaz", async () => {
  const module = await loadWarehouseModule();
  const context = createReceivingContext(module);

  const input = {
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    receivingLocationId: "receiving-location-1",
    source: "purchase_order",
    referenceType: "purchase_order",
    referenceId: "purchase-order-duplicate",
    referenceNumber: "SAS-DUPLICATE",
    createdBy: "user-1",
  };

  await context.service.create(input);

  await assert.rejects(
    context.service.create(input),
    /daha önce mal kabul kaydı oluşturulmuş/,
  );
});

test("stoğa işlenen mal kabul doğrudan iptal edilemez", async () => {
  const module = await loadWarehouseModule();
  const context = await createReceivingWithItem(module, {
    receiving: {
      referenceId: "purchase-order-cancel-1",
    },
  });

  await context.service.start(
    "tenant-1",
    context.receiving.id,
  );

  await context.service.receiveQuantity({
    tenantId: "tenant-1",
    receivingId: context.receiving.id,
    receivingItemId: context.item.id,
    receivedQuantity: 10,
    acceptedQuantity: 10,
    rejectedQuantity: 0,
    damagedQuantity: 0,
    updatedBy: "user-2",
  });

  await context.service.complete(
    "tenant-1",
    context.receiving.id,
    "user-3",
  );

  await assert.rejects(
    context.service.cancel(
      "tenant-1",
      context.receiving.id,
      "Yanlış kayıt",
    ),
    /tekrar iptal edilemez/,
  );
});

test("geçersiz görev planlama tarihi Türkçe doğrulama hatası üretir", async () => {
  const module = await loadWarehouseModule();
  const context = await createReceivingWithItem(module, {
    receiving: {
      referenceId: "purchase-order-task-1",
    },
  });

  await assert.rejects(
    context.service.createTask({
      tenantId: "tenant-1",
      receivingId: context.receiving.id,
      type: "unloading",
      plannedAt: "geçersiz-tarih",
      createdBy: "user-1",
    }),
    /Görev planlama tarihi geçerli bir tarih olmalıdır/,
  );
});
