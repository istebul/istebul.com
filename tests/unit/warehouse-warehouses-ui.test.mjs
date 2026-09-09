import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("WarehouseIQ Depo Yönetimi paneli HTML'e bağlıdır", async () => {
  const html = await readFile("warehouse/index.html", "utf8");

  assert.match(
    html,
    /<article[^>]*id="depo-yonetimi"[^>]*>/
  );

  assert.match(
    html,
    /<script type="module" src="\/js\/warehouse\/warehouses-ui\.js"><\/script>/
  );

  assert.match(html, /id="depo-form"/);
  assert.match(html, /id="depo-yonetim-listesi"/);
});

test("WarehouseIQ Depo Yönetimi temel alanlarını içerir", async () => {
  const html = await readFile("warehouse/index.html", "utf8");

  for (const id of [
    "depo-kodu",
    "depo-adi",
    "depo-saat-dilimi",
    "depo-aciklama",
    "depo-adres",
    "depo-ilce",
    "depo-sehir",
    "depo-posta-kodu",
    "depo-ulke-kodu",
    "depo-toplam-alan",
    "depo-kullanilabilir-alan",
    "depo-maksimum-palet",
    "depo-maksimum-bin",
  ]) {
    assert.match(
      html,
      new RegExp(`id="${id}"`),
      `Eksik depo yönetimi alanı: ${id}`
    );
  }
});

