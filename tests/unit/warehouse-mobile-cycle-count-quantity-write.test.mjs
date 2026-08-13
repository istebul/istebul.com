import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const CLIENT =
  "js/warehouse/cycle-count-client.js";

const CONTROLLER =
  "js/warehouse/cycle-count-write-controller.js";

const QUANTITY_UI =
  "js/warehouse/cycle-count-quantity-ui.js";

const CORE_UI =
  "js/warehouse/cycle-count-ui.js";

const HTML =
  "warehouse/index.html";

const CSS =
  "css/warehouse/cycle-count-mobile.css";

const MIGRATION =
  "supabase/migrations/20260813170000_warehouse_cycle_count_quantity_write.sql";

const BUILD =
  "scripts/production-build.cjs";

const ACCOUNT =
  "11111111-1111-4111-8111-111111111111";

const WAREHOUSE =
  "22222222-2222-4222-8222-222222222222";

const COUNT =
  "33333333-3333-4333-8333-333333333333";

const ITEM =
  "44444444-4444-4444-8444-444444444444";

const TASK =
  "55555555-5555-4555-8555-555555555555";

const REQUEST =
  "66666666-6666-4666-8666-666666666666";

const {
  buildCycleCountQuantityPayload,
  recordCycleCountQuantity
} =
  await import(
    "../../js/warehouse/cycle-count-client.js"
  );

const {
  buildCycleCountQuantityConfirmation,
  persistCycleCountQuantity
} =
  await import(
    "../../js/warehouse/cycle-count-write-controller.js"
  );

test(
  "Cycle Count client sıfır dahil fiziksel miktar payloadını normalize eder",
  () => {
    const payload =
      buildCycleCountQuantityPayload({
        cycleCountId:
          COUNT,
        cycleCountItemId:
          ITEM,
        taskId:
          TASK,
        countedQuantity:
          0,
        locationScan:
          "A-01-01",
        productScan:
          "SKU-001",
        notes:
          "Kontrol edildi"
      });

    assert.equal(
      payload.countedQuantity,
      0
    );

    assert.equal(
      payload.locationScan,
      "A-01-01"
    );

    assert.equal(
      payload.productScan,
      "SKU-001"
    );
  }
);

test(
  "Cycle Count client caller JWT account warehouse ve Idempotency-Key ile POST yapar",
  async () => {
    let call = null;

    const result =
      await recordCycleCountQuantity({
        accessToken:
          "kullanici-token",
        accountId:
          ACCOUNT,
        warehouseId:
          WAREHOUSE,
        cycleCountId:
          COUNT,
        cycleCountItemId:
          ITEM,
        taskId:
          TASK,
        countedQuantity:
          7.5,
        locationScan:
          "A-01",
        productScan:
          "SKU-001",
        notes:
          "",
        requestId:
          REQUEST,
        fetchImpl:
          async (
            url,
            options
          ) => {
            call = {
              url,
              options
            };

            return new Response(
              JSON.stringify({
                ok: true,
                data: {
                  status:
                    "recorded"
                }
              }),
              {
                status: 200,
                headers: {
                  "Content-Type":
                    "application/json"
                }
              }
            );
          }
      });

    assert.equal(
      call.url,
      "/api/warehouse/cycle-count-quantity"
    );

    assert.equal(
      call.options.method,
      "POST"
    );

    assert.equal(
      call.options.headers
        .Authorization,
      "Bearer kullanici-token"
    );

    assert.equal(
      call.options.headers[
        "Idempotency-Key"
      ],
      REQUEST
    );

    const body =
      JSON.parse(
        call.options.body
      );

    assert.equal(
      body.accountId,
      ACCOUNT
    );

    assert.equal(
      body.warehouseId,
      WAREHOUSE
    );

    assert.equal(
      body.action,
      "record_quantity"
    );

    assert.equal(
      body.payload
        .countedQuantity,
      7.5
    );

    assert.equal(
      result.requestId,
      REQUEST
    );
  }
);

