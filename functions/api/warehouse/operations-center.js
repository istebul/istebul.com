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


const LIVE_PERIOD_MS =
  24 * 60 * 60 * 1000;

function finiteNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function sumNumeric(rows, field) {
  return (rows || []).reduce(
    (total, row) =>
      total +
      (
        finiteNumber(
          row?.[field]
        ) ?? 0
      ),
    0
  );
}

function percent(
  numerator,
  denominator
) {
  const top =
    finiteNumber(numerator);

  const bottom =
    finiteNumber(denominator);

  if (
    top === null ||
    bottom === null ||
    bottom <= 0
  ) {
    return null;
  }

  return Math.round(
    (
      Math.max(
        0,
        Math.min(
          1,
          top / bottom
        )
      ) * 100
    ) * 100
  ) / 100;
}

function healthStatus(score) {
  const value =
    finiteNumber(score);

  if (value === null) {
    return null;
  }

  if (value >= 85) {
    return "healthy";
  }

  if (value >= 65) {
    return "attention";
  }

  return "critical";
}

export function buildLiveSnapshot({
  accountId,
  warehouseId = null,
  periodStart,
  periodEnd,
  generatedAt,
  pickings = [],
  pickingItems = [],
  taskRows = [],
  cycleCountItems = [],
  locations = [],
  inventoryBalances = []
}) {
  const capacityLocations =
    new Map();

  for (const location of locations) {
    const capacity =
      finiteNumber(
        location?.maximum_unit_count
      );

    if (
      capacity !== null &&
      capacity > 0 &&
      location?.id
    ) {
      capacityLocations.set(
        location.id,
        capacity
      );
    }
  }

  const totalCapacity =
    [...capacityLocations.values()]
      .reduce(
        (total, value) =>
          total + value,
        0
      );

  const usedCapacity =
    inventoryBalances.reduce(
      (total, balance) => {
        if (
          !capacityLocations.has(
            balance?.location_id
          )
        ) {
          return total;
        }

        return total +
          (
            finiteNumber(
              balance?.quantity
            ) ?? 0
          );
      },
      0
    );

  const completedPickings =
    pickings.filter(
      (row) =>
        row?.status ===
          "completed"
    );

  const completedTasks =
    taskRows.filter(
      (row) =>
        row?.status ===
          "completed"
    );

  const exceptionTasks =
    taskRows.filter(
      (row) =>
        row?.status ===
          "exception"
    );

  const completedCounts =
    cycleCountItems.filter(
      (row) =>
        finiteNumber(
          row?.final_count_quantity
        ) !== null
    );

  const accurateCounts =
    completedCounts.filter(
      (row) => {
        const expected =
          finiteNumber(
            row?.expected_quantity
          );

        const actual =
          finiteNumber(
            row?.final_count_quantity
          );

        const tolerance =
          finiteNumber(
            row?.tolerance_quantity
          ) ?? 0;

        if (
          expected === null ||
          actual === null
        ) {
          return false;
        }

        return (
          Math.abs(
            actual - expected
          ) <= tolerance
        );
      }
    );

  const requestedItems =
    sumNumeric(
      pickingItems,
      "requested_quantity"
    );

  const fulfilledItems =
    sumNumeric(
      pickingItems,
      "picked_quantity"
    );

  const shortItems =
    sumNumeric(
      pickingItems,
      "short_quantity"
    );

  const hasData =
    pickings.length > 0 ||
    pickingItems.length > 0 ||
    taskRows.length > 0 ||
    completedCounts.length > 0 ||
    capacityLocations.size > 0 ||
    inventoryBalances.length > 0;

  if (!hasData) {
    return null;
  }

  const orderCompletionRate =
    percent(
      completedPickings.length,
      pickings.length
    );

  const taskCompletionRate =
    percent(
      completedTasks.length,
      taskRows.length
    );

  const taskExceptionRate =
    percent(
      exceptionTasks.length,
      taskRows.length
    );

  const inventoryAccuracyRate =
    percent(
      accurateCounts.length,
      completedCounts.length
    );

  const capacityUtilizationRate =
    totalCapacity > 0
      ? percent(
          usedCapacity,
          totalCapacity
        )
      : null;

  const itemFulfillmentRate =
    percent(
      fulfilledItems,
      requestedItems
    );

  const shortPickRate =
    percent(
      shortItems,
      requestedItems
    );

  const healthInputs = [
    orderCompletionRate,
    taskCompletionRate,
    inventoryAccuracyRate,
    itemFulfillmentRate
  ].filter(
    (value) =>
      value !== null
  );

  const healthScore =
    healthInputs.length > 0
      ? Math.round(
          (
            healthInputs.reduce(
              (total, value) =>
                total + value,
              0
            ) /
            healthInputs.length
          ) * 100
        ) / 100
      : null;

  return {
    id:
      `live:${accountId}:` +
      `${warehouseId || "all"}:` +
      `${generatedAt}`,

    account_id:
      accountId,

    warehouse_id:
      warehouseId || null,

    period_start:
      periodStart,

    period_end:
      periodEnd,

    total_orders:
      pickings.length,

    completed_orders:
      completedPickings.length,

    on_time_orders:
      null,

    delayed_orders:
      null,

    total_tasks:
      taskRows.length,

    completed_tasks:
      completedTasks.length,

    exception_tasks:
      exceptionTasks.length,

    total_inventory_checks:
      completedCounts.length,

    accurate_inventory_checks:
      accurateCounts.length,

    used_capacity:
      totalCapacity > 0
        ? usedCapacity
        : null,

    total_capacity:
      totalCapacity > 0
        ? totalCapacity
        : null,

    productive_minutes:
      null,

    available_labor_minutes:
      null,

    requested_items:
      requestedItems,

    fulfilled_items:
      fulfilledItems,

    short_items:
      shortItems,

    order_completion_rate:
      orderCompletionRate,

    on_time_dispatch_rate:
      null,

    task_completion_rate:
      taskCompletionRate,

    task_exception_rate:
      taskExceptionRate,

    inventory_accuracy_rate:
      inventoryAccuracyRate,

    capacity_utilization_rate:
      capacityUtilizationRate,

    labor_utilization_rate:
      null,

    item_fulfillment_rate:
      itemFulfillmentRate,

    short_pick_rate:
      shortPickRate,

    health_score:
      healthScore,

    health_status:
      healthStatus(
        healthScore
      ),

    kpis: [],
    alerts: [],

    calculated_at:
      generatedAt
  };
}

