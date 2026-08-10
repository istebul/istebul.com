import { isAllowedOrigin } from "../../_shared/cors-origins.js";
import { API_ERROR_CODES, logApiEvent } from "../../_shared/api-response.js";
import { buildCorsJsonHeaders, corsJson, corsJsonError } from "../../_shared/cors-json.js";
import { buildWarehouseOperationsCopilotRuntime } from "../../_shared/warehouse-copilot-runtime.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function extractBearerToken(request) {
  const value = request.headers.get("Authorization") || "";
  if (!value.startsWith("Bearer ")) return null;
  return value.slice(7).trim() || null;
}

export function normalizeUuid(value) {
  const text = String(value ?? "").trim();
  return text && UUID.test(text) ? text : null;
}

export function selectAuthorizedAccount(memberships, requestedAccountId) {
  const active = (memberships ?? []).filter((row) =>
    row?.status === "active" && normalizeUuid(row.account_id)
  );

  if (!active.length) return { ok: false, reason: "membership_missing" };

  if (!requestedAccountId) {
    return { ok: true, membership: active[0] };
  }

  const membership = active.find((row) => row.account_id === requestedAccountId);
  return membership
    ? { ok: true, membership }
    : { ok: false, reason: "account_forbidden" };
}

function corsHeaders(origin) {
  return buildCorsJsonHeaders(origin, {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "private, no-store",
    Vary: "Authorization, Origin"
  });
}

async function readJson(response) {
  try { return await response.json(); } catch { return null; }
}

