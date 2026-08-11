import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  extractBearerToken,
  mapRpcError,
  normalizeUuid,
  normalizeWriteAction,
  normalizeWriteRequest,
  onRequestOptions,
  onRequestPost,
} from "../../functions/api/warehouse/receiving.js";

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";

test("Receiving write API Bearer tokenı ayıklar", () => {
  const request = new Request(
    "https://istebul.com/api/warehouse/receiving",
    {
      headers: {
        Authorization: "Bearer örnek-token",
      },
    },
  );

  assert.equal(
    extractBearerToken(request),
    "örnek-token",
  );

  assert.equal(
    extractBearerToken(
      new Request(
        "https://istebul.com/api/warehouse/receiving",
      ),
    ),
    null,
  );
});

test("Receiving write API UUID ve işlem adını doğrular", () => {
  assert.equal(normalizeUuid(ACCOUNT_ID), ACCOUNT_ID);
  assert.equal(normalizeUuid("firma-1"), null);

  assert.equal(normalizeWriteAction("create"), "create");
  assert.equal(
    normalizeWriteAction("receive_quantity"),
    "receive_quantity",
  );
  assert.equal(normalizeWriteAction("complete"), null);
});

test("Receiving write isteği Idempotency-Key olmadan kabul edilmez", () => {
  const result = normalizeWriteRequest(
    {
      accountId: ACCOUNT_ID,
      action: "create",
      payload: {},
    },
    null,
  );

  assert.deepEqual(result, {
    ok: false,
    reason: "request_id_invalid",
  });
});

test("Receiving write isteği normalize edilir", () => {
  const result = normalizeWriteRequest(
    {
      accountId: ACCOUNT_ID,
      action: "add_item",
      payload: {
        receivingId:
          "33333333-3333-4333-8333-333333333333",
      },
    },
    REQUEST_ID,
  );

  assert.equal(result.ok, true);
  assert.equal(result.value.accountId, ACCOUNT_ID);
  assert.equal(result.value.action, "add_item");
  assert.equal(result.value.requestId, REQUEST_ID);
});

test("Receiving write API servis rolü kullanmaz ve kullanıcı JWT'sini RPC'ye iletir", async () => {
  const source = await readFile(
    "functions/api/warehouse/receiving.js",
    "utf8",
  );

  assert.equal(
    source.includes("SUPABASE_SERVICE_ROLE_KEY"),
    false,
  );

  assert.match(
    source,
    /Authorization:\s*`Bearer \$\{token\}`/,
  );
  assert.match(
    source,
    /warehouse_receiving_write/,
  );
  assert.match(source, /Idempotency-Key/);
  assert.match(source, /onRequestPost/);
  assert.match(source, /onRequestOptions/);
});

test("Receiving write API başarılı RPC sonucunu standart zarfla döndürür", async () => {
  const calls = [];

  const fetchMock = async (url, options = {}) => {
    calls.push({
      url: String(url),
      options,
    });

    if (String(url).includes("/auth/v1/user")) {
      return new Response(
        JSON.stringify({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (
      String(url).includes(
        "/rest/v1/rpc/warehouse_receiving_write",
      )
    ) {
      return new Response(
        JSON.stringify({
          action: "create",
          receivingId:
            "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          status: "draft",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    throw new Error(`Beklenmeyen URL: ${url}`);
  };

  const request = new Request(
    "https://istebul.com/api/warehouse/receiving",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer kullanici-token",
        "Content-Type": "application/json",
        "Idempotency-Key": REQUEST_ID,
        Origin: "https://www.istebul.com",
      },
      body: JSON.stringify({
        accountId: ACCOUNT_ID,
        action: "create",
        payload: {
          warehouseId:
            "33333333-3333-4333-8333-333333333333",
          receivingLocationId:
            "44444444-4444-4444-8444-444444444444",
          source: "manual",
        },
      }),
    },
  );

  const response = await onRequestPost({
    request,
    env: {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon-key",
    },
    fetch: fetchMock,
  });

  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("Cache-Control"),
    "private, no-store",
  );

  const body = await response.json();

  assert.equal(body.ok, true);
  assert.equal(body.data.status, "draft");
  assert.equal(calls.length, 2);

  const rpcBody = JSON.parse(
    calls[1].options.body,
  );

  assert.equal(rpcBody.p_account_id, ACCOUNT_ID);
  assert.equal(rpcBody.p_request_id, REQUEST_ID);
  assert.equal(rpcBody.p_action, "create");
  assert.equal(
    calls[1].options.headers.Authorization,
    "Bearer kullanici-token",
  );
});

test("Receiving write API OPTIONS güvenli CORS başlıklarını döndürür", () => {
  const response = onRequestOptions({
    request: new Request(
      "https://istebul.com/api/warehouse/receiving",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://www.istebul.com",
        },
      },
    ),
  });

  assert.equal(response.status, 204);
  assert.match(
    response.headers.get(
      "Access-Control-Allow-Headers",
    ),
    /Idempotency-Key/,
  );
  assert.equal(
    response.headers.get("Cache-Control"),
    "private, no-store",
  );
});

test("RPC hata kodları güvenli HTTP hata kodlarına çevrilir", () => {
  assert.deepEqual(
    mapRpcError({
      status: 400,
      data: {
        code: "42501",
        message: "Yetki yok.",
      },
    }),
    {
      status: 403,
      code: "forbidden",
      message: "Yetki yok.",
    },
  );

  assert.equal(
    mapRpcError({
      status: 400,
      data: {
        code: "23505",
        message: "Çakışma.",
      },
    }).status,
    409,
  );

  assert.equal(
    mapRpcError({
      status: 400,
      data: {
        code: "P0002",
        message: "Bulunamadı.",
      },
    }).status,
    404,
  );
});
