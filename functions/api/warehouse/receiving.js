import {
  API_ERROR_CODES,
  apiSuccessBody,
  logApiEvent,
} from "../../_shared/api-response.js";
import {
  buildCorsJsonHeaders,
  corsJson,
  corsJsonError,
} from "../../_shared/cors-json.js";

const WRITE_ACTIONS = Object.freeze([
  "create",
  "add_item",
  "start",
  "receive_quantity",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BODY_BYTES = 32 * 1024;

export function extractBearerToken(request) {
  const value = request.headers.get("Authorization") || "";
  if (!value.startsWith("Bearer ")) return null;

  const token = value.slice(7).trim();
  return token || null;
}

export function normalizeUuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeWriteAction(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return WRITE_ACTIONS.includes(normalized) ? normalized : null;
}

export function normalizeWriteRequest(body, requestId) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, reason: "body_invalid" };
  }

  const accountId = normalizeUuid(body.accountId);
  if (!accountId) {
    return { ok: false, reason: "account_invalid" };
  }

  const action = normalizeWriteAction(body.action);
  if (!action) {
    return { ok: false, reason: "action_invalid" };
  }

  const normalizedRequestId = normalizeUuid(requestId);
  if (!normalizedRequestId) {
    return { ok: false, reason: "request_id_invalid" };
  }

  const payload =
    body.payload &&
    typeof body.payload === "object" &&
    !Array.isArray(body.payload)
      ? body.payload
      : {};

  return {
    ok: true,
    value: {
      accountId,
      action,
      requestId: normalizedRequestId,
      payload,
    },
  };
}

function responseHeaders() {
  return {
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Idempotency-Key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "private, no-store",
    Vary: "Authorization, Origin",
  };
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function getAuthenticatedUser(
  env,
  token,
  fetchImpl,
) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return {
      ok: false,
      reason: "server_misconfigured",
    };
  }

  const response = await fetchImpl(
    new URL("/auth/v1/user", env.SUPABASE_URL),
    {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      reason: "unauthorized",
    };
  }

  const user = await readJsonSafely(response);

  if (!user?.id) {
    return {
      ok: false,
      reason: "unauthorized",
    };
  }

  return {
    ok: true,
    user,
  };
}

async function invokeReceivingWrite(
  env,
  token,
  input,
  fetchImpl,
) {
  const response = await fetchImpl(
    new URL(
      "/rest/v1/rpc/warehouse_receiving_write",
      env.SUPABASE_URL,
    ),
    {
      method: "POST",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        p_action: input.action,
        p_request_id: input.requestId,
        p_account_id: input.accountId,
        p_payload: input.payload,
      }),
    },
  );

  const data = await readJsonSafely(response);

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export function mapRpcError(result) {
  const code = String(result?.data?.code || "");
  const message = String(
    result?.data?.message ||
      "Mal kabul işlemi tamamlanamadı.",
  );

  if (code === "42501") {
    return {
      status: 403,
      code: API_ERROR_CODES.FORBIDDEN,
      message,
    };
  }

  if (code === "23505") {
    return {
      status: 409,
      code: API_ERROR_CODES.CONFLICT,
      message,
    };
  }

  if (code === "P0002") {
    return {
      status: 404,
      code: API_ERROR_CODES.NOT_FOUND,
      message,
    };
  }

  if (
    code === "22023" ||
    code === "22P02" ||
    code === "22007"
  ) {
    return {
      status: 400,
      code: API_ERROR_CODES.BAD_REQUEST,
      message,
    };
  }

  if (code === "40001") {
    return {
      status: 409,
      code: API_ERROR_CODES.CONFLICT,
      message,
    };
  }

  return {
    status: result?.status >= 500 ? 502 : 400,
    code:
      result?.status >= 500
        ? API_ERROR_CODES.UPSTREAM_ERROR
        : API_ERROR_CODES.BAD_REQUEST,
    message,
  };
}

