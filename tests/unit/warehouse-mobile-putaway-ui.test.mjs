import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const UI_PATH =
  "js/warehouse/putaway-ui.js";

test("B1.2.2 Putaway UI modülü Warehouse sayfasında yüklenir", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  const operationsIndex =
    html.indexOf(
      "/js/warehouse/operations-center.js"
    );

  const putawayIndex =
    html.indexOf(
      "/js/warehouse/putaway-ui.js"
    );

  assert.ok(operationsIndex >= 0);
  assert.ok(putawayIndex > operationsIndex);
});

test("Putaway UI yalnız read-only lookup bağımlılıklarını kullanır", async () => {
  const source = await readFile(
    UI_PATH,
    "utf8"
  );

  assert.match(
    source,
    /resolvePutawayProductBarcode/
  );

  assert.match(
    source,
    /resolvePutawayLocationBarcode/
  );

  assert.match(
    source,
    /getWarehouseOperationsContext/
  );

  assert.match(
    source,
    /getWarehouseSupabaseClient/
  );
});

test("Aktif Putaway kayıtları firma depo ve çalışma durumuyla okunur", async () => {
  const source = await readFile(
    UI_PATH,
    "utf8"
  );

  assert.match(
    source,
    /\.from\("warehouse_putaways"\)/
  );

  assert.match(
    source,
    /\.eq\(\s*"account_id"/
  );

  assert.match(
    source,
    /\.eq\(\s*"warehouse_id"/
  );

  assert.match(
    source,
    /"in_progress"/
  );

  assert.match(
    source,
    /"partially_completed"/
  );
});

test("Ortak barkod olayı yalnız aktif Yerleştirme panelinde işlenir", async () => {
  const source = await readFile(
    UI_PATH,
    "utf8"
  );

  assert.match(
    source,
    /warehouse:barcode-scan/
  );

  assert.match(
    source,
    /window\.location\.hash ===\s*"#yerlestirme"/
  );

  assert.match(
    source,
    /if \(!putawayPanelIsActive\(\)\)/
  );
});

test("Mal Kabul barkod dinleyicisi Yerleştirme aktifken taramayı işlemez", async () => {
  const receiving = await readFile(
    "js/warehouse/receiving-ui.js",
    "utf8"
  );

  assert.match(
    receiving,
    /window\.location\.hash === "#yerlestirme"/
  );

  assert.match(
    receiving,
    /warehouse:barcode-scan/
  );
});

test("İlk tarama ürün SKU doğrulamasıdır ve ikinci aşamaya geçirir", async () => {
  const source = await readFile(
    UI_PATH,
    "utf8"
  );

  assert.match(
    source,
    /await resolvePutawayProductBarcode\(\{/
  );

  assert.match(
    source,
    /setStage\("location"\)/
  );

  assert.match(
    source,
    /Henüz stok hareketi oluşturulmadı/
  );
});

test("İkinci tarama hedef lokasyonu kaynak lokasyon bağlamıyla doğrular", async () => {
  const source = await readFile(
    UI_PATH,
    "utf8"
  );

  assert.match(
    source,
    /await resolvePutawayLocationBarcode\(\{/
  );

  assert.match(
    source,
    /sourceLocationId:[\s\S]{0,120}source_location_id/
  );

  assert.match(
    source,
    /warehouseId:[\s\S]{0,80}context\.warehouseId/
  );
});

test("Miktar ancak ürün ve lokasyon doğrulamasından sonra açılır", async () => {
  const source = await readFile(
    UI_PATH,
    "utf8"
  );

  assert.match(
    source,
    /quantity\.disabled = false/
  );

  assert.match(
    source,
    /confirmButton\.disabled = false/
  );

  assert.match(
    source,
    /quantity\.max =[\s\S]{0,80}String\(remaining\)/
  );
});

test("Barkod taraması doğrudan Putaway write onayı üretmez", async () => {
  const source = await readFile(
    "js/warehouse/putaway-ui.js",
    "utf8"
  );

  const start = source.indexOf(
    "\"warehouse:barcode-scan\""
  );

  const end = source.indexOf(
    "select?.addEventListener",
    start
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const scanBlock = source.slice(
    start,
    end
  );

  assert.doesNotMatch(
    scanBlock,
    /warehouse:putaway-confirm/
  );
});

test("Putaway UI doğrudan API stok veya mutation yüzeyi açmaz", async () => {
  const source = await readFile(
    UI_PATH,
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /\bfetch\s*\(/
  );

  assert.doesNotMatch(
    source,
    /warehouse_putaway_(write|execute_write|complete_write)/
  );

  assert.doesNotMatch(
    source,
    /warehouse_inventory_(movements|balances)/
  );

  assert.doesNotMatch(
    source,
    /\.(insert|update|upsert|delete)\s*\(/
  );

  assert.doesNotMatch(
    source,
    /SUPABASE_SERVICE_ROLE_KEY|service_role/
  );
});

test("Complete barkod veya execute tarafından otomatik başlatılmaz", async () => {
  const source = await readFile(
    "js/warehouse/putaway-ui.js",
    "utf8"
  );

  const scanStart =
    source.indexOf(
      "\"warehouse:barcode-scan\""
    );

  const scanEnd =
    source.indexOf(
      "select?.addEventListener",
      scanStart
    );

  assert.ok(scanStart >= 0);
  assert.ok(scanEnd > scanStart);

  assert.doesNotMatch(
    source.slice(
      scanStart,
      scanEnd
    ),
    /warehouse:putaway-complete-confirm/
  );

  const writeSuccessStart =
    source.indexOf(
      "\"warehouse:putaway-write-success\""
    );

  const writeSuccessEnd =
    source.indexOf(
      "\"warehouse:putaway-write-error\"",
      writeSuccessStart
    );

  assert.ok(writeSuccessStart >= 0);
  assert.ok(writeSuccessEnd > writeSuccessStart);

  assert.doesNotMatch(
    source.slice(
      writeSuccessStart,
      writeSuccessEnd
    ),
    /warehouse:putaway-complete-confirm/
  );
});
