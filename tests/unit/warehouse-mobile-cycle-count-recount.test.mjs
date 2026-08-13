import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CLIENT =
  "js/warehouse/cycle-count-recount-client.js";

const CONTROLLER =
  "js/warehouse/cycle-count-recount-controller.js";

const UI =
  "js/warehouse/cycle-count-recount-ui.js";

const CORE =
  "js/warehouse/cycle-count-ui.js";

const HTML =
  "warehouse/index.html";

const CSS =
  "css/warehouse/cycle-count-mobile.css";

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

const REQUEST_2 =
  "77777777-7777-4777-8777-777777777777";

const {
  buildCycleCountRecountPayload,
  recordCycleCountRecountQuantity
} =
  await import(
    "../../js/warehouse/cycle-count-recount-client.js"
  );

const {
  buildCycleCountRecountConfirmation,
  persistCycleCountRecountQuantity
} =
  await import(
    "../../js/warehouse/cycle-count-recount-controller.js"
  );

const {
  isEligibleRecountTask,
  recountLocationMatchesTask,
  recountProductMatchesTask
} =
  await import(
    "../../js/warehouse/cycle-count-recount-ui.js"
  );

test(
  "Recount client dar payloadı normalize eder",
  () => {
    const payload =
      buildCycleCountRecountPayload({
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
          "Kontrollü yeniden sayım"
      });

    assert.deepEqual(
      Object.keys(
        payload
      ).sort(),
      [
        "countedQuantity",
        "cycleCountId",
        "cycleCountItemId",
        "locationScan",
        "notes",
        "productScan",
        "taskId"
      ].sort()
    );

    assert.equal(
      payload.countedQuantity,
      0
    );
  }
);

