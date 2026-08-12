import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  extractBearerToken,
  mapRpcError,
  normalizeUuid,
  normalizeWriteAction,
  normalizeWriteRequest,
  onRequestOptions,
  onRequestPost,
} from "../../functions/api/warehouse/putaway.js";

const ACCOUNT_ID =
  "11111111-1111-4111-8111-111111111111";
const REQUEST_ID =
  "22222222-2222-4222-8222-222222222222";

test("Putaway write API Bearer tokenı ayıklar", () => {
  const request = new Request(
    "https://istebul.com/api/warehouse/putaway",
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
        "https://istebul.com/api/warehouse/putaway",
      ),
    ),
    null,
  );
});

test(
  "Putaway write API create add_item start execute_item ve complete aksiyonlarını kabul eder",
  () => {
    assert.equal(normalizeUuid(ACCOUNT_ID), ACCOUNT_ID);
    assert.equal(normalizeUuid("firma-1"), null);

    assert.equal(normalizeWriteAction("create"), "create");
    assert.equal(
      normalizeWriteAction("add_item"),
      "add_item",
    );
    assert.equal(normalizeWriteAction("start"), "start");

    assert.equal(
      normalizeWriteAction("execute_item"),
      "execute_item",
    );
    assert.equal(
      normalizeWriteAction("complete"),
      "complete",
    );
    assert.equal(normalizeWriteAction("cancel"), null);
  },
);

test(
  "Putaway write isteği Idempotency-Key olmadan kabul edilmez",
  () => {
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
  },
);

test(
  "Putaway write payload yalnız JSON nesnesi olabilir",
  () => {
    const invalid = normalizeWriteRequest(
      {
        accountId: ACCOUNT_ID,
        action: "create",
        payload: [],
      },
      REQUEST_ID,
    );

    assert.deepEqual(invalid, {
      ok: false,
      reason: "payload_invalid",
    });

    const valid = normalizeWriteRequest(
      {
        accountId: ACCOUNT_ID,
        action: "add_item",
        payload: {
          putawayId:
            "33333333-3333-4333-8333-333333333333",
        },
      },
      REQUEST_ID,
    );

    assert.equal(valid.ok, true);
    assert.equal(valid.value.accountId, ACCOUNT_ID);
    assert.equal(valid.value.action, "add_item");
    assert.equal(valid.value.requestId, REQUEST_ID);
  },
);

test(
  "Putaway write API service role kullanmaz ve caller JWT ile RPC çağırır",
  async () => {
    const source = await readFile(
      "functions/api/warehouse/putaway.js",
      "utf8",
    );

    assert.equal(
      source.includes("SUPABASE_SERVICE_ROLE_KEY"),
      false,
    );

    assert.equal(source.includes("service_role"), false);

    assert.match(
      source,
      /Authorization:\s*`Bearer \$\{token\}`/,
    );

    assert.match(
      source,
      /warehouse_putaway_write/,
    );

    assert.match(source, /Idempotency-Key/);
  },
);

test(
  "Putaway write API başarılı RPC sonucunu standart zarfla döndürür",
  async () => {
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
          "/rest/v1/rpc/warehouse_putaway_write",
        )
      ) {
        return new Response(
          JSON.stringify({
            action: "create",
            putawayId:
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
      "https://istebul.com/api/warehouse/putaway",
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
            sourceLocationId:
              "44444444-4444-4444-8444-444444444444",
            strategy: "nearest_location",
          },
        }),
      },
    );

    const response = await onRequestPost({
      request,
      env: {
        SUPABASE_URL:
          "https://example.supabase.co",
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

    const rpcCall = calls[1];
    assert.match(
      rpcCall.url,
      /\/rest\/v1\/rpc\/warehouse_putaway_write$/,
    );

    const rpcBody = JSON.parse(rpcCall.options.body);

    assert.deepEqual(rpcBody, {
      p_action: "create",
      p_request_id: REQUEST_ID,
      p_account_id: ACCOUNT_ID,
      p_payload: {
        warehouseId:
          "33333333-3333-4333-8333-333333333333",
        sourceLocationId:
          "44444444-4444-4444-8444-444444444444",
        strategy: "nearest_location",
      },
    });

    assert.equal(
      rpcCall.options.headers.Authorization,
      "Bearer kullanici-token",
    );

    assert.equal(
      rpcCall.options.headers.apikey,
      "anon-key",
    );
  },
);

test(
  "Putaway write API oturum olmadan RPC çağırmaz",
  async () => {
    let fetchCalled = false;

    const response = await onRequestPost({
      request: new Request(
        "https://istebul.com/api/warehouse/putaway",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": REQUEST_ID,
          },
          body: JSON.stringify({
            accountId: ACCOUNT_ID,
            action: "start",
            payload: {
              putawayId:
                "33333333-3333-4333-8333-333333333333",
            },
          }),
        },
      ),
      env: {
        SUPABASE_URL:
          "https://example.supabase.co",
        SUPABASE_ANON_KEY: "anon-key",
      },
      fetch: async () => {
        fetchCalled = true;
        throw new Error("Çağrılmamalı.");
      },
    });

    assert.equal(response.status, 401);
    assert.equal(fetchCalled, false);
  },
);

