import {
  API_ERROR_CODES,
  apiSuccessBody,
} from "../../_shared/api-response.js";

import {
  buildCorsJsonHeaders,
  corsJson as sharedCorsJson,
  corsJsonError as sharedCorsJsonError,
} from "../../_shared/cors-json.js";

import {
  getIntegrationConnector,
} from "./integration-connectors.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BODY_BYTES = 32 * 1024;

const INTEGRATION_CORS_HEADERS = Object.freeze({
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Cache-Control": "private, no-store",
});

function corsJson(body, status = 200, origin = null, headerOverrides = {}) {
  return sharedCorsJson(
    body,
    status,
    origin,
    { ...INTEGRATION_CORS_HEADERS, ...headerOverrides },
  );
}

function corsJsonError(
  status,
  code,
  message,
  origin = null,
  details = undefined,
  headerOverrides = {},
) {
  return sharedCorsJsonError(
    status,
    code,
    message,
    origin,
    details,
    { ...INTEGRATION_CORS_HEADERS, ...headerOverrides },
  );
}

const INTEGRATION_STATUSES = new Set([
  "draft",
  "testing",
  "active",
  "inactive",
  "error",
]);

const AUTH_TYPES = new Set([
  "none",
  "api_key",
  "bearer",
  "basic",
  "oauth2_client_credentials",
  "custom",
]);

const CUSTOM_REST_AUTH_TYPES = new Set([
  "none",
  "api_key",
  "bearer",
]);

const READ_ROLES = new Set([
  "admin",
  "warehouse_manager",
]);

const WRITE_ROLES = new Set([
  "admin",
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

function normalizeText(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isUnsafeIpv4(hostname) {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return false;
  }

  const octets = hostname.split(".").map(Number);
  if (octets.some((part) => part < 0 || part > 255)) {
    return true;
  }

  const [a, b, c] = octets;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (
      b === 168 ||
      (b === 0 && (c === 0 || c === 2)) ||
      (b === 88 && c === 99)
    )) ||
    (a === 198 && (
      b === 18 ||
      b === 19 ||
      (b === 51 && c === 100)
    )) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function normalizeBaseUrl(value) {
  const normalized = normalizeText(value);

  if (normalized === null) {
    return { ok: true, value: null };
  }

  if (normalized.length > 2000) {
    return { ok: false, reason: "base_url_invalid" };
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return { ok: false, reason: "base_url_invalid" };
  }

  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    return { ok: false, reason: "base_url_invalid" };
  }

  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".home") ||
    hostname.includes(":") ||
    isUnsafeIpv4(hostname)
  ) {
    return { ok: false, reason: "base_url_unsafe" };
  }

  return { ok: true, value: normalized };
}

const SAFE_HEADER_NAME_PATTERN =
  /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

const RESERVED_CUSTOM_HEADER_NAMES = new Set([
  "authorization",
  "content-type",
  "content-length",
  "host",
  "connection",
  "transfer-encoding",
  "idempotency-key",
  "x-warehouse-event",
]);

function normalizeIntegrationConfig(value) {
  if (!isPlainObject(value)) {
    return { ok: false, reason: "config_invalid" };
  }

  if (Object.keys(value).some((key) => key !== "auth")) {
    return { ok: false, reason: "config_fields_invalid" };
  }

  const config = {};

  if (value.auth !== undefined) {
    if (!isPlainObject(value.auth)) {
      return { ok: false, reason: "config_auth_invalid" };
    }

    if (
      Object.keys(value.auth).some(
        (key) => key !== "headerName",
      )
    ) {
      return { ok: false, reason: "config_auth_fields_invalid" };
    }

    const auth = {};

    if (value.auth.headerName !== undefined) {
      const headerName = normalizeText(value.auth.headerName);

      if (
        !headerName ||
        headerName.length > 128 ||
        !SAFE_HEADER_NAME_PATTERN.test(headerName) ||
        RESERVED_CUSTOM_HEADER_NAMES.has(headerName.toLowerCase())
      ) {
        return { ok: false, reason: "config_header_name_invalid" };
      }

      auth.headerName = headerName;
    }

    config.auth = auth;
  }

  return { ok: true, value: config };
}

