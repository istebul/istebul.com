import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("WarehouseIQ gerçek mobil Yerleştirme panelini içerir", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  for (const id of [
    "yerlestirme",
    "yerlestirme-secimi",
    "yerlestirme-asama",
    "yerlestirme-urun-barkod",
    "yerlestirme-lokasyon-barkod",
    "yerlestirme-miktar",
    "yerlestirme-onayla",
    "yerlestirme-tamamla"
  ]) {
    assert.match(
      html,
      new RegExp(`id="${id}"`)
    );
  }
});

test("Yerleştirme menüsü gerçek mobil panele gider", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  assert.match(
    html,
    /href="#yerlestirme">⌑ Yerleştirme/
  );
});

test("Yerleştirme paneli iki aşamalı barkod modelini açıklar", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  assert.match(
    html,
    /Önce ürün veya SKU barkodunu, ardından hedef lokasyon barkodunu okutun/
  );

  assert.match(
    html,
    /1\. ADIM[\s\S]*Ürün \/ SKU barkodu/
  );

  assert.match(
    html,
    /2\. ADIM[\s\S]*Hedef lokasyon barkodu/
  );
});

test("Barkod okutma tek başına stok hareketi oluşturmaz", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  assert.match(
    html,
    /Barkod okutma tek başına stok hareketi oluşturmaz/
  );
});

test("Yerleştirme onayı başlangıçta kapalıdır", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  assert.match(
    html,
    /id="yerlestirme-onayla"[\s\S]{0,120}disabled/
  );

  assert.match(
    html,
    />\s*Yerleştirmeyi Onayla\s*</
  );
});

test("Yerleştirmeyi Tamamla ayrı ve başlangıçta kapalıdır", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  assert.match(
    html,
    /id="yerlestirme-tamamla"[\s\S]{0,120}disabled/
  );

  assert.match(
    html,
    />\s*Yerleştirmeyi Tamamla\s*</
  );

  assert.match(
    html,
    /ayrıca açık kullanıcı onayı gerektirir/
  );
});

test("Warehouse HTML kabuğu direct RPC veya service role sözleşmesi gömmez", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  assert.doesNotMatch(
    html,
    /warehouse_putaway_execute_write/
  );

  assert.doesNotMatch(
    html,
    /SUPABASE_SERVICE_ROLE_KEY|service_role/i
  );

  assert.doesNotMatch(
    html,
    /warehouse_inventory_(movements|balances)/
  );
});

test("Mobil Yerleştirme CSS dokunma ve dar ekran kurallarını korur", async () => {
  const css = await readFile(
    "css/warehouse/putaway-mobile.css",
    "utf8"
  );

  assert.match(
    css,
    /warehouse-putaway-panel/
  );

  assert.match(
    css,
    /min-height:48px/
  );

  assert.match(
    css,
    /@media\(max-width:800px\)/
  );
});
