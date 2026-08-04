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

test("stok hareket türleri Türkçe etiketlere sahiptir", async () => {
  const module = await loadWarehouseModule();

  assert.equal(
    module.INVENTORY_MOVEMENT_TYPE_LABELS.goods_receipt,
    "Mal Kabul",
  );

  assert.equal(
    module.INVENTORY_MOVEMENT_TYPE_LABELS.location_transfer,
    "Lokasyon Transferi",
  );

  assert.equal(
    module.INVENTORY_MOVEMENT_TYPE_LABELS.order_issue,
    "Sipariş Çıkışı",
  );

  assert.equal(
    module.INVENTORY_MOVEMENT_TYPE_LABELS.reversal,
    "Ters Kayıt",
  );
});

test("stok hareket yönleri Türkçe etiketlere sahiptir", async () => {
  const module = await loadWarehouseModule();

  assert.equal(
    module.INVENTORY_DIRECTION_LABELS.inbound,
    "Giriş",
  );

  assert.equal(
    module.INVENTORY_DIRECTION_LABELS.outbound,
    "Çıkış",
  );

  assert.equal(
    module.INVENTORY_DIRECTION_LABELS.transfer,
    "Transfer",
  );

  assert.equal(
    module.INVENTORY_DIRECTION_LABELS.adjustment,
    "Düzeltme",
  );
});

test("stok durumları Türkçe etiketlere sahiptir", async () => {
  const module = await loadWarehouseModule();

  assert.equal(
    module.INVENTORY_STOCK_STATUS_LABELS.available,
    "Kullanılabilir",
  );

  assert.equal(
    module.INVENTORY_STOCK_STATUS_LABELS.reserved,
    "Rezerve",
  );

  assert.equal(
    module.INVENTORY_STOCK_STATUS_LABELS.quality_control,
    "Kalite Kontrolde",
  );

  assert.equal(
    module.INVENTORY_STOCK_STATUS_LABELS.in_transit,
    "Transferde",
  );
});

test("rezervasyon durumları Türkçe etiketlere sahiptir", async () => {
  const module = await loadWarehouseModule();

  assert.equal(
    module.INVENTORY_RESERVATION_STATUS_LABELS.active,
    "Aktif",
  );

  assert.equal(
    module.INVENTORY_RESERVATION_STATUS_LABELS.partially_consumed,
    "Kısmen Kullanıldı",
  );

  assert.equal(
    module.INVENTORY_RESERVATION_STATUS_LABELS.cancelled,
    "İptal Edildi",
  );
});

test("hareket türünden yön doğru çözülür", async () => {
  const module = await loadWarehouseModule();

  assert.equal(
    module.resolveInventoryDirection("goods_receipt"),
    "inbound",
  );

  assert.equal(
    module.resolveInventoryDirection("order_issue"),
    "outbound",
  );

  assert.equal(
    module.resolveInventoryDirection("location_transfer"),
    "transfer",
  );

  assert.equal(
    module.resolveInventoryDirection("reservation"),
    "reservation",
  );

  assert.equal(
    module.resolveInventoryDirection("count_surplus"),
    "adjustment",
  );
});

test("stok hareket miktarı sıfırdan büyük olmalıdır", async () => {
  const module = await loadWarehouseModule();

  assert.throws(
    () =>
      module.validateCreateInventoryMovementInput({
        tenantId: "tenant-1",
        movementType: "goods_receipt",
        warehouseId: "warehouse-1",
        locationId: "location-1",
        productId: "product-1",
        quantity: 0,
        unit: "piece",
        createdBy: "user-1",
      }),
    module.InventoryValidationError,
  );
});

test("stok hareketi zorunlu kimlikleri doğrular", async () => {
  const module = await loadWarehouseModule();

  assert.throws(
    () =>
      module.validateCreateInventoryMovementInput({
        tenantId: "",
        movementType: "goods_receipt",
        warehouseId: "warehouse-1",
        locationId: "location-1",
        productId: "product-1",
        quantity: 10,
        unit: "piece",
        createdBy: "user-1",
      }),
    module.InventoryValidationError,
  );
});

test("lokasyon transferinde hedef lokasyon zorunludur", async () => {
  const module = await loadWarehouseModule();

  assert.throws(
    () =>
      module.validateCreateInventoryMovementInput({
        tenantId: "tenant-1",
        movementType: "location_transfer",
        warehouseId: "warehouse-1",
        locationId: "location-1",
        productId: "product-1",
        quantity: 5,
        unit: "piece",
        createdBy: "user-1",
      }),
    module.InventoryValidationError,
  );
});

