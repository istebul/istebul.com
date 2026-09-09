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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BODY_BYTES = 32 * 1024;

const WAREHOUSE_STATUSES = new Set([
  "draft",
  "active",
  "temporarily_closed",
  "inactive",
  "archived",
]);

const MANAGEMENT_ROLES = new Set([
  "owner",
  "admin",
  "warehouse_manager",
]);

function extractBearerToken(request) {
  const value = request.headers.get("Authorization") || "";
  if (!value.startsWith("Bearer ")) return null;
  const token = value.slice(7).trim();
  return token || null;
}

function normalizeUuid(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function readBody(request) {
  const contentLength = Number(
    request.headers.get("Content-Length") || 0,
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_BODY_BYTES
  ) {
    return {
      ok: false,
      reason: "body_too_large",
    };
  }

  let text;

  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      reason: "body_read_failed",
    };
  }

  if (
    new TextEncoder().encode(text).byteLength >
    MAX_BODY_BYTES
  ) {
    return {
      ok: false,
      reason: "body_too_large",
    };
  }

  if (!text.trim()) {
    return {
      ok: false,
      reason: "body_invalid",
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(text),
    };
  } catch {
    return {
      ok: false,
      reason: "json_invalid",
    };
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

async function supabaseRequest(
  env,
  token,
  path,
  options = {},
  fetchImpl = fetch,
) {
  return fetchImpl(
    new URL(path, env.SUPABASE_URL),
    {
      ...options,
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    },
  );
}

async function getMembership(
  env,
  token,
  userId,
  accountId,
  fetchImpl,
) {
  const params = new URLSearchParams({
    select: "account_id,role,status",
    user_id: `eq.${userId}`,
    account_id: `eq.${accountId}`,
    status: "eq.active",
    limit: "1",
  });

  const response = await supabaseRequest(
    env,
    token,
    `/rest/v1/warehouse_users?${params.toString()}`,
    {},
    fetchImpl,
  );

  if (!response.ok) {
    return {
      ok: false,
      reason: "membership_lookup_failed",
    };
  }

  const rows = await readJsonSafely(response);

  if (!Array.isArray(rows) || !rows[0]) {
    return {
      ok: false,
      reason: "membership_missing",
    };
  }

  return {
    ok: true,
    membership: rows[0],
  };
}

function normalizeText(value) {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim();

  return normalized || null;
}

function normalizeCreateInput(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return {
      ok: false,
      reason: "body_invalid",
    };
  }

  const requestId = normalizeUuid(body.requestId);
  const accountId = normalizeUuid(body.accountId);

  if (!requestId) {
    return {
      ok: false,
      reason: "request_id_invalid",
    };
  }

  if (!accountId) {
    return {
      ok: false,
      reason: "account_invalid",
    };
  }

  const code = String(body.code || "").trim().toUpperCase();
  const name = String(body.name || "").trim();

  if (!code) {
    return {
      ok: false,
      reason: "code_invalid",
    };
  }

  if (!name) {
    return {
      ok: false,
      reason: "name_invalid",
    };
  }

  const numberOrNull = (value) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  };

  const integerOrNull = (value) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isInteger(number) ? number : null;
  };

  return {
    ok: true,
    value: {
      requestId,
      accountId,
      code,
      name,
      description: normalizeText(body.description),
      timezone:
        normalizeText(body.timezone) ||
        "Europe/Istanbul",
      addressLine: normalizeText(body.addressLine),
      district: normalizeText(body.district),
      city: normalizeText(body.city),
      postalCode: normalizeText(body.postalCode),
      countryCode:
        String(body.countryCode || "TR")
          .trim()
          .toUpperCase(),
      totalAreaSquareMeters: numberOrNull(
        body.totalAreaSquareMeters,
      ),
      usableAreaSquareMeters: numberOrNull(
        body.usableAreaSquareMeters,
      ),
      maximumPalletCapacity: integerOrNull(
        body.maximumPalletCapacity,
      ),
      maximumBinCapacity: integerOrNull(
        body.maximumBinCapacity,
      ),
    },
  };
}

