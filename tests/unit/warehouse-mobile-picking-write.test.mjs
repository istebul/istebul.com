import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ACCOUNT_ID =
  "11111111-1111-4111-8111-111111111111";

const PICKING_ID =
  "22222222-2222-4222-8222-222222222222";

const ITEM_ID =
  "33333333-3333-4333-8333-333333333333";

const SOURCE_ID =
  "44444444-4444-4444-8444-444444444444";

const DESTINATION_ID =
  "55555555-5555-4555-8555-555555555555";

const REQUEST_ID =
  "66666666-6666-4666-8666-666666666666";

const BARCODE =
  "8690000000001";

const confirmation = {
  pickingId:
    PICKING_ID,

  pickingItemId:
    ITEM_ID,

  sourceLocationId:
    SOURCE_ID,

  destinationLocationId:
    DESTINATION_ID,

  quantity: 7,

  shortQuantity: 3,

  barcode:
    BARCODE,

  lotNumber:
    "LOT-2026-01",

  serialNumber:
    "SER-0001"
};

test(
  "Picking client caller JWT Idempotency-Key ve execute_item payloadını taşır",
  async () => {
    const {
      executePickingItem
    } =
      await import(
        "../../js/warehouse/picking-client.js"
      );

    const calls = [];

    const result =
      await executePickingItem({
        accessToken:
          "kullanici-token",

        accountId:
          ACCOUNT_ID,

        ...confirmation,

        requestId:
          REQUEST_ID,

        fetchImpl:
          async (
            url,
            options
          ) => {
            calls.push({
              url,
              options
            });

            return {
              ok: true,
              status: 200,

              async json() {
                return {
                  ok: true,

                  data: {
                    remainingQuantity:
                      0
                  }
                };
              }
            };
          }
      });

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].url,
      "/api/warehouse/picking"
    );

    assert.equal(
      calls[0].options
        .headers.Authorization,
      "Bearer kullanici-token"
    );

    assert.equal(
      calls[0].options
        .headers["Idempotency-Key"],
      REQUEST_ID
    );

    const body =
      JSON.parse(
        calls[0].options.body
      );

    assert.equal(
      body.accountId,
      ACCOUNT_ID
    );

    assert.equal(
      body.action,
      "execute_item"
    );

    assert.deepEqual(
      body.payload,
      confirmation
    );

    assert.equal(
      result.requestId,
      REQUEST_ID
    );
  }
);

test(
  "Picking client tam short-pick için quantity sıfır kabul eder",
  async () => {
    const {
      buildPickingExecuteItemPayload
    } =
      await import(
        "../../js/warehouse/picking-client.js"
      );

    const payload =
      buildPickingExecuteItemPayload({
        ...confirmation,

        quantity: 0,

        shortQuantity: 10
      });

    assert.equal(
      payload.quantity,
      0
    );

    assert.equal(
      payload.shortQuantity,
      10
    );
  }
);

test(
  "Picking client sıfır işlenen miktarı reddeder",
  async () => {
    const {
      buildPickingExecuteItemPayload
    } =
      await import(
        "../../js/warehouse/picking-client.js"
      );

    assert.throws(
      () =>
        buildPickingExecuteItemPayload({
          ...confirmation,
          quantity: 0,
          shortQuantity: 0
        }),
      /en az biri sıfırdan büyük/
    );
  }
);

test(
  "Picking client kaynak ve hedef lokasyonun aynı olmasını reddeder",
  async () => {
    const {
      buildPickingExecuteItemPayload
    } =
      await import(
        "../../js/warehouse/picking-client.js"
      );

    assert.throws(
      () =>
        buildPickingExecuteItemPayload({
          ...confirmation,

          destinationLocationId:
            SOURCE_ID
        }),
      /Kaynak ve hedef lokasyon aynı olamaz/
    );
  }
);

