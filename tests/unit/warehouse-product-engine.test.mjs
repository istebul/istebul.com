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

function createService(module) {
  let id = 0;

  return new module.ProductService({
    repository: new module.InMemoryProductRepository(),
    createId: () => `id-${++id}`,
    now: () => "2026-08-04T14:00:00.000Z",
  });
}

test("ProductService ürün oluşturur ve kodu normalize eder", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  const product = await service.create({
    tenantId: "tenant-1",
    code: "urun-001",
    name: "Deneme Ürünü",
    baseUnit: "piece",
    createdBy: "user-1",
  });

  assert.equal(product.code, "URUN-001");
  assert.equal(product.status, "draft");
  assert.equal(product.baseUnit, "piece");
  assert.equal(product.tracking.lotTrackingRequired, false);
  assert.equal(product.hazardousMaterial, false);
});

test("ProductService aynı tenant içinde ürün kodu çakışmasını engeller", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  await service.create({
    tenantId: "tenant-1",
    code: "URUN-001",
    name: "Birinci Ürün",
    baseUnit: "piece",
    createdBy: "user-1",
  });

  await assert.rejects(
    () =>
      service.create({
        tenantId: "tenant-1",
        code: "urun-001",
        name: "İkinci Ürün",
        baseUnit: "piece",
        createdBy: "user-1",
      }),
    module.ProductCodeConflictError,
  );
});

test("Ürün repository tenant izolasyonu uygular", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  const product = await service.create({
    tenantId: "tenant-1",
    code: "URUN-001",
    name: "Deneme Ürünü",
    baseUnit: "piece",
    createdBy: "user-1",
  });

  await assert.rejects(
    () => service.get("tenant-2", product.id),
    module.ProductNotFoundError,
  );
});

test("ProductService geçerli durum geçişini uygular", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  const product = await service.create({
    tenantId: "tenant-1",
    code: "URUN-001",
    name: "Deneme Ürünü",
    baseUnit: "piece",
    createdBy: "user-1",
  });

  const active = await service.changeStatus(
    "tenant-1",
    product.id,
    "active",
  );

  assert.equal(active.status, "active");
});

test("ProductService geçersiz durum geçişini engeller", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  const product = await service.create({
    tenantId: "tenant-1",
    code: "URUN-001",
    name: "Deneme Ürünü",
    baseUnit: "piece",
    createdBy: "user-1",
  });

  await assert.rejects(
    () =>
      service.changeStatus(
        "tenant-1",
        product.id,
        "inactive",
      ),
    module.ProductValidationError,
  );
});

test("Son kullanma tarihi takibi lot veya seri numarası gerektirir", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  await assert.rejects(
    () =>
      service.create({
        tenantId: "tenant-1",
        code: "URUN-001",
        name: "Takipli Ürün",
        baseUnit: "piece",
        tracking: {
          expiryDateTrackingRequired: true,
        },
        createdBy: "user-1",
      }),
    module.ProductValidationError,
  );
});

test("Minimum stok maksimum stoktan büyük olamaz", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  await assert.rejects(
    () =>
      service.create({
        tenantId: "tenant-1",
        code: "URUN-001",
        name: "Stok Kurallı Ürün",
        baseUnit: "piece",
        stockRules: {
          minimumStockQuantity: 100,
          maximumStockQuantity: 50,
        },
        createdBy: "user-1",
      }),
    module.ProductValidationError,
  );
});

test("ProductService SKU oluşturur ve kodu normalize eder", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  const product = await service.create({
    tenantId: "tenant-1",
    code: "URUN-001",
    name: "Deneme Ürünü",
    baseUnit: "piece",
    createdBy: "user-1",
  });

  const sku = await service.createSku({
    tenantId: "tenant-1",
    productId: product.id,
    skuCode: "sku.001",
    name: "Deneme SKU",
    unit: "box",
    conversionFactor: 12,
    createdBy: "user-1",
  });

  assert.equal(sku.skuCode, "SKU.001");
  assert.equal(sku.conversionFactor, 12);
  assert.equal(sku.active, true);
});

test("SKU dönüşüm katsayısı sıfırdan büyük olmalıdır", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  const product = await service.create({
    tenantId: "tenant-1",
    code: "URUN-001",
    name: "Deneme Ürünü",
    baseUnit: "piece",
    createdBy: "user-1",
  });

  await assert.rejects(
    () =>
      service.createSku({
        tenantId: "tenant-1",
        productId: product.id,
        skuCode: "SKU-001",
        name: "Geçersiz SKU",
        unit: "box",
        conversionFactor: 0,
        createdBy: "user-1",
      }),
    module.ProductValidationError,
  );
});

test("ProductService aynı tenant içinde SKU kodu çakışmasını engeller", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  const product = await service.create({
    tenantId: "tenant-1",
    code: "URUN-001",
    name: "Deneme Ürünü",
    baseUnit: "piece",
    createdBy: "user-1",
  });

  const input = {
    tenantId: "tenant-1",
    productId: product.id,
    skuCode: "SKU-001",
    name: "Deneme SKU",
    unit: "box",
    createdBy: "user-1",
  };

  await service.createSku(input);

  await assert.rejects(
    () => service.createSku(input),
    module.ProductSkuConflictError,
  );
});

test("ProductService barkod oluşturur", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  const product = await service.create({
    tenantId: "tenant-1",
    code: "URUN-001",
    name: "Deneme Ürünü",
    baseUnit: "piece",
    createdBy: "user-1",
  });

  const barcode = await service.createBarcode({
    tenantId: "tenant-1",
    productId: product.id,
    value: "8691234567890",
    type: "ean13",
    primary: true,
    createdBy: "user-1",
  });

  assert.equal(barcode.value, "8691234567890");
  assert.equal(barcode.type, "ean13");
  assert.equal(barcode.primary, true);
});

test("ProductService barkod çakışmasını engeller", async () => {
  const module = await loadWarehouseModule();
  const service = createService(module);

  const product = await service.create({
    tenantId: "tenant-1",
    code: "URUN-001",
    name: "Deneme Ürünü",
    baseUnit: "piece",
    createdBy: "user-1",
  });

  const input = {
    tenantId: "tenant-1",
    productId: product.id,
    value: "8691234567890",
    type: "ean13",
    createdBy: "user-1",
  };

  await service.createBarcode(input);

  await assert.rejects(
    () => service.createBarcode(input),
    module.ProductBarcodeConflictError,
  );
});

test("Ürün durumu Türkçe etiketleri tanımlıdır", async () => {
  const module = await loadWarehouseModule();

  assert.equal(module.PRODUCT_STATUS_LABELS.draft, "Taslak");
  assert.equal(module.PRODUCT_STATUS_LABELS.active, "Aktif");
  assert.equal(
    module.PRODUCT_STATUS_LABELS.discontinued,
    "Üretimi Sonlandırıldı",
  );
});

test("Ölçü birimi Türkçe etiketleri tanımlıdır", async () => {
  const module = await loadWarehouseModule();

  assert.equal(module.UNIT_OF_MEASURE_LABELS.piece, "Adet");
  assert.equal(module.UNIT_OF_MEASURE_LABELS.case, "Koli");
  assert.equal(module.UNIT_OF_MEASURE_LABELS.pallet, "Palet");
});

test("Barkod türü Türkçe etiketleri tanımlıdır", async () => {
  const module = await loadWarehouseModule();

  assert.equal(module.BARCODE_TYPE_LABELS.qr, "QR Kod");
  assert.equal(
    module.BARCODE_TYPE_LABELS.internal,
    "Dahili Barkod",
  );
});