test(
  "Putaway write API OPTIONS güvenli CORS başlıklarını döndürür",
  () => {
    const response = onRequestOptions({
      request: new Request(
        "https://istebul.com/api/warehouse/putaway",
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
  },
);

test(
  "Putaway RPC hata kodları güvenli HTTP hata kodlarına çevrilir",
  () => {
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

    assert.equal(
      mapRpcError({
        status: 400,
        data: {
          code: "22023",
          message: "Geçersiz.",
        },
      }).status,
      400,
    );

    assert.equal(
      mapRpcError({
        status: 503,
        data: {
          message: "Upstream.",
        },
      }).status,
      502,
    );
  },
);

test(
  "Putaway execute payloadı dar RPC sözleşmesine göre doğrulanır",
  () => {
    const putawayId =
      "33333333-3333-4333-8333-333333333333";
    const putawayItemId =
      "44444444-4444-4444-8444-444444444444";
    const targetLocationId =
      "55555555-5555-4555-8555-555555555555";

    const missing = normalizeWriteRequest(
      {
        accountId: ACCOUNT_ID,
        action: "execute_item",
        payload: {
          putawayId,
          putawayItemId,
          quantity: 2,
        },
      },
      REQUEST_ID,
    );

    assert.deepEqual(missing, {
      ok: false,
      reason: "target_location_id_invalid",
    });

    const invalidQuantity = normalizeWriteRequest(
      {
        accountId: ACCOUNT_ID,
        action: "execute_item",
        payload: {
          putawayId,
          putawayItemId,
          targetLocationId,
          quantity: 0,
        },
      },
      REQUEST_ID,
    );

    assert.deepEqual(invalidQuantity, {
      ok: false,
      reason: "quantity_invalid",
    });

    const valid = normalizeWriteRequest(
      {
        accountId: ACCOUNT_ID,
        action: "execute_item",
        payload: {
          putawayId,
          putawayItemId,
          targetLocationId,
          quantity: "2.5",
          notes: "  Raf doğrulandı.  ",
        },
      },
      REQUEST_ID,
    );

    assert.equal(valid.ok, true);
    assert.deepEqual(valid.value.payload, {
      putawayId,
      putawayItemId,
      targetLocationId,
      quantity: 2.5,
      notes: "Raf doğrulandı.",
    });
  },
);

test(
  "Putaway execute caller JWT ve aynı Idempotency-Key ile atomik RPCye gider",
  async () => {
    const calls = [];
    const putawayId =
      "33333333-3333-4333-8333-333333333333";
    const putawayItemId =
      "44444444-4444-4444-8444-444444444444";
    const targetLocationId =
      "55555555-5555-4555-8555-555555555555";

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
          "/rest/v1/rpc/warehouse_putaway_execute_write",
        )
      ) {
        return new Response(
          JSON.stringify({
            action: "execute_item",
            putawayId,
            putawayItemId,
            targetLocationId,
            quantity: 2.5,
            status: "partially_completed",
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
      "https://istebul.com/api/warehouse/putaway",
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
          action: "execute_item",
          payload: {
            putawayId,
            putawayItemId,
            targetLocationId,
            quantity: 2.5,
            notes: "Raf doğrulandı.",
          },
        }),
      },
    );

    const response = await onRequestPost({
      request,
      env: {
        SUPABASE_URL:
          "https://example.supabase.co",
        SUPABASE_ANON_KEY: "anon-key",
      },
      fetch: fetchMock,
    });

    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);

    assert.match(
      calls[1].url,
      /warehouse_putaway_execute_write$/,
    );

    assert.equal(
      calls[1].options.headers.Authorization,
      "Bearer kullanici-token",
    );

    assert.equal(
      calls[1].options.headers.apikey,
      "anon-key",
    );

    const rpcBody = JSON.parse(
      calls[1].options.body,
    );

    assert.deepEqual(rpcBody, {
      p_request_id: REQUEST_ID,
      p_account_id: ACCOUNT_ID,
      p_putaway_id: putawayId,
      p_putaway_item_id: putawayItemId,
      p_target_location_id: targetLocationId,
      p_quantity: 2.5,
      p_notes: "Raf doğrulandı.",
    });
  },
);