test(
  "controller quantity confirmation payloadını dar sözleşmede tutar",
  () => {
    const payload =
      buildCycleCountQuantityConfirmation({
        cycleCountId:
          COUNT,
        cycleCountItemId:
          ITEM,
        taskId:
          TASK,
        countedQuantity:
          12,
        locationScan:
          "A-01",
        productScan:
          "SKU-001",
        notes:
          "Saha notu"
      });

    assert.deepEqual(
      Object.keys(payload),
      [
        "cycleCountId",
        "cycleCountItemId",
        "taskId",
        "countedQuantity",
        "locationScan",
        "productScan",
        "notes"
      ]
    );
  }
);

test(
  "controller caller session ve seçili account warehouse contextini clienta taşır",
  async () => {
    let received = null;

    await persistCycleCountQuantity(
      {
        cycleCountId:
          COUNT,
        cycleCountItemId:
          ITEM,
        taskId:
          TASK,
        countedQuantity:
          3,
        locationScan:
          "A-01",
        productScan:
          "SKU-001",
        notes:
          ""
      },
      {
        getContext:
          () => ({
            accountId:
              ACCOUNT,
            warehouseId:
              WAREHOUSE
          }),

        getSession:
          async () => ({
            access_token:
              "session-token"
          }),

        record:
          async (
            input
          ) => {
            received =
              input;

            return {
              requestId:
                input.requestId,
              data: {
                status:
                  "recorded"
              }
            };
          }
      }
    );

    assert.equal(
      received.accountId,
      ACCOUNT
    );

    assert.equal(
      received.warehouseId,
      WAREHOUSE
    );

    assert.equal(
      received.accessToken,
      "session-token"
    );
  }
);

test(
  "ağ hatası retry işleminde aynı Idempotency-Key korunur başarı sonrası yenisi üretilir",
  async () => {
    const requestIds = [];
    let attempt = 0;

    const confirmation = {
      cycleCountId:
        "73333333-3333-4333-8333-333333333333",
      cycleCountItemId:
        "74444444-4444-4444-8444-444444444444",
      taskId:
        "75555555-5555-4555-8555-555555555555",
      countedQuantity:
        9,
      locationScan:
        "B-01",
      productScan:
        "SKU-RETRY",
      notes:
        ""
    };

    const dependencies = {
      getContext:
        () => ({
          accountId:
            ACCOUNT,
          warehouseId:
            WAREHOUSE
        }),

      getSession:
        async () => ({
          access_token:
            "session-token"
        }),

      record:
        async (
          input
        ) => {
          requestIds.push(
            input.requestId
          );

          attempt += 1;

          if (attempt === 1) {
            throw new Error(
              "geçici ağ hatası"
            );
          }

          return {
            requestId:
              input.requestId,
            data: {
              status:
                "recorded"
            }
          };
        }
    };

    await assert.rejects(
      () =>
        persistCycleCountQuantity(
          confirmation,
          dependencies
        ),
      /geçici ağ hatası/
    );

    await persistCycleCountQuantity(
      confirmation,
      dependencies
    );

    await persistCycleCountQuantity(
      confirmation,
      dependencies
    );

    assert.equal(
      requestIds[0],
      requestIds[1]
    );

    assert.notEqual(
      requestIds[1],
      requestIds[2]
    );
  }
);

