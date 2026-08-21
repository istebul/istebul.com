const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTION =
  "create_from_packing";

const RPC =
  "/rest/v1/rpc/warehouse_shipping_create_from_packing_write";

const STRATEGIES = Object.freeze([
  "single_shipment",
  "multi_order",
  "consolidated",
  "direct_delivery",
  "cross_dock",
  "parcel",
  "less_than_truckload",
  "full_truckload",
  "milk_run",
  "route_optimized",
  "carrier_optimized",
  "cost_optimized",
  "service_level_optimized",
  "temperature_controlled",
  "hazardous_material"
]);

function text(value) {
  return String(value ?? "").trim();
}

function uuid(value) {
  const normalized =
    text(value).toLowerCase();

  return UUID.test(normalized)
    ? normalized
    : null;
}

function object(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function allowedKeys(value, keys) {
  return Object.keys(value).every(
    (key) => keys.has(key)
  );
}

export function extractBearerToken(request) {
  const header =
    request.headers.get("Authorization") || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
}

function timestamp(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return { ok: true, value: null };
  }

  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value))
  ) {
    return { ok: false, value: null };
  }

  return {
    ok: true,
    value: value.trim()
  };
}

export function normalizeShippingCreateRequest(
  body,
  requestId
) {
  const normalizedRequestId =
    uuid(requestId);

  if (!normalizedRequestId) {
    return {
      ok: false,
      reason: "request_id_invalid"
    };
  }

  if (!object(body)) {
    return {
      ok: false,
      reason: "body_invalid"
    };
  }

  if (
    !allowedKeys(
      body,
      new Set([
        "accountId",
        "action",
        "payload"
      ])
    )
  ) {
    return {
      ok: false,
      reason: "body_fields_invalid"
    };
  }

  if (body.action !== ACTION) {
    return {
      ok: false,
      reason: "action_invalid"
    };
  }

  const accountId =
    uuid(body.accountId);

  if (!accountId) {
    return {
      ok: false,
      reason: "account_id_invalid"
    };
  }

  if (!object(body.payload)) {
    return {
      ok: false,
      reason: "payload_invalid"
    };
  }

  if (
    !allowedKeys(
      body.payload,
      new Set([
        "packingId",
        "shippingLocationId",
        "strategy",
        "priority",
        "plannedAt",
        "expectedDeliveryAt",
        "notes"
      ])
    )
  ) {
    return {
      ok: false,
      reason: "payload_fields_invalid"
    };
  }

  const packingId =
    uuid(body.payload.packingId);

  const shippingLocationId =
    uuid(body.payload.shippingLocationId);

  if (!packingId) {
    return {
      ok: false,
      reason: "packing_id_invalid"
    };
  }

  if (!shippingLocationId) {
    return {
      ok: false,
      reason: "shipping_location_id_invalid"
    };
  }

  const strategy =
    text(
      body.payload.strategy ||
      "single_shipment"
    ).toLowerCase();

  if (!STRATEGIES.includes(strategy)) {
    return {
      ok: false,
      reason: "strategy_invalid"
    };
  }

  let priority = null;

  if (
    body.payload.priority !== undefined &&
    body.payload.priority !== null &&
    body.payload.priority !== ""
  ) {
    priority =
      Number(body.payload.priority);

    if (
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 100
    ) {
      return {
        ok: false,
        reason: "priority_invalid"
      };
    }
  }

  const plannedAt =
    timestamp(body.payload.plannedAt);

  if (!plannedAt.ok) {
    return {
      ok: false,
      reason: "planned_at_invalid"
    };
  }

  const expectedDeliveryAt =
    timestamp(
      body.payload.expectedDeliveryAt
    );

  if (!expectedDeliveryAt.ok) {
    return {
      ok: false,
      reason: "expected_delivery_at_invalid"
    };
  }

  let notes = null;

  if (
    body.payload.notes !== undefined &&
    body.payload.notes !== null &&
    body.payload.notes !== ""
  ) {
    if (
      typeof body.payload.notes !== "string"
    ) {
      return {
        ok: false,
        reason: "notes_invalid"
      };
    }

    notes =
      body.payload.notes.trim();

    if (notes.length > 4000) {
      return {
        ok: false,
        reason: "notes_invalid"
      };
    }

    notes ||= null;
  }

  return {
    ok: true,

    value: {
      requestId:
        normalizedRequestId,

      accountId,

      action:
        ACTION,

      payload: {
        packingId,
        shippingLocationId,
        strategy,
        priority,
        plannedAt:
          plannedAt.value,
        expectedDeliveryAt:
          expectedDeliveryAt.value,
        notes
      }
    }
  };
}

export function shippingRpcRequest(input) {
  return {
    path: RPC,

    body: {
      p_request_id:
        input.requestId,

      p_account_id:
        input.accountId,

      p_packing_id:
        input.payload.packingId,

      p_shipping_location_id:
        input.payload.shippingLocationId,

      p_strategy:
        input.payload.strategy,

      p_priority:
        input.payload.priority,

      p_planned_at:
        input.payload.plannedAt,

      p_expected_delivery_at:
        input.payload.expectedDeliveryAt,

      p_notes:
        input.payload.notes
    }
  };
}

