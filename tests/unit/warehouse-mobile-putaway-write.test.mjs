import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ACCOUNT_ID =
  "11111111-1111-4111-8111-111111111111";
const PUTAWAY_ID =
  "22222222-2222-4222-8222-222222222222";
const ITEM_ID =
  "33333333-3333-4333-8333-333333333333";
const LOCATION_ID =
  "44444444-4444-4444-8444-444444444444";
const REQUEST_ID =
  "55555555-5555-4555-8555-555555555555";

test("Putaway client caller JWT Idempotency-Key ve execute_item payloadını taşır", async () => {
  const { executePutawayItem } =
    await import(
      "../../js/warehouse/putaway-client.js"
    );

  const calls = [];

  const result =
    await executePutawayItem({
      accessToken:
        "kullanici-token",
      accountId:
        ACCOUNT_ID,
      putawayId:
        PUTAWAY_ID,
      putawayItemId:
        ITEM_ID,
      targetLocationId:
        LOCATION_ID,
      quantity: 2,
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
                  "execute_item",
                remainingQuantity: 3
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

  const body =
    JSON.parse(
      calls[0].options.body
    );

  assert.deepEqual(
    body,
    {
      accountId:
        ACCOUNT_ID,
      action:
        "execute_item",
      payload: {
        putawayId:
          PUTAWAY_ID,
        putawayItemId:
          ITEM_ID,
        targetLocationId:
          LOCATION_ID,
        quantity: 2
      }
    }
  );

  assert.equal(
    result.requestId,
    REQUEST_ID
  );
});

test("Putaway client dar execute payloadını doğrular", async () => {
  const {
    buildExecuteItemPayload
  } = await import(
    "../../js/warehouse/putaway-client.js"
  );

  assert.deepEqual(
    buildExecuteItemPayload({
      putawayId:
        PUTAWAY_ID,
      putawayItemId:
        ITEM_ID,
      targetLocationId:
        LOCATION_ID,
      quantity: "2.5"
    }),
    {
      putawayId:
        PUTAWAY_ID,
      putawayItemId:
        ITEM_ID,
      targetLocationId:
        LOCATION_ID,
      quantity: 2.5
    }
  );

  assert.throws(
    () =>
      buildExecuteItemPayload({
        putawayId:
          PUTAWAY_ID,
        putawayItemId:
          ITEM_ID,
        targetLocationId:
          LOCATION_ID,
        quantity: 0
      }),
    /sıfırdan büyük/
  );
});

test("Putaway controller yalnız açık putaway-confirm olayını dinler", async () => {
  const source =
    await readFile(
      "js/warehouse/putaway-write-controller.js",
      "utf8"
    );

  assert.match(
    source,
    /warehouse:putaway-confirm/
  );
  assert.doesNotMatch(
    source,
    /warehouse:barcode-scan/
  );
  assert.match(
    source,
    /persistPutawayConfirmation/
  );
});

test("Putaway controller caller JWT ve firma contextini clienta taşır", async () => {
  const {
    persistPutawayConfirmation
  } = await import(
    "../../js/warehouse/putaway-write-controller.js"
  );

  const calls = [];

  await persistPutawayConfirmation(
    {
      putawayId:
        PUTAWAY_ID,
      putawayItemId:
        ITEM_ID,
      targetLocationId:
        LOCATION_ID,
      quantity: 2
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
      execute:
        async (input) => {
          calls.push(input);

          return {
            requestId:
              input.requestId,
            data: {
              remainingQuantity: 1
            }
          };
        }
    }
  );

  assert.equal(
    calls[0].accessToken,
    "kullanici-token"
  );
  assert.equal(
    calls[0].accountId,
    ACCOUNT_ID
  );
});

test("Ağ hatasında aynı Putaway işlemi aynı Idempotency-Key ile tekrar edilir", async () => {
  const {
    persistPutawayConfirmation
  } = await import(
    "../../js/warehouse/putaway-write-controller.js"
  );

  const requestIds = [];
  let attempt = 0;

  const confirmation = {
    putawayId:
      PUTAWAY_ID,
    putawayItemId:
      ITEM_ID,
    targetLocationId:
      LOCATION_ID,
    quantity: 2
  };

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
            remainingQuantity: 1
          }
        };
      }
  };

  await assert.rejects(
    persistPutawayConfirmation(
      confirmation,
      dependencies
    ),
    /Geçici ağ hatası/
  );

  await persistPutawayConfirmation(
    confirmation,
    dependencies
  );

  assert.equal(
    requestIds[0],
    requestIds[1]
  );
});