async function optionalRows(
  env,
  token,
  table,
  params,
  fetchImpl
) {
  try {
    return await rows(
      env,
      token,
      table,
      params,
      fetchImpl
    );
  } catch (error) {
    logApiEvent(
      "warn",
      "warehouse_operations_live_source_unavailable",
      {
        table,
        message:
          error instanceof Error
            ? error.message
            : String(error)
      }
    );

    return [];
  }
}

function scopedLiveParams({
  accountId,
  warehouseId,
  select,
  periodStart,
  timeColumn = "created_at",
  warehouseScoped = true,
  currentState = false
}) {
  if (
    warehouseId &&
    !warehouseScoped
  ) {
    return null;
  }

  const params = {
    select,
    account_id:
      `eq.${accountId}`,
    limit: "1000"
  };

  if (warehouseId) {
    params.warehouse_id =
      `eq.${warehouseId}`;
  }

  if (!currentState) {
    params[timeColumn] =
      `gte.${periodStart}`;

    params.order =
      `${timeColumn}.desc`;
  }

  return params;
}

async function loadLiveOperationsSnapshot({
  env,
  token,
  accountId,
  warehouseId,
  generatedAt,
  fetchImpl
}) {
  const periodEnd =
    generatedAt;

  const periodStart =
    new Date(
      new Date(
        generatedAt
      ).getTime() -
      LIVE_PERIOD_MS
    ).toISOString();

  const read = (
    table,
    select,
    options = {}
  ) => {
    const params =
      scopedLiveParams({
        accountId,
        warehouseId,
        select,
        periodStart,
        ...options
      });

    if (!params) {
      return Promise.resolve([]);
    }

    return optionalRows(
      env,
      token,
      table,
      params,
      fetchImpl
    );
  };

  const [
    pickings,
    pickingItems,
    cycleCountItems,
    locations,
    inventoryBalances,
    receivingRows,
    putawayRows,
    qualityRows,
    packingRows,
    cycleCountRows,
    pickingTasks,
    cycleCountTasks,
    packingTasks,
    receivingTasks,
    putawayTasks,
    qualityTasks,
    operationExceptions
  ] = await Promise.all([
    read(
      "warehouse_pickings",
      "id,status,warehouse_id,created_at,completed_at"
    ),

    read(
      "warehouse_picking_items",
      "id,warehouse_id,requested_quantity,picked_quantity,short_quantity,created_at"
    ),

    read(
      "warehouse_cycle_count_items",
      "id,warehouse_id,expected_quantity,final_count_quantity,tolerance_quantity,status,created_at"
    ),

    read(
      "warehouse_locations",
      "id,warehouse_id,maximum_unit_count,status",
      {
        currentState: true
      }
    ),

    read(
      "warehouse_inventory_balances",
      "id,warehouse_id,location_id,quantity,updated_at",
      {
        currentState: true
      }
    ),

    read(
      "warehouse_receivings",
      "id,status,warehouse_id,created_at"
    ),

    read(
      "warehouse_putaways",
      "id,status,warehouse_id,created_at"
    ),

    read(
      "warehouse_quality_inspections",
      "id,status,warehouse_id,created_at"
    ),

    read(
      "warehouse_packings",
      "id,status,warehouse_id,created_at"
    ),

    read(
      "warehouse_cycle_counts",
      "id,status,warehouse_id,created_at"
    ),

    read(
      "warehouse_picking_tasks",
      "id,status,warehouse_id,created_at"
    ),

    read(
      "warehouse_cycle_count_tasks",
      "id,status,warehouse_id,created_at"
    ),

    read(
      "warehouse_packing_tasks",
      "id,status,warehouse_id,created_at"
    ),

    read(
      "warehouse_receiving_tasks",
      "id,status,created_at",
      {
        warehouseScoped: false
      }
    ),

    read(
      "warehouse_putaway_tasks",
      "id,status,created_at",
      {
        warehouseScoped: false
      }
    ),

    read(
      "warehouse_quality_tasks",
      "id,status,created_at",
      {
        warehouseScoped: false
      }
    ),

    read(
      "warehouse_operations_exceptions",
      "id,account_id,warehouse_id,process,category,code,severity,root_cause,description,occurred_at,resolved_at,resolution_note,delay_minutes,impacted_orders,impacted_tasks,impacted_items,created_at",
      {
        timeColumn:
          "occurred_at"
      }
    )
  ]);

  const taskRows = [
    ...pickingTasks,
    ...cycleCountTasks,
    ...packingTasks,
    ...receivingTasks,
    ...putawayTasks,
    ...qualityTasks
  ];

  const processGroups = [
    ["receiving", receivingRows],
    ["quality_control", qualityRows],
    ["putaway", putawayRows],
    ["picking", pickings],
    ["packing", packingRows],
    ["cycle_count", cycleCountRows]
  ];

  const processVolumes =
    processGroups
      .filter(
        ([, records]) =>
          records.length > 0
      )
      .map(
        ([process, records]) => ({
          process,
          operation_count:
            records.length,
          period_start:
            periodStart,
          period_end:
            periodEnd
        })
      );

  const snapshot =
    buildLiveSnapshot({
      accountId,
      warehouseId,
      periodStart,
      periodEnd,
      generatedAt,
      pickings,
      pickingItems,
      taskRows,
      cycleCountItems,
      locations,
      inventoryBalances
    });

  return {
    snapshot,
    processVolumes,
    exceptions:
      operationExceptions
  };
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

  const generatedAt =
    new Date().toISOString();

  const [
    snapshots,
    trend,
    live
  ] = await Promise.all([
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
    }, fetchImpl),

    loadLiveOperationsSnapshot({
      env,
      token,
      accountId,
      warehouseId,
      generatedAt,
      fetchImpl
    })
  ]);

  const persistedSnapshot =
    snapshots[0] ?? null;

  const snapshot =
    live.snapshot ??
    persistedSnapshot;

  const snapshotSource =
    live.snapshot
      ? "live"
      : persistedSnapshot
        ? "persisted"
        : "empty";

  let exceptions =
    live.snapshot
      ? live.exceptions
      : [];

  let processVolumes =
    live.snapshot
      ? live.processVolumes
      : [];

  if (
    !live.snapshot &&
    persistedSnapshot
  ) {
    const exceptionParams = {
      select: "id,account_id,warehouse_id,process,category,code,severity,root_cause,description,occurred_at,resolved_at,resolution_note,delay_minutes,impacted_orders,impacted_tasks,impacted_items,created_at",
      account_id: `eq.${accountId}`,
      occurred_at: `gte.${persistedSnapshot.period_start}`,
      and: `(occurred_at.lte.${persistedSnapshot.period_end})`,
      order: "occurred_at.desc",
      limit: "100"
    };

    if (warehouseId) {
      exceptionParams.warehouse_id =
        `eq.${warehouseId}`;
    }

    [
      exceptions,
      processVolumes
    ] = await Promise.all([
      rows(
        env,
        token,
        "warehouse_operations_exceptions",
        exceptionParams,
        fetchImpl
      ),

      rows(
        env,
        token,
        "warehouse_operations_process_volumes",
        {
          select:
            "process,operation_count,period_start,period_end",
          account_id:
            `eq.${accountId}`,
          warehouse_id,
          period_end:
            `gte.${persistedSnapshot.period_start}`,
          period_start:
            `lte.${persistedSnapshot.period_end}`,
          order:
            "process.asc"
        },
        fetchImpl
      )
    ]);
  }

  const normalizedTrend =
    [...trend].reverse();

  if (
    snapshotSource === "live" &&
    finiteNumber(
      snapshot?.health_score
    ) !== null
  ) {
    normalizedTrend.push(
      snapshot
    );
  }

  let copilot = null;

  if (
    snapshot &&
    snapshotSource === "persisted"
  ) {
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
      snapshotSource,
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
