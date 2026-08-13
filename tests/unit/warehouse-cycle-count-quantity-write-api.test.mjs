import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const API_PATH =
  "functions/api/warehouse/cycle-count-quantity.js";

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

const USER =
  "77777777-7777-4777-8777-777777777777";

const {
  extractBearerToken,
  normalizeUuid,
  normalizeWriteRequest,
  onRequestOptions,
  onRequestPost,
  rpcErrorStatus
} =
  await import(
    "../../functions/api/warehouse/cycle-count-quantity.js"
  );

function validBody(
  overrides = {}
) {
  const {
    payload:
      payloadOverrides = {},

    ...rootOverrides
  } =
    overrides;

  return {
    accountId:
      ACCOUNT,

    warehouseId:
      WAREHOUSE,

    action:
      "record_quantity",

    ...rootOverrides,

    payload: {
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
        "8690000000001",

      notes:
        "İlk fiziksel sayım",

      ...payloadOverrides
    }
  };
}

function buildRequest({
  body =
    validBody(),

  token =
    "kullanici-token",

  requestId =
    REQUEST
} = {}) {
  const headers =
    new Headers({
      "Content-Type":
        "application/json",

      Origin:
        "https://istebul.com"
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
    "https://istebul.com/api/warehouse/cycle-count-quantity",
    {
      method:
        "POST",

      headers,

      body:
        JSON.stringify(
          body
        )
    }
  );
}

test(
  "Cycle Count quantity API Bearer tokenı ayıklar",
  () => {
    assert.equal(
      extractBearerToken(
        buildRequest()
      ),
      "kullanici-token"
    );
  }
);

test(
  "Cycle Count quantity API UUID doğrular",
  () => {
    assert.equal(
      normalizeUuid(
        ACCOUNT
      ),
      ACCOUNT
    );

    assert.equal(
      normalizeUuid(
        "gecersiz"
      ),
      null
    );
  }
);

test(
  "record_quantity account warehouse task item tarama ve sıfır miktarı normalize eder",
  () => {
    const result =
      normalizeWriteRequest(
        validBody(),
        REQUEST
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.data.accountId,
      ACCOUNT
    );

    assert.equal(
      result.data.warehouseId,
      WAREHOUSE
    );

    assert.equal(
      result.data.action,
      "record_quantity"
    );

    assert.equal(
      result.data.payload
        .cycleCountId,
      COUNT
    );

    assert.equal(
      result.data.payload
        .cycleCountItemId,
      ITEM
    );

    assert.equal(
      result.data.payload
        .taskId,
      TASK
    );

    assert.equal(
      result.data.payload
        .countedQuantity,
      0
    );

    assert.equal(
      result.data.payload
        .locationScan,
      "A-01-01"
    );

    assert.equal(
      result.data.payload
        .productScan,
      "8690000000001"
    );
  }
);

test(
  "record_quantity negatif ve geçersiz miktarı reddeder",
  () => {
    for (
      const quantity
      of [
        -1,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        "5"
      ]
    ) {
      const result =
        normalizeWriteRequest(
          validBody({
            payload: {
              countedQuantity:
                quantity
            }
          }),
          REQUEST
        );

      assert.equal(
        result.ok,
        false
      );

      assert.equal(
        result.reason,
        "counted_quantity_invalid"
      );
    }
  }
);

test(
  "record_quantity warehouseId zorunluluğunu API katmanında uygular",
  () => {
    const result =
      normalizeWriteRequest(
        validBody({
          warehouseId:
            "gecersiz"
        }),
        REQUEST
      );

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.reason,
      "warehouse_id_invalid"
    );
  }
);

test(
  "record_quantity desteklenmeyen üst seviye alanı reddeder",
  () => {
    const result =
      normalizeWriteRequest(
        {
          ...validBody(),

          expectedQuantity:
            10
        },
        REQUEST
      );

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.reason,
      "body_fields_invalid"
    );
  }
);

test(
  "record_quantity beklenen stok ve variance gibi ekstra payload alanlarını reddeder",
  () => {
    for (
      const field
      of [
        "expectedQuantity",
        "varianceQuantity",
        "unitCost",
        "finalCountQuantity"
      ]
    ) {
      const result =
        normalizeWriteRequest(
          validBody({
            payload: {
              [field]:
                10
            }
          }),
          REQUEST
        );

      assert.equal(
        result.ok,
        false
      );

      assert.equal(
        result.reason,
        "payload_fields_invalid"
      );
    }
  }
);

