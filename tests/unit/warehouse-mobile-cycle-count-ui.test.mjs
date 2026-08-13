import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const UI_PATH =
  "js/warehouse/cycle-count-ui.js";

const HTML_PATH =
  "warehouse/index.html";

const CSS_PATH =
  "css/warehouse/cycle-count-mobile.css";

const RECEIVING_PATH =
  "js/warehouse/receiving-ui.js";

const BUILD_PATH =
  "scripts/production-build.cjs";

test(
  "WarehouseIQ mobil Sayım paneli ve navigasyonu yükler",
  async () => {
    const html =
      await readFile(
        HTML_PATH,
        "utf8"
      );

    assert.match(
      html,
      /id="sayim"/
    );

    assert.match(
      html,
      /<h2>Sayım<\/h2>/
    );

    assert.match(
      html,
      /href="#sayim"/
    );

    assert.match(
      html,
      /data-mobile-nav="sayim"/
    );

    assert.match(
      html,
      /\/css\/warehouse\/cycle-count-mobile\.css/
    );

    assert.match(
      html,
      /\/js\/warehouse\/cycle-count-ui\.js/
    );
  }
);

test(
  "A7.1 gerçek güvenli Cycle Count HTTP API'sini caller JWT ile GET çağırır",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    assert.match(
      source,
      /\/api\/warehouse\/cycle-count/
    );

    assert.match(
      source,
      /getWarehouseOperationsContext/
    );

    assert.match(
      source,
      /getWarehouseSupabaseClient/
    );

    assert.match(
      source,
      /\.auth[\s\S]{0,120}?\.getSession\(\)/
    );

    assert.match(
      source,
      /Authorization:[\s\S]{0,80}?Bearer/
    );

    assert.match(
      source,
      /method:\s*"GET"/
    );

    assert.match(
      source,
      /accountId/
    );

    assert.match(
      source,
      /warehouseId/
    );
  }
);

test(
  "A7.1 Cycle Count UI doğrudan Warehouse tablolarını sorgulamaz",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /\.from\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.(insert|update|upsert|delete|rpc)\s*\(/
    );

    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY|service_role/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_(balances|movements)/
    );
  }
);

test(
  "ortak barkod olayı yalnız aktif Sayım panelinde işlenir",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    assert.match(
      source,
      /warehouse:barcode-scan/
    );

    assert.match(
      source,
      /window\.location\.hash\s*===\s*"#sayim"/
    );

    assert.match(
      source,
      /if\s*\(\s*!cycleCountPanelIsActive\(\)/
    );
  }
);

test(
  "ilk Sayım taraması lokasyon barkodu veya lokasyon kodunu doğrular",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    assert.match(
      source,
      /function locationMatchesTask/
    );

    assert.match(
      source,
      /location\.barcode/
    );

    assert.match(
      source,
      /location\.full_code/
    );

    assert.match(
      source,
      /location\.code/
    );

    assert.match(
      source,
      /setStage\(\s*"product"\s*\)/
    );

    assert.match(
      source,
      /Lokasyon doğrulandı\. Şimdi ürün veya SKU barkodunu okutun/
    );
  }
);

test(
  "ikinci Sayım taraması ürün SKU veya görev barkod metadata'sını doğrular",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    assert.match(
      source,
      /function productMatchesTask/
    );

    assert.match(
      source,
      /task\.product\?\.code/
    );

    assert.match(
      source,
      /task\.sku\?\.sku_code/
    );

    assert.match(
      source,
      /task\.barcodes/
    );

    assert.match(
      source,
      /barcode\?\.value/
    );
  }
);

test(
  "ürün taraması lokasyon doğrulamasından önce ilerlemez",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    assert.match(
      source,
      /!uiState\.locationVerified/
    );

    assert.match(
      source,
      /Ürün veya SKU barkodundan önce sayım lokasyonu doğrulanmalıdır/
    );
  }
);

test(
  "A7.1 görev kartı gerçek count task location product SKU ve takip metadata'sını gösterir",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    for (
      const contract
      of [
        "cycle_count_number",
        "strategy",
        "planned_at",
        "assigned_user_id",
        "full_code",
        "product",
        "sku_code",
        "tracking",
        "recount_required"
      ]
    ) {
      assert.match(
        source,
        new RegExp(contract)
      );
    }

    assert.match(
      source,
      /Aktif görev satırı/
    );

    assert.match(
      source,
      /Yeniden sayım işaretli/
    );
  }
);

test(
  "A7.1 loading empty auth forbidden error durumlarını ayırır",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    for (
      const state
      of [
        '"loading"',
        '"empty"',
        '"auth"',
        '"forbidden"',
        '"error"'
      ]
    ) {
      assert.match(
        source,
        new RegExp(state)
      );
    }

    assert.match(
      source,
      /response\.status === 401/
    );

    assert.match(
      source,
      /response\.status === 403/
    );

    assert.match(
      source,
      /Aktif sayım görevi bulunmuyor/
    );
  }
);

test(
  "A7.1 miktar sayım sonucu variance stok düzeltme veya completion yüzeyi açmaz",
  async () => {
    const [
      source,
      html
    ] =
      await Promise.all([
        readFile(
          UI_PATH,
          "utf8"
        ),
        readFile(
          HTML_PATH,
          "utf8"
        )
      ]);

    assert.doesNotMatch(
      source,
      /expected_quantity|first_count_quantity|second_count_quantity|final_count_quantity|variance_quantity|variance_percentage|variance_value|unit_cost/
    );

    assert.doesNotMatch(
      html,
      /id="sayim-(miktar|onayla|tamamla)"/
    );

    assert.doesNotMatch(
      source,
      /warehouse:cycle-count-(confirm|write|complete)/
    );

    assert.doesNotMatch(
      source,
      /method:\s*"(POST|PUT|PATCH|DELETE)"/
    );
  }
);

test(
  "Receiving barkod listenerı Sayım panelinde sessiz kalır",
  async () => {
    const receiving =
      await readFile(
        RECEIVING_PATH,
        "utf8"
      );

    assert.match(
      receiving,
      /window\.location\.hash\s*===\s*"#sayim"/
    );

    assert.match(
      receiving,
      /warehouse:barcode-scan/
    );
  }
);

test(
  "Cycle Count mobil CSS dar ekran ve alt navigasyon sözleşmesini korur",
  async () => {
    const css =
      await readFile(
        CSS_PATH,
        "utf8"
      );

    assert.match(
      css,
      /@media\s*\(max-width:\s*800px\)/
    );

    assert.match(
      css,
      /grid-template-columns:\s*1fr/
    );

    assert.match(
      css,
      /warehouse-mobile-bottom-nav/
    );

    assert.match(
      css,
      /repeat\(6,\s*minmax\(0,\s*1fr\)\)/
    );
  }
);

test(
  "Production build Cycle Count mobil varlıklarını yayınlar",
  async () => {
    const build =
      await readFile(
        BUILD_PATH,
        "utf8"
      );

    assert.match(
      build,
      /css\/warehouse\/cycle-count-mobile\.css/
    );

    assert.match(
      build,
      /js\/warehouse\/cycle-count-ui\.js/
    );
  }
);