function sanitizeIntegrationConfig(value) {
  const normalized = normalizeIntegrationConfig(value);
  return normalized.ok ? normalized.value : {};
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

async function authorizeAccount(
  env,
  token,
  userId,
  accountId,
  roles,
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

  if (!roles.has(membership.membership.role)) {
    return {
      ok: false,
      response: corsJsonError(
        403,
        API_ERROR_CODES.FORBIDDEN,
        "Entegrasyon yönetimi için yetkiniz bulunmuyor.",
      ),
    };
  }

  return {
    ok: true,
    membership: membership.membership,
  };
}

function integrationSelect() {
  return [
    "id",
    "account_id",
    "name",
    "connector_key",
    "provider_name",
    "status",
    "auth_type",
    "base_url",
    "config",
    "last_test_at",
    "last_success_at",
    "last_error",
    "created_at",
    "updated_at",
    "credential_secret_id",
  ].join(",");
}

function sanitizeIntegration(row) {
  return {
    id: row.id,
    account_id: row.account_id,
    name: row.name,
    connector_key: row.connector_key,
    provider_name: row.provider_name ?? null,
    status: row.status,
    auth_type: row.auth_type,
    base_url: row.base_url ?? null,
    config: sanitizeIntegrationConfig(row.config),
    has_credential: Boolean(row.credential_secret_id),
    last_test_at: row.last_test_at ?? null,
    last_success_at: row.last_success_at ?? null,
    last_error: row.last_error ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rejectUnknownFields(
  body,
  allowed,
) {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      reason: "body_object_required",
    };
  }

  const unknown = Object.keys(body).filter(
    (key) => !allowed.has(key),
  );

  return unknown.length
    ? {
        ok: false,
        reason: "body_fields_invalid",
      }
    : {
        ok: true,
      };
}

function normalizeCreateInput(body) {
  const fieldCheck = rejectUnknownFields(
    body,
    new Set([
      "accountId",
      "name",
      "connectorKey",
      "providerName",
      "authType",
      "baseUrl",
      "config",
    ]),
  );

  if (!fieldCheck.ok) return fieldCheck;

  const accountId = normalizeUuid(body.accountId);
  if (!accountId) {
    return {
      ok: false,
      reason: "account_id_invalid",
    };
  }

  const name = normalizeText(body.name);
  if (!name || name.length < 2 || name.length > 160) {
    return {
      ok: false,
      reason: "name_invalid",
    };
  }

  const connectorKey = normalizeText(body.connectorKey);
  if (!connectorKey || connectorKey.length > 120) {
    return {
      ok: false,
      reason: "connector_key_invalid",
    };
  }

  const providerName = normalizeText(body.providerName);

  const authType =
    normalizeText(body.authType) || "api_key";

  if (!AUTH_TYPES.has(authType)) {
    return {
      ok: false,
      reason: "auth_type_invalid",
    };
  }

  if (
    connectorKey === "custom_rest" &&
    !CUSTOM_REST_AUTH_TYPES.has(authType)
  ) {
    return {
      ok: false,
      reason: "auth_type_unsupported_for_connector",
    };
  }

  const baseUrlResult = normalizeBaseUrl(body.baseUrl);
  if (!baseUrlResult.ok) return baseUrlResult;
  const baseUrl = baseUrlResult.value;

  const configResult = normalizeIntegrationConfig(
    body.config === undefined ? {} : body.config,
  );

  if (!configResult.ok) return configResult;

  return {
    ok: true,
    value: {
      accountId,
      name,
      connectorKey,
      providerName,
      authType,
      baseUrl,
      config: configResult.value,
    },
  };
}

function normalizeUpdateInput(body) {
  const fieldCheck = rejectUnknownFields(
    body,
    new Set([
      "accountId",
      "integrationId",
      "name",
      "connectorKey",
      "providerName",
      "status",
      "authType",
      "baseUrl",
      "config",
    ]),
  );

  if (!fieldCheck.ok) return fieldCheck;

  const accountId = normalizeUuid(body.accountId);
  if (!accountId) {
    return {
      ok: false,
      reason: "account_id_invalid",
    };
  }

  const integrationId = normalizeUuid(
    body.integrationId,
  );

  if (!integrationId) {
    return {
      ok: false,
      reason: "integration_id_invalid",
    };
  }

  const patch = {};

  if (body.name !== undefined) {
    const name = normalizeText(body.name);

    if (
      !name ||
      name.length < 2 ||
      name.length > 160
    ) {
      return {
        ok: false,
        reason: "name_invalid",
      };
    }

    patch.name = name;
  }

  if (body.connectorKey !== undefined) {
    const connectorKey = normalizeText(
      body.connectorKey,
    );

    if (!connectorKey || connectorKey.length > 120) {
      return {
        ok: false,
        reason: "connector_key_invalid",
      };
    }

    patch.connector_key = connectorKey;
  }

  if (body.providerName !== undefined) {
    patch.provider_name =
      normalizeText(body.providerName);
  }

  if (body.status !== undefined) {
    const status = normalizeText(body.status);

    if (!INTEGRATION_STATUSES.has(status)) {
      return {
        ok: false,
        reason: "status_invalid",
      };
    }

    if (status !== "draft" && status !== "inactive") {
      return {
        ok: false,
        reason: "status_managed_by_lifecycle",
      };
    }

    patch.status = status;
  }

  if (body.authType !== undefined) {
    const authType = normalizeText(body.authType);

    if (!AUTH_TYPES.has(authType)) {
      return {
        ok: false,
        reason: "auth_type_invalid",
      };
    }

    patch.auth_type = authType;
  }

  if (body.baseUrl !== undefined) {
    const baseUrlResult = normalizeBaseUrl(body.baseUrl);
    if (!baseUrlResult.ok) return baseUrlResult;
    patch.base_url = baseUrlResult.value;
  }

  if (body.config !== undefined) {
    const configResult = normalizeIntegrationConfig(body.config);

    if (!configResult.ok) return configResult;

    patch.config = configResult.value;
  }

  if (!Object.keys(patch).length) {
    return {
      ok: false,
      reason: "patch_empty",
    };
  }

  return {
    ok: true,
    value: {
      accountId,
      integrationId,
      patch,
    },
  };
}

function normalizeTestConnectionInput(body) {
  const fieldCheck = rejectUnknownFields(
    body,
    new Set(["integrationId", "secret"]),
  );

  if (!fieldCheck.ok) return fieldCheck;

  const integrationId = normalizeUuid(body.integrationId);
  if (!integrationId) {
    return { ok: false, reason: "integration_id_invalid" };
  }

  const secret = String(body.secret ?? "");

  if (secret.length > 50000) {
    return { ok: false, reason: "credential_too_large" };
  }

  return {
    ok: true,
    value: {
      integrationId,
      secret,
    },
  };
}

function integrationTimeoutMs(env) {
  const configured = Number(
    env.WAREHOUSE_INTEGRATION_TIMEOUT_MS || 15000,
  );

  if (!Number.isFinite(configured)) return 15000;

  return Math.max(1000, Math.min(configured, 120000));
}

async function fetchWithTimeout(
  url,
  options,
  timeoutMs,
  fetchImpl,
) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    return await fetchImpl(url, {
      ...options,
      signal: controller.signal,
      redirect: "manual",
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeCredentialInput(body) {
  const fieldCheck = rejectUnknownFields(
    body,
    new Set([
      "integrationId",
      "secret",
      "name",
      "description",
    ]),
  );

  if (!fieldCheck.ok) return fieldCheck;

  const integrationId = normalizeUuid(
    body.integrationId,
  );

  if (!integrationId) {
    return {
      ok: false,
      reason: "integration_id_invalid",
    };
  }

  const secret = String(body.secret ?? "");

  if (!secret.trim()) {
    return {
      ok: false,
      reason: "credential_empty",
    };
  }

  if (secret.length > 50000) {
    return {
      ok: false,
      reason: "credential_too_large",
    };
  }

  const name = normalizeText(body.name);
  const description = normalizeText(
    body.description,
  );

  return {
    ok: true,
    value: {
      integrationId,
      secret,
      name,
      description,
    },
  };
}

async function loadIntegration(
  env,
  token,
  integrationId,
  fetchImpl,
) {
  const params = new URLSearchParams({
    select: integrationSelect(),
    id: `eq.${integrationId}`,
    limit: "1",
  });

  const response = await supabaseRequest(
    env,
    token,
    `/rest/v1/warehouse_integrations?${params.toString()}`,
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

  const row =
    Array.isArray(payload) && payload[0]
      ? payload[0]
      : null;

  if (!row) {
    return {
      ok: false,
      status: 404,
      reason: "integration_missing",
    };
  }

  return {
    ok: true,
    row,
  };
}

async function loadConnector(
  env,
  token,
  connectorKey,
  fetchImpl,
) {
  const params = new URLSearchParams({
    select:
      "connector_key,display_name,category,implementation_status,config_schema",
    connector_key: `eq.${connectorKey}`,
    limit: "1",
  });

  const response = await supabaseRequest(
    env,
    token,
    `/rest/v1/warehouse_integration_connectors?${params.toString()}`,
    {},
    fetchImpl,
  );

  const payload = await readJsonSafely(response);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
    };
  }

  const row =
    Array.isArray(payload) && payload[0]
      ? payload[0]
      : null;

  if (!row) {
    return {
      ok: false,
      status: 400,
      reason: "connector_missing",
    };
  }

  return {
    ok: true,
    row,
  };
}

function mapDatabaseError(response, payload) {
  const code = payload?.code;

  if (code === "23505") {
    return {
      status: 409,
      message: "Bu WarehouseIQ firmasında aynı entegrasyon adı zaten kullanılıyor.",
    };
  }

  if (code === "23503") {
    return {
      status: 409,
      message: "Entegrasyon bağlı kayıtlar nedeniyle bu işlem tamamlanamadı.",
    };
  }

  if (
    code === "23514" ||
    code === "22P02"
  ) {
    return {
      status: 400,
      message: "Entegrasyon verileri geçersiz.",
    };
  }

  if (response.status >= 400 && response.status < 500) {
    return {
      status: response.status,
      message: "Entegrasyon işlemi reddedildi.",
    };
  }

  return {
    status: 500,
    message: "Entegrasyon işlemi gerçekleştirilemedi.",
  };
}

function normalizeCapabilityInput(body) {
  const fieldCheck = rejectUnknownFields(
    body,
    new Set(["integrationId", "capabilityKey", "enabled"]),
  );

  if (!fieldCheck.ok) return fieldCheck;

  const integrationId = normalizeUuid(body.integrationId);
  if (!integrationId) {
    return { ok: false, reason: "integration_id_invalid" };
  }

  if (body.capabilityKey !== "shipment.write") {
    return { ok: false, reason: "capability_key_unsupported" };
  }

  if (typeof body.enabled !== "boolean") {
    return { ok: false, reason: "enabled_boolean_required" };
  }

  return {
    ok: true,
    value: {
      integrationId,
      capabilityKey: "shipment.write",
      enabled: body.enabled,
    },
  };
}

async function listCapabilities(
  env,
  token,
  integrationIds,
  fetchImpl,
) {
  if (!integrationIds.length) {
    return { ok: true, rows: [] };
  }

  const params = new URLSearchParams({
    select: "id,integration_id,capability_key,enabled,updated_at",
    integration_id: `in.(${integrationIds.join(",")})`,
    order: "capability_key.asc",
  });

  const response = await supabaseRequest(
    env,
    token,
    `/rest/v1/warehouse_integration_capabilities?${params.toString()}`,
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

async function listIntegrations(
  env,
  token,
  accountId,
  fetchImpl,
) {
  const params = new URLSearchParams({
    select: integrationSelect(),
    account_id: `eq.${accountId}`,
    order: "created_at.desc",
  });

  const response = await supabaseRequest(
    env,
    token,
    `/rest/v1/warehouse_integrations?${params.toString()}`,
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

async function listConnectors(
  env,
  token,
  fetchImpl,
) {
  const params = new URLSearchParams({
    select:
      "connector_key,display_name,category,implementation_status,config_schema",
    order: "display_name.asc",
  });

  const response = await supabaseRequest(
    env,
    token,
    `/rest/v1/warehouse_integration_connectors?${params.toString()}`,
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

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: buildCorsJsonHeaders(
      context.request,
      INTEGRATION_CORS_HEADERS,
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

  const authorization =
    await authorizeAccount(
      env,
      token,
      auth.user.id,
      accountId,
      READ_ROLES,
      fetchImpl,
    );

  if (!authorization.ok) {
    return authorization.response;
  }

  const [integrations, connectors] =
    await Promise.all([
      listIntegrations(
        env,
        token,
        accountId,
        fetchImpl,
      ),
      listConnectors(
        env,
        token,
        fetchImpl,
      ),
    ]);

  if (!integrations.ok) {
    return corsJsonError(
      integrations.status >= 400 &&
        integrations.status < 500
        ? integrations.status
        : 500,
      API_ERROR_CODES.INTERNAL_ERROR,
      "Entegrasyonlar okunamadı.",
    );
  }

  if (!connectors.ok) {
    return corsJsonError(
      connectors.status >= 400 &&
        connectors.status < 500
        ? connectors.status
        : 500,
      API_ERROR_CODES.INTERNAL_ERROR,
      "Entegrasyon sağlayıcıları okunamadı.",
    );
  }

  const capabilities = await listCapabilities(
    env,
    token,
    integrations.rows.map((row) => row.id),
    fetchImpl,
  );

  if (!capabilities.ok) {
    return corsJsonError(
      capabilities.status >= 400 &&
        capabilities.status < 500
        ? capabilities.status
        : 500,
      API_ERROR_CODES.INTERNAL_ERROR,
      "Entegrasyon yetenekleri okunamadı.",
    );
  }

  const capabilitiesByIntegration = new Map();
  for (const capability of capabilities.rows) {
    const items =
      capabilitiesByIntegration.get(capability.integration_id) || [];

    items.push({
      id: capability.id,
      integration_id: capability.integration_id,
      capability_key: capability.capability_key,
      enabled: capability.enabled === true,
      updated_at: capability.updated_at ?? null,
    });

    capabilitiesByIntegration.set(
      capability.integration_id,
      items,
    );
  }

  return corsJson(
    apiSuccessBody({
      accountId,
      integrations: integrations.rows.map((row) => ({
        ...sanitizeIntegration(row),
        capabilities:
          capabilitiesByIntegration.get(row.id) || [],
      })),
      connectors: connectors.rows,
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
    env,
    fetchImpl,
    token,
    auth,
  } = authenticated;

  const url = new URL(context.request.url);
  const action =
    normalizeText(
      url.searchParams.get("action"),
    ) || "create";

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

  if (action === "test-connection") {
    const normalized =
      normalizeTestConnectionInput(body.value);

    if (!normalized.ok) {
      return corsJsonError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        `Bağlantı testi isteği geçersiz: ${normalized.reason}`,
      );
    }

    const input = normalized.value;

    const integration = await loadIntegration(
      env,
      token,
      input.integrationId,
      fetchImpl,
    );

    if (!integration.ok) {
      return corsJsonError(
        integration.status || 500,
        integration.reason === "integration_missing"
          ? API_ERROR_CODES.NOT_FOUND
          : API_ERROR_CODES.INTERNAL_ERROR,
        integration.reason === "integration_missing"
          ? "Entegrasyon bulunamadı."
          : "Entegrasyon doğrulanamadı.",
      );
    }

    const row = integration.row;

    const authorization = await authorizeAccount(
      env,
      token,
      auth.user.id,
      row.account_id,
      WRITE_ROLES,
      fetchImpl,
    );

    if (!authorization.ok) {
      return authorization.response;
    }

    if (row.status === "active") {
      return corsJsonError(
        409,
        API_ERROR_CODES.CONFLICT,
        "Canlı entegrasyonu test için durdurmamak adına önce pasife alın.",
      );
    }

    if (row.connector_key !== "custom_rest") {
      return corsJsonError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        "Bağlantı testi yalnız uygulanmış Özel REST connector'ı için kullanılabilir.",
      );
    }

    const connectorRecord = await loadConnector(
      env,
      token,
      row.connector_key,
      fetchImpl,
    );

    if (
      !connectorRecord.ok ||
      connectorRecord.row.implementation_status !== "available"
    ) {
      return corsJsonError(
        409,
        API_ERROR_CODES.CONFLICT,
        "Entegrasyon connector'ı kullanıma hazır değil.",
      );
    }

    if (!CUSTOM_REST_AUTH_TYPES.has(row.auth_type)) {
      return corsJsonError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        "Özel REST için yalnız none, bearer veya api_key kimlik doğrulaması destekleniyor.",
      );
    }

    const baseUrlResult = normalizeBaseUrl(row.base_url);

    if (!baseUrlResult.ok || !baseUrlResult.value) {
      return corsJsonError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        "Güvenli HTTPS endpoint adresi gerekli.",
      );
    }

    if (row.auth_type !== "none" && !input.secret.trim()) {
      return corsJsonError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        "Kimlik doğrulamalı bağlantı testi için credential değerini yeniden girin. Kayıtlı Vault sırrı tarayıcıya açılmaz.",
      );
    }

    let connectorRequest;

    try {
      const connector =
        getIntegrationConnector(row.connector_key);

      connectorRequest = connector.buildRequest({
        runtime: {
          baseUrl: baseUrlResult.value,
          authType: row.auth_type,
          credential: input.secret,
          config: sanitizeIntegrationConfig(row.config),
        },
        outboxId: `test-${globalThis.crypto.randomUUID()}`,
        eventType: "warehouse.integration.test",
      });
    } catch {
      return corsJsonError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        "Bağlantı testi için connector isteği oluşturulamadı.",
      );
    }

    const markTestingResponse = await supabaseRequest(
      env,
      token,
      `/rest/v1/warehouse_integrations?id=eq.${input.integrationId}&account_id=eq.${row.account_id}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          status: "testing",
          updated_at: new Date().toISOString(),
        }),
      },
      fetchImpl,
    );

    const markTestingPayload =
      await readJsonSafely(markTestingResponse);

    if (
      !markTestingResponse.ok ||
      !Array.isArray(markTestingPayload) ||
      !markTestingPayload[0]
    ) {
      return corsJsonError(
        markTestingResponse.ok ? 404 : 500,
        markTestingResponse.ok
          ? API_ERROR_CODES.NOT_FOUND
          : API_ERROR_CODES.INTERNAL_ERROR,
        "Entegrasyon test durumuna alınamadı.",
      );
    }

    const startedAt = Date.now();
    let response = null;
    let testOk = false;
    let message = "Endpoint'e bağlantı kurulamadı.";

    try {
      response = await fetchWithTimeout(
        connectorRequest.url,
        {
          method: "HEAD",
          headers: connectorRequest.headers,
        },
        integrationTimeoutMs(env),
        fetchImpl,
      );

      testOk = response.status >= 200 && response.status < 300;

      if (testOk) {
        message = "Endpoint HEAD isteğine başarılı yanıt verdi.";
      } else if (response.status === 401 || response.status === 403) {
        message = "Endpoint kimlik doğrulamasını reddetti.";
      } else if (
        response.status === 405 ||
        response.status === 501
      ) {
        message = "Endpoint erişilebilir ancak HEAD yöntemi desteklenmiyor.";
      } else {
        message = `Endpoint HTTP ${response.status} yanıtı verdi.`;
      }
    } catch (error) {
      message =
        error?.name === "AbortError"
          ? "Bağlantı testi zaman aşımına uğradı."
          : "Endpoint'e bağlantı kurulamadı.";
    }

    const elapsedMs = Date.now() - startedAt;
    const testedAt = new Date().toISOString();

    const finalResponse = await supabaseRequest(
      env,
      token,
      `/rest/v1/warehouse_integrations?id=eq.${input.integrationId}&account_id=eq.${row.account_id}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          status: testOk
            ? (row.status === "inactive" ? "inactive" : "draft")
            : "error",
          last_test_at: testedAt,
          last_error: testOk ? null : message,
          updated_at: testedAt,
        }),
      },
      fetchImpl,
    );

    const finalPayload = await readJsonSafely(finalResponse);

    if (!finalResponse.ok) {
      return corsJsonError(
        500,
        API_ERROR_CODES.INTERNAL_ERROR,
        "Test sonucu entegrasyon kaydına yazılamadı.",
      );
    }

    if (!Array.isArray(finalPayload) || !finalPayload[0]) {
      return corsJsonError(
        404,
        API_ERROR_CODES.NOT_FOUND,
        "Test edilen entegrasyon bulunamadı.",
      );
    }

    return corsJson(
      apiSuccessBody({
        integrationId: input.integrationId,
        connectionTest: {
          ok: testOk,
          method: "HEAD",
          httpStatus: response?.status ?? null,
          elapsedMs,
          testedAt,
          message,
        },
      }),
      200,
    );
  }

  if (action === "set-credential") {
    const normalized =
      normalizeCredentialInput(
        body.value,
      );

    if (!normalized.ok) {
      return corsJsonError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        `Credential isteği geçersiz: ${normalized.reason}`,
      );
    }

    const input = normalized.value;

    const integration =
      await loadIntegration(
        env,
        token,
        input.integrationId,
        fetchImpl,
      );

    if (!integration.ok) {
      return corsJsonError(
        integration.status || 500,
        integration.reason ===
          "integration_missing"
          ? API_ERROR_CODES.NOT_FOUND
          : API_ERROR_CODES.INTERNAL_ERROR,
        integration.reason ===
          "integration_missing"
          ? "Entegrasyon bulunamadı."
          : "Entegrasyon doğrulanamadı.",
      );
    }

    const authorization =
      await authorizeAccount(
        env,
        token,
        auth.user.id,
        integration.row.account_id,
        WRITE_ROLES,
        fetchImpl,
      );

    if (!authorization.ok) {
      return authorization.response;
    }

    if (
      integration.row.status === "active" ||
      integration.row.status === "testing"
    ) {
      return corsJsonError(
        409,
        API_ERROR_CODES.CONFLICT,
        "Aktif entegrasyonda veya devam eden bağlantı testinde credential değiştirilemez.",
      );
    }

    const rpc = await invokeRpc(
      env,
      token,
      "warehouse_integration_set_credential",
      {
        p_integration_id: input.integrationId,
        p_secret: input.secret,
        p_name: input.name ?? null,
        p_description: input.description ?? null,
      },
      fetchImpl,
    );
    if (!rpc.ok) {
      const mapped = mapDatabaseError(
        rpc,
        rpc.payload,
      );

      return corsJsonError(
        mapped.status,
        rpc.status === 403
          ? API_ERROR_CODES.FORBIDDEN
          : API_ERROR_CODES.INTERNAL_ERROR,
        rpc.status === 403
          ? "Credential yönetimi için admin yetkisi gerekli."
          : "Entegrasyon credential bilgisi kaydedilemedi.",
      );
    }

    return corsJson(
      apiSuccessBody({
        integrationId:
          input.integrationId,
        hasCredential: true,
      }),
      200,
    );
  }

  if (action === "detach-credential") {
    if (
      !isPlainObject(body.value)
    ) {
      return corsJsonError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        "Credential isteği geçersiz.",
      );
    }

    const fieldCheck =
      rejectUnknownFields(
        body.value,
        new Set(["integrationId"]),
      );

    if (!fieldCheck.ok) {
      return corsJsonError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        "Credential isteği geçersiz: body_fields_invalid",
      );
    }

    const integrationId =
      normalizeUuid(
        body.value.integrationId,
      );

    if (!integrationId) {
      return corsJsonError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        "Credential isteği geçersiz: integration_id_invalid",
      );
    }

    const integration =
      await loadIntegration(
        env,
        token,
        integrationId,
        fetchImpl,
      );

    if (!integration.ok) {
      return corsJsonError(
        integration.status || 500,
        integration.reason ===
          "integration_missing"
          ? API_ERROR_CODES.NOT_FOUND
          : API_ERROR_CODES.INTERNAL_ERROR,
        integration.reason ===
          "integration_missing"
          ? "Entegrasyon bulunamadı."
          : "Entegrasyon doğrulanamadı.",
      );
    }

    const authorization =
      await authorizeAccount(
        env,
        token,
        auth.user.id,
        integration.row.account_id,
        WRITE_ROLES,
        fetchImpl,
      );

    if (!authorization.ok) {
      return authorization.response;
    }

    if (
      integration.row.status === "active" ||
      integration.row.status === "testing"
    ) {
      return corsJsonError(
        409,
        API_ERROR_CODES.CONFLICT,
        "Aktif entegrasyonda veya devam eden bağlantı testinde credential kaldırılamaz.",
      );
    }

    const rpc = await invokeRpc(
      env,
      token,
      "warehouse_integration_detach_credential",
      {
        p_integration_id: integrationId,
      },
      fetchImpl,
    );

    if (!rpc.ok) {
      return corsJsonError(
        rpc.status === 403
          ? 403
          : rpc.status >= 400 &&
              rpc.status < 500
            ? rpc.status
            : 500,
        rpc.status === 403
          ? API_ERROR_CODES.FORBIDDEN
          : API_ERROR_CODES.INTERNAL_ERROR,
        rpc.status === 403
          ? "Credential yönetimi için admin yetkisi gerekli."
          : "Entegrasyon credential bağlantısı kaldırılamadı.",
      );
    }

    return corsJson(
      apiSuccessBody({
        integrationId,
        hasCredential: false,
      }),
      200,
    );
  }

  if (action === "set-capability") {
    const normalized = normalizeCapabilityInput(body.value);

    if (!normalized.ok) {
      return corsJsonError(
        400,
        API_ERROR_CODES.VALIDATION_ERROR,
        `Entegrasyon yeteneği isteği geçersiz: ${normalized.reason}`,
      );
    }

    const input = normalized.value;
    const integration = await loadIntegration(
      env,
      token,
      input.integrationId,
      fetchImpl,
    );

    if (
      !integration.ok ||
      integration.row.account_id == null
    ) {
      return corsJsonError(
        404,
        API_ERROR_CODES.NOT_FOUND,
        "Entegrasyon bulunamadı.",
      );
    }

    const authorization = await authorizeAccount(
      env,
      token,
      auth.user.id,
      integration.row.account_id,
      WRITE_ROLES,
      fetchImpl,
    );

    if (!authorization.ok) {
      return authorization.response;
    }

    if (integration.row.status === "active") {
      return corsJsonError(
        409,
        API_ERROR_CODES.CONFLICT,
        "Aktif entegrasyonda capability değişimi öncesinde entegrasyonu pasife alın.",
      );
    }

    if (input.enabled) {
      if (
        integration.row.connector_key !== "custom_rest" ||
        !CUSTOM_REST_AUTH_TYPES.has(integration.row.auth_type) ||
        !integration.row.credential_secret_id
      ) {
        return corsJsonError(
          409,
          API_ERROR_CODES.CONFLICT,
          "shipment.write için uygulanmış custom_rest connector ve kayıtlı Vault credential gerekli.",
        );
      }

      const baseUrl = normalizeBaseUrl(integration.row.base_url);
      if (!baseUrl.ok || !baseUrl.value) {
        return corsJsonError(
          400,
          API_ERROR_CODES.VALIDATION_ERROR,
          "shipment.write için güvenli HTTPS endpoint gerekli.",
        );
      }

      const connector = await loadConnector(
        env,
        token,
        integration.row.connector_key,
        fetchImpl,
      );

      if (
        !connector.ok ||
        connector.row.implementation_status !== "available"
      ) {
        return corsJsonError(
          409,
          API_ERROR_CODES.CONFLICT,
          "Entegrasyon connector'ı kullanıma hazır değil.",
        );
      }
    }

    const response = await supabaseRequest(
      env,
      token,
      "/rest/v1/warehouse_integration_capabilities?on_conflict=integration_id%2Ccapability_key",
      {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          integration_id: input.integrationId,
          capability_key: input.capabilityKey,
          enabled: input.enabled,
          updated_at: new Date().toISOString(),
        }),
      },
      fetchImpl,
    );

    const payload = await readJsonSafely(response);

    if (!response.ok) {
      const mapped = mapDatabaseError(response, payload);

      return corsJsonError(
        mapped.status,
        mapped.status === 409
          ? API_ERROR_CODES.CONFLICT
          : API_ERROR_CODES.INTERNAL_ERROR,
        mapped.message,
      );
    }

    const row =
      Array.isArray(payload) && payload[0]
        ? payload[0]
        : null;

    if (!row) {
      return corsJsonError(
        500,
        API_ERROR_CODES.INTERNAL_ERROR,
        "Entegrasyon yeteneği kaydedilemedi.",
      );
    }

    return corsJson(
      apiSuccessBody({
        capability: {
          id: row.id,
          integration_id: row.integration_id,
          capability_key: row.capability_key,
          enabled: row.enabled === true,
          updated_at: row.updated_at ?? null,
        },
      }),
      200,
    );
  }

  if (action !== "create") {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      "Desteklenmeyen entegrasyon işlemi.",
    );
  }

  const normalized =
    normalizeCreateInput(
      body.value,
    );

  if (!normalized.ok) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      `Entegrasyon oluşturma isteği geçersiz: ${normalized.reason}`,
    );
  }

  const input = normalized.value;

  const authorization =
    await authorizeAccount(
      env,
      token,
      auth.user.id,
      input.accountId,
      WRITE_ROLES,
      fetchImpl,
    );

  if (!authorization.ok) {
    return authorization.response;
  }

  const connector =
    await loadConnector(
      env,
      token,
      input.connectorKey,
      fetchImpl,
    );

  if (!connector.ok) {
    return corsJsonError(
      connector.status >= 400 &&
        connector.status < 500
        ? connector.status
        : 500,
      connector.status === 400
        ? API_ERROR_CODES.VALIDATION_ERROR
        : API_ERROR_CODES.INTERNAL_ERROR,
      connector.status === 400
        ? "Entegrasyon sağlayıcısı bulunamadı."
        : "Entegrasyon sağlayıcısı doğrulanamadı.",
    );
  }

  if (
    input.connectorKey !== "custom_rest" ||
    connector.row.implementation_status !== "available"
  ) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      "Bu entegrasyon connector'ı henüz uygulama aşamasında.",
    );
  }

  const response =
    await supabaseRequest(
      env,
      token,
      "/rest/v1/warehouse_integrations",
      {
        method: "POST",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          account_id: input.accountId,
          name: input.name,
          connector_key:
            input.connectorKey,
          provider_name:
            input.providerName,
          status: "draft",
          auth_type: input.authType,
          base_url: input.baseUrl,
          config: input.config,
        }),
      },
      fetchImpl,
    );

  const payload =
    await readJsonSafely(response);

  if (!response.ok) {
    const mapped = mapDatabaseError(
      response,
      payload,
    );

    return corsJsonError(
      mapped.status,
      mapped.status === 409
        ? API_ERROR_CODES.CONFLICT
        : API_ERROR_CODES.INTERNAL_ERROR,
      mapped.message,
    );
  }

  const row =
    Array.isArray(payload) && payload[0]
      ? payload[0]
      : null;

  return corsJson(
    apiSuccessBody({
      integration: row
        ? sanitizeIntegration(row)
        : null,
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

  const normalized =
    normalizeUpdateInput(
      body.value,
    );

  if (!normalized.ok) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      `Entegrasyon güncelleme isteği geçersiz: ${normalized.reason}`,
    );
  }

  const input = normalized.value;

  const authorization =
    await authorizeAccount(
      env,
      token,
      auth.user.id,
      input.accountId,
      WRITE_ROLES,
      fetchImpl,
    );

  if (!authorization.ok) {
    return authorization.response;
  }

  const currentIntegration = await loadIntegration(
    env,
    token,
    input.integrationId,
    fetchImpl,
  );

  if (
    !currentIntegration.ok ||
    currentIntegration.row.account_id !== input.accountId
  ) {
    return corsJsonError(
      404,
      API_ERROR_CODES.NOT_FOUND,
      "Entegrasyon bulunamadı.",
    );
  }

  const settingsChanged = [
    "connector_key",
    "auth_type",
    "base_url",
    "config",
  ].some((key) =>
    Object.prototype.hasOwnProperty.call(input.patch, key),
  );

  if (
    currentIntegration.row.status === "active" &&
    input.patch.status !== "inactive" &&
    input.patch.status !== "draft"
  ) {
    return corsJsonError(
      409,
      API_ERROR_CODES.CONFLICT,
      "Aktif entegrasyon ayarlarını değiştirmeden önce entegrasyonu pasife alın.",
    );
  }

  const effectiveConnectorKey =
    input.patch.connector_key ??
    currentIntegration.row.connector_key;

  const effectiveAuthType =
    input.patch.auth_type ??
    currentIntegration.row.auth_type;

  const effectiveBaseUrl =
    input.patch.base_url !== undefined
      ? input.patch.base_url
      : currentIntegration.row.base_url;

  const effectiveBaseUrlResult =
    normalizeBaseUrl(effectiveBaseUrl);

  if (!effectiveBaseUrlResult.ok) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      "Entegrasyon URL adresi güvenlik doğrulamasından geçmedi.",
    );
  }

  if (
    effectiveConnectorKey !== "custom_rest"
  ) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      "Bu entegrasyon connector'ı henüz uygulanmadı.",
    );
  }

  if (!CUSTOM_REST_AUTH_TYPES.has(effectiveAuthType)) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      "Bu REST connector için yalnız none, bearer veya api_key kimlik doğrulaması destekleniyor.",
    );
  }

  if (input.patch.connector_key) {
    const connector =
      await loadConnector(
        env,
        token,
        input.patch.connector_key,
        fetchImpl,
      );

    if (!connector.ok) {
      return corsJsonError(
        connector.status >= 400 &&
          connector.status < 500
          ? connector.status
          : 500,
        connector.status === 400
          ? API_ERROR_CODES.VALIDATION_ERROR
          : API_ERROR_CODES.INTERNAL_ERROR,
        connector.status === 400
          ? "Entegrasyon sağlayıcısı bulunamadı."
          : "Entegrasyon sağlayıcısı doğrulanamadı.",
      );
    }
  }

  const response =
    await supabaseRequest(
      env,
      token,
      `/rest/v1/warehouse_integrations?id=eq.${input.integrationId}&account_id=eq.${input.accountId}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          ...input.patch,
          ...(settingsChanged
            ? {
                last_test_at: null,
                last_error:
                  "Bağlantı ayarları değişti; yeniden test edin.",
                ...(
                  currentIntegration.row.status !== "inactive" &&
                  input.patch.status !== "inactive"
                    ? { status: "draft" }
                    : {}
                ),
              }
            : {}),
          updated_at: new Date().toISOString(),
        }),
      },
      fetchImpl,
    );

  const payload =
    await readJsonSafely(response);

  if (!response.ok) {
    const mapped = mapDatabaseError(
      response,
      payload,
    );

    return corsJsonError(
      mapped.status,
      mapped.status === 409
        ? API_ERROR_CODES.CONFLICT
        : API_ERROR_CODES.INTERNAL_ERROR,
      mapped.message,
    );
  }

  const row =
    Array.isArray(payload) && payload[0]
      ? payload[0]
      : null;

  if (!row) {
    return corsJsonError(
      404,
      API_ERROR_CODES.NOT_FOUND,
      "Entegrasyon bulunamadı.",
    );
  }

  return corsJson(
    apiSuccessBody({
      integration:
        sanitizeIntegration(row),
    }),
    200,
  );
}

export async function onRequestDelete(context) {
  const authenticated = await authenticate(context);

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
  const integrationId = normalizeUuid(
    url.searchParams.get("integrationId"),
  );

  if (!accountId || !integrationId) {
    return corsJsonError(
      400,
      API_ERROR_CODES.VALIDATION_ERROR,
      "accountId ve integrationId geçerli UUID olmalıdır.",
    );
  }

  const authorization = await authorizeAccount(
    env,
    token,
    auth.user.id,
    accountId,
    WRITE_ROLES,
    fetchImpl,
  );

  if (!authorization.ok) {
    return authorization.response;
  }

  const response = await supabaseRequest(
    env,
    token,
    `/rest/v1/warehouse_integrations?id=eq.${integrationId}&account_id=eq.${accountId}`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status: "inactive",
        updated_at: new Date().toISOString(),
      }),
    },
    fetchImpl,
  );

  const payload = await readJsonSafely(response);

  if (!response.ok) {
    const mapped = mapDatabaseError(response, payload);

    return corsJsonError(
      mapped.status,
      mapped.status === 409
        ? API_ERROR_CODES.CONFLICT
        : API_ERROR_CODES.INTERNAL_ERROR,
      mapped.message,
    );
  }

  const row =
    Array.isArray(payload) && payload[0]
      ? payload[0]
      : null;

  if (!row) {
    return corsJsonError(
      404,
      API_ERROR_CODES.NOT_FOUND,
      "Entegrasyon bulunamadı.",
    );
  }

  return corsJson(
    apiSuccessBody({
      integration: sanitizeIntegration(row),
      deactivated: true,
    }),
    200,
  );
}