export async function onRequestPost(context) {
  const origin = context.request.headers.get("Origin");
  const fetchImpl = context.fetch ?? fetch;

  try {
    const contentLength = Number(
      context.request.headers.get("Content-Length") || "0",
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_BODY_BYTES
    ) {
      return corsJsonError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        "İstek gövdesi izin verilen boyutu aşıyor.",
        origin,
        undefined,
        responseHeaders(),
      );
    }

    const token = extractBearerToken(context.request);

    if (!token) {
      return corsJsonError(
        401,
        API_ERROR_CODES.UNAUTHORIZED,
        "WarehouseIQ oturumu gerekli.",
        origin,
        undefined,
        responseHeaders(),
      );
    }

    const auth = await getAuthenticatedUser(
      context.env,
      token,
      fetchImpl,
    );

    if (!auth.ok) {
      if (auth.reason === "server_misconfigured") {
        return corsJsonError(
          500,
          API_ERROR_CODES.SERVER_MISCONFIGURED,
          "WarehouseIQ veri bağlantısı yapılandırılmamış.",
          origin,
          undefined,
          responseHeaders(),
        );
      }

      return corsJsonError(
        401,
        API_ERROR_CODES.UNAUTHORIZED,
        "WarehouseIQ oturumu geçersiz veya süresi dolmuş.",
        origin,
        undefined,
        responseHeaders(),
      );
    }

    let body;

    try {
      body = await context.request.json();
    } catch {
      return corsJsonError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        "Geçerli bir JSON istek gövdesi gönderilmelidir.",
        origin,
        undefined,
        responseHeaders(),
      );
    }

    const normalized = normalizeWriteRequest(
      body,
      context.request.headers.get("Idempotency-Key"),
    );

    if (!normalized.ok) {
      const messages = {
        body_invalid: "İstek gövdesi geçersizdir.",
        account_invalid: "Firma kimliği geçerli bir UUID olmalıdır.",
        action_invalid: "Mal kabul işlemi desteklenmiyor.",
        request_id_invalid:
          "Idempotency-Key başlığı geçerli bir UUID olmalıdır.",
      };

      return corsJsonError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        messages[normalized.reason] ||
          "Mal kabul isteği geçersizdir.",
        origin,
        undefined,
        responseHeaders(),
      );
    }

    const result = await invokeReceivingWrite(
      context.env,
      token,
      normalized.value,
      fetchImpl,
    );

    if (!result.ok) {
      const mapped = mapRpcError(result);

      logApiEvent(
        mapped.status >= 500 ? "error" : "warn",
        "warehouse_receiving_write_failed",
        {
          userId: auth.user.id,
          accountId: normalized.value.accountId,
          action: normalized.value.action,
          requestId: normalized.value.requestId,
          status: mapped.status,
          databaseCode: result?.data?.code ?? null,
        },
      );

      return corsJsonError(
        mapped.status,
        mapped.code,
        mapped.message,
        origin,
        undefined,
        responseHeaders(),
      );
    }

    logApiEvent("info", "warehouse_receiving_write_succeeded", {
      userId: auth.user.id,
      accountId: normalized.value.accountId,
      action: normalized.value.action,
      requestId: normalized.value.requestId,
    });

    return corsJson(
      apiSuccessBody(result.data ?? {}),
      200,
      origin,
      responseHeaders(),
    );
  } catch (error) {
    logApiEvent(
      "error",
      "warehouse_receiving_write_unhandled",
      {
        message:
          error instanceof Error
            ? error.message
            : "Bilinmeyen hata",
      },
    );

    return corsJsonError(
      500,
      API_ERROR_CODES.INTERNAL_ERROR,
      "Mal kabul işlemi sırasında beklenmeyen bir hata oluştu.",
      origin,
      undefined,
      responseHeaders(),
    );
  }
}

export function onRequestOptions(context) {
  const origin = context.request.headers.get("Origin");

  return new Response(null, {
    status: 204,
    headers: buildCorsJsonHeaders(
      origin,
      responseHeaders(),
    ),
  });
}