async function getAuthenticatedUser(env, token, fetchImpl = fetch) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase kimlik doğrulama ayarları eksik.");
  }

  const response = await fetchImpl(new URL("/auth/v1/user", env.SUPABASE_URL), {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  return response.ok ? readJson(response) : null;
}

function restUrl(env, table, params) {
  const url = new URL(`/rest/v1/${table}`, env.SUPABASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url;
}

async function rows(env, token, table, params, fetchImpl = fetch) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase bağlantı ayarları eksik.");
  }

  const response = await fetchImpl(restUrl(env, table, params), {
    headers: {
      Accept: "application/json",
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(`${table} verisi okunamadı: ${body?.message || `HTTP ${response.status}`}`);
  }
  return Array.isArray(body) ? body : [];
}

function warehouseFilter(warehouseId) {
  return warehouseId ? `eq.${warehouseId}` : "is.null";
}

export async function loadOperationsCenter({
  env,
  token,
  user,
  requestedAccountId = null,
  requestedWarehouseId = null,
  fetchImpl = fetch
}) {
  const memberships = await rows(env, token, "warehouse_users", {
    select: "account_id,role,status,created_at",
    user_id: `eq.${user.id}`,
    status: "eq.active",
    order: "created_at.asc"
  }, fetchImpl);

  const selected = selectAuthorizedAccount(memberships, requestedAccountId);
  if (!selected.ok) return selected;

  const accountId = selected.membership.account_id;

  const [accounts, warehouses] = await Promise.all([
    rows(env, token, "warehouse_accounts", {
      select: "id,code,name,status,timezone,country_code",
      id: `eq.${accountId}`,
      limit: "1"
    }, fetchImpl),
    rows(env, token, "warehouses", {
      select: "id,account_id,code,name,status,timezone",
      account_id: `eq.${accountId}`,
      status: "eq.active",
      order: "name.asc"
    }, fetchImpl)
  ]);

  const account = accounts[0] ?? null;
  if (!account) return { ok: false, reason: "account_missing" };

  if (requestedWarehouseId && !warehouses.some((row) => row.id === requestedWarehouseId)) {
    return { ok: false, reason: "warehouse_forbidden" };
  }

  const warehouseId = requestedWarehouseId || null;
  const warehouse_id = warehouseFilter(warehouseId);

  const [snapshots, trend] = await Promise.all([
    rows(env, token, "warehouse_operations_dashboard_snapshots", {
      select: "*",
      account_id: `eq.${accountId}`,
      warehouse_id,
      order: "calculated_at.desc",
      limit: "1"
    }, fetchImpl),
    rows(env, token, "warehouse_operations_dashboard_snapshots", {
      select: "*",
      account_id: `eq.${accountId}`,
      warehouse_id,
      order: "calculated_at.desc",
      limit: "7"
    }, fetchImpl)
  ]);

  const snapshot = snapshots[0] ?? null;
  let exceptions = [];
  let processVolumes = [];

  if (snapshot) {
    const exceptionParams = {
      select: "id,account_id,warehouse_id,process,category,code,severity,root_cause,description,occurred_at,resolved_at,resolution_note,delay_minutes,impacted_orders,impacted_tasks,impacted_items,created_at",
      account_id: `eq.${accountId}`,
      occurred_at: `gte.${snapshot.period_start}`,
      and: `(occurred_at.lte.${snapshot.period_end})`,
      order: "occurred_at.desc",
      limit: "100"
    };

    if (warehouseId) exceptionParams.warehouse_id = `eq.${warehouseId}`;

    [exceptions, processVolumes] = await Promise.all([
      rows(env, token, "warehouse_operations_exceptions", exceptionParams, fetchImpl),
      rows(env, token, "warehouse_operations_process_volumes", {
        select: "process,operation_count,period_start,period_end",
        account_id: `eq.${accountId}`,
        warehouse_id,
        period_end: `gte.${snapshot.period_start}`,
        period_start: `lte.${snapshot.period_end}`,
        order: "process.asc"
      }, fetchImpl)
    ]);
  }

  const normalizedTrend = [...trend].reverse();
  const generatedAt = new Date().toISOString();
  let copilot = null;

  if (snapshot) {
    try {
      copilot =
        await buildWarehouseOperationsCopilotRuntime({
          accountId,
          warehouseId,
          snapshot,
          trend: normalizedTrend,
          exceptions,
          processVolumes,
          generatedAt
        });
    } catch (error) {
      logApiEvent(
        "warn",
        "warehouse_operations_copilot_failed",
        {
          message:
            error instanceof Error
              ? error.message
              : String(error)
        }
      );
    }
  }

  return {
    ok: true,
    data: {
      account: { ...account, role: selected.membership.role },
      warehouses,
      selection: { accountId, warehouseId },
      snapshot,
      trend: normalizedTrend,
      exceptions,
      processVolumes,
      copilot,
      liveData: true,
      generatedAt
    }
  };
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get("Origin");
  if (origin && !isAllowedOrigin(origin)) {
    return corsJsonError(403, API_ERROR_CODES.FORBIDDEN, "Bu kaynaktan erişime izin verilmiyor.", origin, undefined, corsHeaders(origin));
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestGet(context) {
  const origin = context.request.headers.get("Origin");

  if (origin && !isAllowedOrigin(origin)) {
    return corsJsonError(403, API_ERROR_CODES.FORBIDDEN, "Bu kaynaktan erişime izin verilmiyor.", origin, undefined, corsHeaders(origin));
  }

  const token = extractBearerToken(context.request);
  if (!token) {
    return corsJsonError(401, API_ERROR_CODES.UNAUTHORIZED, "WarehouseIQ oturumu gerekli.", origin, undefined, corsHeaders(origin));
  }

  try {
    const user = await getAuthenticatedUser(context.env, token);
    if (!user?.id) {
      return corsJsonError(401, API_ERROR_CODES.UNAUTHORIZED, "WarehouseIQ oturumu geçersiz veya süresi dolmuş.", origin, undefined, corsHeaders(origin));
    }

    const url = new URL(context.request.url);
    const accountRaw = url.searchParams.get("accountId");
    const warehouseRaw = url.searchParams.get("warehouseId");
    const requestedAccountId = accountRaw === null ? null : normalizeUuid(accountRaw);
    const requestedWarehouseId = warehouseRaw === null ? null : normalizeUuid(warehouseRaw);

    if (accountRaw !== null && !requestedAccountId) {
      return corsJsonError(400, API_ERROR_CODES.BAD_REQUEST, "Firma kimliği geçerli bir UUID olmalıdır.", origin, undefined, corsHeaders(origin));
    }
    if (warehouseRaw !== null && !requestedWarehouseId) {
      return corsJsonError(400, API_ERROR_CODES.BAD_REQUEST, "Depo kimliği geçerli bir UUID olmalıdır.", origin, undefined, corsHeaders(origin));
    }

    const result = await loadOperationsCenter({
      env: context.env,
      token,
      user,
      requestedAccountId,
      requestedWarehouseId
    });

    if (!result.ok) {
      const map = {
        membership_missing: [403, API_ERROR_CODES.FORBIDDEN, "WarehouseIQ için aktif firma üyeliğiniz bulunmuyor."],
        account_forbidden: [403, API_ERROR_CODES.FORBIDDEN, "Bu WarehouseIQ firmasına erişim yetkiniz bulunmuyor."],
        warehouse_forbidden: [403, API_ERROR_CODES.FORBIDDEN, "Bu depoya erişim yetkiniz bulunmuyor."],
        account_missing: [404, API_ERROR_CODES.NOT_FOUND, "WarehouseIQ firma kaydı bulunamadı."]
      };
      const [status, code, message] = map[result.reason] || [500, API_ERROR_CODES.INTERNAL_ERROR, "WarehouseIQ erişimi doğrulanamadı."];
      return corsJsonError(status, code, message, origin, undefined, corsHeaders(origin));
    }

    return corsJson({ ok: true, data: result.data }, 200, origin, corsHeaders(origin));
  } catch (error) {
    logApiEvent("error", "warehouse_operations_center_failed", {
      message: error instanceof Error ? error.message : String(error)
    });
    return corsJsonError(500, API_ERROR_CODES.INTERNAL_ERROR, "WarehouseIQ operasyon verileri şu anda yüklenemedi.", origin, undefined, corsHeaders(origin));
  }
}
