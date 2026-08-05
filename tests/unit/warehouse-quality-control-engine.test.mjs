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

function createContext(module) {
  const repository =
    new module.InMemoryQualityInspectionRepository();

  let id = 0;

  const service = new module.QualityInspectionService({
    repository,
    createId: () => `quality-entity-${++id}`,
    now: () => "2026-08-05T12:00:00.000Z",
    sequence: () => id + 1,
  });

  return {
    repository,
    service,
  };
}

async function createInspectionWithItem(
  module,
  overrides = {},
) {
  const context = createContext(module);

  const inspection = await context.service.create({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    locationId: "quality-location-1",
    receivingId: "receiving-1",
    referenceType: "receiving",
    referenceId: "receiving-1",
    referenceNumber: "MK-20260805-000001",
    createdBy: "user-1",
    ...overrides.inspection,
  });

  const item = await context.service.addItem({
    tenantId: "tenant-1",
    inspectionId: inspection.id,
    productId: "product-1",
    receivingId: "receiving-1",
    receivingItemId: "receiving-item-1",
    warehouseId: "warehouse-1",
    locationId: "quality-location-1",
    controlType: "receiving_inspection",
    inspectedQuantity: 10,
    unit: "piece",
    createdBy: "user-1",
    ...overrides.item,
  });

  return {
    ...context,
    inspection,
    item,
  };
}

test("kalite kontrol oluşturulur, satır eklenir ve başlatılır", async () => {
  const module = await loadWarehouseModule();
  const context = await createInspectionWithItem(module);

  assert.equal(context.inspection.status, "draft");
  assert.match(
    context.inspection.inspectionNumber,
    /^KK-20260805-\d{6}$/,
  );

  const started = await context.service.start(
    "tenant-1",
    context.inspection.id,
  );

  assert.equal(started.status, "in_progress");
  assert.equal(
    started.startedAt,
    "2026-08-05T12:00:00.000Z",
  );
});

test("sonuç miktar toplamı kontrol miktarına eşit olmalıdır", async () => {
  const module = await loadWarehouseModule();
  const context = await createInspectionWithItem(module);

  await context.service.start(
    "tenant-1",
    context.inspection.id,
  );

  await assert.rejects(
    context.service.recordResult({
      tenantId: "tenant-1",
      inspectionId: context.inspection.id,
      inspectionItemId: context.item.id,
      acceptedQuantity: 5,
      rejectedQuantity: 2,
      conditionalQuantity: 1,
      holdQuantity: 1,
      decision: "conditionally_accepted",
      inspectedBy: "quality-user",
    }),
    /kontrol miktarına eşit olmalıdır/,
  );
});

test("tüm satırlar sonuçlanınca kayıt sonuç bekliyor durumuna geçer", async () => {
  const module = await loadWarehouseModule();
  const context = await createInspectionWithItem(module);

  await context.service.start(
    "tenant-1",
    context.inspection.id,
  );

  const item = await context.service.recordResult({
    tenantId: "tenant-1",
    inspectionId: context.inspection.id,
    inspectionItemId: context.item.id,
    acceptedQuantity: 8,
    rejectedQuantity: 1,
    conditionalQuantity: 1,
    holdQuantity: 0,
    decision: "conditionally_accepted",
    inspectedBy: "quality-user",
  });

  assert.equal(item.decision, "conditionally_accepted");

  const refreshed = await context.service.get(
    "tenant-1",
    context.inspection.id,
  );

  assert.equal(refreshed.status, "waiting_result");
});

test("nihai karar risk önceliğine göre hesaplanır", async () => {
  const module = await loadWarehouseModule();
  const context = await createInspectionWithItem(module);

  const secondItem = await context.service.addItem({
    tenantId: "tenant-1",
    inspectionId: context.inspection.id,
    productId: "product-2",
    receivingId: "receiving-1",
    receivingItemId: "receiving-item-2",
    warehouseId: "warehouse-1",
    locationId: "quality-location-1",
    controlType: "visual_inspection",
    inspectedQuantity: 5,
    unit: "piece",
    createdBy: "user-1",
  });

  await context.service.start(
    "tenant-1",
    context.inspection.id,
  );

  await context.service.recordResult({
    tenantId: "tenant-1",
    inspectionId: context.inspection.id,
    inspectionItemId: context.item.id,
    acceptedQuantity: 10,
    rejectedQuantity: 0,
    conditionalQuantity: 0,
    holdQuantity: 0,
    decision: "accepted",
    inspectedBy: "quality-user",
  });

  await context.service.recordResult({
    tenantId: "tenant-1",
    inspectionId: context.inspection.id,
    inspectionItemId: secondItem.id,
    acceptedQuantity: 0,
    rejectedQuantity: 5,
    conditionalQuantity: 0,
    holdQuantity: 0,
    decision: "rejected",
    inspectedBy: "quality-user",
  });

  const completed = await context.service.complete(
    "tenant-1",
    context.inspection.id,
    "quality-manager",
  );

  assert.equal(completed.status, "completed");
  assert.equal(completed.finalDecision, "rejected");
});

