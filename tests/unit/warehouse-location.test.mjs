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

async function createServices(module) {
  const warehouseRepository =
    new module.InMemoryWarehouseRepository();

  const warehouseService = new module.WarehouseService({
    repository: warehouseRepository,
    createId: () => "warehouse-1",
    now: () => "2026-08-04T09:00:00.000Z",
  });

  await warehouseService.create({
    tenantId: "tenant-1",
    code: "IZM-01",
    name: "İzmir Ana Depo",
    createdBy: "user-1",
  });

  const locationService = new module.LocationService({
    repository: new module.InMemoryLocationRepository(),
    warehouseRepository,
    createId: () => "location-1",
    now: () => "2026-08-04T09:00:00.000Z",
  });

  return { warehouseService, locationService };
}

test("LocationService hiyerarşik tam kod üretir", async () => {
  const module = await loadWarehouseModule();
  const { locationService } = await createServices(module);

  const location = await locationService.create({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    code: "G014",
    name: "A-05-03-02-014",
    type: "picking",
    hierarchy: {
      zoneCode: "a",
      aisleCode: "05",
      rackCode: "03",
      levelCode: "02",
      binCode: "014",
    },
    createdBy: "user-1",
  });

  assert.equal(location.fullCode, "A-05-03-02-014");
  assert.equal(
    location.barcode,
    "LOC:warehouse-1:A-05-03-02-014",
  );
  assert.equal(location.status, "empty");
});

test("LocationService aynı depo içinde tam kod çakışmasını engeller", async () => {
  const module = await loadWarehouseModule();
  const { locationService } = await createServices(module);

  const input = {
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    code: "G014",
    name: "Lokasyon",
    type: "picking",
    hierarchy: {
      zoneCode: "A",
      aisleCode: "05",
      rackCode: "03",
      levelCode: "02",
      binCode: "014",
    },
    createdBy: "user-1",
  };

  await locationService.create(input);

  await assert.rejects(
    () => locationService.create(input),
    module.LocationCodeConflictError,
  );
});

test("LocationService mevcut olmayan depoya lokasyon eklemez", async () => {
  const module = await loadWarehouseModule();
  const { locationService } = await createServices(module);

  await assert.rejects(
    () =>
      locationService.create({
        tenantId: "tenant-1",
        warehouseId: "missing-warehouse",
        code: "G001",
        name: "Geçersiz Lokasyon",
        type: "picking",
        hierarchy: {
          zoneCode: "A",
          binCode: "001",
        },
        createdBy: "user-1",
      }),
    module.LocationValidationError,
  );
});

test("Location repository tenant ve depo izolasyonu uygular", async () => {
  const module = await loadWarehouseModule();
  const { locationService } = await createServices(module);

  await locationService.create({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    code: "G001",
    name: "Lokasyon",
    type: "reserve",
    hierarchy: {
      zoneCode: "A",
      binCode: "001",
    },
    createdBy: "user-1",
  });

  await assert.rejects(
    () =>
      locationService.get(
        "tenant-2",
        "warehouse-1",
        "location-1",
      ),
    module.LocationNotFoundError,
  );
});

test("LocationService geçerli durum geçişini uygular", async () => {
  const module = await loadWarehouseModule();
  const { locationService } = await createServices(module);

  await locationService.create({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    code: "G001",
    name: "Lokasyon",
    type: "reserve",
    hierarchy: {
      zoneCode: "A",
      binCode: "001",
    },
    createdBy: "user-1",
  });

  const available = await locationService.changeStatus(
    "tenant-1",
    "warehouse-1",
    "location-1",
    "available",
  );

  assert.equal(available.status, "available");
  assert.equal(available.active, true);
});

test("LocationService geçersiz durum geçişini engeller", async () => {
  const module = await loadWarehouseModule();
  const { locationService } = await createServices(module);

  await locationService.create({
    tenantId: "tenant-1",
    warehouseId: "warehouse-1",
    code: "G001",
    name: "Lokasyon",
    type: "reserve",
    hierarchy: {
      zoneCode: "A",
      binCode: "001",
    },
    createdBy: "user-1",
  });

  await assert.rejects(
    () =>
      locationService.changeStatus(
        "tenant-1",
        "warehouse-1",
        "location-1",
        "occupied",
      ),
    module.LocationValidationError,
  );
});

test("Location sıcaklık aralığı doğrulaması çalışır", async () => {
  const module = await loadWarehouseModule();
  const { locationService } = await createServices(module);

  await assert.rejects(
    () =>
      locationService.create({
        tenantId: "tenant-1",
        warehouseId: "warehouse-1",
        code: "S001",
        name: "Soğuk Alan",
        type: "cold_storage",
        hierarchy: {
          zoneCode: "S",
          binCode: "001",
        },
        temperatureMinimumCelsius: 8,
        temperatureMaximumCelsius: 2,
        createdBy: "user-1",
      }),
    module.LocationValidationError,
  );
});

test("buildLocationFullCode lokasyon parçalarını normalize eder", async () => {
  const module = await loadWarehouseModule();

  assert.equal(
    module.buildLocationFullCode({
      zoneCode: "a",
      aisleCode: "01",
      rackCode: "r2",
      levelCode: "03",
      binCode: "b04",
    }),
    "A-01-R2-03-B04",
  );
});
