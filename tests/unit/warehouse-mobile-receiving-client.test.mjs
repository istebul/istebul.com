import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ACCOUNT_ID =
  "11111111-1111-4111-8111-111111111111";

const REQUEST_ID =
  "22222222-2222-4222-8222-222222222222";

const RECEIVING_ID =
  "33333333-3333-4333-8333-333333333333";

test("Receiving client kullanıcı JWT ve idempotency başlığını taşır", async () => {
  const {
    writeReceiving
  } = await import(
    "../../js/warehouse/receiving-client.js"
  );

  const calls = [];

  const fetchImpl = async (url, options) => {
    calls.push({ url, options });

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          action: "receive_quantity"
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  };

  const result = await writeReceiving({
    accessToken: "kullanici-token",
    accountId: ACCOUNT_ID,
    action: "receive_quantity",
    payload: {
      receivingId: RECEIVING_ID
    },
    requestId: REQUEST_ID,
    fetchImpl
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "/api/warehouse/receiving"
  );

  assert.equal(
    calls[0].options.headers.Authorization,
    "Bearer kullanici-token"
  );

  assert.equal(
    calls[0].options.headers["Idempotency-Key"],
    REQUEST_ID
  );

  const body = JSON.parse(calls[0].options.body);

  assert.equal(body.accountId, ACCOUNT_ID);
  assert.equal(body.action, "receive_quantity");
  assert.deepEqual(body.payload, {
    receivingId: RECEIVING_ID
  });

  assert.equal(result.requestId, REQUEST_ID);
  assert.equal(
    result.data.action,
    "receive_quantity"
  );
});

test("Receiving client service role veya anonim yazma anahtarı kullanmaz", async () => {
  const source = await readFile(
    "js/warehouse/receiving-client.js",
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /SUPABASE_SERVICE_ROLE_KEY/
  );

  assert.doesNotMatch(
    source,
    /SUPABASE_ANON_KEY/
  );

  assert.match(
    source,
    /Authorization:\s*`Bearer \$\{token\}`/
  );
});

test("Receiving client barkod tarama olayını doğrudan dinlemez", async () => {
  const source = await readFile(
    "js/warehouse/receiving-client.js",
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /warehouse:barcode-scan/
  );

  assert.doesNotMatch(
    source,
    /addEventListener/
  );
});

test("Receiving complete ayrı açık işlem olarak gönderilir", async () => {
  const {
    completeReceiving
  } = await import(
    "../../js/warehouse/receiving-client.js"
  );

  const calls = [];

  const fetchImpl = async (url, options) => {
    calls.push({ url, options });

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          action: "complete",
          receivingId: RECEIVING_ID,
          status: "completed"
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  };

  const result = await completeReceiving({
    accessToken: "kullanici-token",
    accountId: ACCOUNT_ID,
    receivingId: RECEIVING_ID,
    requestId: REQUEST_ID,
    fetchImpl
  });

  const body = JSON.parse(calls[0].options.body);

  assert.equal(body.action, "complete");
  assert.deepEqual(body.payload, {
    receivingId: RECEIVING_ID
  });

  assert.equal(
    result.data.status,
    "completed"
  );
});

test("Receiving client hatalı UUID ile API çağrısı yapmaz", async () => {
  const {
    writeReceiving
  } = await import(
    "../../js/warehouse/receiving-client.js"
  );

  let called = false;

  await assert.rejects(
    writeReceiving({
      accessToken: "kullanici-token",
      accountId: "firma-1",
      action: "receive_quantity",
      payload: {},
      requestId: REQUEST_ID,
      fetchImpl: async () => {
        called = true;
        throw new Error("Çağrılmamalı");
      }
    }),
    /Firma kimliği geçerli bir UUID olmalıdır/
  );

  assert.equal(called, false);
});

test("Receiving client API hata mesajını kullanıcıya taşır", async () => {
  const {
    writeReceiving
  } = await import(
    "../../js/warehouse/receiving-client.js"
  );

  await assert.rejects(
    writeReceiving({
      accessToken: "kullanici-token",
      accountId: ACCOUNT_ID,
      action: "receive_quantity",
      payload: {},
      requestId: REQUEST_ID,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            ok: false,
            error: {
              message: "Mal kabul satırı bulunamadı."
            }
          }),
          {
            status: 404,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
    }),
    /Mal kabul satırı bulunamadı/
  );
});