test("Başarılı Putaway işleminden sonra yeni onay yeni Idempotency-Key üretir", async () => {
  const {
    persistPutawayConfirmation
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
    execute:
      async (input) => {
        requestIds.push(
          input.requestId
        );

        return {
          requestId:
            input.requestId,
          data: {
            remainingQuantity: 0
          }
        };
      }
  };

  const confirmation = {
    putawayId:
      PUTAWAY_ID,
    putawayItemId:
      ITEM_ID,
    targetLocationId:
      LOCATION_ID,
    quantity: 2
  };

  await persistPutawayConfirmation(
    confirmation,
    dependencies
  );

  await persistPutawayConfirmation(
    confirmation,
    dependencies
  );

  assert.notEqual(
    requestIds[0],
    requestIds[1]
  );
});

test("Putaway write eşzamanlı çift onayı writePending ile engeller", async () => {
  const source =
    await readFile(
      "js/warehouse/putaway-write-controller.js",
      "utf8"
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
    /writePending = true/
  );
  assert.match(
    source,
    /writePending = false/
  );
});

test("Putaway UI yalnız açık kullanıcı onayından sonra putaway-confirm üretir", async () => {
  const source =
    await readFile(
      "js/warehouse/putaway-ui.js",
      "utf8"
    );

  assert.match(
    source,
    /window\.confirm/
  );
  assert.match(
    source,
    /warehouse:putaway-confirm/
  );
  assert.match(
    source,
    /putawayItemId/
  );
  assert.match(
    source,
    /targetLocationId/
  );
});

test("Barkod listener doğrudan Putaway write onayı üretmez", async () => {
  const source =
    await readFile(
      "js/warehouse/putaway-ui.js",
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

  assert.ok(start >= 0);
  assert.ok(end > start);

  assert.doesNotMatch(
    source.slice(start, end),
    /warehouse:putaway-confirm/
  );
});

test("Putaway write başarı hata ve satır yenileme olayları UI tarafından işlenir", async () => {
  const source =
    await readFile(
      "js/warehouse/putaway-ui.js",
      "utf8"
    );

  assert.match(
    source,
    /warehouse:putaway-write-start/
  );
  assert.match(
    source,
    /warehouse:putaway-write-success/
  );
  assert.match(
    source,
    /warehouse:putaway-write-error/
  );
  assert.match(
    source,
    /void loadPutawayOptions/
  );
});

test("Putaway write controller Warehouse sayfasında UI sonrasında yüklenir", async () => {
  const html =
    await readFile(
      "warehouse/index.html",
      "utf8"
    );

  const uiIndex =
    html.indexOf(
      "/js/warehouse/putaway-ui.js"
    );
  const controllerIndex =
    html.indexOf(
      "/js/warehouse/putaway-write-controller.js"
    );
  const receivingIndex =
    html.indexOf(
      "/js/warehouse/receiving-ui.js"
    );

  assert.ok(uiIndex >= 0);
  assert.ok(
    controllerIndex > uiIndex
  );
  assert.ok(
    receivingIndex >
      controllerIndex
  );
});

test("Putaway client controller service role veya direct inventory write açmaz", async () => {
  const clientSource =
    await readFile(
      "js/warehouse/putaway-client.js",
      "utf8"
    );
  const controllerSource =
    await readFile(
      "js/warehouse/putaway-write-controller.js",
      "utf8"
    );

  const combined =
    `${clientSource}\n${controllerSource}`;

  assert.doesNotMatch(
    combined,
    /SUPABASE_SERVICE_ROLE_KEY|service_role/i
  );
  assert.doesNotMatch(
    combined,
    /warehouse_inventory_(movements|balances)/
  );
  assert.doesNotMatch(
    combined,
    /\.from\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(/
  );
});
