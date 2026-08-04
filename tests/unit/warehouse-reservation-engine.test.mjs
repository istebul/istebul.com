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

function createInventoryService(module) {
  const repository = new module.InMemoryInventoryRepository();
  let id = 0;

  const service = new module.InventoryService({
    repository,
    createId: () => `movement-${++id}`,
    now: () => "2026-08-04T12:00:00.000Z",
  });

  return { repository, service };
}

test("kullanılabilir stok fiziksel stoktan rezervasyonları düşer", async () => {
  const module = await loadWarehouseModule();

  const availability = module.calculateInventoryAvailability(
    {
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      locationId: "location-1",
      productId: "product-1",
    },
    3,
    [
      {
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        locationId: "location-1",
        productId: "product-1",
        stockStatus: "available",
        quantity: 10,
        unit: "piece",
      },
    ],
  );

  assert.equal(availability.physicalQuantity, 10);
  assert.equal(availability.reservedQuantity, 3);
  assert.equal(availability.availableQuantity, 7);
});

test("FIFO tahsis en eski stok bakiyesinden başlar", async () => {
  const module = await loadWarehouseModule();

  const result = module.allocateInventoryFifo({
    quantity: 7,
    unit: "piece",
    balances: [
      {
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        locationId: "location-new",
        productId: "product-1",
        stockStatus: "available",
        quantity: 5,
        unit: "piece",
        lastMovementAt: "2026-08-03T10:00:00.000Z",
      },
      {
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        locationId: "location-old",
        productId: "product-1",
        stockStatus: "available",
        quantity: 4,
        unit: "piece",
        lastMovementAt: "2026-08-01T10:00:00.000Z",
      },
    ],
  });

  assert.equal(result.fullyAllocated, true);
  assert.equal(result.allocatedQuantity, 7);
  assert.equal(result.remainingQuantity, 0);
  assert.equal(result.allocations.length, 2);
  assert.equal(
    result.allocations[0].balance.locationId,
    "location-old",
  );
  assert.equal(result.allocations[0].allocatedQuantity, 4);
  assert.equal(result.allocations[1].allocatedQuantity, 3);
});

test("rezervasyon oluşturulur ve kullanılabilir stok azalır", async () => {
  const module = await loadWarehouseModule();
  const inventory = createInventoryService(module);

  await inventory.service.recordMovement({
    tenantId: "tenant-1",
    movementType: "goods_receipt",
    warehouseId: "warehouse-1",
    locationId: "location-1",
    productId: "product-1",
    quantity: 10,
    unit: "piece",
    createdBy: "user-1",
  });

  const repository =
    new module.InMemoryReservationRepository();

  const service = new module.ReservationService({
    repository,
    inventoryRepository: inventory.repository,
    createId: () => "reservation-1",
    now: () => "2026-08-04T12:00:00.000Z",
    sequence: () => 1,
  });

  const reservation = await service.create({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    locationId: "location-1",
    productId: "product-1",
    quantity: 4,
    unit: "piece",
    createdBy: "user-1",
  });

  assert.equal(reservation.status, "active");
  assert.equal(reservation.reservationNumber, "REZ-20260804-000001");

  const availability = await service.getAvailability({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    locationId: "location-1",
    productId: "product-1",
  });

  assert.equal(availability.physicalQuantity, 10);
  assert.equal(availability.reservedQuantity, 4);
  assert.equal(availability.availableQuantity, 6);
});

test("rezervasyon kısmi ve tam tüketilebilir", async () => {
  const module = await loadWarehouseModule();
  const inventory = createInventoryService(module);

  await inventory.service.recordMovement({
    tenantId: "tenant-1",
    movementType: "goods_receipt",
    warehouseId: "warehouse-1",
    locationId: "location-1",
    productId: "product-1",
    quantity: 10,
    unit: "piece",
    createdBy: "user-1",
  });

  const service = new module.ReservationService({
    repository: new module.InMemoryReservationRepository(),
    inventoryRepository: inventory.repository,
    createId: () => "reservation-1",
    now: () => "2026-08-04T12:00:00.000Z",
    sequence: () => 1,
  });

  const reservation = await service.create({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    locationId: "location-1",
    productId: "product-1",
    quantity: 6,
    unit: "piece",
    createdBy: "user-1",
  });

  const partial = await service.consume({
    tenantId: "tenant-1",
    reservationId: reservation.id,
    quantity: 2,
  });

  assert.equal(partial.status, "partially_consumed");
  assert.equal(partial.consumedQuantity, 2);

  const completed = await service.consume({
    tenantId: "tenant-1",
    reservationId: reservation.id,
    quantity: 4,
  });

  assert.equal(completed.status, "consumed");
  assert.equal(completed.consumedQuantity, 6);
});

test("yetersiz kullanılabilir stok rezervasyonu engeller", async () => {
  const module = await loadWarehouseModule();
  const inventory = createInventoryService(module);

  await inventory.service.recordMovement({
    tenantId: "tenant-1",
    movementType: "goods_receipt",
    warehouseId: "warehouse-1",
    locationId: "location-1",
    productId: "product-1",
    quantity: 3,
    unit: "piece",
    createdBy: "user-1",
  });

  const service = new module.ReservationService({
    repository: new module.InMemoryReservationRepository(),
    inventoryRepository: inventory.repository,
  });

  await assert.rejects(
    service.create({
      tenantId: "tenant-1",
      warehouseId: "warehouse-1",
      locationId: "location-1",
      productId: "product-1",
      quantity: 5,
      unit: "piece",
      createdBy: "user-1",
    }),
    module.InventoryInsufficientStockError,
  );
});