test(
  "Recount client caller JWT Idempotency-Key ve güvenli HTTP endpoint kullanır",
  async () => {
    let call = null;

    const result =
      await recordCycleCountRecountQuantity({
        accessToken:
          "caller-token",
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
          12,
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
      "/api/warehouse/cycle-count-recount-quantity"
    );

    assert.equal(
      call.options.headers
        .Authorization,
      "Bearer caller-token"
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
      body.action,
      "record_recount_quantity"
    );

    assert.equal(
      body.payload
        .countedQuantity,
      12
    );

    assert.equal(
      result.requestId,
      REQUEST
    );
  }
);

test(
  "Recount controller Node testinde browser runtime import etmeden dependency injection kullanır",
  async () => {
    const confirmation =
      buildCycleCountRecountConfirmation({
        cycleCountId:
          COUNT,
        cycleCountItemId:
          ITEM,
        taskId:
          TASK,
        countedQuantity:
          "7.5",
        locationScan:
          "A-01",
        productScan:
          "SKU-001",
        notes:
          ""
      });

    assert.equal(
      confirmation.countedQuantity,
      7.5
    );

    const result =
      await persistCycleCountRecountQuantity(
        confirmation,
        {
          getWarehouseOperationsContext:
            () => ({
              accountId:
                ACCOUNT,
              warehouseId:
                WAREHOUSE
            }),

          getWarehouseSession:
            async () => ({
              access_token:
                "caller-token"
            }),

          requestIdFactory:
            () =>
              REQUEST,

          recordCycleCountRecountQuantity:
            async (input) => ({
              status:
                "recorded",
              requestId:
                input.requestId
            })
        }
      );

    assert.equal(
      result.requestId,
      REQUEST
    );
  }
);

test(
  "Recount retry aynı Idempotency-Key değerini korur başarı sonrası yeniler",
  async () => {
    const calls = [];

    let generated = 0;

    const ids = [
      REQUEST,
      REQUEST_2
    ];

    const detail = {
      cycleCountId:
        COUNT,
      cycleCountItemId:
        ITEM,
      taskId:
        TASK,
      countedQuantity:
        8,
      locationScan:
        "A-01",
      productScan:
        "SKU-001",
      notes:
        ""
    };

    const dependencies = {
      getWarehouseOperationsContext:
        () => ({
          accountId:
            ACCOUNT,
          warehouseId:
            WAREHOUSE
        }),

      getWarehouseSession:
        async () => ({
          access_token:
            "caller-token"
        }),

      requestIdFactory:
        () =>
          ids[
            generated++
          ],

      recordCycleCountRecountQuantity:
        async (input) => {
          calls.push(
            input.requestId
          );

          if (
            calls.length ===
            1
          ) {
            throw new Error(
              "network"
            );
          }

          return {
            status:
              "recorded",
            requestId:
              input.requestId
          };
        }
    };

    await assert.rejects(
      () =>
        persistCycleCountRecountQuantity(
          detail,
          dependencies
        ),
      /network/
    );

    await persistCycleCountRecountQuantity(
      detail,
      dependencies
    );

    await persistCycleCountRecountQuantity(
      detail,
      dependencies
    );

    assert.deepEqual(
      calls,
      [
        REQUEST,
        REQUEST,
        REQUEST_2
      ]
    );
  }
);

test(
  "Mobil Recount yalnız uygun recount_required görevini kabul eder",
  () => {
    const eligible = {
      id:
        TASK,
      type:
        "recount",
      status:
        "assigned",
      item: {
        id:
          ITEM,
        status:
          "recount_required",
        recount_required:
          true,
        counted_at:
          "2026-08-13T20:00:00Z",
        recounted_at:
          null
      }
    };

    assert.equal(
      isEligibleRecountTask(
        eligible
      ),
      true
    );

    assert.equal(
      isEligibleRecountTask({
        ...eligible,
        type:
          "first_count"
      }),
      false
    );

    assert.equal(
      isEligibleRecountTask({
        ...eligible,
        item: {
          ...eligible.item,
          recounted_at:
            "2026-08-13T21:00:00Z"
        }
      }),
      false
    );
  }
);

test(
  "Mobil Recount strict lokasyon ve ürün SKU taraması uygular",
  () => {
    const task = {
      location: {
        barcode:
          "LOC-0001",
        full_code:
          "A-01-01",
        code:
          "A01"
      },

      product: {
        code:
          "PRD-001"
      },

      sku: {
        sku_code:
          "SKU-001"
      },

      barcodes: [
        {
          value:
            "8690000000001"
        }
      ]
    };

    assert.equal(
      recountLocationMatchesTask(
        task,
        "LOC-0001"
      ),
      true
    );

    assert.equal(
      recountLocationMatchesTask(
        task,
        "a-01-01"
      ),
      true
    );

    assert.equal(
      recountLocationMatchesTask(
        task,
        "B-99"
      ),
      false
    );

    assert.equal(
      recountProductMatchesTask(
        task,
        "sku-001"
      ),
      true
    );

    assert.equal(
      recountProductMatchesTask(
        task,
        "8690000000001"
      ),
      true
    );

    assert.equal(
      recountProductMatchesTask(
        task,
        "SKU-999"
      ),
      false
    );
  }
);

test(
  "Recount UI explicit mod ikinci açık onay ve ayrı confirm eventi kullanır",
  async () => {
    const source =
      await readFile(
        UI,
        "utf8"
      );

    assert.match(
      source,
      /warehouse:cycle-count-recount-mode/
    );

    assert.match(
      source,
      /warehouse:cycle-count-recount-confirm/
    );

    assert.match(
      source,
      /window\.confirm/
    );

    assert.match(
      source,
      /İkinci fiziksel sayım miktarı/
    );
  }
);

test(
  "Recount UI doğrudan HTTP RPC Supabase veya inventory mutation yapmaz",
  async () => {
    const source =
      await readFile(
        UI,
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /\bfetch\s*\(/
    );

    assert.doesNotMatch(
      source,
      /\/rest\/v1\/rpc\//i
    );

    assert.doesNotMatch(
      source,
      /supabase/i
    );

    assert.doesNotMatch(
      source,
      /inventory[_-](adjust|mutation|movement)/i
    );
  }
);

test(
  "Recount client controller ve UI blind-count hassas alanlarını kullanmaz",
  async () => {
    const sources =
      await Promise.all(
        [
          CLIENT,
          CONTROLLER,
          UI
        ].map(
          (file) =>
            readFile(
              file,
              "utf8"
            )
        )
      );

    assert.doesNotMatch(
      sources.join("\n"),
      /expected_quantity|expectedQuantity|first_count_quantity|second_count_quantity|final_count_quantity|variance_quantity|variance_percentage|variance_value|unit_cost|unitCost|recorded_by|recounted_by/i
    );
  }
);

test(
  "Controller operations-center browser runtimeını statik import etmez",
  async () => {
    const source =
      await readFile(
        CONTROLLER,
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /^import[\s\S]*?from\s+["']\.\/operations-center\.js["']/m
    );

    assert.match(
      source,
      /await import\(\s*["']\.\/operations-center\.js["']\s*\)/s
    );
  }
);

test(
  "Core UI recount task handoff verir ve recount modunda first-count barkodunu işlemez",
  async () => {
    const source =
      await readFile(
        CORE,
        "utf8"
      );

    assert.match(
      source,
      /recountModeActive/
    );

    assert.match(
      source,
      /warehouse:cycle-count-recount-tasks/
    );

    assert.match(
      source,
      /warehouse:cycle-count-recount-mode/
    );

    assert.match(
      source,
      /if\s*\(\s*uiState\.recountModeActive\s*\)\s*\{\s*return;/s
    );
  }
);

test(
  "HTML ayrı Recount yüzeyi ve doğru script sırasını taşır",
  async () => {
    const source =
      await readFile(
        HTML,
        "utf8"
      );

    for (
      const id of
      [
        "sayim-yeniden-sayim",
        "sayim-yeniden-modu",
        "sayim-yeniden-gorevi-secimi",
        "sayim-yeniden-lokasyon-barkod",
        "sayim-yeniden-urun-barkod",
        "sayim-yeniden-sayilan-miktar",
        "sayim-yeniden-miktari-kaydet"
      ]
    ) {
      assert.ok(
        source.includes(
          `id="${id}"`
        )
      );
    }

    const evaluation =
      source.indexOf(
        "/js/warehouse/cycle-count-evaluation-controller.js"
      );

    const recountUi =
      source.indexOf(
        "/js/warehouse/cycle-count-recount-ui.js"
      );

    const recountController =
      source.indexOf(
        "/js/warehouse/cycle-count-recount-controller.js"
      );

    const receiving =
      source.indexOf(
        "/js/warehouse/receiving-ui.js"
      );

    assert.ok(
      evaluation >= 0 &&
      evaluation < recountUi &&
      recountUi < recountController &&
      recountController < receiving
    );
  }
);

test(
  "Production build Recount assetlerini yayınlar",
  async () => {
    const source =
      await readFile(
        BUILD,
        "utf8"
      );

    for (
      const asset of
      [
        "js/warehouse/cycle-count-recount-client.js",
        "js/warehouse/cycle-count-recount-ui.js",
        "js/warehouse/cycle-count-recount-controller.js"
      ]
    ) {
      assert.ok(
        source.includes(
          asset
        )
      );
    }
  }
);

test(
  "Recount responsive CSS explicit mode yüzeyini taşır",
  async () => {
    const source =
      await readFile(
        CSS,
        "utf8"
      );

    assert.match(
      source,
      /\.warehouse-cycle-count-recount/
    );

    assert.match(
      source,
      /\.warehouse-cycle-count-recount-mode/
    );

    assert.match(
      source,
      /min-height:\s*44px/
    );

    assert.match(
      source,
      /@media\s*\(max-width:\s*800px\)/
    );
  }
);
