import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("WarehouseIQ gerçek mobil Mal Kabul panelini içerir", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  for (const id of [
    "mal-kabul",
    "mal-kabul-secimi",
    "mal-kabul-barkod",
    "mal-kabul-mesaji",
    "mal-kabul-eslesme",
    "mal-kabul-miktar",
    "mal-kabul-onayla"
  ]) {
    assert.match(
      html,
      new RegExp(`id="${id}"`)
    );
  }

  assert.match(
    html,
    /barkod okutma tek başına stok veya mal kabul miktarı yazmaz/i
  );
});

test("Mal Kabul menüsü gerçek mobil panele gider", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  assert.match(
    html,
    /href="#mal-kabul">⇥ Mal Kabul/
  );
});

test("Barkod olayı yalnız salt-okunur eşleştirme ve onay modeline bağlanır", async () => {
  const source = await readFile(
    "js/warehouse/receiving-ui.js",
    "utf8"
  );

  assert.match(
    source,
    /warehouse:barcode-scan/
  );

  assert.match(
    source,
    /resolveReceivingBarcode/
  );

  assert.match(
    source,
    /warehouse:receiving-confirm/
  );

  assert.match(
    source,
    /Henüz veri tabanına yazılmadı/
  );
});

test("B3 UI doğrudan receiving veya stok write işlemi yapmaz", async () => {
  const source = await readFile(
    "js/warehouse/receiving-ui.js",
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /\bfetch\s*\(/
  );

  assert.doesNotMatch(
    source,
    /receiveQuantity\s*\(/
  );

  assert.doesNotMatch(
    source,
    /completeReceiving\s*\(/
  );

  assert.doesNotMatch(
    source,
    /\/api\/warehouse\/receiving/
  );

  assert.doesNotMatch(
    source,
    /\.insert\s*\(/
  );

  assert.doesNotMatch(
    source,
    /\.update\s*\(/
  );

  assert.doesNotMatch(
    source,
    /\.upsert\s*\(/
  );

  assert.doesNotMatch(
    source,
    /SUPABASE_SERVICE_ROLE_KEY/
  );
});

test("Operations Center güvenli client ve firma depo contexti paylaşır", async () => {
  const source = await readFile(
    "js/warehouse/operations-center.js",
    "utf8"
  );

  assert.match(
    source,
    /warehouse:operations-context/
  );

  assert.match(
    source,
    /export function getWarehouseSupabaseClient/
  );

  assert.match(
    source,
    /export function getWarehouseOperationsContext/
  );

  assert.match(
    source,
    /export async function getWarehouseSession/
  );
});

test("Mobil Mal Kabul miktarı açık kullanıcı tıklamasıyla onaylanır", async () => {
  const source = await readFile(
    "js/warehouse/receiving-ui.js",
    "utf8"
  );

  assert.match(
    source,
    /confirmButton\?\.addEventListener\(\s*"click"/
  );

  assert.match(
    source,
    /createConfirmation\(\)/
  );

  assert.match(
    source,
    /receivedQuantity:\s*quantity/
  );
});

test("Mobil Mal Kabul CSS dokunma ve dar ekran kurallarını korur", async () => {
  const css = await readFile(
    "css/warehouse/receiving-mobile.css",
    "utf8"
  );

  assert.match(
    css,
    /min-height:48px/
  );

  assert.match(
    css,
    /@media\(max-width:800px\)/
  );

  assert.match(
    css,
    /grid-template-columns:1fr/
  );

  assert.match(
    css,
    /@media\(max-width:520px\)/
  );
});

test("Production build B1 B2 B3 WarehouseIQ kaynaklarını yayınlar", async () => {
  const source = await readFile(
    "scripts/production-build.cjs",
    "utf8"
  );

  for (const file of [
    "css/warehouse/receiving-mobile.css",
    "js/warehouse/receiving-ui.js",
    "js/warehouse/receiving-client.js",
    "js/warehouse/receiving-lookup.js"
  ]) {
    assert.match(
      source,
      new RegExp(
        file.replaceAll(".", "\\.")
      )
    );
  }
});
