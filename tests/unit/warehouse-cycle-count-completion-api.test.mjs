import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  handleCompletionRequest,
  mapCompletionRpcStatus,
  normalizeCompletionRequest,
} from "../../functions/api/warehouse/cycle-count-completion.js";

const REQUEST_ID =
  "11111111-1111-4111-8111-111111111111";

const ACCOUNT_ID =
  "22222222-2222-4222-8222-222222222222";

const WAREHOUSE_ID =
  "33333333-3333-4333-8333-333333333333";

const COUNT_ID =
  "44444444-4444-4444-8444-444444444444";

const USER_ID =
  "55555555-5555-4555-8555-555555555555";

const TOKEN =
  "caller-jwt";

const ENV = {
  SUPABASE_URL:
    "https://warehouse.test",
  SUPABASE_ANON_KEY:
    "anon-key",
};

function request(
  body,
  {
    token = TOKEN,
    requestId = REQUEST_ID,
    method = "POST",
  } = {}
) {
  const headers =
    new Headers({
      "Content-Type":
        "application/json",
      Origin:
        "https://istebul.com",
    });

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  if (requestId) {
    headers.set(
      "Idempotency-Key",
      requestId
    );
  }

  return new Request(
    "https://istebul.com/api/warehouse/cycle-count-completion",
    {
      method,
      headers,
      body:
        method === "POST"
          ? JSON.stringify(body)
          : undefined,
    }
  );
}

function validBody(
  action = "approve_count"
) {
  return {
    accountId:
      ACCOUNT_ID,

    warehouseId:
      WAREHOUSE_ID,

    action,

    payload: {
      cycleCountId:
        COUNT_ID,

      notes:
        "  Yönetici onayı  ",
    },
  };
}

test("completion request altı lifecycle actionını kabul eder", () => {
  for (
    const action of [
      "approve_count",
      "prepare_adjustments",
      "approve_adjustments",
      "reject_adjustments",
      "process_adjustments",
      "complete_count",
    ]
  ) {
    const normalized =
      normalizeCompletionRequest(
        validBody(action),
        REQUEST_ID
      );

    assert.equal(
      normalized.ok,
      true
    );

    assert.equal(
      normalized.data.action,
      action
    );

    assert.equal(
      normalized.data.payload.notes,
      "Yönetici onayı"
    );
  }
});

test("completion payload ekstra veya hassas alan kabul etmez", () => {
  const topLevel =
    normalizeCompletionRequest(
      {
        ...validBody(),
        expectedQuantity: 10,
      },
      REQUEST_ID
    );

  assert.equal(
    topLevel.ok,
    false
  );

  const payload =
    normalizeCompletionRequest(
      {
        ...validBody(),
        payload: {
          cycleCountId:
            COUNT_ID,
          notes:
            "ok",
          varianceQuantity:
            12,
        },
      },
      REQUEST_ID
    );

  assert.equal(
    payload.ok,
    false
  );
});

test("completion Idempotency-Key UUID olmak zorundadır", () => {
  const normalized =
    normalizeCompletionRequest(
      validBody(),
      "not-a-uuid"
    );

  assert.deepEqual(
    normalized,
    {
      ok: false,
      reason:
        "request_id_invalid",
    }
  );
});

test("completion notes 1000 karakter sınırındadır", () => {
  const normalized =
    normalizeCompletionRequest(
      {
        ...validBody(),
        payload: {
          cycleCountId:
            COUNT_ID,
          notes:
            "x".repeat(1001),
        },
      },
      REQUEST_ID
    );

  assert.deepEqual(
    normalized,
    {
      ok: false,
      reason:
        "notes_too_long",
    }
  );
});

test("Bearer token olmadan upstream çağrısı yapılmaz", async () => {
  let calls = 0;

  const response =
    await handleCompletionRequest(
      {
        request:
          request(
            validBody(),
            {
              token: null,
            }
          ),
        env: ENV,
      },
      async () => {
        calls += 1;
        throw new Error(
          "çağrılmamalı"
        );
      }
    );

  assert.equal(
    response.status,
    401
  );

  assert.equal(
    calls,
    0
  );
});

test("geçersiz warehouseId upstream çağrısını engeller", async () => {
  let calls = 0;

  const response =
    await handleCompletionRequest(
      {
        request:
          request({
            ...validBody(),
            warehouseId:
              "invalid",
          }),
        env: ENV,
      },
      async () => {
        calls += 1;
        throw new Error(
          "çağrılmamalı"
        );
      }
    );

  assert.equal(
    response.status,
    400
  );

  assert.equal(
    calls,
    0
  );
});