test(
  "Idempotency-Key zorunludur",
  () => {
    const result =
      normalizeWriteRequest(
        validBody(),
        null
      );

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.reason,
      "request_id_invalid"
    );
  }
);

test(
  "başarılı POST caller JWT ve anon key ile yalnız quantity RPC çağırır",
  async () => {
    const calls = [];

    const fetchImpl =
      async (
        url,
        options = {}
      ) => {
        const pathname =
          new URL(
            String(url)
          ).pathname;

        calls.push({
          pathname,
          options
        });

        if (
          pathname ===
          "/auth/v1/user"
        ) {
          return new Response(
            JSON.stringify({
              id:
                USER
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

        if (
          pathname ===
          "/rest/v1/rpc/warehouse_cycle_count_record_quantity_write"
        ) {
          return new Response(
            JSON.stringify({
              action:
                "record_quantity",

              requestId:
                REQUEST,

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

              status:
                "recorded",

              countedQuantity:
                0,

              unit:
                "piece",

              itemStatus:
                "in_progress",

              taskStatus:
                "in_progress",

              recordedBy:
                USER
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

        throw new Error(
          `Beklenmeyen fetch: ${url}`
        );
      };

    const response =
      await onRequestPost({
        request:
          buildRequest(),

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",

          fetch:
            fetchImpl
        }
      });

    assert.equal(
      response.status,
      200
    );

    const responseBody =
      await response.json();

    assert.equal(
      responseBody.ok,
      true
    );

    assert.equal(
      responseBody.requestId,
      REQUEST
    );

    assert.equal(
      responseBody.data.status,
      "recorded"
    );

    assert.equal(
      calls.length,
      2
    );

    assert.equal(
      calls[0].pathname,
      "/auth/v1/user"
    );

    assert.equal(
      calls[0]
        .options
        .headers
        .apikey,
      "anon-key"
    );

    assert.equal(
      calls[0]
        .options
        .headers
        .Authorization,
      "Bearer kullanici-token"
    );

    assert.equal(
      calls[1].pathname,
      "/rest/v1/rpc/warehouse_cycle_count_record_quantity_write"
    );

    assert.equal(
      calls[1]
        .options
        .method,
      "POST"
    );

    assert.equal(
      calls[1]
        .options
        .headers
        .apikey,
      "anon-key"
    );

    assert.equal(
      calls[1]
        .options
        .headers
        .Authorization,
      "Bearer kullanici-token"
    );

    const rpcBody =
      JSON.parse(
        calls[1]
          .options
          .body
      );

    assert.deepEqual(
      rpcBody,
      {
        p_request_id:
          REQUEST,

        p_account_id:
          ACCOUNT,

        p_warehouse_id:
          WAREHOUSE,

        p_cycle_count_id:
          COUNT,

        p_cycle_count_item_id:
          ITEM,

        p_task_id:
          TASK,

        p_counted_quantity:
          0,

        p_location_scan:
          "A-01-01",

        p_product_scan:
          "8690000000001",

        p_notes:
          "İlk fiziksel sayım"
      }
    );
  }
);

test(
  "Bearer token olmadan auth veya quantity RPC çağrılmaz",
  async () => {
    let called =
      false;

    const response =
      await onRequestPost({
        request:
          buildRequest({
            token:
              null
          }),

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",

          fetch:
            async () => {
              called =
                true;

              throw new Error(
                "çağrılmamalı"
              );
            }
        }
      });

    assert.equal(
      response.status,
      401
    );

    assert.equal(
      called,
      false
    );
  }
);

test(
  "Idempotency-Key olmadan auth veya quantity RPC çağrılmaz",
  async () => {
    let called =
      false;

    const response =
      await onRequestPost({
        request:
          buildRequest({
            requestId:
              null
          }),

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",

          fetch:
            async () => {
              called =
                true;

              throw new Error(
                "çağrılmamalı"
              );
            }
        }
      });

    assert.equal(
      response.status,
      400
    );

    assert.equal(
      called,
      false
    );
  }
);

test(
  "geçersiz warehouseId upstream çağrıyı engeller",
  async () => {
    let called =
      false;

    const response =
      await onRequestPost({
        request:
          buildRequest({
            body:
              validBody({
                warehouseId:
                  "yanlis"
              })
          }),

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",

          fetch:
            async () => {
              called =
                true;

              throw new Error(
                "çağrılmamalı"
              );
            }
        }
      });

    assert.equal(
      response.status,
      400
    );

    assert.equal(
      called,
      false
    );
  }
);

test(
  "RPC hata kodları güvenli HTTP durumlarına map edilir",
  () => {
    assert.equal(
      rpcErrorStatus(
        "28000"
      ),
      401
    );

    assert.equal(
      rpcErrorStatus(
        "42501"
      ),
      403
    );

    assert.equal(
      rpcErrorStatus(
        "P0002"
      ),
      404
    );

    assert.equal(
      rpcErrorStatus(
        "23505"
      ),
      409
    );

    assert.equal(
      rpcErrorStatus(
        "40001"
      ),
      409
    );

    assert.equal(
      rpcErrorStatus(
        "22023"
      ),
      422
    );

    assert.equal(
      rpcErrorStatus(
        "XX999"
      ),
      500
    );
  }
);

test(
  "bilinen RPC validation mesajı güvenli biçimde kullanıcıya taşınır",
  async () => {
    const fetchImpl =
      async (
        url
      ) => {
        const pathname =
          new URL(
            String(url)
          ).pathname;

        if (
          pathname ===
          "/auth/v1/user"
        ) {
          return new Response(
            JSON.stringify({
              id:
                USER
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

        return new Response(
          JSON.stringify({
            code:
              "22023",

            message:
              "Okutulan lokasyon seçili sayım göreviyle uyuşmuyor."
          }),
          {
            status: 400,

            headers: {
              "Content-Type":
                "application/json"
            }
          }
        );
      };

    const response =
      await onRequestPost({
        request:
          buildRequest(),

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",

          fetch:
            fetchImpl
        }
      });

    assert.equal(
      response.status,
      422
    );

    const body =
      await response.json();

    assert.equal(
      body.error.code,
      "VALIDATION_ERROR"
    );

    assert.equal(
      body.error.message,
      "Okutulan lokasyon seçili sayım göreviyle uyuşmuyor."
    );
  }
);

test(
  "bilinmeyen RPC 5xx ayrıntıları istemciye sızdırılmaz",
  async () => {
    const fetchImpl =
      async (
        url
      ) => {
        const pathname =
          new URL(
            String(url)
          ).pathname;

        if (
          pathname ===
          "/auth/v1/user"
        ) {
          return new Response(
            JSON.stringify({
              id:
                USER
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

        return new Response(
          JSON.stringify({
            code:
              "XX999",

            message:
              "relation warehouse_secret_internal does not exist"
          }),
          {
            status: 500,

            headers: {
              "Content-Type":
                "application/json"
            }
          }
        );
      };

    const response =
      await onRequestPost({
        request:
          buildRequest(),

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",

          fetch:
            fetchImpl
        }
      });

    assert.equal(
      response.status,
      500
    );

    const body =
      await response.json();

    assert.equal(
      body.error.message,
      "Sayım miktarı şu anda kaydedilemedi."
    );

    assert.doesNotMatch(
      JSON.stringify(
        body
      ),
      /warehouse_secret_internal/i
    );
  }
);

test(
  "OPTIONS Authorization ve Idempotency-Key başlıklarını açar",
  () => {
    const response =
      onRequestOptions({
        request:
          new Request(
            "https://istebul.com/api/warehouse/cycle-count-quantity",
            {
              method:
                "OPTIONS",

              headers: {
                Origin:
                  "https://istebul.com"
              }
            }
          )
      });

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

    assert.match(
      response.headers.get(
        "Access-Control-Allow-Methods"
      ),
      /POST/
    );
  }
);

test(
  "A7.2.1 yalnız quantity RPC kullanır; service role direct tablo veya stok mutation açmaz",
  async () => {
    const source =
      await readFile(
        API_PATH,
        "utf8"
      );

    assert.match(
      source,
      /warehouse_cycle_count_record_quantity_write/
    );

    assert.match(
      source,
      /p_warehouse_id/
    );

    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY|service_role|serviceRole/i
    );

    assert.doesNotMatch(
      source,
      /\/rest\/v1\/warehouse_cycle_count_/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_(results|exceptions|adjustments|approvals)/i
    );

    assert.doesNotMatch(
      source,
      /expected_quantity|expectedQuantity|variance_quantity|varianceQuantity|unit_cost|unitCost/i
    );
  }
);
