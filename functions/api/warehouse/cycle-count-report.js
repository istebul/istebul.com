const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RPC_PATH =
  "/rest/v1/rpc/warehouse_cycle_count_management_read";

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

export function normalizeReportRequest(
  url
) {
  const accountId =
    normalizeUuid(
      url.searchParams.get(
        "accountId"
      )
    );

  const warehouseId =
    normalizeUuid(
      url.searchParams.get(
        "warehouseId"
      )
    );

  const rawCycleCountId =
    normalizeText(
      url.searchParams.get(
        "cycleCountId"
      )
    );

  const cycleCountId =
    rawCycleCountId
      ? normalizeUuid(
          rawCycleCountId
        )
      : null;

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
    rawCycleCountId &&
    !cycleCountId
  ) {
    return {
      ok: false,
      reason:
        "cycle_count_id_invalid"
    };
  }

  return {
    ok: true,

    data: {
      accountId,
      warehouseId,
      cycleCountId
    }
  };
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin":
      origin || "*",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",

    "Access-Control-Allow-Methods":
      "GET, OPTIONS",

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

        ...corsHeaders(origin)
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
    account_id_invalid:
      "Firma kimliği geçersiz.",

    warehouse_id_invalid:
      "Depo kimliği geçersiz.",

    cycle_count_id_invalid:
      "Cycle Count kimliği geçersiz."
  };

  return (
    messages[reason] ||
    "Cycle Count rapor isteği geçersiz."
  );
}

export function mapManagementRpcStatus(
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

  return "Cycle Count yönetim raporu alınamadı.";
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

async function callManagementRpc(
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
          p_account_id:
            input.accountId,

          p_warehouse_id:
            input.warehouseId,

          p_cycle_count_id:
            input.cycleCountId
        })
    }
  );
}

export async function handleReportRequest(
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
    "GET"
  ) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            "method_not_allowed",
          message:
            "Yalnız GET isteği desteklenir."
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

  const normalized =
    normalizeReportRequest(
      new URL(
        request.url
      )
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
      await callManagementRpc(
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
            "Cycle Count yönetim servisine ulaşılamadı."
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
      mapManagementRpcStatus(
        rpcBody
      );

    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            status === 500
              ? "cycle_count_report_failed"
              : String(
                  rpcBody?.code ||
                  "cycle_count_report_rejected"
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
    !rpcBody ||
    typeof rpcBody !==
      "object" ||
    Array.isArray(rpcBody)
  ) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code:
            "cycle_count_report_response_invalid",
          message:
            "Cycle Count yönetim cevabı doğrulanamadı."
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
  return handleReportRequest(
    context
  );
}
