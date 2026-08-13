import {
  isAllowedOrigin,
} from "../../_shared/cors-origins.js";
import {
  API_ERROR_CODES,
  logApiEvent,
} from "../../_shared/api-response.js";
import {
  buildCorsJsonHeaders,
  corsJson,
  corsJsonError,
} from "../../_shared/cors-json.js";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTIVE_TASK_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
];

export const CYCLE_COUNT_ITEM_SELECT = [
  "id",
  "cycle_count_id",
  "line_number",
  "warehouse_id",
  "location_id",
  "product_id",
  "sku_id",
  "stock_status",
  "tracking",
  "unit",
  "status",
  "blind_count",
  "recount_required",
  "adjustment_required",
  "counted_at",
  "recounted_at",
  "approved_at",
  "created_at",
  "updated_at",
].join(",");

const CYCLE_COUNT_SELECT = [
  "id",
  "cycle_count_number",
  "warehouse_id",
  "strategy",
  "status",
  "reference_type",
  "reference_number",
  "blind_count",
  "freeze_inventory",
  "priority",
  "planned_at",
  "released_at",
  "started_at",
  "counted_at",
  "created_at",
  "updated_at",
].join(",");

const CYCLE_COUNT_TASK_SELECT = [
  "id",
  "cycle_count_id",
  "cycle_count_item_id",
  "warehouse_id",
  "location_id",
  "product_id",
  "type",
  "status",
  "priority",
  "sequence",
  "assigned_user_id",
  "assigned_team_id",
  "assigned_equipment_id",
  "planned_at",
  "started_at",
  "completed_at",
  "notes",
  "created_at",
  "updated_at",
].join(",");

const LOCATION_SELECT = [
  "id",
  "warehouse_id",
  "code",
  "full_code",
  "barcode",
  "name",
  "location_type",
  "status",
  "active",
].join(",");

const PRODUCT_SELECT = [
  "id",
  "code",
  "name",
  "status",
  "base_unit",
].join(",");

const SKU_SELECT = [
  "id",
  "product_id",
  "sku_code",
  "name",
  "unit",
  "active",
].join(",");

const BARCODE_SELECT = [
  "id",
  "product_id",
  "sku_id",
  "value",
  "type",
  "is_primary",
].join(",");


export function extractBearerToken(
  request,
) {
  const value =
    request.headers.get("Authorization") || "";

  if (!value.startsWith("Bearer ")) {
    return null;
  }

  return value.slice(7).trim() || null;
}

export function normalizeUuid(
  value,
) {
  const text =
    String(value ?? "").trim();

  return text && UUID.test(text)
    ? text
    : null;
}

export function selectAuthorizedAccount(
  memberships,
  requestedAccountId,
) {
  const active =
    (memberships ?? []).filter(
      (row) =>
        row?.status === "active" &&
        normalizeUuid(row.account_id),
    );

  if (!active.length) {
    return {
      ok: false,
      reason: "membership_missing",
    };
  }

  if (!requestedAccountId) {
    return {
      ok: true,
      membership: active[0],
    };
  }

  const membership =
    active.find(
      (row) =>
        row.account_id ===
        requestedAccountId,
    );

  return membership
    ? {
        ok: true,
        membership,
      }
    : {
        ok: false,
        reason: "account_forbidden",
      };
}

function corsHeaders(
  origin,
) {
  return buildCorsJsonHeaders(
    origin,
    {
      "Access-Control-Allow-Methods":
        "GET, OPTIONS",
      "Cache-Control":
        "private, no-store",
      Vary:
        "Authorization, Origin",
    },
  );
}

