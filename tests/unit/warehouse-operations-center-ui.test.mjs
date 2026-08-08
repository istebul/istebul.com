import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("WarehouseIQ operasyon merkezi Türkçe temel yüzeyi içerir", async () => {
  const html = await readFile("warehouse/index.html", "utf8");

  for (const label of [
    "Operasyon Merkezi",
    "Genel Bakış",
    "Stok Yönetimi",
    "Mal Kabul",
    "Yerleştirme",
    "Toplama",
    "Paketleme",
    "Sevkiyat",
    "Yönetici Aksiyonları"
  ]) {
    assert.ok(html.includes(label), `Eksik etiket: ${label}`);
  }
});

test("WarehouseIQ ilk boyamada demo sayı göstermez", async () => {
  const html = await readFile("warehouse/index.html", "utf8");

  assert.doesNotMatch(html, /Gösterim verisi/);
  assert.doesNotMatch(html, /gösterim verisidir/);
  assert.doesNotMatch(
    html,
    /Gerçek WarehouseIQ servis bağlantısı sonraki aşamada yapılacaktır/
  );

  for (const key of [
    "health",
    "dispatch",
    "inventory",
    "capacity",
    "tasks",
    "labor"
  ]) {
    assert.match(
      html,
      new RegExp(`data-kpi="${key}">—</strong>`)
    );
  }
});

test("WarehouseIQ tarayıcı oturumu ile korumalı API'yi çağırır", async () => {
  const [html, js] = await Promise.all([
    readFile("warehouse/index.html", "utf8"),
    readFile("js/warehouse/operations-center.js", "utf8")
  ]);

  assert.match(html, /<script src="\/env\.js"><\/script>/);
  assert.match(
    html,
    /<script type="module" src="\/js\/warehouse\/operations-center\.js"><\/script>/
  );

  assert.match(
    js,
    /https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.49\.8\/\+esm/
  );
  assert.match(js, /istebul-auth-public-v1/);
  assert.match(js, /auth\.getSession\(\)/);
  assert.match(js, /\/api\/warehouse\/operations-center/);
  assert.match(
    js,
    /Authorization:\s*`Bearer \$\{session\.access_token\}`/
  );
  assert.match(js, /cache:\s*"no-store"/);
});

test("WarehouseIQ canlı UI auth, yetki, boş veri ve hata durumlarını ayırır", async () => {
  const js = await readFile(
    "js/warehouse/operations-center.js",
    "utf8"
  );

  for (const text of [
    "Oturum gerekli",
    "Erişim yok",
    "Veri bekleniyor",
    "Bağlantı hatası",
    "henüz operasyon snapshot kaydı bulunmuyor",
    "aktif WarehouseIQ üyeliği bulunmuyor"
  ]) {
    assert.ok(js.includes(text), `Eksik durum metni: ${text}`);
  }
});

test("WarehouseIQ gerçek snapshot KPI ve operasyon alanlarını işler", async () => {
  const js = await readFile(
    "js/warehouse/operations-center.js",
    "utf8"
  );

  for (const field of [
    "health_score",
    "on_time_dispatch_rate",
    "inventory_accuracy_rate",
    "capacity_utilization_rate",
    "task_completion_rate",
    "labor_utilization_rate",
    "operation_count",
    "resolved_at",
    "root_cause"
  ]) {
    assert.ok(js.includes(field), `Eksik canlı alan: ${field}`);
  }
});

test("WarehouseIQ trend ve Türkçe tarih biçimlendirmesi canlı veriden üretilir", async () => {
  const js = await readFile(
    "js/warehouse/operations-center.js",
    "utf8"
  );

  assert.match(js, /Intl\.DateTimeFormat\("tr-TR"/);
  assert.match(js, /renderTrend\(data\.trend\)/);
  assert.doesNotMatch(js, /const data=\{today:/);
});

test("production build WarehouseIQ statik dosyalarını yayınlar", async () => {
  const build = await readFile("scripts/production-build.cjs", "utf8");

  for (const path of [
    "warehouse/index.html",
    "css/warehouse/operations-center.css",
    "js/warehouse/operations-center.js"
  ]) {
    assert.ok(
      build.includes(`'${path}'`),
      `Production build listesinde eksik: ${path}`
    );
  }
});
