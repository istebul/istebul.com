import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("WarehouseIQ operasyon merkezi Türkçe temel yüzeyi içerir", async () => {
  const html = await readFile("warehouse/index.html", "utf8");
  for (const label of [
    "Operasyon Merkezi",
    "Gösterim verisi",
    "Genel Bakış",
    "Stok Yönetimi",
    "Mal Kabul",
    "Yerleştirme",
    "Toplama",
    "Paketleme",
    "Sevkiyat",
    "Yönetici Aksiyonları",
  ]) {
    assert.ok(html.includes(label), `Eksik etiket: ${label}`);
  }
});

test("KPI, risk, rapor ve aksiyon alanları bulunur", async () => {
  const html = await readFile("warehouse/index.html", "utf8");
  for (const label of [
    "Operasyon Sağlık Skoru",
    "Zamanında Sevkiyat",
    "Stok Doğruluğu",
    "Kapasite Kullanımı",
    "Personel Verimliliği",
    "Kritik uyarılar",
    "Performans sıralaması",
    "Bugünün aksiyon planı",
  ]) {
    assert.ok(html.includes(label), `Eksik alan: ${label}`);
  }
});

test("ilk sürüm gerçek veri izlenimi oluşturmaz", async () => {
  const html = await readFile("warehouse/index.html", "utf8");
  assert.match(html, /gösterim verisidir/);
  assert.match(html, /Gerçek WarehouseIQ servis bağlantısı sonraki aşamada yapılacaktır/);
});

test("mobil stil ve Türkçe tarih etkileşimi bulunur", async () => {
  const [css, js] = await Promise.all([
    readFile("css/warehouse/operations-center.css", "utf8"),
    readFile("js/warehouse/operations-center.js", "utf8"),
  ]);
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(js, /Intl\.DateTimeFormat\("tr-TR"/);
  assert.match(js, /apply\("today"\)/);
});


test("production build WarehouseIQ statik dosyalarını yayınlar", async () => {
  const build = await readFile("scripts/production-build.cjs", "utf8");

  for (const path of [
    "warehouse/index.html",
    "css/warehouse/operations-center.css",
    "js/warehouse/operations-center.js",
  ]) {
    assert.ok(
      build.includes(`'${path}'`),
      `Production build listesinde eksik: ${path}`,
    );
  }
});
