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

const LOCATION_TYPES = new Set([
  "receiving",
  "quality_control",
  "reserve",
  "picking",
  "bulk",
  "cold_storage",
  "hazardous",
  "returns",
  "damaged",
  "packing",
  "shipping",
  "cross_dock",
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
  const contentLength = Number(request.headers.get("Content-Length") || 0);

  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
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

  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
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

async function getAuthenticatedUser(env, token, fetchImpl) {
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

async function getMembership(env, token, userId, accountId, fetchImpl) {
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

function normalizeCreateInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, reason: "body_invalid" };
  }

  const requestId = normalizeUuid(body.requestId);
  if (!requestId) {
    return { ok: false, reason: "request_id_invalid" };
  }

  const accountId = normalizeUuid(body.accountId);
  if (!accountId) {
    return { ok: false, reason: "account_invalid" };
  }

  const warehouseId = normalizeUuid(body.warehouseId);
  if (!warehouseId) {
    return { ok: false, reason: "warehouse_invalid" };
  }

  const code = String(body.code || "").trim();
  const name = String(body.name || "").trim();
  const locationType = String(body.locationType || body.type || "")
    .trim()
    .toLowerCase();
  const zoneCode = String(body.zoneCode || "").trim();

  if (!code) return { ok: false, reason: "code_invalid" };
  if (!name) return { ok: false, reason: "name_invalid" };
  if (!LOCATION_TYPES.has(locationType)) {
    return { ok: false, reason: "location_type_invalid" };
  }
  if (!zoneCode) return { ok: false, reason: "zone_code_invalid" };

  const uuidOrNull = (value) => {
    if (value === undefined || value === null || value === "") return null;
    return normalizeUuid(value);
  };

  const parentLocationId = uuidOrNull(body.parentLocationId);

  if (
    body.parentLocationId !== undefined &&
    body.parentLocationId !== null &&
    body.parentLocationId !== "" &&
    !parentLocationId
  ) {
    return { ok: false, reason: "parent_location_invalid" };
  }

  const textOrNull = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const normalized = String(value).trim();
    return normalized || null;
  };

  const numberOrNull = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const integerOrNull = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const number = Number(value);
    return Number.isInteger(number) ? number : null;
  };

  return {
    ok: true,
    value: {
      requestId,
      accountId,
      warehouseId,
      code,
      name,
      locationType,
      zoneCode,
      parentLocationId,
      aisleCode: textOrNull(body.aisleCode),
      rackCode: textOrNull(body.rackCode),
      levelCode: textOrNull(body.levelCode),
      binCode: textOrNull(body.binCode),
      description: textOrNull(body.description),
      maximumWeightKilograms: numberOrNull(body.maximumWeightKilograms),
      maximumVolumeCubicMeters: numberOrNull(body.maximumVolumeCubicMeters),
      maximumPalletCount: integerOrNull(body.maximumPalletCount),
      maximumUnitCount: numberOrNull(body.maximumUnitCount),
      widthCentimeters: numberOrNull(body.widthCentimeters),
      depthCentimeters: numberOrNull(body.depthCentimeters),
      heightCentimeters: numberOrNull(body.heightCentimeters),
      coordinateX: numberOrNull(body.coordinateX),
      coordinateY: numberOrNull(body.coordinateY),
      coordinateZ: numberOrNull(body.coordinateZ),
      temperatureMinimumCelsius: numberOrNull(
        body.temperatureMinimumCelsius,
      ),
      temperatureMaximumCelsius: numberOrNull(
        body.temperatureMaximumCelsius,
      ),
      hazardousMaterialAllowed: body.hazardousMaterialAllowed === true,
      mixedSkuAllowed: body.mixedSkuAllowed === true,
    },
  };
}