async function readJson(
  response,
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function getAuthenticatedUser(
  env,
  token,
  fetchImpl = fetch,
) {
  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_ANON_KEY
  ) {
    throw new Error(
      "Supabase kimlik doğrulama ayarları eksik.",
    );
  }

  const response =
    await fetchImpl(
      new URL(
        "/auth/v1/user",
        env.SUPABASE_URL,
      ),
      {
        headers: {
          apikey:
            env.SUPABASE_ANON_KEY,
          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  return response.ok
    ? readJson(response)
    : null;
}

function restUrl(
  env,
  table,
  params,
) {
  const url =
    new URL(
      `/rest/v1/${table}`,
      env.SUPABASE_URL,
    );

  Object.entries(params)
    .forEach(
      ([key, value]) => {
        if (
          value !== undefined &&
          value !== null
        ) {
          url.searchParams.set(
            key,
            String(value),
          );
        }
      },
    );

  return url;
}

async function rows(
  env,
  token,
  table,
  params,
  fetchImpl = fetch,
) {
  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_ANON_KEY
  ) {
    throw new Error(
      "Supabase bağlantı ayarları eksik.",
    );
  }

  const response =
    await fetchImpl(
      restUrl(
        env,
        table,
        params,
      ),
      {
        headers: {
          Accept:
            "application/json",
          apikey:
            env.SUPABASE_ANON_KEY,
          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  const body =
    await readJson(response);

  if (!response.ok) {
    throw new Error(
      `${table} verisi okunamadı: ${
        body?.message ||
        `HTTP ${response.status}`
      }`,
    );
  }

  return Array.isArray(body)
    ? body
    : [];
}

function uniqueIds(
  values,
) {
  return [
    ...new Set(
      (values ?? [])
        .map(normalizeUuid)
        .filter(Boolean),
    ),
  ];
}

function inFilter(
  values,
) {
  return `in.(${values.join(",")})`;
}

function buildTaskReadModel({
  tasks,
  counts,
  items,
  locations,
  products,
  skus,
  barcodes,
}) {
  const countById =
    new Map(
      counts.map(
        (count) => [
          count.id,
          count,
        ],
      ),
    );

  const itemById =
    new Map(
      items.map(
        (item) => [
          item.id,
          item,
        ],
      ),
    );

  const locationById =
    new Map(
      locations.map(
        (location) => [
          location.id,
          location,
        ],
      ),
    );

  const productById =
    new Map(
      products.map(
        (product) => [
          product.id,
          product,
        ],
      ),
    );

  const skuById =
    new Map(
      skus.map(
        (sku) => [
          sku.id,
          sku,
        ],
      ),
    );

  const barcodesByProduct =
    new Map();

  for (const barcode of barcodes) {
    const productId =
      normalizeUuid(
        barcode.product_id,
      );

    if (!productId) {
      continue;
    }

    const current =
      barcodesByProduct.get(
        productId,
      ) ?? [];

    current.push(barcode);

    barcodesByProduct.set(
      productId,
      current,
    );
  }

  return tasks
    .filter(
      (task) =>
        countById.has(
          task.cycle_count_id,
        ),
    )
    .map(
      (task) => {
        const item =
          task.cycle_count_item_id
            ? (
                itemById.get(
                  task.cycle_count_item_id,
                ) ?? null
              )
            : null;

        // Bağlı item varsa fiziksel kapsam için item,
        // task üzerindeki opsiyonel kopyalardan daha güçlü kaynaktır.
        const locationId =
          normalizeUuid(
            item?.location_id,
          ) ||
          normalizeUuid(
            task.location_id,
          );

        const productId =
          normalizeUuid(
            item?.product_id,
          ) ||
          normalizeUuid(
            task.product_id,
          );

        const skuId =
          normalizeUuid(
            item?.sku_id,
          );

        const skuCandidate =
          skuId
            ? (
                skuById.get(
                  skuId,
                ) ?? null
              )
            : null;

        const sku =
          skuCandidate &&
          (
            !productId ||
            skuCandidate.product_id ===
              productId
          )
            ? skuCandidate
            : null;

        const taskBarcodes =
          productId
            ? (
                barcodesByProduct
                  .get(productId) ??
                []
              ).filter(
                (barcode) =>
                  !barcode.sku_id ||
                  (
                    skuId &&
                    barcode.sku_id ===
                      skuId
                  ),
              )
            : [];

        return {
          ...task,

          cycleCount:
            countById.get(
              task.cycle_count_id,
            ) ?? null,

          item,

          location:
            locationId
              ? (
                  locationById.get(
                    locationId,
                  ) ?? null
                )
              : null,

          product:
            productId
              ? (
                  productById.get(
                    productId,
                  ) ?? null
                )
              : null,

          sku,

          barcodes:
            taskBarcodes,
        };
      },
    );
}

export async function loadCycleCountReadModel({
  env,
  token,
  user,
  requestedAccountId = null,
  requestedWarehouseId,
  fetchImpl = fetch,
}) {
  const memberships =
    await rows(
      env,
      token,
      "warehouse_users",
      {
        select:
          "account_id,role,status,created_at",
        user_id:
          `eq.${user.id}`,
        status:
          "eq.active",
        order:
          "created_at.asc",
      },
      fetchImpl,
    );

  const selected =
    selectAuthorizedAccount(
      memberships,
      requestedAccountId,
    );

  if (!selected.ok) {
    return selected;
  }

  const accountId =
    selected.membership.account_id;

  const [accounts, warehouses] =
    await Promise.all([
      rows(
        env,
        token,
        "warehouse_accounts",
        {
          select:
            "id,code,name,status,timezone,country_code",
          id:
            `eq.${accountId}`,
          limit:
            "1",
        },
        fetchImpl,
      ),

      rows(
        env,
        token,
        "warehouses",
        {
          select:
            "id,account_id,code,name,status,timezone",
          account_id:
            `eq.${accountId}`,
          status:
            "eq.active",
          order:
            "name.asc",
        },
        fetchImpl,
      ),
    ]);

  const account =
    accounts[0] ?? null;

  if (!account) {
    return {
      ok: false,
      reason: "account_missing",
    };
  }

  const warehouse =
    warehouses.find(
      (row) =>
        row.id ===
        requestedWarehouseId,
    ) ?? null;

  if (!warehouse) {
    return {
      ok: false,
      reason: "warehouse_forbidden",
    };
  }

  const tasks =
    await rows(
      env,
      token,
      "warehouse_cycle_count_tasks",
      {
        select:
          CYCLE_COUNT_TASK_SELECT,
        account_id:
          `eq.${accountId}`,
        warehouse_id:
          `eq.${requestedWarehouseId}`,
        status:
          `in.(${ACTIVE_TASK_STATUSES.join(",")})`,
        order:
          "priority.desc,sequence.asc,created_at.asc",
        limit:
          "250",
      },
      fetchImpl,
    );

  if (!tasks.length) {
    return {
      ok: true,
      data: {
        account: {
          ...account,
          role:
            selected.membership.role,
        },
        warehouse,
        selection: {
          accountId,
          warehouseId:
            requestedWarehouseId,
        },
        counts: [],
        items: [],
        tasks: [],
        summary: {
          activeTaskCount: 0,
          pendingTaskCount: 0,
          assignedTaskCount: 0,
          inProgressTaskCount: 0,
          recountRequiredItemCount: 0,
        },
        liveData: true,
        generatedAt:
          new Date().toISOString(),
      },
    };
  }

  const countIds =
    uniqueIds(
      tasks.map(
        (task) =>
          task.cycle_count_id,
      ),
    );

  const itemIds =
    uniqueIds(
      tasks.map(
        (task) =>
          task.cycle_count_item_id,
      ),
    );

  const countPromise =
    rows(
      env,
      token,
      "warehouse_cycle_counts",
      {
        select:
          CYCLE_COUNT_SELECT,
        account_id:
          `eq.${accountId}`,
        warehouse_id:
          `eq.${requestedWarehouseId}`,
        id:
          inFilter(countIds),
        order:
          "priority.desc,created_at.asc",
      },
      fetchImpl,
    );

  const itemPromise =
    itemIds.length
      ? rows(
          env,
          token,
          "warehouse_cycle_count_items",
          {
            select:
              CYCLE_COUNT_ITEM_SELECT,
            account_id:
              `eq.${accountId}`,
            warehouse_id:
              `eq.${requestedWarehouseId}`,
            id:
              inFilter(itemIds),
            order:
              "line_number.asc",
          },
          fetchImpl,
        )
      : Promise.resolve([]);

  const [
    counts,
    items,
  ] =
    await Promise.all([
      countPromise,
      itemPromise,
    ]);

  const locationIds =
    uniqueIds([
      ...tasks.map(
        (task) =>
          task.location_id,
      ),
      ...items.map(
        (item) =>
          item.location_id,
      ),
    ]);

  const productIds =
    uniqueIds([
      ...tasks.map(
        (task) =>
          task.product_id,
      ),
      ...items.map(
        (item) =>
          item.product_id,
      ),
    ]);

  const skuIds =
    uniqueIds(
      items.map(
        (item) =>
          item.sku_id,
      ),
    );

  const locationPromise =
    locationIds.length
      ? rows(
          env,
          token,
          "warehouse_locations",
          {
            select:
              LOCATION_SELECT,
            account_id:
              `eq.${accountId}`,
            warehouse_id:
              `eq.${requestedWarehouseId}`,
            id:
              inFilter(
                locationIds,
              ),
            order:
              "full_code.asc",
          },
          fetchImpl,
        )
      : Promise.resolve([]);

  const productPromise =
    productIds.length
      ? rows(
          env,
          token,
          "warehouse_products",
          {
            select:
              PRODUCT_SELECT,
            account_id:
              `eq.${accountId}`,
            id:
              inFilter(
                productIds,
              ),
            order:
              "name.asc",
          },
          fetchImpl,
        )
      : Promise.resolve([]);

  const skuPromise =
    skuIds.length
      ? rows(
          env,
          token,
          "warehouse_product_skus",
          {
            select:
              SKU_SELECT,
            account_id:
              `eq.${accountId}`,
            product_id:
              inFilter(
                productIds,
              ),
            id:
              inFilter(
                skuIds,
              ),
            order:
              "sku_code.asc",
          },
          fetchImpl,
        )
      : Promise.resolve([]);

  const barcodePromise =
    productIds.length
      ? rows(
          env,
          token,
          "warehouse_product_barcodes",
          {
            select:
              BARCODE_SELECT,
            account_id:
              `eq.${accountId}`,
            product_id:
              inFilter(
                productIds,
              ),
            active:
              "eq.true",
            order:
              "is_primary.desc,value.asc",
          },
          fetchImpl,
        )
      : Promise.resolve([]);

  const [
    locations,
    products,
    skus,
    barcodes,
  ] =
    await Promise.all([
      locationPromise,
      productPromise,
      skuPromise,
      barcodePromise,
    ]);

  const normalizedTasks =
    buildTaskReadModel({
      tasks,
      counts,
      items,
      locations,
      products,
      skus,
      barcodes,
    });

  return {
    ok: true,
    data: {
      account: {
        ...account,
        role:
          selected.membership.role,
      },
      warehouse,
      selection: {
        accountId,
        warehouseId:
          requestedWarehouseId,
      },
      counts,
      items,
      tasks:
        normalizedTasks,
      summary: {
        activeTaskCount:
          normalizedTasks.length,

        pendingTaskCount:
          normalizedTasks.filter(
            (task) =>
              task.status ===
              "pending",
          ).length,

        assignedTaskCount:
          normalizedTasks.filter(
            (task) =>
              task.status ===
              "assigned",
          ).length,

        inProgressTaskCount:
          normalizedTasks.filter(
            (task) =>
              task.status ===
              "in_progress",
          ).length,

        recountRequiredItemCount:
          items.filter(
            (item) =>
              item.recount_required ===
              true,
          ).length,
      },
      liveData: true,
      generatedAt:
        new Date().toISOString(),
    },
  };
}

export async function onRequestOptions(
  context,
) {
  const origin =
    context.request.headers.get(
      "Origin",
    );

  if (
    origin &&
    !isAllowedOrigin(origin)
  ) {
    return corsJsonError(
      403,
      API_ERROR_CODES.FORBIDDEN,
      "Bu kaynaktan erişime izin verilmiyor.",
      origin,
      undefined,
      corsHeaders(origin),
    );
  }

  return new Response(
    null,
    {
      status: 204,
      headers:
        corsHeaders(origin),
    },
  );
}

export async function onRequestGet(
  context,
) {
  const origin =
    context.request.headers.get(
      "Origin",
    );

  if (
    origin &&
    !isAllowedOrigin(origin)
  ) {
    return corsJsonError(
      403,
      API_ERROR_CODES.FORBIDDEN,
      "Bu kaynaktan erişime izin verilmiyor.",
      origin,
      undefined,
      corsHeaders(origin),
    );
  }

  const token =
    extractBearerToken(
      context.request,
    );

  if (!token) {
    return corsJsonError(
      401,
      API_ERROR_CODES.UNAUTHORIZED,
      "WarehouseIQ oturumu gerekli.",
      origin,
      undefined,
      corsHeaders(origin),
    );
  }

  try {
    const user =
      await getAuthenticatedUser(
        context.env,
        token,
        context.fetch ?? fetch,
      );

    if (!user?.id) {
      return corsJsonError(
        401,
        API_ERROR_CODES.UNAUTHORIZED,
        "WarehouseIQ oturumu geçersiz veya süresi dolmuş.",
        origin,
        undefined,
        corsHeaders(origin),
      );
    }

    const url =
      new URL(
        context.request.url,
      );

    const accountRaw =
      url.searchParams.get(
        "accountId",
      );

    const warehouseRaw =
      url.searchParams.get(
        "warehouseId",
      );

    const requestedAccountId =
      accountRaw === null
        ? null
        : normalizeUuid(
            accountRaw,
          );

    const requestedWarehouseId =
      warehouseRaw === null
        ? null
        : normalizeUuid(
            warehouseRaw,
          );

    if (
      accountRaw !== null &&
      !requestedAccountId
    ) {
      return corsJsonError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        "Firma kimliği geçerli bir UUID olmalıdır.",
        origin,
        undefined,
        corsHeaders(origin),
      );
    }

    if (warehouseRaw === null) {
      return corsJsonError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        "Depo kimliği zorunludur.",
        origin,
        undefined,
        corsHeaders(origin),
      );
    }

    if (!requestedWarehouseId) {
      return corsJsonError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        "Depo kimliği geçerli bir UUID olmalıdır.",
        origin,
        undefined,
        corsHeaders(origin),
      );
    }

    const result =
      await loadCycleCountReadModel({
        env:
          context.env,
        token,
        user,
        requestedAccountId,
        requestedWarehouseId,
        fetchImpl:
          context.fetch ?? fetch,
      });

    if (!result.ok) {
      const map = {
        membership_missing: [
          403,
          API_ERROR_CODES.FORBIDDEN,
          "WarehouseIQ için aktif firma üyeliğiniz bulunmuyor.",
        ],

        account_forbidden: [
          403,
          API_ERROR_CODES.FORBIDDEN,
          "Bu WarehouseIQ firmasına erişim yetkiniz bulunmuyor.",
        ],

        warehouse_forbidden: [
          403,
          API_ERROR_CODES.FORBIDDEN,
          "Bu depoya erişim yetkiniz bulunmuyor.",
        ],

        account_missing: [
          404,
          API_ERROR_CODES.NOT_FOUND,
          "WarehouseIQ firma kaydı bulunamadı.",
        ],
      };

      const [
        status,
        code,
        message,
      ] =
        map[result.reason] || [
          500,
          API_ERROR_CODES.INTERNAL_ERROR,
          "WarehouseIQ sayım erişimi doğrulanamadı.",
        ];

      return corsJsonError(
        status,
        code,
        message,
        origin,
        undefined,
        corsHeaders(origin),
      );
    }

    return corsJson(
      {
        ok: true,
        data:
          result.data,
      },
      200,
      origin,
      corsHeaders(origin),
    );
  } catch (error) {
    logApiEvent(
      "error",
      "warehouse_cycle_count_read_failed",
      {
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );

    return corsJsonError(
      500,
      API_ERROR_CODES.INTERNAL_ERROR,
      "WarehouseIQ sayım görevleri şu anda yüklenemedi.",
      origin,
      undefined,
      corsHeaders(origin),
    );
  }
}
