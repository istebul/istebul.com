const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTIONS =
  new Set([
    "approve_count",
    "prepare_adjustments",
    "approve_adjustments",
    "reject_adjustments",
    "process_adjustments",
    "complete_count"
  ]);

const RPC_PATH =
  "/rest/v1/rpc/warehouse_cycle_count_completion_write";

function normalizeText(value) {
  return String(
    value ?? ""
  ).trim();
}

export function normalizeUuid(value) {
  const normalized =
    normalizeText(value);

  return UUID.test(normalized)
    ? normalized
    : null;
}

export function extractBearerToken(request) {
  const value =
    request.headers.get(
      "Authorization"
    ) || "";

  if (
    !value.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  return (
    value
      .slice(7)
      .trim() ||
    null
  );
}

function isPlainObject(value) {
  return Boolean(
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  );
}

function hasOnlyKeys(
  value,
  allowed
) {
  return Object.keys(
    value
  ).every(
    (key) =>
      allowed.has(key)
  );
}

export function normalizeCompletionRequest(
  body,
  requestId
) {
  const normalizedRequestId =
    normalizeUuid(
      requestId
    );

  if (!normalizedRequestId) {
    return {
      ok: false,
      reason:
        "request_id_invalid"
    };
  }

  if (
    !isPlainObject(body)
  ) {
    return {
      ok: false,
      reason:
        "body_invalid"
    };
  }

  if (
    !hasOnlyKeys(
      body,
      new Set([
        "accountId",
        "warehouseId",
        "action",
        "payload"
      ])
    )
  ) {
    return {
      ok: false,
      reason:
        "body_fields_invalid"
    };
  }

  const accountId =
    normalizeUuid(
      body.accountId
    );

  const warehouseId =
    normalizeUuid(
      body.warehouseId
    );

  if (!accountId) {
    return {
      ok: false,
      reason:
        "account_id_invalid"
    };
  }

  if (!warehouseId) {
    return {
      ok: false,
      reason:
        "warehouse_id_invalid"
    };
  }

  if (
    typeof body.action !==
      "string" ||
    !ACTIONS.has(
      body.action
    )
  ) {
    return {
      ok: false,
      reason:
        "action_invalid"
    };
  }

  if (
    !isPlainObject(
      body.payload
    )
  ) {
    return {
      ok: false,
      reason:
        "payload_invalid"
    };
  }

  if (
    !hasOnlyKeys(
      body.payload,
      new Set([
        "cycleCountId",
        "notes"
      ])
    )
  ) {
    return {
      ok: false,
      reason:
        "payload_fields_invalid"
    };
  }

  const cycleCountId =
    normalizeUuid(
      body.payload
        .cycleCountId
    );

  if (!cycleCountId) {
    return {
      ok: false,
      reason:
        "cycle_count_id_invalid"
    };
  }

  let notes =
    null;

  if (
    body.payload.notes !==
      undefined &&
    body.payload.notes !==
      null
  ) {
    if (
      typeof body.payload
        .notes !==
      "string"
    ) {
      return {
        ok: false,
        reason:
          "notes_invalid"
      };
    }

    notes =
      body.payload.notes
        .trim() ||
      null;

    if (
      notes &&
      notes.length > 1000
    ) {
      return {
        ok: false,
        reason:
          "notes_too_long"
      };
    }
  }

  return {
    ok: true,

    data: {
      requestId:
        normalizedRequestId,

      accountId,
      warehouseId,

      action:
        body.action,

      payload: {
        cycleCountId,
        notes
      }
    }
  };
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin":
      origin || "*",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Idempotency-Key",

    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    "Access-Control-Max-Age":
      "86400",

    "Cache-Control":
      "private, no-store",

    Vary:
      "Authorization, Origin"
  };
}

function jsonResponse(
  body,
  status,
  origin
) {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        ...corsHeaders(
          origin
        )
      }
    }
  );
}

