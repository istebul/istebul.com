import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("WarehouseIQ mobil menü erişilebilir drawer sözleşmesini içerir", async () => {
  const html = await readFile("warehouse/index.html", "utf8");

  assert.match(html, /id="warehouse-menu-toggle"/);
  assert.match(html, /aria-controls="warehouse-nav"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /id="warehouse-nav"/);
  assert.match(html, /aria-label="WarehouseIQ ana menüsü"/);
  assert.match(html, /id="warehouse-nav-backdrop"/);
});

test("WarehouseIQ mobil alt navigasyon kritik operasyon yüzeylerine erişir", async () => {
  const html = await readFile("warehouse/index.html", "utf8");

  for (const target of [
    "genel",
    "surecler",
    "uyarilar",
    "copilot",
    "aksiyonlar"
  ]) {
    assert.match(html, new RegExp(`data-mobile-nav="${target}"`));
  }

  assert.match(html, /aria-label="Hızlı operasyon erişimi"/);
});

test("Mobil navigasyon modülü kullanıcı kontrollü drawer davranışı sağlar", async () => {
  const source = await readFile("js/warehouse/mobile-navigation.js", "utf8");

  assert.match(source, /warehouse-nav-open/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /Operasyon menüsünü aç/);
  assert.match(source, /Operasyon menüsünü kapat/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /warehouse-nav-backdrop/);
});

test("Mobil drawer açılış ve kapanışta odak yönetimi yapar", async () => {
  const source = await readFile("js/warehouse/mobile-navigation.js", "utf8");

  assert.match(source, /previousFocus = document\.activeElement/);
  assert.match(source, /firstLink\?\.focus\(\)/);
  assert.match(source, /previousFocus\.focus\(\)/);
});

test("Mobil navigasyon hash ile aktif bölümü senkronize eder", async () => {
  const source = await readFile("js/warehouse/mobile-navigation.js", "utf8");

  assert.match(source, /window\.location\.hash/);
  assert.match(source, /hashchange/);
  assert.match(source, /aria-current/);
  assert.match(source, /syncActiveNavigation/);
});

test("WarehouseIQ mobil CSS drawer ve bottom navigation kullanır", async () => {
  const css = await readFile("css/warehouse/operations-center.css", "utf8");

  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /\.side #warehouse-nav\{[\s\S]*?position:fixed/);
  assert.match(css, /transform:translateX\(-105%\)/);
  assert.match(css, /body\.warehouse-nav-open \.side #warehouse-nav\{[\s\S]*?translateX\(0\)/);
  assert.match(css, /\.warehouse-mobile-bottom-nav\{[\s\S]*?position:fixed/);
});

test("Kapalı mobil drawer odak ve ekran okuyucu erişiminden çıkarılır", async () => {
  const css = await readFile(
    "css/warehouse/operations-center.css",
    "utf8"
  );
  const source = await readFile(
    "js/warehouse/mobile-navigation.js",
    "utf8"
  );

  assert.match(
    css,
    /\.side #warehouse-nav\{[\s\S]*?visibility:hidden[\s\S]*?pointer-events:none/
  );
  assert.match(
    css,
    /body\.warehouse-nav-open \.side #warehouse-nav\{[\s\S]*?visibility:visible[\s\S]*?pointer-events:auto/
  );
  assert.match(source, /syncNavAccessibility/);
  assert.match(source, /aria-hidden/);
});

test("Mobil etkileşim alanları ve safe-area alt navigasyonda korunur", async () => {
  const css = await readFile("css/warehouse/operations-center.css", "utf8");

  assert.match(css, /\.warehouse-menu-toggle\{[\s\S]*?min-height:44px/);
  assert.match(css, /\.warehouse-mobile-bottom-nav a\{[\s\S]*?min-height:48px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /scroll-margin-top:86px/);
});

test("WarehouseIQ mobil küçük ekranda yatay taşma korumaları taşır", async () => {
  const css = await readFile("css/warehouse/operations-center.css", "utf8");

  assert.match(css, /overflow-x:hidden/);
  assert.match(css, /grid-template-columns:minmax\(76px,104px\) minmax\(0,1fr\) auto/);
  assert.match(css, /main,[\s\S]*?\.grid,[\s\S]*?\.panel\{[\s\S]*?max-width:100%/);
});

test("Production build mobil navigasyon modülünü yayınlar", async () => {
  const source = await readFile("scripts/production-build.cjs", "utf8");

  assert.match(source, /js\/warehouse\/mobile-navigation\.js/);
});