test(
  "Picking controller hata retry işleminde aynı Idempotency-Key değerini korur",
  async () => {
    const {
      persistPickingConfirmation
    } =
      await import(
        "../../js/warehouse/picking-write-controller.js"
      );

    const requestIds = [];
    let attempt = 0;

    const dependencies = {
      getContext:
        () => ({
          accountId:
            ACCOUNT_ID
        }),

      getSession:
        async () => ({
          access_token:
            "kullanici-token"
        }),

      execute:
        async (input) => {
          requestIds.push(
            input.requestId
          );

          attempt += 1;

          if (attempt === 1) {
            throw new Error(
              "Geçici ağ hatası"
            );
          }

          return {
            requestId:
              input.requestId,

            data: {
              remainingQuantity:
                0
            }
          };
        }
    };

    await assert.rejects(
      persistPickingConfirmation(
        confirmation,
        dependencies
      ),
      /Geçici ağ hatası/
    );

    await persistPickingConfirmation(
      confirmation,
      dependencies
    );

    assert.equal(
      requestIds[0],
      requestIds[1]
    );
  }
);

test(
  "başarılı Picking execute sonrasında aynı payload yeni Idempotency-Key üretir",
  async () => {
    const {
      persistPickingConfirmation
    } =
      await import(
        "../../js/warehouse/picking-write-controller.js"
      );

    const requestIds = [];

    const dependencies = {
      getContext:
        () => ({
          accountId:
            ACCOUNT_ID
        }),

      getSession:
        async () => ({
          access_token:
            "kullanici-token"
        }),

      execute:
        async (input) => {
          requestIds.push(
            input.requestId
          );

          return {
            requestId:
              input.requestId,

            data: {
              remainingQuantity:
                0
            }
          };
        }
    };

    await persistPickingConfirmation(
      confirmation,
      dependencies
    );

    await persistPickingConfirmation(
      confirmation,
      dependencies
    );

    assert.notEqual(
      requestIds[0],
      requestIds[1]
    );
  }
);

test(
  "Picking UI explicit buton ve ikinci kullanıcı onayı olmadan write üretmez",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    assert.match(
      source,
      /function confirmPickingCandidate/
    );

    assert.match(
      source,
      /window\.confirm/
    );

    assert.match(
      source,
      /warehouse:picking-confirm/
    );

    assert.match(
      source,
      /buildPickingConfirmation/
    );

    assert.match(
      source,
      /toplama-onayla/
    );
  }
);

test(
  "barkod listener doğrudan Picking write onayı üretmez",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    const start =
      source.indexOf(
        '"warehouse:barcode-scan"'
      );

    const end =
      source.indexOf(
        "select?.addEventListener",
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
      /executePickingItem|execute_item/
    );
  }
);

test(
  "Picking write controller barkod dinlemez ve çift write kilidi kullanır",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-write-controller.js",
        "utf8"
      );

    assert.match(
      source,
      /warehouse:picking-confirm/
    );

    assert.doesNotMatch(
      source,
      /warehouse:barcode-scan/
    );

    assert.match(
      source,
      /let writePending = false/
    );

    assert.match(
      source,
      /if \(writePending\)/
    );

    assert.match(
      source,
      /retryRequestIds/
    );
  }
);

test(
  "Picking UI miktar short-pick kalan miktar lot ve seri kapılarını uygular",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    assert.match(
      source,
      /quantity \+ shortQuantity/
    );

    assert.match(
      source,
      /currentPickingRemainingQuantity/
    );

    assert.match(
      source,
      /expectedPickingLot/
    );

    assert.match(
      source,
      /expectedPickingSerial/
    );

    assert.match(
      source,
      /Lot doğrulaması başarısız/
    );

    assert.match(
      source,
      /Seri numarası doğrulaması başarısız/
    );
  }
);