async function readJsonSafe(
  response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function requestErrorMessage(
  reason
) {
  const messages = {
    request_id_invalid:
      "Geçerli bir Idempotency-Key zorunludur.",

    body_invalid:
      "İstek gövdesi geçerli bir JSON nesnesi olmalıdır.",

    body_fields_invalid:
      "İstek desteklenmeyen alanlar içeriyor.",

    account_id_invalid:
      "Firma kimliği geçersiz.",

    warehouse_id_invalid:
      "Depo kimliği geçersiz.",

    action_invalid:
      "Cycle Count tamamlama işlemi geçersiz.",

    payload_invalid:
      "Cycle Count işlem verisi geçersiz.",

    payload_fields_invalid:
      "Cycle Count işlem verisi desteklenmeyen alanlar içeriyor.",

    cycle_count_id_invalid:
      "Cycle Count kimliği geçersiz.",

    notes_invalid:
      "İşlem notu metin olmalıdır.",

    notes_too_long:
      "İşlem notu en fazla 1000 karakter olabilir."
  };

  return (
    messages[reason] ||
    "Cycle Count tamamlama isteği geçersiz."
  );
}

export function mapCompletionRpcStatus(
  error
) {
  switch (
    String(
      error?.code || ""
    )
  ) {
    case "22023":
      return 400;

    case "28000":
      return 401;

    case "42501":
      return 403;

    case "P0002":
      return 404;

    case "23505":
    case "55000":
      return 409;

    default:
      return 500;
  }
}

function safeRpcErrorMessage(
  error,
  status
) {
  if (
    status >= 400 &&
    status < 500 &&
    typeof error?.message ===
      "string" &&
    error.message.trim()
  ) {
    return error.message.trim();
  }

  return "Cycle Count işlemi tamamlanamadı.";
}

async function verifyCaller(
  env,
  token,
  fetchImpl
) {
  const response =
    await fetchImpl(
      new URL(
        "/auth/v1/user",
        env.SUPABASE_URL
      ),
      {
        method:
          "GET",

        headers: {
          apikey:
            env.SUPABASE_ANON_KEY,

          Authorization:
            `Bearer ${token}`
        }
      }
    );

  if (!response.ok) {
    return false;
  }

  const user =
    await readJsonSafe(
      response
    );

  return Boolean(
    user &&
    normalizeUuid(
      user.id
    )
  );
}

async function callCompletionRpc(
  env,
  token,
  input,
  fetchImpl
) {
  return fetchImpl(
    new URL(
      RPC_PATH,
      env.SUPABASE_URL
    ),
    {
      method:
        "POST",

      headers: {
        apikey:
          env.SUPABASE_ANON_KEY,

        Authorization:
          `Bearer ${token}`,

        "Content-Type":
          "application/json"
      },

      body:
        JSON.stringify({
          p_request_id:
            input.requestId,

          p_account_id:
            input.accountId,

          p_warehouse_id:
            input.warehouseId,

          p_cycle_count_id:
            input.payload
              .cycleCountId,

          p_action:
            input.action,

          p_notes:
            input.payload
              .notes
        })
    }
  );
}

export async function handleCompletionRequest(
  context,
  fetchImpl = fetch
) {
  const request =
    context?.request;

  const env =
    context?.env || {};

  const origin =
    request?.headers
      ?.get("Origin") ||
    "";

  if (!request) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            "request_missing",
          message:
            "HTTP isteği bulunamadı."
        }
      },
      500,
      origin
    );
  }

  if (
    request.method ===
    "OPTIONS"
  ) {
    return new Response(
      null,
      {
        status: 204,
        headers:
          corsHeaders(origin)
      }
    );
  }

  if (
    request.method !==
    "POST"
  ) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            "method_not_allowed",
          message:
            "Yalnız POST isteği desteklenir."
        }
      },
      405,
      origin
    );
  }

  const token =
    extractBearerToken(
      request
    );

  if (!token) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            "unauthorized",
          message:
            "WarehouseIQ oturumu doğrulanamadı."
        }
      },
      401,
      origin
    );
  }

  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_ANON_KEY
  ) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            "warehouse_configuration_missing",
          message:
            "WarehouseIQ servis yapılandırması eksik."
        }
      },
      500,
      origin
    );
  }

  const requestId =
    request.headers.get(
      "Idempotency-Key"
    );

  let body;

  try {
    body =
      await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            "invalid_json",
          message:
            "İstek gövdesi geçerli JSON olmalıdır."
        }
      },
      400,
      origin
    );
  }

  const normalized =
    normalizeCompletionRequest(
      body,
      requestId
    );

  if (!normalized.ok) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            normalized.reason,
          message:
            requestErrorMessage(
              normalized.reason
            )
        }
      },
      400,
      origin
    );
  }

  let callerValid =
    false;

  try {
    callerValid =
      await verifyCaller(
        env,
        token,
        fetchImpl
      );
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            "warehouse_auth_unavailable",
          message:
            "WarehouseIQ oturum servisine ulaşılamadı."
        }
      },
      503,
      origin
    );
  }

  if (!callerValid) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            "unauthorized",
          message:
            "WarehouseIQ oturumu geçersiz veya süresi dolmuş."
        }
      },
      401,
      origin
    );
  }

  let rpcResponse;

  try {
    rpcResponse =
      await callCompletionRpc(
        env,
        token,
        normalized.data,
        fetchImpl
      );
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            "warehouse_rpc_unavailable",
          message:
            "Cycle Count işlem servisine ulaşılamadı."
        }
      },
      503,
      origin
    );
  }

  const rpcBody =
    await readJsonSafe(
      rpcResponse
    );

  if (!rpcResponse.ok) {
    const status =
      mapCompletionRpcStatus(
        rpcBody
      );

    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            status === 500
              ? "cycle_count_completion_failed"
              : String(
                  rpcBody?.code ||
                  "cycle_count_completion_rejected"
                ),

          message:
            safeRpcErrorMessage(
              rpcBody,
              status
            )
        }
      },
      status,
      origin
    );
  }

  if (
    !isPlainObject(
      rpcBody
    )
  ) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            "cycle_count_completion_response_invalid",
          message:
            "Cycle Count işlem cevabı doğrulanamadı."
        }
      },
      502,
      origin
    );
  }

  return jsonResponse(
    {
      ok: true,
      data:
        rpcBody
    },
    200,
    origin
  );
}

export async function onRequest(
  context
) {
  return handleCompletionRequest(
    context
  );
}