async function invokeLocationBootstrap(
  env,
  token,
  input,
  fetchImpl,
) {
  const rpcBody = {
    p_request_id: input.requestId,
    p_account_id: input.accountId,
    p_warehouse_id: input.warehouseId,
    p_code: input.code,
    p_name: input.name,
    p_location_type: input.locationType,
    p_zone_code: input.zoneCode,
    p_parent_location_id: input.parentLocationId,
    p_aisle_code: input.aisleCode,
    p_rack_code: input.rackCode,
    p_level_code: input.levelCode,
    p_bin_code: input.binCode,
    p_description: input.description,
    p_maximum_weight_kilograms: input.maximumWeightKilograms,
    p_maximum_volume_cubic_meters: input.maximumVolumeCubicMeters,
    p_maximum_pallet_count: input.maximumPalletCount,
    p_maximum_unit_count: input.maximumUnitCount,
    p_width_centimeters: input.widthCentimeters,
    p_depth_centimeters: input.depthCentimeters,
    p_height_centimeters: input.heightCentimeters,
    p_coordinate_x: input.coordinateX,
    p_coordinate_y: input.coordinateY,
    p_coordinate_z: input.coordinateZ,
    p_temperature_minimum_celsius: input.temperatureMinimumCelsius,
    p_temperature_maximum_celsius: input.temperatureMaximumCelsius,
    p_hazardous_material_allowed: input.hazardousMaterialAllowed,
    p_mixed_sku_allowed: input.mixedSkuAllowed,
  };

  const response = await supabaseRequest(
    env,
    token,
    "/rest/v1/rpc/warehouse_location_bootstrap_write",
    {
      method: "POST",
      body: JSON.stringify(rpcBody),
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

async function listLocations(
  env,
  token,
  accountId,
  warehouseId,
  fetchImpl,
) {
  const params = new URLSearchParams({
    select:
      "id,account_id,warehouse_id,parent_location_id,code,full_code,barcode,name,type,status,zone_code,aisle_code,rack_code,level_code,bin_code,description,maximum_weight_kilograms,maximum_volume_cubic_meters,maximum_pallet_count,maximum_unit_count,width_centimeters,depth_centimeters,height_centimeters,coordinate_x,coordinate_y,coordinate_z,temperature_minimum_celsius,temperature_maximum_celsius,hazardous_material_allowed,mixed_sku_allowed,active,created_by,created_at,updated_at",
    account_id: `eq.${accountId}`,
    active: "eq.true",
    order: "full_code.asc",
  });

  if (warehouseId) {
    params.set("warehouse_id", `eq.${warehouseId}`);
  }

  const response = await supabaseRequest(
    env,
    token,
    `/rest/v1/warehouse_locations?${params.toString()}`,
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
    rows: Array.isArray(payload) ? payload : [],
  };
}

function corsHeaders(request) {
  return buildCorsJsonHeaders(request);
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(context.request),
  });
}

export async function onRequestGet(context) {
  const request = context.request;
  const env = context.env || {};
  const fetchImpl = context.fetch || context.env?.fetch || fetch;

  const token = extractBearerToken(request);

  if (!token) {
    return corsJsonError(
      401,
      API_ERROR_CODES.UNAUTHORIZED,
      "Kimlik doğrulaması gerekli.",
    );
  }

  const auth = await getAuthenticatedUser(env, token, fetchImpl);

  if (!auth.ok) {
    return corsJsonError(
      auth.reason === "server_misconfigured" ? 500 : 401,
      auth.reason === "server_misconfigured"
        ? API_ERROR_CODES.SERVER_MISCONFIGURED
        : API_ERROR_CODES.UNAUTHORIZED,
      auth.reason === "server_misconfigured"
        ? "WarehouseIQ kimlik doğrulama yapılandırması eksik."
        : "Oturum geçersiz veya süresi dolmuş.",
    );
  }

  const url = new URL(request.url);
  const accountId = normalizeUuid(url.searchParams.get("accountId"));

  if (!accountId) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      "accountId geçerli bir UUID olmalıdır.",
    );
  }

  const warehouseIdRaw = url.searchParams.get("warehouseId");
  const warehouseId = warehouseIdRaw
    ? normalizeUuid(warehouseIdRaw)
    : null;

  if (warehouseIdRaw && !warehouseId) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      "warehouseId geçerli bir UUID olmalıdır.",
    );
  }

  const membership = await getMembership(
    env,
    token,
    auth.user.id,
    accountId,
    fetchImpl,
  );

  if (!membership.ok) {
    return corsJsonError(
      membership.reason === "membership_missing" ? 403 : 500,
      membership.reason === "membership_missing"
        ? API_ERROR_CODES.FORBIDDEN
        : API_ERROR_CODES.INTERNAL_ERROR,
      membership.reason === "membership_missing"
        ? "Bu WarehouseIQ firmasına erişim yetkiniz bulunmuyor."
        : "Firma üyeliği doğrulanamadı.",
    );
  }

  const result = await listLocations(
    env,
    token,
    accountId,
    warehouseId,
    fetchImpl,
  );

  if (!result.ok) {
    return corsJsonError(
      result.status >= 400 && result.status < 500 ? result.status : 500,
      API_ERROR_CODES.INTERNAL_ERROR,
      "Lokasyonlar okunamadı.",
    );
  }

  return corsJson(
    apiSuccessBody({
      locations: result.rows,
      count: result.rows.length,
    }),
    200,
  );
}

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env || {};
  const fetchImpl = context.fetch || context.env?.fetch || fetch;

  const token = extractBearerToken(request);

  if (!token) {
    return corsJsonError(
      401,
      API_ERROR_CODES.UNAUTHORIZED,
      "Kimlik doğrulaması gerekli.",
    );
  }

  const auth = await getAuthenticatedUser(env, token, fetchImpl);

  if (!auth.ok) {
    return corsJsonError(
      auth.reason === "server_misconfigured" ? 500 : 401,
      auth.reason === "server_misconfigured"
        ? API_ERROR_CODES.SERVER_MISCONFIGURED
        : API_ERROR_CODES.UNAUTHORIZED,
      auth.reason === "server_misconfigured"
        ? "WarehouseIQ kimlik doğrulama yapılandırması eksik."
        : "Oturum geçersiz veya süresi dolmuş.",
    );
  }

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

  const normalized = normalizeCreateInput(body.value);

  if (!normalized.ok) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      `Lokasyon isteği geçersiz: ${normalized.reason}`,
    );
  }

  const input = normalized.value;

  const membership = await getMembership(
    env,
    token,
    auth.user.id,
    input.accountId,
    fetchImpl,
  );

  if (!membership.ok) {
    return corsJsonError(
      membership.reason === "membership_missing" ? 403 : 500,
      membership.reason === "membership_missing"
        ? API_ERROR_CODES.FORBIDDEN
        : API_ERROR_CODES.INTERNAL_ERROR,
      membership.reason === "membership_missing"
        ? "Bu WarehouseIQ firmasına erişim yetkiniz bulunmuyor."
        : "Firma üyeliği doğrulanamadı.",
    );
  }

  const allowedRoles = new Set([
    "owner",
    "admin",
    "warehouse_manager",
    "supervisor",
    "inventory_controller",
  ]);

  if (!allowedRoles.has(membership.membership.role)) {
    return corsJsonError(
      403,
      API_ERROR_CODES.FORBIDDEN,
      "Lokasyon oluşturma yetkiniz bulunmuyor.",
    );
  }

  const result = await invokeLocationBootstrap(
    env,
    token,
    input,
    fetchImpl,
  );

  if (!result.ok) {
    const message =
      result.payload?.message ||
      result.payload?.error_description ||
      result.payload?.hint ||
      "Lokasyon oluşturulamadı.";

    try {
      logApiEvent("error", "warehouse_location_bootstrap_failed", {
        userId: auth.user.id,
        accountId: input.accountId,
        warehouseId: input.warehouseId,
        status: result.status,
      });
    } catch {}

    return corsJsonError(
      result.status >= 400 && result.status < 500
        ? result.status
        : 500,
      API_ERROR_CODES.INTERNAL_ERROR,
      message,
    );
  }

  return corsJson(
    apiSuccessBody({
      location: result.payload,
    }),
    201,
  );
}