test("ters kayıt için kaynak hareket kimliği zorunludur", async () => {
  const module = await loadWarehouseModule();

  assert.throws(
    () =>
      module.validateCreateInventoryMovementInput({
        tenantId: "tenant-1",
        movementType: "reversal",
        warehouseId: "warehouse-1",
        locationId: "location-1",
        productId: "product-1",
        quantity: 5,
        unit: "piece",
        createdBy: "user-1",
      }),
    module.InventoryValidationError,
  );
});

test("stok hareketi metin alanlarını normalize eder", async () => {
  const module = await loadWarehouseModule();

  const input =
    module.validateCreateInventoryMovementInput({
      tenantId: " tenant-1 ",
      movementType: "goods_receipt",
      warehouseId: " warehouse-1 ",
      locationId: " location-1 ",
      productId: " product-1 ",
      skuId: " sku-1 ",
      quantity: 10,
      unit: " piece ",
      reason: " Mal kabul ",
      notes: " Kontrol edildi ",
      createdBy: " user-1 ",
    });

  assert.equal(input.tenantId, "tenant-1");
  assert.equal(input.warehouseId, "warehouse-1");
  assert.equal(input.locationId, "location-1");
  assert.equal(input.productId, "product-1");
  assert.equal(input.skuId, "sku-1");
  assert.equal(input.unit, "piece");
  assert.equal(input.reason, "Mal kabul");
  assert.equal(input.notes, "Kontrol edildi");
});

test("takip alanlarını normalize eder", async () => {
  const module = await loadWarehouseModule();

  const input =
    module.validateCreateInventoryMovementInput({
      tenantId: "tenant-1",
      movementType: "goods_receipt",
      warehouseId: "warehouse-1",
      locationId: "location-1",
      productId: "product-1",
      quantity: 10,
      unit: "piece",
      tracking: {
        lotNumber: " LOT-001 ",
        serialNumber: " SN-001 ",
      },
      createdBy: "user-1",
    });

  assert.equal(input.tracking.lotNumber, "LOT-001");
  assert.equal(input.tracking.serialNumber, "SN-001");
});

test("üretim tarihi son kullanma tarihinden sonra olamaz", async () => {
  const module = await loadWarehouseModule();

  assert.throws(
    () =>
      module.validateCreateInventoryMovementInput({
        tenantId: "tenant-1",
        movementType: "goods_receipt",
        warehouseId: "warehouse-1",
        locationId: "location-1",
        productId: "product-1",
        quantity: 10,
        unit: "piece",
        tracking: {
          productionDate: "2026-08-10",
          expiryDate: "2026-08-01",
        },
        createdBy: "user-1",
      }),
    module.InventoryValidationError,
  );
});

test("geçerli tarihler ISO formatına dönüştürülür", async () => {
  const module = await loadWarehouseModule();

  const input =
    module.validateCreateInventoryMovementInput({
      tenantId: "tenant-1",
      movementType: "goods_receipt",
      warehouseId: "warehouse-1",
      locationId: "location-1",
      productId: "product-1",
      quantity: 10,
      unit: "piece",
      occurredAt: "2026-08-04T10:00:00+03:00",
      tracking: {
        productionDate: "2026-08-01",
        expiryDate: "2027-08-01",
      },
      createdBy: "user-1",
    });

  assert.match(input.occurredAt, /Z$/);
  assert.match(input.tracking.productionDate, /Z$/);
  assert.match(input.tracking.expiryDate, /Z$/);
});

test("referans alanları normalize edilir", async () => {
  const module = await loadWarehouseModule();

  const input =
    module.validateCreateInventoryMovementInput({
      tenantId: "tenant-1",
      movementType: "purchase_receipt",
      warehouseId: "warehouse-1",
      locationId: "location-1",
      productId: "product-1",
      quantity: 10,
      unit: "piece",
      reference: {
        referenceType: " purchase_order ",
        referenceId: " po-1 ",
        referenceNumber: " SAT-2026-001 ",
      },
      createdBy: "user-1",
    });

  assert.equal(
    input.reference.referenceType,
    "purchase_order",
  );

  assert.equal(input.reference.referenceId, "po-1");

  assert.equal(
    input.reference.referenceNumber,
    "SAT-2026-001",
  );
});
