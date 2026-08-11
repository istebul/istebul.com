import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("WarehouseIQ ayrı kapsamlı PWA manifesti kullanır", async () => {
  const manifest = JSON.parse(
    await readFile(
      "warehouse/manifest.webmanifest",
      "utf8"
    )
  );

  assert.equal(
    manifest.name,
    "WarehouseIQ · Akıllı Depo Yönetimi"
  );
  assert.equal(
    manifest.short_name,
    "WarehouseIQ"
  );
  assert.equal(
    manifest.start_url,
    "/warehouse/"
  );
  assert.equal(
    manifest.scope,
    "/warehouse/"
  );
  assert.equal(
    manifest.display,
    "standalone"
  );
  assert.equal(
    manifest.lang,
    "tr-TR"
  );
  assert.ok(
    manifest.icons.some(
      (icon) =>
        icon.sizes === "512x512" &&
        icon.purpose === "maskable"
    )
  );
});

test("WarehouseIQ HTML PWA meta ve kullanıcı kontrollü kurulum düğmesini içerir", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  assert.match(
    html,
    /viewport-fit=cover/
  );
  assert.match(
    html,
    /rel="manifest" href="\/warehouse\/manifest\.webmanifest"/
  );
  assert.match(
    html,
    /apple-mobile-web-app-capable/
  );
  assert.match(
    html,
    /id="pwa-eylem"/
  );
  assert.match(
    html,
    /\/js\/warehouse\/pwa\.js/
  );
});

test("Warehouse service worker korumalı API ve ortam ayarlarını önbelleğe almaz", async () => {
  const source = await readFile(
    "warehouse/sw.js",
    "utf8"
  );

  assert.match(
    source,
    /pathname\.startsWith\("\/api\/"\)/
  );
  assert.match(
    source,
    /pathname\.startsWith\("\/functions\/"\)/
  );
  assert.match(
    source,
    /pathname === "\/env\.js"/
  );
  assert.match(
    source,
    /cache: "no-store"/
  );
  assert.doesNotMatch(
    source,
    /\/api\/warehouse\/operations-center/
  );
});

test("Warehouse service worker çevrimdışı gezinmede yalnız güvenli offline yüzeyi döndürür", async () => {
  const source = await readFile(
    "warehouse/sw.js",
    "utf8"
  );

  assert.match(
    source,
    /const OFFLINE_PAGE = "\/warehouse\/offline\.html"/
  );
  assert.match(
    source,
    /event\.request\.mode === "navigate"/
  );
  assert.match(
    source,
    /cache\.match\(OFFLINE_PAGE\)/
  );
});

test("PWA kurulum istemi otomatik açılmaz ve kullanıcı düğmesine bağlıdır", async () => {
  const source = await readFile(
    "js/warehouse/pwa.js",
    "utf8"
  );

  assert.match(
    source,
    /beforeinstallprompt/
  );
  assert.match(
    source,
    /event\.preventDefault\(\)/
  );
  assert.match(
    source,
    /actionButton\?\.addEventListener/
  );
  assert.match(
    source,
    /await promptEvent\.prompt\(\)/
  );
  assert.match(
    source,
    /navigator\.serviceWorker\.register/
  );
  assert.match(
    source,
    /scope: WORKER_SCOPE/
  );
});

test("PWA güncellemesi açık kullanıcı aksiyonuyla etkinleştirilir", async () => {
  const source = await readFile(
    "js/warehouse/pwa.js",
    "utf8"
  );

  assert.match(
    source,
    /Güncellemeyi uygula/
  );
  assert.match(
    source,
    /SKIP_WAITING/
  );
  assert.match(
    source,
    /controllerchange/
  );
});

test("Offline sayfa korunan operasyon verisinin çevrimdışı gösterilmediğini açıklar", async () => {
  const html = await readFile(
    "warehouse/offline.html",
    "utf8"
  );

  assert.match(
    html,
    /canlı operasyon verileri güvenlik nedeniyle cihazda/
  );
  assert.match(
    html,
    /Korunan depo verileri çevrimdışı modda gösterilmez/
  );
  assert.match(
    html,
    /href="\/warehouse\/"/
  );
  assert.doesNotMatch(
    html,
    /operations-center\.js/
  );
});

test("Warehouse mobil PWA safe-area ve en az 44px etkileşim alanı tanımlar", async () => {
  const css = await readFile(
    "css/warehouse/operations-center.css",
    "utf8"
  );

  assert.match(
    css,
    /env\(safe-area-inset-bottom\)/
  );
  assert.match(
    css,
    /\.pwa-action\{[\s\S]*?min-height:44px/
  );
  assert.match(
    css,
    /@media\(display-mode:standalone\)/
  );
});

test("Production build tüm WarehouseIQ PWA dosyalarını yayınlar", async () => {
  const source = await readFile(
    "scripts/production-build.cjs",
    "utf8"
  );

  for (const file of [
    "warehouse/offline.html",
    "warehouse/manifest.webmanifest",
    "warehouse/sw.js",
    "js/warehouse/pwa.js"
  ]) {
    assert.match(
      source,
      new RegExp(
        file.replaceAll(".", "\\.")
      )
    );
  }
});