export function rpcErrorStatus(code) {
  const map = {
    "28000": 401,
    "42501": 403,
    "P0002": 404,
    "23505": 409,
    "40001": 409,
    "22023": 422,
    "23514": 422,
    "22P02": 400
  };

  return map[String(code || "")] || 500;
}

function cors(origin) {
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

function json(
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

        ...cors(origin)
      }
    }
  );
}

function error(
  status,
  code,
  message,
  origin
) {
  return json(
    {
      ok: false,
      error: {
        code,
        message
      }
    },
    status,
    origin
  );
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function safeResult(
  body,
  input
) {
  if (
    !object(body) ||
    body.ok !== true ||
    body.action !== ACTION
  ) {
    return null;
  }

  if (
    uuid(body.requestId) !==
      input.requestId ||
    uuid(body.packingId) !==
      input.payload.packingId ||
    uuid(body.shippingLocationId) !==
      input.payload.shippingLocationId
  ) {
    return null;
  }

  const shippingId =
    uuid(body.shippingId);

  const warehouseId =
    uuid(body.warehouseId);

  const shippingNumber =
    text(body.shippingNumber);

  const status =
    text(body.status).toLowerCase();

  const itemCount =
    Number(body.itemCount);

  const packageCount =
    Number(body.packageCount);

  if (
    !shippingId ||
    !warehouseId ||
    !shippingNumber ||
    status !== "draft" ||
    !Number.isInteger(itemCount) ||
    itemCount < 0 ||
    !Number.isInteger(packageCount) ||
    packageCount < 0
  ) {
    return null;
  }

  return Object.freeze({
    action: ACTION,
    shippingId,
    shippingNumber,
    packingId:
      input.payload.packingId,
    warehouseId,
    shippingLocationId:
      input.payload.shippingLocationId,
    status,
    itemCount,
    packageCount
  });
}

export async function onRequestPost(context) {
  const {
    request,
    env
  } = context;

  const origin =
    request.headers.get("Origin") || "";

  const fetchImpl =
    context.fetch ?? fetch;

  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_ANON_KEY
  ) {
    return error(
      500,
      "CONFIGURATION_ERROR",
      "Sevkiyat servisi yapılandırılamadı.",
      origin
    );
  }

  const token =
    extractBearerToken(request);

  if (!token) {
    return error(
      401,
      "UNAUTHORIZED",
      "Sevkiyat oluşturmak için oturum açmanız gerekir.",
      origin
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return error(
      400,
      "INVALID_JSON",
      "Geçerli JSON gönderilmelidir.",
      origin
    );
  }

  const normalized =
    normalizeShippingCreateRequest(
      body,
      request.headers.get(
        "Idempotency-Key"
      )
    );

  if (!normalized.ok) {
    return error(
      400,
      "INVALID_REQUEST",
      "Sevkiyat isteği geçersiz.",
      origin
    );
  }

  let authResponse;

  try {
    authResponse =
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
  } catch {
    return error(
      502,
      "AUTH_UPSTREAM_UNAVAILABLE",
      "Oturum servisine ulaşılamıyor.",
      origin
    );
  }

  const authBody =
    await readJson(authResponse);

  if (
    !authResponse.ok ||
    !uuid(authBody?.id)
  ) {
    return error(
      401,
      "UNAUTHORIZED",
      "WarehouseIQ oturumu doğrulanamadı.",
      origin
    );
  }

  const rpc =
    shippingRpcRequest(
      normalized.value
    );

  let rpcResponse;

  try {
    rpcResponse =
      await fetchImpl(
        new URL(
          rpc.path,
          env.SUPABASE_URL
        ),
        {
          method: "POST",

          headers: {
            apikey:
              env.SUPABASE_ANON_KEY,

            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json"
          },

          body:
            JSON.stringify(
              rpc.body
            )
        }
      );
  } catch {
    return error(
      502,
      "UPSTREAM_UNAVAILABLE",
      "Sevkiyat servisine ulaşılamıyor.",
      origin
    );
  }

  const rpcBody =
    await readJson(rpcResponse);

  if (!rpcResponse.ok) {
    const status =
      rpcErrorStatus(
        rpcBody?.code
      );

    const code =
      status === 401
        ? "UNAUTHORIZED"
        : status === 403
          ? "FORBIDDEN"
          : status === 404
            ? "NOT_FOUND"
            : status === 409
              ? "CONFLICT"
              : status === 422
                ? "VALIDATION_ERROR"
                : status === 400
                  ? "INVALID_REQUEST"
                  : "INTERNAL_ERROR";

    return error(
      status,
      code,
      status >= 500
        ? "Sevkiyat oluşturulamadı."
        : text(rpcBody?.message) ||
          "Sevkiyat oluşturulamadı.",
      origin
    );
  }

  const data =
    safeResult(
      rpcBody,
      normalized.value
    );

  if (!data) {
    return error(
      502,
      "INVALID_UPSTREAM_RESPONSE",
      "Sevkiyat servisi geçerli sonuç döndürmedi.",
      origin
    );
  }

  return json(
    {
      ok: true,
      requestId:
        normalized.value.requestId,
      data
    },
    200,
    origin
  );
}

export function onRequestOptions({
  request
}) {
  const origin =
    request.headers.get("Origin") || "";

  return new Response(
    null,
    {
      status: 204,
      headers:
        cors(origin)
    }
  );
}