function normalizeUpdateInput(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return {
      ok: false,
      reason: "body_invalid",
    };
  }

  const requestId = normalizeUuid(body.requestId);
  const accountId = normalizeUuid(body.accountId);
  const warehouseId = normalizeUuid(body.warehouseId);

  if (!requestId) {
    return {
      ok: false,
      reason: "request_id_invalid",
    };
  }

  if (!accountId) {
    return {
      ok: false,
      reason: "account_invalid",
    };
  }

  if (!warehouseId) {
    return {
      ok: false,
      reason: "warehouse_invalid",
    };
  }

  const patch = {};

  const allowedFields = [
    "name",
    "description",
    "timezone",
    "addressLine",
    "district",
    "city",
    "postalCode",
    "countryCode",
    "totalAreaSquareMeters",
    "usableAreaSquareMeters",
    "maximumPalletCapacity",
    "maximumBinCapacity",
  ];

  for (const field of allowedFields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      continue;
    }

    const value = body[field];

    if (
      [
        "name",
        "timezone",
        "addressLine",
        "district",
        "city",
        "postalCode",
      ].includes(field)
    ) {
      if (value === null) {
        return {
          ok: false,
          reason: `field_null:${field}`,
        };
      }

      const normalized = String(value).trim();

      if (!normalized) {
        return {
          ok: false,
          reason: `field_empty:${field}`,
        };
      }

      patch[field] = normalized;
      continue;
    }

    if (field === "description") {
      patch[field] =
        value === null
          ? null
          : String(value).trim() || null;
      continue;
    }

    if (field === "countryCode") {
      if (value === null) {
        return {
          ok: false,
          reason: "country_code_null",
        };
      }

      const normalized = String(value)
        .trim()
        .toUpperCase();

      if (!/^[A-Z]{2}$/.test(normalized)) {
        return {
          ok: false,
          reason: "country_code_invalid",
        };
      }

      patch[field] = normalized;
      continue;
    }

    if (
      [
        "totalAreaSquareMeters",
        "usableAreaSquareMeters",
        "maximumPalletCapacity",
        "maximumBinCapacity",
      ].includes(field)
    ) {
      if (value === null) {
        return {
          ok: false,
          reason: `field_null:${field}`,
        };
      }

      const number = Number(value);

      if (!Number.isFinite(number) || number < 0) {
        return {
          ok: false,
          reason: `number_invalid:${field}`,
        };
      }

      if (
        [
          "maximumPalletCapacity",
          "maximumBinCapacity",
        ].includes(field) &&
        !Number.isInteger(number)
      ) {
        return {
          ok: false,
          reason: `integer_invalid:${field}`,
        };
      }

      patch[field] = number;
    }
  }

  if (Object.keys(patch).length === 0) {
    return {
      ok: false,
      reason: "patch_empty",
    };
  }

  return {
    ok: true,
    value: {
      requestId,
      accountId,
      warehouseId,
      patch,
    },
  };
}

function normalizeStatusInput(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return {
      ok: false,
      reason: "body_invalid",
    };
  }

  const requestId = normalizeUuid(body.requestId);
  const accountId = normalizeUuid(body.accountId);
  const warehouseId = normalizeUuid(body.warehouseId);

  if (!requestId) {
    return {
      ok: false,
      reason: "request_id_invalid",
    };
  }

  if (!accountId) {
    return {
      ok: false,
      reason: "account_invalid",
    };
  }

  if (!warehouseId) {
    return {
      ok: false,
      reason: "warehouse_invalid",
    };
  }

  const status = String(body.status || "")
    .trim()
    .toLowerCase();

  if (!WAREHOUSE_STATUSES.has(status)) {
    return {
      ok: false,
      reason: "status_invalid",
    };
  }

  return {
    ok: true,
    value: {
      requestId,
      accountId,
      warehouseId,
      status,
    },
  };
}