test("aynı mal kabul için ikinci kalite kontrol oluşturulamaz", async () => {
  const module = await loadWarehouseModule();
  const context = createContext(module);

  const input = {
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    locationId: "quality-location-1",
    receivingId: "receiving-duplicate",
    referenceType: "receiving",
    referenceId: "receiving-duplicate",
    createdBy: "user-1",
  };

  await context.service.create(input);

  await assert.rejects(
    context.service.create(input),
    /daha önce kalite kontrol oluşturulmuş/,
  );
});

test("numune oluşturulur ve ana kalite kaydına eklenir", async () => {
  const module = await loadWarehouseModule();
  const context = await createInspectionWithItem(module);

  const sample = await context.service.createSample({
    tenantId: "tenant-1",
    inspectionId: context.inspection.id,
    inspectionItemId: context.item.id,
    quantity: 2,
    unit: "piece",
    lotNumber: "LOT-001",
    createdBy: "quality-user",
  });

  assert.equal(sample.status, "planned");
  assert.match(sample.sampleNumber, /^NUM-20260805-\d{6}$/);

  const refreshed = await context.service.get(
    "tenant-1",
    context.inspection.id,
  );

  assert.equal(refreshed.samples.length, 1);
  assert.equal(refreshed.samples[0].lotNumber, "LOT-001");
});

test("kalite istisnası oluşturulur ve çözülebilir", async () => {
  const module = await loadWarehouseModule();
  const context = await createInspectionWithItem(module);

  const exception = await context.service.createException({
    tenantId: "tenant-1",
    inspectionId: context.inspection.id,
    inspectionItemId: context.item.id,
    type: "temperature_out_of_range",
    message: "Ürün sıcaklığı kabul aralığının dışında.",
    expectedValue: "2-8 °C",
    actualValue: "11 °C",
  });

  assert.equal(exception.resolved, false);

  const resolved = await context.service.resolveException({
    tenantId: "tenant-1",
    inspectionId: context.inspection.id,
    exceptionId: exception.id,
    resolvedBy: "quality-manager",
    resolutionNotes: "Ürün karantinaya alındı.",
  });

  assert.equal(resolved.resolved, true);
  assert.equal(resolved.resolvedBy, "quality-manager");

  const exceptions = await context.service.listExceptions(
    "tenant-1",
    context.inspection.id,
  );

  assert.equal(exceptions.length, 1);
  assert.equal(exceptions[0].resolved, true);
});

test("tamamlanmış kalite kontrol iptal edilemez", async () => {
  const module = await loadWarehouseModule();
  const context = await createInspectionWithItem(module);

  await context.service.start(
    "tenant-1",
    context.inspection.id,
  );

  await context.service.recordResult({
    tenantId: "tenant-1",
    inspectionId: context.inspection.id,
    inspectionItemId: context.item.id,
    acceptedQuantity: 10,
    rejectedQuantity: 0,
    conditionalQuantity: 0,
    holdQuantity: 0,
    decision: "accepted",
    inspectedBy: "quality-user",
  });

  await context.service.complete(
    "tenant-1",
    context.inspection.id,
    "quality-manager",
  );

  await assert.rejects(
    context.service.cancel(
      "tenant-1",
      context.inspection.id,
      "Yanlış kayıt",
    ),
    /tekrar iptal edilemez/,
  );
});

test("geçersiz görev tarihi Türkçe doğrulama hatası üretir", async () => {
  const module = await loadWarehouseModule();
  const context = await createInspectionWithItem(module);

  await assert.rejects(
    context.service.createTask({
      tenantId: "tenant-1",
      inspectionId: context.inspection.id,
      type: "visual_inspection",
      plannedAt: "geçersiz-tarih",
      createdBy: "quality-user",
    }),
    /Görev planlama tarihi geçerli bir tarih olmalıdır/,
  );
});