test("başarılı POST caller JWT ve anon key ile yalnız completion RPC çağırır", async () => {
  const calls = [];

  const fetchImpl =
    async (
      url,
      options = {}
    ) => {
      calls.push({
        url:
          String(url),
        options,
      });

      const path =
        new URL(url).pathname;

      if (
        path ===
        "/auth/v1/user"
      ) {
        return new Response(
          JSON.stringify({
            id: USER_ID,
          }),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      }

      if (
        path ===
        "/rest/v1/rpc/warehouse_cycle_count_completion_write"
      ) {
        return new Response(
          JSON.stringify({
            requestId:
              REQUEST_ID,
            cycleCountId:
              COUNT_ID,
            action:
              "approve_count",
            status:
              "approved",
          }),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      }

      throw new Error(
        `Beklenmeyen URL: ${url}`
      );
    };

  const response =
    await handleCompletionRequest(
      {
        request:
          request(
            validBody()
          ),
        env: ENV,
      },
      fetchImpl
    );

  assert.equal(
    response.status,
    200
  );

  assert.equal(
    calls.length,
    2
  );

  const rpc =
    calls[1];

  assert.equal(
    new URL(
      rpc.url
    ).pathname,
    "/rest/v1/rpc/warehouse_cycle_count_completion_write"
  );

  assert.equal(
    rpc.options.headers
      .apikey,
    ENV.SUPABASE_ANON_KEY
  );

  assert.equal(
    rpc.options.headers
      .Authorization,
    `Bearer ${TOKEN}`
  );

  const rpcBody =
    JSON.parse(
      rpc.options.body
    );

  assert.deepEqual(
    rpcBody,
    {
      p_request_id:
        REQUEST_ID,

      p_account_id:
        ACCOUNT_ID,

      p_warehouse_id:
        WAREHOUSE_ID,

      p_cycle_count_id:
        COUNT_ID,

      p_action:
        "approve_count",

      p_notes:
        "Yönetici onayı",
    }
  );

  const result =
    await response.json();

  assert.equal(
    result.ok,
    true
  );

  assert.equal(
    result.data.status,
    "approved"
  );
});

test("RPC güvenlik ve lifecycle hata kodları HTTP durumlarına map edilir", () => {
  assert.equal(
    mapCompletionRpcStatus({
      code: "22023",
    }),
    400
  );

  assert.equal(
    mapCompletionRpcStatus({
      code: "28000",
    }),
    401
  );

  assert.equal(
    mapCompletionRpcStatus({
      code: "42501",
    }),
    403
  );

  assert.equal(
    mapCompletionRpcStatus({
      code: "P0002",
    }),
    404
  );

  assert.equal(
    mapCompletionRpcStatus({
      code: "23505",
    }),
    409
  );

  assert.equal(
    mapCompletionRpcStatus({
      code: "55000",
    }),
    409
  );

  assert.equal(
    mapCompletionRpcStatus({
      code: "XX000",
    }),
    500
  );
});

test("bilinmeyen RPC 5xx ayrıntısı istemciye sızdırılmaz", async () => {
  const fetchImpl =
    async (url) => {
      const path =
        new URL(url).pathname;

      if (
        path ===
        "/auth/v1/user"
      ) {
        return new Response(
          JSON.stringify({
            id: USER_ID,
          }),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          code:
            "XX000",
          message:
            "secret database detail",
          details:
            "internal",
        }),
        {
          status: 500,
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );
    };

  const response =
    await handleCompletionRequest(
      {
        request:
          request(
            validBody()
          ),
        env: ENV,
      },
      fetchImpl
    );

  assert.equal(
    response.status,
    500
  );

  const result =
    await response.json();

  assert.equal(
    result.error.message,
    "Cycle Count işlemi tamamlanamadı."
  );

  assert.doesNotMatch(
    JSON.stringify(result),
    /secret database detail|internal/
  );
});

test("OPTIONS Authorization ve Idempotency-Key başlıklarını açar", async () => {
  const response =
    await handleCompletionRequest(
      {
        request:
          request(
            null,
            {
              method:
                "OPTIONS",
            }
          ),
        env: ENV,
      }
    );

  assert.equal(
    response.status,
    204
  );

  assert.match(
    response.headers.get(
      "Access-Control-Allow-Headers"
    ),
    /Authorization/
  );

  assert.match(
    response.headers.get(
      "Access-Control-Allow-Headers"
    ),
    /Idempotency-Key/
  );
});

test("completion API yalnız dar RPC kullanır service role ve doğrudan warehouse mutation açmaz", () => {
  const source =
    fs.readFileSync(
      "functions/api/warehouse/cycle-count-completion.js",
      "utf8"
    );

  assert.match(
    source,
    /warehouse_cycle_count_completion_write/
  );

  assert.match(
    source,
    /SUPABASE_ANON_KEY/
  );

  assert.doesNotMatch(
    source,
    /SERVICE_ROLE|service_role|SUPABASE_SERVICE/i
  );

  assert.doesNotMatch(
    source,
    /\/rest\/v1\/warehouse_cycle_count_(?:adjustments|approvals|reports|items|exceptions)/i
  );

  assert.doesNotMatch(
    source,
    /\/rest\/v1\/warehouse_inventory_(?:balances|movements)/i
  );
});

test("completion API response blind-count miktar alanları üretmez", () => {
  const source =
    fs.readFileSync(
      "functions/api/warehouse/cycle-count-completion.js",
      "utf8"
    );

  for (
    const forbidden of [
      "expectedQuantity",
      "firstCountQuantity",
      "secondCountQuantity",
      "finalCountQuantity",
      "varianceQuantity",
      "varianceValue",
      "unitCost",
    ]
  ) {
    assert.doesNotMatch(
      source,
      new RegExp(
        `['"]${forbidden}['"]`
      )
    );
  }
});
