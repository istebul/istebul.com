import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const UI_PATH =
  "js/warehouse/picking-ui.js";

const HTML_PATH =
  "warehouse/index.html";

const RECEIVING_PATH =
  "js/warehouse/receiving-ui.js";

test(
  "Warehouse Operations Center Toplama panelini içerir",
  async () => {
    const html =
      await readFile(
        HTML_PATH,
        "utf8"
      );

    assert.match(
      html,
      /id="toplama"/
    );

    assert.match(
      html,
      /<h2>Toplama<\/h2>/
    );

    assert.match(
      html,
      /id="toplama-gorevi-secimi"/
    );

    assert.match(
      html,
      /id="toplama-kaynak-barkod"/
    );

    assert.match(
      html,
      /id="toplama-urun-barkod"/
    );
  }
);

test(
  "Toplama navigasyon bağlantısı ve mobil CSS yüklenir",
  async () => {
    const html =
      await readFile(
        HTML_PATH,
        "utf8"
      );

    assert.match(
      html,
      /href="#toplama"/
    );

    assert.match(
      html,
      /\/css\/warehouse\/picking-mobile\.css/
    );
  }
);

test(
  "Picking UI doğru modülleri kullanır",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
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
      /resolvePickingTaskContext/
    );

    assert.match(
      source,
      /resolvePickingSourceLocationBarcode/
    );

    assert.match(
      source,
      /resolvePickingProductBarcode/
    );
  }
);

test(
  "aktif Picking görevleri account warehouse ve aktif statuslarla salt okunur listelenir",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    assert.match(
      source,
      /\.from\(\s*"warehouse_picking_tasks"\s*\)/
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
      /\.in\(\s*"status"/
    );

    for (const status of [
      "pending",
      "assigned",
      "in_progress",
      "partially_completed"
    ]) {
      assert.match(
        source,
        new RegExp(
          `"${status}"`
        )
      );
    }
  }
);

test(
  "ortak barkod olayı yalnız aktif Toplama panelinde işlenir",
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
      /window\.location\.hash ===\s*"#toplama"/
    );

    assert.match(
      source,
      /if\s*\(\s*!pickingPanelIsActive\(\)/
    );
  }
);

test(
  "ilk tarama görev kaynak lokasyonunu doğrular",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    assert.match(
      source,
      /await resolvePickingSourceLocationBarcode\(\{/
    );

    assert.match(
      source,
      /expectedSourceLocationId:[\s\S]{0,120}?sourceLocationId/
    );

    assert.match(
      source,
      /setStage\(\s*"product"\s*\)/
    );
  }
);

test(
  "ikinci tarama ürün veya SKU doğrulamasıdır",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    assert.match(
      source,
      /await resolvePickingProductBarcode\(\{/
    );

    assert.match(
      source,
      /pickingId:[\s\S]{0,120}?picking\.id/
    );

    assert.match(
      source,
      /task:[\s\S]{0,120}?task/
    );
  }
);

test(
  "ürün taraması kaynak lokasyon doğrulamasından önce ilerlemez",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    assert.match(
      source,
      /if\s*\(\s*!uiState\.sourceLocationMatch/
    );

    assert.match(
      source,
      /Ürün veya SKU barkodundan önce kaynak lokasyon doğrulanmalıdır/
    );
  }
);

test(
  "Picking barkod listenerı doğrudan write confirmation üretmez",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    const start =
      source.indexOf(
        '"warehouse:barcode-scan"'
      );

    const end =
      source.indexOf(
        'select?.addEventListener',
        start
      );

    assert.ok(
      start >= 0
    );

    assert.ok(
      end > start
    );

    const scanBlock =
      source.slice(
        start,
        end
      );

    assert.doesNotMatch(
      scanBlock,
      /warehouse:picking-confirm/
    );

    assert.doesNotMatch(
      scanBlock,
      /execute_item/
    );

    assert.doesNotMatch(
      scanBlock,
      /warehouse_picking_execute_write/
    );
  }
);

test(
  "A6.2 UI doğrudan API veya tablo mutation yapmaz",
  async () => {
    const source =
      await readFile(
        UI_PATH,
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /\bfetch\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\.(insert|update|upsert|delete)\s*\(/
    );

    assert.doesNotMatch(
      source,
      /warehouse_picking_(write|execute_write|complete_write|resolve_exception_write)/
    );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_(balances|movements)/
    );

    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY|service_role/i
    );
  }
);

test(
  "A6.2 miktar short-pick ve onay kontrollerini henüz kapalı tutar",
  async () => {
    const html =
      await readFile(
        HTML_PATH,
        "utf8"
      );

    assert.match(
      html,
      /id="toplama-miktar"[\s\S]{0,220}?disabled/
    );

    assert.match(
      html,
      /id="toplama-eksik-miktar"[\s\S]{0,220}?disabled/
    );

    assert.match(
      html,
      /id="toplama-onayla"[\s\S]{0,100}?disabled/
    );
  }
);

test(
  "Receiving barkod listenerı Toplama ve Yerleştirme panellerinde çalışmaz",
  async () => {
    const receiving =
      await readFile(
        RECEIVING_PATH,
        "utf8"
      );

    assert.match(
      receiving,
      /window\.location\.hash === "#yerlestirme"/
    );

    assert.match(
      receiving,
      /window\.location\.hash === "#toplama"/
    );

    assert.match(
      receiving,
      /warehouse:barcode-scan/
    );
  }
);

test(
  "Putaway kendi panel guardını korur",
  async () => {
    const putaway =
      await readFile(
        "js/warehouse/putaway-ui.js",
        "utf8"
      );

    assert.match(
      putaway,
      /window\.location\.hash ===\s*"#yerlestirme"/
    );

    assert.match(
      putaway,
      /if\s*\(\s*!putawayPanelIsActive\(\)/
    );
  }
);

test(
  "Picking UI script sırası Putaway sonrası Receiving öncesidir",
  async () => {
    const html =
      await readFile(
        HTML_PATH,
        "utf8"
      );

    const operations =
      html.indexOf(
        "/js/warehouse/operations-center.js"
      );

    const putawayUi =
      html.indexOf(
        "/js/warehouse/putaway-ui.js"
      );

    const putawayWrite =
      html.indexOf(
        "/js/warehouse/putaway-write-controller.js"
      );

    const pickingUi =
      html.indexOf(
        "/js/warehouse/picking-ui.js"
      );

    const receivingUi =
      html.indexOf(
        "/js/warehouse/receiving-ui.js"
      );

    const receivingWrite =
      html.indexOf(
        "/js/warehouse/receiving-write-controller.js"
      );

    assert.ok(
      operations >= 0
    );

    assert.ok(
      putawayUi >
      operations
    );

    assert.ok(
      putawayWrite >
      putawayUi
    );

    assert.ok(
      pickingUi >
      putawayWrite
    );

    assert.ok(
      receivingUi >
      pickingUi
    );

    assert.ok(
      receivingWrite >
      receivingUi
    );
  }
);