test(
  "Putaway complete payloadı yalnız Putaway kimliğini kabul eder",
  () => {
    const putawayId =
      "33333333-3333-4333-8333-333333333333";

    const missing = normalizeWriteRequest(
      {
        accountId: ACCOUNT_ID,
        action: "complete",
        payload: {},
      },
      REQUEST_ID,
    );

    assert.deepEqual(missing, {
      ok: false,
      reason: "putaway_id_invalid",
    });

    const valid = normalizeWriteRequest(
      {
        accountId: ACCOUNT_ID,
        action: "complete",
        payload: {
          putawayId,
          istemciTarafiFazlaAlan: "gonderilmemeli",
        },
      },
      REQUEST_ID,
    );

    assert.equal(valid.ok, true);

    assert.deepEqual(
      valid.value.payload,
      {
        putawayId,
      },
    );
  },
);

test(
  "Putaway complete caller JWT ve aynı Idempotency-Key ile ayrı RPCye gider",
  async () => {
    const calls = [];
    const putawayId =
      "33333333-3333-4333-8333-333333333333";

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
          "/rest/v1/rpc/warehouse_putaway_complete_write",
        )
      ) {
        return new Response(
          JSON.stringify({
            action: "complete",
            putawayId,
            status: "completed",
            completedAt:
              "2026-08-12T10:30:00.000Z",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      throw new Error(
        `Beklenmeyen URL: ${url}`,
      );
    };

    const request = new Request(
      "https://istebul.com/api/warehouse/putaway",
      {
        method: "POST",
        headers: {
          Authorization:
            "Bearer kullanici-token",
          "Content-Type":
            "application/json",
          "Idempotency-Key":
            REQUEST_ID,
          Origin:
            "https://www.istebul.com",
        },
        body: JSON.stringify({
          accountId: ACCOUNT_ID,
          action: "complete",
          payload: {
            putawayId,
          },
        }),
      },
    );

    const response = await onRequestPost({
      request,
      env: {
        SUPABASE_URL:
          "https://example.supabase.co",
        SUPABASE_ANON_KEY:
          "anon-key",
      },
      fetch: fetchMock,
    });

    assert.equal(response.status, 200);
    assert.equal(calls.length, 2);

    assert.match(
      calls[1].url,
      /warehouse_putaway_complete_write$/,
    );

    assert.equal(
      calls[1].options.headers.Authorization,
      "Bearer kullanici-token",
    );

    assert.equal(
      calls[1].options.headers.apikey,
      "anon-key",
    );

    const rpcBody = JSON.parse(
      calls[1].options.body,
    );

    assert.deepEqual(rpcBody, {
      p_request_id: REQUEST_ID,
      p_account_id: ACCOUNT_ID,
      p_putaway_id: putawayId,
    });

    assert.equal(
      Object.hasOwn(
        rpcBody,
        "p_action",
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        rpcBody,
        "p_payload",
      ),
      false,
    );
  },
);

test(
  "Putaway HTTP kritik aksiyonları yalnız dar RPC yollarına açar",
  async () => {
    const source = await readFile(
      "functions/api/warehouse/putaway.js",
      "utf8",
    );

    const writeActionsBlock =
      source.match(
        /const WRITE_ACTIONS[\s\S]*?\]\);/,
      )?.[0] ?? "";

    assert.match(writeActionsBlock, /execute_item/);
    assert.match(writeActionsBlock, /complete/);
    assert.doesNotMatch(
      writeActionsBlock,
      /cancel/,
    );

    assert.match(
      source,
      /warehouse_putaway_execute_write/,
    );

    assert.match(
      source,
      /warehouse_putaway_complete_write/,
    );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_(movements|balances)/,
    );
  },
);