test(
  "write controller yalnız explicit quantity confirm eventini dinler barkod dinlemez",
  async () => {
    const source =
      await readFile(
        CONTROLLER,
        "utf8"
      );

    assert.match(
      source,
      /addEventListener\(\s*"warehouse:cycle-count-quantity-confirm"/
    );

    assert.doesNotMatch(
      source,
      /addEventListener\(\s*"warehouse:barcode-scan"/
    );

    assert.match(
      source,
      /writePending/
    );
  }
);

test(
  "core UI fiziksel doğrulama tamamlanınca quantity handoff eventini üretir",
  async () => {
    const source =
      await readFile(
        CORE_UI,
        "utf8"
      );

    assert.match(
      source,
      /warehouse:cycle-count-verification-ready/
    );

    assert.match(
      source,
      /cycleCountItemId/
    );

    assert.match(
      source,
      /locationScan/
    );

    assert.match(
      source,
      /productScan/
    );
  }
);

test(
  "SKU satırında generic ürün barkodu yerine doğru SKU kodu veya SKU barkodu doğrulanır",
  async () => {
    const source =
      await readFile(
        CORE_UI,
        "utf8"
      );

    assert.match(
      source,
      /const skuId\s*=[\s\S]*task\.sku\?\.id/
    );

    assert.match(
      source,
      /task\.sku\?\.sku_code/
    );

    assert.match(
      source,
      /barcode\?\.sku_id/
    );

    assert.match(
      source,
      /skuId/
    );
  }
);

test(
  "ürün doğrulaması tamamlandıktan sonra yeni barkod quantity aşamasını bozmaz",
  async () => {
    const source =
      await readFile(
        CORE_UI,
        "utf8"
      );

    assert.match(
      source,
      /uiState\.locationVerified\s*&&[\s\S]*uiState\.productVerified/
    );

    assert.match(
      source,
      /Yeni barkod okutmak yerine sayılan miktarı girin/
    );
  }
);

test(
  "mobil HTML miktar not ve explicit kayıt butonunu başlangıçta kapalı taşır",
  async () => {
    const html =
      await readFile(
        HTML,
        "utf8"
      );

    assert.match(
      html,
      /id="sayim-miktar-kaydi"[\s\S]*hidden/
    );

    assert.match(
      html,
      /id="sayim-sayilan-miktar"[\s\S]*disabled/
    );

    assert.match(
      html,
      /id="sayim-notu"[\s\S]*disabled/
    );

    assert.match(
      html,
      /id="sayim-miktari-kaydet"[\s\S]*disabled/
    );

    assert.match(
      html,
      /Sayım Miktarını Kaydet/
    );
  }
);

test(
  "quantity UI ikinci açık kullanıcı onayı olmadan confirm eventi üretmez",
  async () => {
    const source =
      await readFile(
        QUANTITY_UI,
        "utf8"
      );

    const confirmIndex =
      source.indexOf(
        "window.confirm"
      );

    const eventIndex =
      source.indexOf(
        '"warehouse:cycle-count-quantity-confirm"'
      );

    assert.ok(
      confirmIndex >= 0
    );

    assert.ok(
      eventIndex >
        confirmIndex
    );

    assert.match(
      source,
      /if \(!approved\)[\s\S]*return/
    );
  }
);

test(
  "quantity UI barkod dinlemez HTTP veya RPC mutation yapmaz",
  async () => {
    const source =
      await readFile(
        QUANTITY_UI,
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /warehouse:barcode-scan/
    );

    assert.doesNotMatch(
      source,
      /fetch\(|\/api\/warehouse\/|\/rest\/v1\/rpc\//
    );

    assert.doesNotMatch(
      source,
      /\.from\(|\.insert\(|\.update\(/
    );
  }
);

test(
  "quantity lifecycle start success error olayları ayrı işlenir",
  async () => {
    const source =
      await readFile(
        QUANTITY_UI,
        "utf8"
      );

    for (
      const eventName
      of [
        "warehouse:cycle-count-quantity-start",
        "warehouse:cycle-count-quantity-success",
        "warehouse:cycle-count-quantity-error"
      ]
    ) {
      assert.match(
        source,
        new RegExp(
          eventName
        )
      );
    }

    assert.match(
      source,
      /warehouse:cycle-count-quantity-recorded/
    );
  }
);

test(
  "başarılı quantity write görevi bu oturumda yeniden ilk sayım adayı yapmaz",
  async () => {
    const source =
      await readFile(
        CORE_UI,
        "utf8"
      );

    assert.match(
      source,
      /recordedTaskIds:\s*new Set\(\)/
    );

    assert.match(
      source,
      /warehouse:cycle-count-quantity-recorded/
    );

    assert.match(
      source,
      /recordedTaskIds[\s\S]*\.add\(taskId\)/
    );
  }
);

test(
  "ilk fiziksel sayım veritabanında yeni request ile overwrite edilemez",
  async () => {
    const sql =
      await readFile(
        MIGRATION,
        "utf8"
      );

    assert.match(
      sql,
      /v_item\.first_count_quantity is not null/
    );

    assert.match(
      sql,
      /ilk fiziksel sayım miktarı zaten kaydedildi/
    );

    assert.match(
      sql,
      /errcode\s*=\s*'23505'/
    );
  }
);

test(
  "A7.2.2 beklenen stok variance stok düzeltme veya completion yüzeyi açmaz",
  async () => {
    const [
      client,
      controller,
      quantityUi,
      html
    ] =
      await Promise.all([
        readFile(
          CLIENT,
          "utf8"
        ),
        readFile(
          CONTROLLER,
          "utf8"
        ),
        readFile(
          QUANTITY_UI,
          "utf8"
        ),
        readFile(
          HTML,
          "utf8"
        )
      ]);

    const combined =
      [
        client,
        controller,
        quantityUi
      ].join("\n");

    assert.doesNotMatch(
      combined,
      /expected_quantity|expectedQuantity|variance_quantity|variance_percentage|variance_value|unit_cost|unitCost/
    );

    assert.doesNotMatch(
      combined,
      /warehouse_inventory_/
    );

    assert.doesNotMatch(
      combined,
      /cycle-count-(complete|adjust|recount)-confirm/
    );

    assert.doesNotMatch(
      html,
      /Beklenen miktar|Sayım farkı:|Stok düzeltmesini onayla/
    );
  }
);

test(
  "client ve controller service role veya doğrudan inventory mutation açmaz",
  async () => {
    const [
      client,
      controller
    ] =
      await Promise.all([
        readFile(
          CLIENT,
          "utf8"
        ),
        readFile(
          CONTROLLER,
          "utf8"
        )
      ]);

    const combined =
      `${client}\n${controller}`;

    assert.doesNotMatch(
      combined,
      /SUPABASE_SERVICE_ROLE_KEY|service_role|serviceRole/i
    );

    assert.doesNotMatch(
      combined,
      /warehouse_inventory_/
    );

    assert.doesNotMatch(
      combined,
      /\.from\(|\.insert\(|\.update\(/
    );

    assert.doesNotMatch(
      combined,
      /\/rest\/v1\/warehouse_/i
    );
  }
);

test(
  "Cycle Count script sırası core UI quantity UI write controller ve Receiving şeklindedir",
  async () => {
    const html =
      await readFile(
        HTML,
        "utf8"
      );

    const core =
      html.indexOf(
        "/js/warehouse/cycle-count-ui.js"
      );

    const quantity =
      html.indexOf(
        "/js/warehouse/cycle-count-quantity-ui.js"
      );

    const controller =
      html.indexOf(
        "/js/warehouse/cycle-count-write-controller.js"
      );

    const receiving =
      html.indexOf(
        "/js/warehouse/receiving-ui.js"
      );

    assert.ok(
      core >= 0 &&
      core < quantity &&
      quantity < controller &&
      controller < receiving
    );
  }
);

test(
  "Production build tüm A7.2.2 mobil varlıklarını yayınlar",
  async () => {
    const build =
      await readFile(
        BUILD,
        "utf8"
      );

    for (
      const file
      of [
        "js/warehouse/cycle-count-client.js",
        "js/warehouse/cycle-count-quantity-ui.js",
        "js/warehouse/cycle-count-write-controller.js"
      ]
    ) {
      assert.match(
        build,
        new RegExp(
          file.replace(
            /\./g,
            "\\."
          )
        )
      );
    }
  }
);

test(
  "Cycle Count quantity CSS mobil dokunma ve dar ekran sözleşmesini korur",
  async () => {
    const css =
      await readFile(
        CSS,
        "utf8"
      );

    assert.match(
      css,
      /warehouse-cycle-count-quantity/
    );

    assert.match(
      css,
      /warehouse-cycle-count-save/
    );

    assert.match(
      css,
      /min-height:\s*3\.25rem/
    );

    assert.match(
      css,
      /@media\s*\(max-width:\s*800px\)/
    );
  }
);
