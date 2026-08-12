import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ACCOUNT_ID =
  "11111111-1111-4111-8111-111111111111";

const PUTAWAY_ID =
  "22222222-2222-4222-8222-222222222222";

const REQUEST_ID =
  "33333333-3333-4333-8333-333333333333";

test("ürün satırı olmayan Putaway complete için hazır değildir", async () => {
  const {
    evaluatePutawayCompletionReadiness
  } = await import(
    "../../js/warehouse/putaway-lookup.js"
  );

  const result =
    evaluatePutawayCompletionReadiness([]);

  assert.equal(result.ready, false);
  assert.equal(result.status, "no_items");
});

test("kalan miktarı bulunan Putaway complete için hazır değildir", async () => {
  const {
    evaluatePutawayCompletionReadiness
  } = await import(
    "../../js/warehouse/putaway-lookup.js"
  );

  const result =
    evaluatePutawayCompletionReadiness([
      {
        remaining_quantity: 1,
        inventory_movement_ids: [
          "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        ]
      }
    ]);

  assert.equal(result.ready, false);
  assert.equal(result.status, "items_remaining");
});

test("stok hareketi bulunmayan Putaway satırı complete için hazır değildir", async () => {
  const {
    evaluatePutawayCompletionReadiness
  } = await import(
    "../../js/warehouse/putaway-lookup.js"
  );

  const result =
    evaluatePutawayCompletionReadiness([
      {
        remaining_quantity: 0,
        inventory_movement_ids: []
      }
    ]);

  assert.equal(result.ready, false);
  assert.equal(result.status, "movement_missing");
});

test("tüm satırları sıfır ve hareketli Putaway complete için hazırdır", async () => {
  const {
    evaluatePutawayCompletionReadiness
  } = await import(
    "../../js/warehouse/putaway-lookup.js"
  );

  const result =
    evaluatePutawayCompletionReadiness([
      {
        remaining_quantity: 0,
        inventory_movement_ids: [
          "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        ]
      },
      {
        remaining_quantity: "0",
        inventory_movement_ids: [
          "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
        ]
      }
    ]);

  assert.equal(result.ready, true);
  assert.equal(result.status, "ready");
  assert.equal(result.itemCount, 2);
});

test("complete readiness yalnız Putaway satırlarını RLS read modeliyle okur", async () => {
  const source =
    await readFile(
      "js/warehouse/putaway-lookup.js",
      "utf8"
    );

  assert.match(
    source,
    /resolvePutawayCompletionReadiness/
  );

  assert.match(
    source,
    /\.from\(PUTAWAY_ITEM_TABLE\)/
  );

  assert.match(
    source,
    /remaining_quantity,inventory_movement_ids/
  );

  const functionStart =
    source.indexOf(
      "export async function resolvePutawayCompletionReadiness"
    );

  const functionSource =
    source.slice(functionStart);

  assert.doesNotMatch(
    functionSource,
    /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/
  );
});

test("complete client caller JWT Idempotency-Key ve yalnız putawayId payloadını taşır", async () => {
  const {
    completePutaway
  } = await import(
    "../../js/warehouse/putaway-client.js"
  );

  const calls = [];

  const result =
    await completePutaway({
      accessToken:
        "kullanici-token",
      accountId:
        ACCOUNT_ID,
      putawayId:
        PUTAWAY_ID,
      requestId:
        REQUEST_ID,
      fetchImpl:
        async (url, options) => {
          calls.push({
            url,
            options
          });

          return new Response(
            JSON.stringify({
              ok: true,
              data: {
                action:
                  "complete",
                putawayId:
                  PUTAWAY_ID,
                status:
                  "completed"
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

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "/api/warehouse/putaway"
  );
  assert.equal(
    calls[0].options.headers.Authorization,
    "Bearer kullanici-token"
  );
  assert.equal(
    calls[0].options.headers["Idempotency-Key"],
    REQUEST_ID
  );

  assert.deepEqual(
    JSON.parse(calls[0].options.body),
    {
      accountId:
        ACCOUNT_ID,
      action:
        "complete",
      payload: {
        putawayId:
          PUTAWAY_ID
      }
    }
  );

  assert.equal(result.requestId, REQUEST_ID);
});

test("complete controller caller JWT firma kapsamı ve ayrı completion fonksiyonunu kullanır", async () => {
  const {
    persistPutawayCompletion
  } = await import(
    "../../js/warehouse/putaway-write-controller.js"
  );

  const calls = [];

  await persistPutawayCompletion(
    {
      putawayId:
        PUTAWAY_ID
    },
    {
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
      complete:
        async (input) => {
          calls.push(input);

          return {
            requestId:
              input.requestId,
            data: {
              status:
                "completed"
            }
          };
        }
    }
  );

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].accessToken,
    "kullanici-token"
  );
  assert.equal(
    calls[0].accountId,
    ACCOUNT_ID
  );
  assert.equal(
    calls[0].putawayId,
    PUTAWAY_ID
  );
});

test("complete ağ hatasında aynı Idempotency-Key ile tekrar edilir", async () => {
  const {
    persistPutawayCompletion
  } = await import(
    "../../js/warehouse/putaway-write-controller.js"
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
    complete:
      async (input) => {
        requestIds.push(input.requestId);

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
            status:
              "completed"
          }
        };
      }
  };

  await assert.rejects(
    persistPutawayCompletion(
      {
        putawayId:
          PUTAWAY_ID
      },
      dependencies
    ),
    /Geçici ağ hatası/
  );

  await persistPutawayCompletion(
    {
      putawayId:
        PUTAWAY_ID
    },
    dependencies
  );

  assert.equal(
    requestIds[0],
    requestIds[1]
  );
});

test("başarılı complete sonrasındaki yeni onay yeni Idempotency-Key üretir", async () => {
  const {
    persistPutawayCompletion
  } = await import(
    "../../js/warehouse/putaway-write-controller.js"
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
    complete:
      async (input) => {
        requestIds.push(input.requestId);

        return {
          requestId:
            input.requestId,
          data: {
            status:
              "completed"
          }
        };
      }
  };

  await persistPutawayCompletion(
    {
      putawayId:
        PUTAWAY_ID
    },
    dependencies
  );

  await persistPutawayCompletion(
    {
      putawayId:
        PUTAWAY_ID
    },
    dependencies
  );

  assert.notEqual(
    requestIds[0],
    requestIds[1]
  );
});

test("complete controller barkod dinlemez ve ayrı explicit event kullanır", async () => {
  const source =
    await readFile(
      "js/warehouse/putaway-write-controller.js",
      "utf8"
    );

  assert.match(
    source,
    /warehouse:putaway-complete-confirm/
  );

  assert.match(
    source,
    /completionRetryRequestIds/
  );

  assert.doesNotMatch(
    source,
    /warehouse:barcode-scan/
  );
});

test("complete UI readiness kontrolü ve ikinci açık kullanıcı onayı olmadan event üretmez", async () => {
  const source =
    await readFile(
      "js/warehouse/putaway-ui.js",
      "utf8"
    );

  assert.match(
    source,
    /resolvePutawayCompletionReadiness/
  );

  assert.match(
    source,
    /refreshPutawayCompletionReadiness/
  );

  assert.match(
    source,
    /window\.confirm/
  );

  assert.match(
    source,
    /warehouse:putaway-complete-confirm/
  );

  assert.match(
    source,
    /uiState\.completionReady/
  );
});

test("execute başarısı veya barkod taraması complete işlemini otomatik başlatmaz", async () => {
  const source =
    await readFile(
      "js/warehouse/putaway-ui.js",
      "utf8"
    );

  const scanStart =
    source.indexOf(
      '"warehouse:barcode-scan"'
    );

  const scanEnd =
    source.indexOf(
      "select?.addEventListener",
      scanStart
    );

  assert.ok(scanStart >= 0);
  assert.ok(scanEnd > scanStart);

  assert.doesNotMatch(
    source.slice(
      scanStart,
      scanEnd
    ),
    /warehouse:putaway-complete-confirm/
  );

  const executeStart =
    source.indexOf(
      '"warehouse:putaway-write-success"'
    );

  const executeEnd =
    source.indexOf(
      '"warehouse:putaway-write-error"',
      executeStart
    );

  assert.ok(executeStart >= 0);
  assert.ok(executeEnd > executeStart);

  assert.doesNotMatch(
    source.slice(
      executeStart,
      executeEnd
    ),
    /warehouse:putaway-complete-confirm/
  );
});
