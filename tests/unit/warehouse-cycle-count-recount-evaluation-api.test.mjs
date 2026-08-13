import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import test from "node:test";

const API_PATH =
  "functions/api/warehouse/cycle-count-recount-evaluation.js";

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

const RECOUNT_TASK =
  "77777777-7777-4777-8777-777777777777";

const USER =
  "88888888-8888-4888-8888-888888888888";

const {
  extractBearerToken,
  normalizeEvaluationRequest,
  normalizeUuid,
  onRequestOptions,
  onRequestPost,
  rpcErrorStatus,
  sanitizeEvaluationResult
} =
  await import(
    "../../functions/api/warehouse/cycle-count-recount-evaluation.js"
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
      "evaluate_recount",

    ...rootOverrides,

    payload: {
      cycleCountId:
        COUNT,

      cycleCountItemId:
        ITEM,

      taskId:
        TASK,

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
    "https://istebul.com/api/warehouse/cycle-count-evaluation",
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
      "evaluate_recount",

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
      "evaluated",

    itemStatus:
      "recount_required",

    countStatus:
      "recount_required",

    recountRequired:
      true,

    reviewRequired:
      false,

    taskStatus:
      "completed",

    recountTaskId:
      RECOUNT_TASK,

    evaluatedBy:
      USER,

    evaluatedAt:
      "2026-08-13T19:00:00.000Z",

    ...overrides
  };
}

test(
  "evaluation API Bearer token ve UUID doğrular",
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
  "evaluate_recount dar account warehouse ve task payloadını normalize eder",
  () => {
    const result =
      normalizeEvaluationRequest(
        validBody(),
        REQUEST
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
          TASK
      }
    );
  }
);

test(
  "evaluation payload ekstra veya hassas alan kabul etmez",
  () => {
    for (
      const field
      of [
        "expectedQuantity",
        "countedQuantity",
        "varianceQuantity",
        "unitCost"
      ]
    ) {
      const result =
        normalizeEvaluationRequest(
          validBody({
            payload: {
              [field]: 10
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
  "evaluation Idempotency-Key zorunludur",
  () => {
    const result =
      normalizeEvaluationRequest(
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
  "başarılı POST caller JWT ve anon key ile yalnız first evaluation RPC çağırır",
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
            "/rest/v1/rpc/warehouse_cycle_count_evaluate_recount"
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
          "/rest/v1/rpc/warehouse_cycle_count_evaluate_recount"
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
          TASK
      }
    );
  }
);

test(
  "HTTP boundary RPC'den gelse bile expected variance result yönü ve kullanıcı kimliğini response'a sızdırmaz",
  () => {
    const safe =
      sanitizeEvaluationResult(
        {
          ...successRpcBody(),

          expectedQuantity:
            100,

          expected_quantity:
            100,

          varianceQuantity:
            -12,

          variance_percentage:
            -12,

          resultType:
            "shortage",

          unitCost:
            99
        },
        {
          payload: {
            cycleCountId:
              COUNT,
            cycleCountItemId:
              ITEM,
            taskId:
              TASK
          }
        }
      );

    assert.deepEqual(
      Object.keys(
        safe
      ),
      [
        "status",
        "cycleCountId",
        "cycleCountItemId",
        "taskId",
        "itemStatus",
        "countStatus",
        "recountRequired",
        "reviewRequired",
        "taskStatus",
        "recountTaskId",
        "evaluatedAt"
      ]
    );

    assert.equal(
      "evaluatedBy" in safe,
      false
    );
  }
);

test(
  "Bearer token olmadan upstream çağrısı yapılmaz",
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
  "RPC güvenlik hata kodları HTTP durumlarına map edilir",
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
            "https://istebul.com/api/warehouse/cycle-count-evaluation",
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
  "evaluation API yalnız dar RPC kullanır service role ve doğrudan Cycle Count tablo mutationı açmaz",
  async () => {
    const source =
      await readFile(
        API_PATH,
        "utf8"
      );

    assert.match(
      source,
      /\/rest\/v1\/rpc\/warehouse_cycle_count_evaluate_recount/
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
      /expected_quantity|variance_quantity|variance_percentage|variance_value|unit_cost/
    );
  }
);


test(
  "Recount evaluation HTTP boundary yalnız evaluate_recount RPC sözleşmesini taşır",
  async () => {
    const {
      readFile: readRecountApiSource
    } =
      await import(
        "node:fs/promises"
      );

    const source =
      await readRecountApiSource(
        "functions/api/warehouse/cycle-count-recount-evaluation.js",
        "utf8"
      );

    assert.match(
      source,
      /const ACTION\s*=\s*[\s\S]*"evaluate_recount"/
    );

    assert.match(
      source,
      /\/rest\/v1\/rpc\/warehouse_cycle_count_evaluate_recount/
    );

    assert.doesNotMatch(
      source,
      /evaluate_first_count/
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_evaluate_first_count/
    );
  }
);

test(
  "Recount evaluation HTTP boundary inventory veya direct tablo mutation açmaz",
  async () => {
    const {
      readFile: readRecountApiSource
    } =
      await import(
        "node:fs/promises"
      );

    const source =
      await readRecountApiSource(
        "functions/api/warehouse/cycle-count-recount-evaluation.js",
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /service_role|service-role|SUPABASE_SERVICE/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_inventory_(balances|movements)/i
    );

    assert.doesNotMatch(
      source,
      /warehouse_cycle_count_(adjustments|approvals)/i
    );

    assert.doesNotMatch(
      source,
      /\/rest\/v1\/warehouse_cycle_count_/i
    );
  }
);
