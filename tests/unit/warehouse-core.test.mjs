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
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

  return import(url);
}

function createWarehouseDependencies(module) {
  return {
    repository: new module.InMemoryWarehouseRepository(),
    createId: () => "warehouse-1",
    now: () => "2026-08-04T09:00:00.000Z",
  };
}

test("WarehouseService depo oluşturur ve kodu normalize eder", async () => {
  const module = await loadWarehouseModule();
  const service = new module.WarehouseService(
    createWarehouseDependencies(module),
  );

  const warehouse = await service.create({
    tenantId: "tenant-1",
    code: "izm-01",
    name: "İzmir Ana Depo",
    createdBy: "user-1",
  });

  assert.equal(warehouse.id, "warehouse-1");
  assert.equal(warehouse.code, "IZM-01");
  assert.equal(warehouse.status, "draft");
  assert.equal(warehouse.timezone, "Europe/Istanbul");
});

test("WarehouseService aynı tenant içinde depo kodu çakışmasını engeller", async () => {
  const module = await loadWarehouseModule();
  let id = 0;

  const service = new module.WarehouseService({
    repository: new module.InMemoryWarehouseRepository(),
    createId: () => `warehouse-${++id}`,
    now: () => "2026-08-04T09:00:00.000Z",
  });

  await service.create({
    tenantId: "tenant-1",
    code: "IZM-01",
    name: "İzmir Ana Depo",
    createdBy: "user-1",
  });

  await assert.rejects(
    () =>
      service.create({
        tenantId: "tenant-1",
        code: "izm-01",
        name: "İkinci Depo",
        createdBy: "user-1",
      }),
    module.WarehouseCodeConflictError,
  );
});

test("Warehouse repository tenant izolasyonu uygular", async () => {
  const module = await loadWarehouseModule();
  const service = new module.WarehouseService(
    createWarehouseDependencies(module),
  );

  await service.create({
    tenantId: "tenant-1",
    code: "IZM-01",
    name: "İzmir Ana Depo",
    createdBy: "user-1",
  });

  await assert.rejects(
    () => service.get("tenant-2", "warehouse-1"),
    module.WarehouseNotFoundError,
  );
});

test("WarehouseService geçerli durum geçişini uygular", async () => {
  const module = await loadWarehouseModule();
  const service = new module.WarehouseService(
    createWarehouseDependencies(module),
  );

  await service.create({
    tenantId: "tenant-1",
    code: "IZM-01",
    name: "İzmir Ana Depo",
    createdBy: "user-1",
  });

  const activated = await service.changeStatus(
    "tenant-1",
    "warehouse-1",
    "active",
  );

  assert.equal(activated.status, "active");
});

test("WarehouseService geçersiz durum geçişini engeller", async () => {
  const module = await loadWarehouseModule();
  const service = new module.WarehouseService(
    createWarehouseDependencies(module),
  );

  await service.create({
    tenantId: "tenant-1",
    code: "IZM-01",
    name: "İzmir Ana Depo",
    createdBy: "user-1",
  });

  await assert.rejects(
    () =>
      service.changeStatus(
        "tenant-1",
        "warehouse-1",
        "inactive",
      ),
    module.WarehouseValidationError,
  );
});

test("Warehouse doğrulaması kullanılabilir alanı sınırlar", async () => {
  const module = await loadWarehouseModule();
  const service = new module.WarehouseService(
    createWarehouseDependencies(module),
  );

  await assert.rejects(
    () =>
      service.create({
        tenantId: "tenant-1",
        code: "IZM-01",
        name: "İzmir Ana Depo",
        createdBy: "user-1",
        capacity: {
          totalAreaSquareMeters: 1000,
          usableAreaSquareMeters: 1200,
        },
      }),
    module.WarehouseValidationError,
  );
});
