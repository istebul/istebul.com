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
    "Sistem bağlı",
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

test(
  "Operasyon merkezi auth lifecycle ve bounded canlı yenileme kullanır",
  async () => {
    const source = await readFile(
      "js/warehouse/operations-center.js",
      "utf8"
    );

    assert.match(
      source,
      /AUTO_REFRESH_MS\s*=\s*30_000/
    );

    assert.match(
      source,
      /\.onAuthStateChange\s*\(/
    );

    assert.match(
      source,
      /"TOKEN_REFRESHED"/
    );

    assert.match(
      source,
      /\bsetInterval\s*\(/
    );

    assert.match(
      source,
      /visibilitychange/
    );

    assert.match(
      source,
      /document\.hidden/
    );

    assert.match(
      source,
      /authSubscription[\s\S]*?unsubscribe/
    );

    assert.match(
      source,
      /loadInFlight/
    );

    assert.match(
      source,
      /loadQueued/
    );
  }
);

test(
  "Operasyon merkezi boş veri durumunu bağlantı hatası olarak göstermez",
  async () => {
    const source = await readFile(
      "js/warehouse/operations-center.js",
      "utf8"
    );

    assert.match(
      source,
      /"Sistem bağlı"/
    );

    assert.match(
      source,
      /"Son bağlantı kontrolü"/
    );

    assert.match(
      source,
      /henüz operasyon snapshot kaydı bulunmuyor/
    );

    assert.match(
      source,
      /snapshotSource === "live"/
    );

    assert.doesNotMatch(
      source,
      /setStatus\(\s*"empty",\s*"Veri bekleniyor"/
    );
  }
);

test("WarehouseIQ production kamera politikası yalnız WarehouseIQ yüzeyinde same-origin erişim açar", async () => {
  const headers = await readFile(
    "_headers",
    "utf8"
  );

  assert.match(
    headers,
    /\/\*\s*\n[\s\S]*?Permissions-Policy:\s*camera=\(\),\s*microphone=\(\),\s*geolocation=\(\)/
  );

  assert.match(
    headers,
    /\/warehouse\/\*\s*\n\s*! Permissions-Policy\s*\n\s*Permissions-Policy:\s*camera=\(self\),\s*microphone=\(\),\s*geolocation=\(\)/
  );

  const warehouseRules =
    headers.match(
      /^\/warehouse\/\*$/gm
    ) ?? [];

  assert.equal(
    warehouseRules.length,
    1
  );
});

test("WarehouseIQ sidebar gerçek Toplama ekranını Operasyon Akışı özetinden ayırır", async () => {
  const html = await readFile(
    "warehouse/index.html",
    "utf8"
  );

  const nav =
    html.match(
      /<nav\s+id="warehouse-nav"[\s\S]*?<\/nav>/
    )?.[0] ?? "";

  assert.ok(
    nav,
    "warehouse-nav bulunmalı"
  );

  assert.match(
    nav,
    /href="#toplama"[^>]*>\s*⌑ Toplama\s*<\/a>/
  );

  assert.match(
    nav,
    /href="#surecler"[^>]*>\s*✓ Operasyon Akışı\s*<\/a>/
  );

  const toplamaLabels =
    nav.match(
      />[^<]*Toplama[^<]*<\/a>/g
    ) ?? [];

  assert.equal(
    toplamaLabels.length,
    1
  );
});

test("Operations Center oturum ve API beklemelerini süre sınırıyla sonlandırır", async () => {
  const js = await readFile(
    "js/warehouse/operations-center.js",
    "utf8"
  );

  assert.match(
    js,
    /AUTH_SESSION_TIMEOUT_MS\s*=\s*8_000/
  );

  assert.match(
    js,
    /API_REQUEST_TIMEOUT_MS\s*=\s*15_000/
  );

  assert.match(
    js,
    /Promise\.race\s*\(/
  );

  assert.match(
    js,
    /client\.auth\.getSession\(\)/
  );

  assert.match(
    js,
    /new AbortController\(\)/
  );

  assert.match(
    js,
    /controller\.abort\(\)/
  );

  assert.match(
    js,
    /signal:\s*controller\.signal/
  );

  assert.match(
    js,
    /oturum kontrolü zaman aşımına uğradı/
  );

  assert.match(
    js,
    /operasyon bağlantısı zaman aşımına uğradı/
  );
});