async function invokeRpc(
  env,
  token,
  rpcName,
  body,
  fetchImpl,
) {
  const response = await supabaseRequest(
    env,
    token,
    `/rest/v1/rpc/${rpcName}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    fetchImpl,
  );

  const payload = await readJsonSafely(response);

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

async function authenticate(context) {
  const request = context.request;
  const env = context.env || {};
  const fetchImpl =
    context.fetch ||
    context.env?.fetch ||
    fetch;

  const token = extractBearerToken(request);

  if (!token) {
    return {
      ok: false,
      response: corsJsonError(
        401,
        API_ERROR_CODES.UNAUTHORIZED,
        "Kimlik doğrulaması gerekli.",
      ),
    };
  }

  const auth = await getAuthenticatedUser(
    env,
    token,
    fetchImpl,
  );

  if (!auth.ok) {
    return {
      ok: false,
      response: corsJsonError(
        auth.reason === "server_misconfigured"
          ? 500
          : 401,
        auth.reason === "server_misconfigured"
          ? API_ERROR_CODES.SERVER_MISCONFIGURED
          : API_ERROR_CODES.UNAUTHORIZED,
        auth.reason === "server_misconfigured"
          ? "WarehouseIQ kimlik doğrulama yapılandırması eksik."
          : "Oturum geçersiz veya süresi dolmuş.",
      ),
    };
  }

  return {
    ok: true,
    request,
    env,
    fetchImpl,
    token,
    auth,
  };
}

async function authorizeManagement(
  env,
  token,
  userId,
  accountId,
  fetchImpl,
) {
  const membership = await getMembership(
    env,
    token,
    userId,
    accountId,
    fetchImpl,
  );

  if (!membership.ok) {
    return {
      ok: false,
      response: corsJsonError(
        membership.reason === "membership_missing"
          ? 403
          : 500,
        membership.reason === "membership_missing"
          ? API_ERROR_CODES.FORBIDDEN
          : API_ERROR_CODES.INTERNAL_ERROR,
        membership.reason === "membership_missing"
          ? "Bu WarehouseIQ firmasına erişim yetkiniz bulunmuyor."
          : "Firma üyeliği doğrulanamadı.",
      ),
    };
  }

  if (
    !MANAGEMENT_ROLES.has(
      membership.membership.role,
    )
  ) {
    return {
      ok: false,
      response: corsJsonError(
        403,
        API_ERROR_CODES.FORBIDDEN,
        "Depo yönetimi için yetkiniz bulunmuyor.",
      ),
    };
  }

  return {
    ok: true,
    membership: membership.membership,
  };
}

async function listWarehouses(
  env,
  token,
  accountId,
  fetchImpl,
) {
  const params = new URLSearchParams({
    select:
      "id,account_id,code,name,description,status,timezone,address_line,district,city,postal_code,country_code,total_area_square_meters,usable_area_square_meters,maximum_pallet_capacity,maximum_bin_capacity,created_by,created_at,updated_at",
    account_id: `eq.${accountId}`,
    order: "code.asc",
  });

  const response = await supabaseRequest(
    env,
    token,
    `/rest/v1/warehouses?${params.toString()}`,
    {},
    fetchImpl,
  );

  const payload = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload,
    };
  }

  return {
    ok: true,
    rows: Array.isArray(payload)
      ? payload
      : [],
  };
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: buildCorsJsonHeaders(
      context.request,
    ),
  });
}

export async function onRequestGet(context) {
  const authenticated =
    await authenticate(context);

  if (!authenticated.ok) {
    return authenticated.response;
  }

  const {
    request,
    env,
    fetchImpl,
    token,
    auth,
  } = authenticated;

  const url = new URL(request.url);
  const accountId = normalizeUuid(
    url.searchParams.get("accountId"),
  );

  if (!accountId) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      "accountId geçerli bir UUID olmalıdır.",
    );
  }

  const membership =
    await getMembership(
      env,
      token,
      auth.user.id,
      accountId,
      fetchImpl,
    );

  if (!membership.ok) {
    return corsJsonError(
      membership.reason === "membership_missing"
        ? 403
        : 500,
      membership.reason === "membership_missing"
        ? API_ERROR_CODES.FORBIDDEN
        : API_ERROR_CODES.INTERNAL_ERROR,
      membership.reason === "membership_missing"
        ? "Bu WarehouseIQ firmasına erişim yetkiniz bulunmuyor."
        : "Firma üyeliği doğrulanamadı.",
    );
  }

  const result =
    await listWarehouses(
      env,
      token,
      accountId,
      fetchImpl,
    );

  if (!result.ok) {
    return corsJsonError(
      result.status >= 400 &&
        result.status < 500
        ? result.status
        : 500,
      API_ERROR_CODES.INTERNAL_ERROR,
      "Depolar okunamadı.",
    );
  }

  return corsJson(
    apiSuccessBody({
      warehouses: result.rows,
      count: result.rows.length,
    }),
    200,
  );
}

export async function onRequestPost(context) {
  const authenticated =
    await authenticate(context);

  if (!authenticated.ok) {
    return authenticated.response;
  }

  const {
    request,
    env,
    fetchImpl,
    token,
    auth,
  } = authenticated;

  const body = await readBody(request);

  if (!body.ok) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      body.reason === "body_too_large"
        ? "İstek gövdesi çok büyük."
        : "Geçersiz JSON isteği.",
    );
  }

  const normalized =
    normalizeCreateInput(body.value);

  if (!normalized.ok) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      `Depo oluşturma isteği geçersiz: ${normalized.reason}`,
    );
  }

  const input = normalized.value;

  const authorization =
    await authorizeManagement(
      env,
      token,
      auth.user.id,
      input.accountId,
      fetchImpl,
    );

  if (!authorization.ok) {
    return authorization.response;
  }

  const result = await invokeRpc(
    env,
    token,
    "warehouse_create_write",
    {
      p_request_id: input.requestId,
      p_account_id: input.accountId,
      p_code: input.code,
      p_name: input.name,
      p_description: input.description,
      p_timezone: input.timezone,
      p_address_line: input.addressLine,
      p_district: input.district,
      p_city: input.city,
      p_postal_code: input.postalCode,
      p_country_code: input.countryCode,
      p_total_area_square_meters:
        input.totalAreaSquareMeters,
      p_usable_area_square_meters:
        input.usableAreaSquareMeters,
      p_maximum_pallet_capacity:
        input.maximumPalletCapacity,
      p_maximum_bin_capacity:
        input.maximumBinCapacity,
    },
    fetchImpl,
  );

  if (!result.ok) {
    const message =
      result.payload?.message ||
      result.payload?.error_description ||
      result.payload?.hint ||
      "Depo oluşturulamadı.";

    try {
      await logApiEvent?.(env, {
        event: "warehouse_create_failed",
        userId: auth.user.id,
        accountId: input.accountId,
        status: result.status,
      });
    } catch {}

    return corsJsonError(
      result.status >= 400 &&
        result.status < 500
        ? result.status
        : 500,
      API_ERROR_CODES.INTERNAL_ERROR,
      message,
    );
  }

  return corsJson(
    apiSuccessBody({
      warehouse: result.payload,
    }),
    201,
  );
}

export async function onRequestPatch(context) {
  const authenticated =
    await authenticate(context);

  if (!authenticated.ok) {
    return authenticated.response;
  }

  const {
    env,
    fetchImpl,
    token,
    auth,
  } = authenticated;

  const body = await readBody(
    context.request,
  );

  if (!body.ok) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      body.reason === "body_too_large"
        ? "İstek gövdesi çok büyük."
        : "Geçersiz JSON isteği.",
    );
  }

  const isStatusRequest =
    body.value &&
    typeof body.value === "object" &&
    !Array.isArray(body.value) &&
    body.value.status !== undefined;

  const normalized = isStatusRequest
    ? normalizeStatusInput(body.value)
    : normalizeUpdateInput(body.value);

  if (!normalized.ok) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      `Depo güncelleme isteği geçersiz: ${normalized.reason}`,
    );
  }

  const input = normalized.value;

  const authorization =
    await authorizeManagement(
      env,
      token,
      auth.user.id,
      input.accountId,
      fetchImpl,
    );

  if (!authorization.ok) {
    return authorization.response;
  }

  const rpcName = isStatusRequest
    ? "warehouse_change_status_write"
    : "warehouse_update_write";

  const rpcBody = isStatusRequest
    ? {
        p_request_id: input.requestId,
        p_account_id: input.accountId,
        p_warehouse_id: input.warehouseId,
        p_status: input.status,
      }
    : {
        p_request_id: input.requestId,
        p_account_id: input.accountId,
        p_warehouse_id: input.warehouseId,
        p_name: input.patch.name ?? null,
        p_description:
          Object.prototype.hasOwnProperty.call(
            input.patch,
            "description",
          )
            ? input.patch.description
            : null,
        p_timezone: input.patch.timezone ?? null,
        p_address_line:
          input.patch.addressLine ?? null,
        p_district:
          input.patch.district ?? null,
        p_city: input.patch.city ?? null,
        p_postal_code:
          input.patch.postalCode ?? null,
        p_country_code:
          input.patch.countryCode ?? null,
        p_total_area_square_meters:
          input.patch.totalAreaSquareMeters ?? null,
        p_usable_area_square_meters:
          input.patch.usableAreaSquareMeters ?? null,
        p_maximum_pallet_capacity:
          input.patch.maximumPalletCapacity ?? null,
        p_maximum_bin_capacity:
          input.patch.maximumBinCapacity ?? null,
      };

  const result = await invokeRpc(
    env,
    token,
    rpcName,
    rpcBody,
    fetchImpl,
  );

  if (!result.ok) {
    const message =
      result.payload?.message ||
      result.payload?.error_description ||
      result.payload?.hint ||
      (
        isStatusRequest
          ? "Depo durumu güncellenemedi."
          : "Depo güncellenemedi."
      );

    try {
      await logApiEvent?.(env, {
        event: isStatusRequest
          ? "warehouse_status_change_failed"
          : "warehouse_update_failed",
        userId: auth.user.id,
        accountId: input.accountId,
        warehouseId: input.warehouseId,
        status: result.status,
      });
    } catch {}

    return corsJsonError(
      result.status >= 400 &&
        result.status < 500
        ? result.status
        : 500,
      API_ERROR_CODES.INTERNAL_ERROR,
      message,
    );
  }

  return corsJson(
    apiSuccessBody({
      warehouse: result.payload,
    }),
    200,
  );
}