test(
  "Picking HTML miktar short-pick lot seri ve explicit onay kontrollerini içerir",
  async () => {
    const html =
      await readFile(
        "warehouse/index.html",
        "utf8"
      );

    for (
      const id of [
        "toplama-miktar",
        "toplama-eksik-miktar",
        "toplama-lot-no",
        "toplama-seri-no",
        "toplama-onayla"
      ]
    ) {
      assert.match(
        html,
        new RegExp(
          `id="${id}"`
        )
      );
    }

    assert.match(
      html,
      /id="toplama-miktar"[\s\S]{0,240}?disabled/
    );

    assert.match(
      html,
      /id="toplama-onayla"[\s\S]{0,140}?disabled/
    );
  }
);

test(
  "Picking write lifecycle start success error olaylarını UI işler",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    assert.match(
      source,
      /warehouse:picking-write-start/
    );

    assert.match(
      source,
      /warehouse:picking-write-success/
    );

    assert.match(
      source,
      /warehouse:picking-write-error/
    );

    assert.match(
      source,
      /void loadPickingTaskOptions/
    );
  }
);

test(
  "Picking client controller service role veya doğrudan inventory mutation açmaz",
  async () => {
    const client =
      await readFile(
        "js/warehouse/picking-client.js",
        "utf8"
      );

    const controller =
      await readFile(
        "js/warehouse/picking-write-controller.js",
        "utf8"
      );

    const combined =
      `${client}\n${controller}`;

    assert.doesNotMatch(
      combined,
      /SUPABASE_SERVICE_ROLE_KEY|service_role/i
    );

    assert.doesNotMatch(
      combined,
      /warehouse_inventory_(movements|balances|reservations)/
    );

    assert.doesNotMatch(
      combined,
      /\.from\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(/
    );
  }
);

test(
  "Picking UI doğrudan HTTP veya RPC mutation yapmaz",
  async () => {
    const source =
      await readFile(
        "js/warehouse/picking-ui.js",
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /\bfetch\s*\(/
    );

    assert.doesNotMatch(
      source,
      /warehouse_picking_(write|execute_write|complete_write|resolve_exception_write)/
    );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_(movements|balances)/
    );

    assert.doesNotMatch(
      source,
      /\.(insert|update|upsert|delete)\s*\(/
    );
  }
);

test(
  "Picking write controller doğru script sırasındadır",
  async () => {
    const html =
      await readFile(
        "warehouse/index.html",
        "utf8"
      );

    const paths = [
      "/js/warehouse/operations-center.js",
      "/js/warehouse/putaway-ui.js",
      "/js/warehouse/putaway-write-controller.js",
      "/js/warehouse/picking-ui.js",
      "/js/warehouse/picking-write-controller.js",
      "/js/warehouse/receiving-ui.js",
      "/js/warehouse/receiving-write-controller.js"
    ];

    const positions =
      paths.map(
        (path) =>
          html.indexOf(path)
      );

    for (
      const position of positions
    ) {
      assert.ok(
        position >= 0
      );
    }

    assert.deepEqual(
      positions,
      [...positions].sort(
        (a, b) => a - b
      )
    );
  }
);

test(
  "A6.3.1 execute UI complete veya resolve_exception işlemini bağlamaz",
  async () => {
    const sources =
      await Promise.all([
        readFile(
          "js/warehouse/picking-client.js",
          "utf8"
        ),
        readFile(
          "js/warehouse/picking-write-controller.js",
          "utf8"
        ),
        readFile(
          "js/warehouse/picking-ui.js",
          "utf8"
        )
      ]);

    const combined =
      sources.join("\n");

    assert.doesNotMatch(
      combined,
      /warehouse:picking-complete-confirm/
    );

    assert.doesNotMatch(
      combined,
      /warehouse:picking-exception-confirm/
    );

    assert.doesNotMatch(
      combined,
      /action:\s*"complete"/
    );

    assert.doesNotMatch(
      combined,
      /action:\s*"resolve_exception"/
    );
  }
);