test("WarehouseIQ Depo Yönetimi mevcut Operations Center session/context akışını kullanır", async () => {
  const js = await readFile(
    "js/warehouse/warehouses-ui.js",
    "utf8"
  );

  assert.match(
    js,
    /import\s*\{[\s\S]*getWarehouseOperationsContext[\s\S]*getWarehouseSession[\s\S]*\}\s*from\s+"\.\/operations-center\.js\?v=20799872";/
  );

  assert.match(
    js,
    /getWarehouseSession\s*\(/
  );

  assert.match(
    js,
    /getWarehouseOperationsContext\s*\(/
  );

  assert.match(
    js,
    /Authorization:\s*`Bearer \$\{session\.access_token\}`/
  );
});

test("WarehouseIQ Depo Yönetimi aynı warehouse API yüzeyini kullanır", async () => {
  const js = await readFile(
    "js/warehouse/warehouses-ui.js",
    "utf8"
  );

  assert.match(
    js,
    /\/api\/warehouse\/warehouses/
  );

  assert.match(
    js,
    /authenticatedRequest\(\s*`\/api\/warehouse\/warehouses\?\$\{params\.toString\(\)\}`/
  );

  assert.match(
    js,
    /method:\s*"POST"/
  );

  assert.match(
    js,
    /method:\s*"PATCH"/
  );
});

test("WarehouseIQ Depo Yönetimi create/update/status RPC sözleşmesini korur", async () => {
  const js = await readFile(
    "js/warehouse/warehouses-ui.js",
    "utf8"
  );

  assert.match(
    js,
    /\/api\/warehouse\/warehouses/
  );

  assert.match(
    js,
    /requestId:\s*globalThis\.crypto\.randomUUID\(\)/
  );

  assert.match(
    js,
    /warehouseId:\s*selectedWarehouseId/
  );

  assert.match(
    js,
    /status/
  );
});

test("WarehouseIQ Depo Yönetimi flat warehouse API alanlarını okuyabilir", async () => {
  const js = await readFile(
    "js/warehouse/warehouses-ui.js",
    "utf8"
  );

  for (const field of [
    "warehouse.address_line",
    "warehouse.district",
    "warehouse.city",
    "warehouse.postal_code",
    "warehouse.country_code",
    "warehouse.total_area_square_meters",
    "warehouse.usable_area_square_meters",
    "warehouse.maximum_pallet_capacity",
    "warehouse.maximum_bin_capacity",
  ]) {
    assert.ok(
      js.includes(field),
      `Eksik flat warehouse alanı: ${field}`
    );
  }
});

test("WarehouseIQ Depo Yönetimi nested veri fallback'lerini korur", async () => {
  const js = await readFile(
    "js/warehouse/warehouses-ui.js",
    "utf8"
  );

  for (const fallback of [
    "warehouse.address?.addressLine",
    "warehouse.address?.district",
    "warehouse.address?.city",
    "warehouse.address?.postalCode",
    "warehouse.address?.countryCode",
    "warehouse.capacity?.totalAreaSquareMeters",
    "warehouse.capacity?.usableAreaSquareMeters",
    "warehouse.capacity?.maximumPalletCapacity",
    "warehouse.capacity?.maximumBinCapacity",
  ]) {
    assert.ok(
      js.includes(fallback),
      `Eksik nested fallback: ${fallback}`
    );
  }
});

test("WarehouseIQ Depo Yönetimi create ile update akışını ayırır", async () => {
  const js = await readFile(
    "js/warehouse/warehouses-ui.js",
    "utf8"
  );

  assert.match(
    js,
    /if\s*\(loading\)\s*\{\s*return;\s*\}/
  );

  assert.match(
    js,
    /if\s*\(selectedWarehouseId\)\s*\{\s*return updateWarehouse\(\);\s*\}/
  );

  assert.match(
    js,
    /Depo Oluştur/
  );
});

test("WarehouseIQ Depo Yönetimi status seçeneklerini tanımlar", async () => {
  const js = await readFile(
    "js/warehouse/warehouses-ui.js",
    "utf8"
  );

  for (const status of [
    "draft",
    "active",
    "temporarily_closed",
    "inactive",
    "archived",
  ]) {
    assert.ok(
      js.includes(status),
      `Eksik warehouse status: ${status}`
    );
  }
});

test("WarehouseIQ Depo Yönetimi mevcut lokasyon yönetimi yüzeyini bozmaz", async () => {
  const html = await readFile("warehouse/index.html", "utf8");

  const warehousePanelMatches =
    html.match(/id="depo-yonetimi"/g) ?? [];

  const locationPanelMatches =
    html.match(/id="lokasyonlar"/g) ?? [];

  assert.equal(
    warehousePanelMatches.length,
    1,
    "Depo Yönetimi paneli tam olarak bir kez bulunmalı"
  );

  assert.equal(
    locationPanelMatches.length,
    1,
    "Lokasyon Yönetimi paneli tam olarak bir kez bulunmalı"
  );

  assert.match(
    html,
    /id="depo-yonetimi"[\s\S]*?id="lokasyonlar"/
  );
});

test("WarehouseIQ Depo Yönetimi CSS yüzeyini kullanır", async () => {
  const css = await readFile(
    "css/warehouse/operations-center.css",
    "utf8"
  );

  for (const selector of [
    ".warehouse-management-grid",
    ".warehouse-form-section",
    ".warehouse-list",
    "#depo-yonetim-listesi",
  ]) {
    assert.ok(
      css.includes(selector),
      `Eksik CSS selector: ${selector}`
    );
  }
});

test("WarehouseIQ production build Depo Yönetimi dosyalarını yayınlar", async () => {
  const build = await readFile(
    "scripts/production-build.cjs",
    "utf8"
  );

  for (const path of [
    "warehouse/index.html",
    "css/warehouse/operations-center.css",
    "js/warehouse/warehouses-ui.js",
  ]) {
    assert.ok(
      build.includes(`'${path}'`),
      `Production build listesinde eksik: ${path}`
    );
  }
});

test("WarehouseIQ Depo Yönetimi source ve dist yüzeyleri mevcuttur", async () => {
  const [
    sourceJs,
    distJs,
    sourceHtml,
    distHtml,
  ] = await Promise.all([
    readFile(
      "js/warehouse/warehouses-ui.js",
      "utf8"
    ),
    readFile(
      "dist/js/warehouse/warehouses-ui.js",
      "utf8"
    ),
    readFile(
      "warehouse/index.html",
      "utf8"
    ),
    readFile(
      "dist/warehouse/index.html",
      "utf8"
    ),
  ]);

  assert.ok(sourceJs.length > 0);
  assert.ok(distJs.length > 0);
  assert.ok(sourceHtml.length > 0);
  assert.ok(distHtml.length > 0);

  assert.match(
    distHtml,
    /\/js\/warehouse\/warehouses-ui\.js/
  );
});
