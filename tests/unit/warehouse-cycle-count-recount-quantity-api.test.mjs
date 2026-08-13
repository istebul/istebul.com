import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const API_PATH =
  "functions/api/warehouse/cycle-count-recount-quantity.js";

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

const REQUEST_ID =
  "66666666-6666-4666-8666-666666666666";

const USER =
  "77777777-7777-4777-8777-777777777777";

const {
  extractBearerToken,
  normalizeRecountQuantityRequest,
  normalizeUuid,
  onRequestOptions,
  onRequestPost,
  rpcErrorStatus,
  sanitizeRecountQuantityResult
} =
  await import(
    "../../functions/api/warehouse/cycle-count-recount-quantity.js"
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
      "record_recount_quantity",

    ...rootOverrides,

    payload: {
      cycleCountId:
        COUNT,

      cycleCountItemId:
        ITEM,

      taskId:
        TASK,

      countedQuantity:
        7.25,

      locationScan:
        "A-01-01",

      productScan:
        "SKU-001",

      notes:
        "Kontrollü yeniden sayım",

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
    REQUEST_ID
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
    "https://istebul.com/api/warehouse/cycle-count-recount-quantity",
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

function jsonResponse(
  body,
  status = 200
) {
  return new Response(
    JSON.stringify(
      body
    ),
    {
      status,

      headers: {
        "Content-Type":
          "application/json"
      }
    }
  );
}

function successRpcBody(
  overrides = {}
) {
  return {
    action:
      "record_recount_quantity",

    requestId:
      REQUEST_ID,

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
      7.25,

    unit:
      "ADET",

    itemStatus:
      "recount_required",

    countStatus:
      "recount_required",

    taskStatus:
      "in_progress",

    recordedBy:
      USER,

    recordedAt:
      "2026-08-13T20:00:00.000Z",

    ...overrides
  };
}

test(
  "recount quantity API Bearer token ve UUID doğrular",
  () => {
    assert.equal(
      extractBearerToken(
        buildRequest()
      ),
      "kullanici-token"
    );

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
  "record_recount_quantity dar payloadı normalize eder ve sıfır miktarı kabul eder",
  () => {
    const result =
      normalizeRecountQuantityRequest(
        validBody({
          payload: {
            countedQuantity:
              0,

            locationScan:
              "  A-01-01  ",

            productScan:
              "  SKU-001  ",

            notes:
              "  tekrar kontrol  "
          }
        }),
        REQUEST_ID
      );

    assert.equal(
      result.ok,
      true
    );

    assert.deepEqual(
      result.data.payload,
      {
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
          "tekrar kontrol"
      }
    );
  }
);

test(
  "recount quantity negatif boş null boolean ve geçersiz miktarı reddeder",
  () => {
    for (
      const quantity
      of [
        -1,
        "",
        "   ",
        null,
        true,
        false,
        "abc",
        Number.NaN,
        Number.POSITIVE_INFINITY
      ]
    ) {
      const result =
        normalizeRecountQuantityRequest(
          validBody({
            payload: {
              countedQuantity:
                quantity
            }
          }),
          REQUEST_ID
        );

      assert.equal(
        result.ok,
        false
      );

      assert.equal(
        result.reason,
        "quantity_invalid"
      );
    }
  }
);

test(
  "recount HTTP payload hassas veya desteklenmeyen alanları kabul etmez",
  () => {
    for (
      const field
      of [
        "expectedQuantity",
        "firstCountQuantity",
        "secondCountQuantity",
        "finalCountQuantity",
        "varianceQuantity",
        "variancePercentage",
        "unitCost",
        "resultType"
      ]
    ) {
      const result =
        normalizeRecountQuantityRequest(
          validBody({
            payload: {
              [field]:
                10
            }
          }),
          REQUEST_ID
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
  "recount Idempotency-Key zorunludur",
  () => {
    const result =
      normalizeRecountQuantityRequest(
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
  "başarılı POST caller JWT ve anon key ile yalnız recount quantity RPC çağırır",
  async () => {
    const calls = [];

    const env = {
      SUPABASE_URL:
        "https://example.supabase.co",

      SUPABASE_ANON_KEY:
        "anon-key",

      fetch:
        async (
          input,
          init = {}
        ) => {
          const url =
            new URL(
              input.toString()
            );

          calls.push({
            url,
            init
          });

          if (
            url.pathname ===
            "/auth/v1/user"
          ) {
            return jsonResponse({
              id:
                USER
            });
          }

          if (
            url.pathname ===
            "/rest/v1/rpc/warehouse_cycle_count_record_recount_quantity_write"
          ) {
            return jsonResponse(
              successRpcBody()
            );
          }

          return jsonResponse(
            {
              message:
                "beklenmeyen"
            },
            500
          );
        }
    };

    const response =
      await onRequestPost({
        request:
          buildRequest(),
        env
      });

    assert.equal(
      response.status,
      200
    );

    const rpcCall =
      calls.find(
        ({ url }) =>
          url.pathname ===
          "/rest/v1/rpc/warehouse_cycle_count_record_recount_quantity_write"
      );

    assert.ok(
      rpcCall
    );

    assert.equal(
      rpcCall.init.headers
        .apikey,
      "anon-key"
    );

    assert.equal(
      rpcCall.init.headers
        .Authorization,
      "Bearer kullanici-token"
    );

    assert.deepEqual(
      JSON.parse(
        rpcCall.init.body
      ),
      {
        p_request_id:
          REQUEST_ID,

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
          7.25,

        p_location_scan:
          "A-01-01",

        p_product_scan:
          "SKU-001",

        p_notes:
          "Kontrollü yeniden sayım"
      }
    );
  }
);

test(
  "HTTP response RPC hassas alanlar gönderse bile yalnız güvenli allowlist döndürür",
  () => {
    const normalized =
      normalizeRecountQuantityRequest(
        validBody(),
        REQUEST_ID
      );

    assert.equal(
      normalized.ok,
      true
    );

    const safe =
      sanitizeRecountQuantityResult(
        {
          ...successRpcBody(),

          expectedQuantity:
            100,

          firstCountQuantity:
            90,

          secondCountQuantity:
            7.25,

          finalCountQuantity:
            7.25,

          varianceQuantity:
            -92.75,

          variancePercentage:
            -92.75,

          resultType:
            "shortage",

          unitCost:
            50
        },
        normalized.data
      );

    assert.ok(
      safe
    );

    assert.deepEqual(
      Object.keys(
        safe
      ).sort(),
      [
        "countStatus",
        "countedQuantity",
        "cycleCountId",
        "cycleCountItemId",
        "itemStatus",
        "recordedAt",
        "status",
        "taskId",
        "taskStatus",
        "unit"
      ].sort()
    );

    assert.equal(
      "recordedBy" in safe,
      false
    );

    assert.equal(
      "varianceQuantity" in safe,
      false
    );

    assert.equal(
      "firstCountQuantity" in safe,
      false
    );

    assert.equal(
      "secondCountQuantity" in safe,
      false
    );
  }
);

test(
  "upstream request account warehouse task veya quantity karışmasını reddeder",
  () => {
    const normalized =
      normalizeRecountQuantityRequest(
        validBody(),
        REQUEST_ID
      );

    assert.equal(
      normalized.ok,
      true
    );

    for (
      const override
      of [
        {
          requestId:
            "88888888-8888-4888-8888-888888888888"
        },
        {
          accountId:
            "99999999-9999-4999-8999-999999999999"
        },
        {
          warehouseId:
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        },
        {
          cycleCountId:
            "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
        },
        {
          cycleCountItemId:
            "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
        },
        {
          taskId:
            "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
        },
        {
          countedQuantity:
            99
        }
      ]
    ) {
      assert.equal(
        sanitizeRecountQuantityResult(
          successRpcBody(
            override
          ),
          normalized.data
        ),
        null
      );
    }
  }
);

test(
  "Bearer token olmadan auth veya recount RPC çağrılmaz",
  async () => {
    let called =
      false;

    const response =
      await onRequestPost({
        request:
          buildRequest({
            token: null
          }),

        env: {
          SUPABASE_URL:
            "https://example.supabase.co",

          SUPABASE_ANON_KEY:
            "anon-key",

          fetch:
            async () => {
              called = true;

              return jsonResponse(
                {}
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
  "Idempotency-Key olmadan auth veya recount RPC çağrılmaz",
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
              called = true;

              return jsonResponse(
                {}
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
  "geçersiz warehouseId upstream çağrısını engeller",
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
              called = true;

              return jsonResponse(
                {}
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
  }
);

test(
  "bilinen recount validation mesajı güvenli biçimde kullanıcıya taşınır",
  async () => {
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
            async (
              input
            ) => {
              const url =
                new URL(
                  input.toString()
                );

              if (
                url.pathname ===
                "/auth/v1/user"
              ) {
                return jsonResponse({
                  id:
                    USER
                });
              }

              return jsonResponse(
                {
                  code:
                    "22023",

                  message:
                    "Bu sayım satırı kontrollü yeniden sayım için uygun durumda değildir."
                },
                400
              );
            }
        }
      });

    assert.equal(
      response.status,
      422
    );

    const body =
      await response.json();

    assert.match(
      body.error.message,
      /kontrollü yeniden sayım/
    );
  }
);

test(
  "bilinmeyen RPC 5xx ayrıntısı istemciye sızdırılmaz",
  async () => {
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
            async (
              input
            ) => {
              const url =
                new URL(
                  input.toString()
                );

              if (
                url.pathname ===
                "/auth/v1/user"
              ) {
                return jsonResponse({
                  id:
                    USER
                });
              }

              return jsonResponse(
                {
                  code:
                    "XX999",

                  message:
                    "gizli SQL ayrıntısı"
                },
                400
              );
            }
        }
      });

    assert.equal(
      response.status,
      500
    );

    const body =
      await response.json();

    assert.doesNotMatch(
      body.error.message,
      /gizli SQL ayrıntısı/
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
            "https://istebul.com/api/warehouse/cycle-count-recount-quantity",
            {
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
  }
);

test(
  "A7.3.2.1 yalnız dar recount RPC kullanır service role direct tablo veya inventory mutation açmaz",
  async () => {
    const source =
      await readFile(
        API_PATH,
        "utf8"
      );

    assert.match(
      source,
      /\/rest\/v1\/rpc\/warehouse_cycle_count_record_recount_quantity_write/
    );

    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY|service_role|serviceRole/i
    );

    assert.doesNotMatch(
      source,
      /\/rest\/v1\/warehouse_cycle_count_(items|tasks|results|exceptions)/
    );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_(balances|movements)/
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_(adjustments|approvals)/
    );
  }
);
