const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTION =
  "record_recount_quantity";

const RPC_PATH =
  "/rest/v1/rpc/warehouse_cycle_count_record_recount_quantity_write";

const MAX_QUANTITY =
  999999999999.999999;

function normalizeText(
  value
) {
  return String(
    value ?? ""
  ).trim();
}

function isPlainObject(
  value
) {
  return Boolean(
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
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
      allowed.has(
        key
      )
  );
}

export function normalizeUuid(
  value
) {
  const normalized =
    normalizeText(
      value
    ).toLowerCase();

  return UUID_PATTERN.test(
    normalized
  )
    ? normalized
    : null;
}

function normalizeQuantity(
  value
) {
  if (
    value === null ||
    value === undefined ||
    typeof value ===
      "boolean" ||
    Array.isArray(
      value
    ) ||
    (
      typeof value ===
        "object"
    )
  ) {
    return null;
  }

  if (
    typeof value ===
      "string" &&
    !value.trim()
  ) {
    return null;
  }

  const quantity =
    Number(
      value
    );

  if (
    !Number.isFinite(
      quantity
    ) ||
    quantity < 0 ||
    quantity >
      MAX_QUANTITY
  ) {
    return null;
  }

  return quantity;
}

function normalizeRequiredText(
  value,
  maxLength
) {
  const normalized =
    normalizeText(
      value
    );

  if (
    !normalized ||
    normalized.length >
      maxLength
  ) {
    return null;
  }

  return normalized;
}

export function extractBearerToken(
  request
) {
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

export function normalizeRecountQuantityRequest(
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
    !isPlainObject(
      body
    )
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

  if (
    body.action !==
      ACTION
  ) {
    return {
      ok: false,
      reason:
        "action_invalid"
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
        "cycleCountItemId",
        "taskId",
        "countedQuantity",
        "locationScan",
        "productScan",
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

  const cycleCountItemId =
    normalizeUuid(
      body.payload
        .cycleCountItemId
    );

  const taskId =
    normalizeUuid(
      body.payload
        .taskId
    );

  if (!cycleCountId) {
    return {
      ok: false,
      reason:
        "cycle_count_id_invalid"
    };
  }

  if (!cycleCountItemId) {
    return {
      ok: false,
      reason:
        "cycle_count_item_id_invalid"
    };
  }

  if (!taskId) {
    return {
      ok: false,
      reason:
        "task_id_invalid"
    };
  }

  const countedQuantity =
    normalizeQuantity(
      body.payload
        .countedQuantity
    );

  if (
    countedQuantity ===
      null
  ) {
    return {
      ok: false,
      reason:
        "quantity_invalid"
    };
  }

  const locationScan =
    normalizeRequiredText(
      body.payload
        .locationScan,
      255
    );

  if (!locationScan) {
    return {
      ok: false,
      reason:
        "location_scan_invalid"
    };
  }

  const productScan =
    normalizeRequiredText(
      body.payload
        .productScan,
      255
    );

  if (!productScan) {
    return {
      ok: false,
      reason:
        "product_scan_invalid"
    };
  }

  const notes =
    normalizeText(
      body.payload
        .notes
    );

  if (
    notes.length >
      1000
  ) {
    return {
      ok: false,
      reason:
        "notes_invalid"
    };
  }

  return {
    ok: true,

    data: {
      requestId:
        normalizedRequestId,

      accountId,
      warehouseId,

      action:
        ACTION,

      payload: {
        cycleCountId,
        cycleCountItemId,
        taskId,
        countedQuantity,
        locationScan,
        productScan,

        notes:
          notes || null
      }
    }
  };
}

function corsHeaders(
  origin
) {
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
    JSON.stringify(
      body
    ),
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

function errorResponse(
  status,
  code,
  message,
  origin
) {
  return jsonResponse(
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

async function readJson(
  response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function authenticateUser({
  env,
  token,
  fetchImpl
}) {
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

  const body =
    await readJson(
      response
    );

  if (
    !response.ok ||
    !normalizeUuid(
      body?.id
    )
  ) {
    return null;
  }

  return body;
}

async function executeRecountQuantity({
  env,
  token,
  input,
  fetchImpl
}) {
  const response =
    await fetchImpl(
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

            p_cycle_count_item_id:
              input.payload
                .cycleCountItemId,

            p_task_id:
              input.payload
                .taskId,

            p_counted_quantity:
              input.payload
                .countedQuantity,

            p_location_scan:
              input.payload
                .locationScan,

            p_product_scan:
              input.payload
                .productScan,

            p_notes:
              input.payload
                .notes
          })
      }
    );

  return {
    response,

    body:
      await readJson(
        response
      )
  };
}

export function rpcErrorStatus(
  code
) {
  const statuses = {
    "28000": 401,
    "42501": 403,
    "P0002": 404,
    "23505": 409,
    "40001": 409,
    "22023": 422,
    "23514": 422,
    "22P02": 400
  };

  return (
    statuses[
      String(
        code ?? ""
      )
    ] ||
    500
  );
}

function errorCodeForStatus(
  status
) {
  if (status === 401) {
    return "UNAUTHORIZED";
  }

  if (status === 403) {
    return "FORBIDDEN";
  }

  if (status === 404) {
    return "NOT_FOUND";
  }

  if (status === 409) {
    return "CONFLICT";
  }

  if (status === 422) {
    return "VALIDATION_ERROR";
  }

  if (status === 400) {
    return "INVALID_REQUEST";
  }

  return "INTERNAL_ERROR";
}

function safeRpcMessage(
  status,
  body
) {
  if (
    status >=
      500
  ) {
    return "Yeniden sayım miktarı şu anda kaydedilemedi.";
  }

  return (
    normalizeText(
      body?.message
    ) ||
    "Yeniden sayım miktarı kaydedilemedi."
  );
}

function upstreamUuidMatches(
  value,
  expected
) {
  return (
    normalizeUuid(
      value
    ) ===
    expected
  );
}

export function sanitizeRecountQuantityResult(
  body,
  input
) {
  if (
    !isPlainObject(
      body
    )
  ) {
    return null;
  }

  if (
    body.action !==
      ACTION ||
    !upstreamUuidMatches(
      body.requestId,
      input.requestId
    ) ||
    !upstreamUuidMatches(
      body.accountId,
      input.accountId
    ) ||
    !upstreamUuidMatches(
      body.warehouseId,
      input.warehouseId
    ) ||
    !upstreamUuidMatches(
      body.cycleCountId,
      input.payload
        .cycleCountId
    ) ||
    !upstreamUuidMatches(
      body.cycleCountItemId,
      input.payload
        .cycleCountItemId
    ) ||
    !upstreamUuidMatches(
      body.taskId,
      input.payload
        .taskId
    )
  ) {
    return null;
  }

  if (
    body.status !==
      "recorded" ||
    body.itemStatus !==
      "recount_required" ||
    body.countStatus !==
      "recount_required" ||
    body.taskStatus !==
      "in_progress"
  ) {
    return null;
  }

  const countedQuantity =
    normalizeQuantity(
      body.countedQuantity
    );

  if (
    countedQuantity ===
      null ||
    countedQuantity !==
      input.payload
        .countedQuantity
  ) {
    return null;
  }

  const unit =
    normalizeRequiredText(
      body.unit,
      64
    );

  const recordedAt =
    normalizeText(
      body.recordedAt
    );

  if (
    !unit ||
    !recordedAt
  ) {
    return null;
  }

  return Object.freeze({
    status:
      "recorded",

    cycleCountId:
      input.payload
        .cycleCountId,

    cycleCountItemId:
      input.payload
        .cycleCountItemId,

    taskId:
      input.payload
        .taskId,

    countedQuantity,

    unit,

    itemStatus:
      "recount_required",

    countStatus:
      "recount_required",

    taskStatus:
      "in_progress",

    recordedAt
  });
}

const INPUT_MESSAGES = {
  request_id_invalid:
    "Geçerli bir Idempotency-Key zorunludur.",

  body_invalid:
    "İstek gövdesi geçerli bir JSON nesnesi olmalıdır.",

  body_fields_invalid:
    "Yeniden sayım isteği desteklenmeyen üst seviye alan içeriyor.",

  action_invalid:
    "Bu Cycle Count yeniden sayım işlemi desteklenmiyor.",

  account_id_invalid:
    "Firma kimliği geçersiz.",

  warehouse_id_invalid:
    "Depo kimliği geçersiz.",

  payload_invalid:
    "Yeniden sayım payloadı geçerli bir JSON nesnesi olmalıdır.",

  payload_fields_invalid:
    "Yeniden sayım payloadı desteklenmeyen alan içeriyor.",

  cycle_count_id_invalid:
    "Sayım kimliği geçersiz.",

  cycle_count_item_id_invalid:
    "Sayım satırı kimliği geçersiz.",

  task_id_invalid:
    "Yeniden sayım görevi kimliği geçersiz.",

  quantity_invalid:
    "Yeniden sayılan miktar sıfır veya daha büyük geçerli bir sayı olmalıdır.",

  location_scan_invalid:
    "Geçerli bir lokasyon barkodu veya kodu zorunludur.",

  product_scan_invalid:
    "Geçerli bir ürün veya SKU barkodu zorunludur.",

  notes_invalid:
    "Yeniden sayım notu 1000 karakteri aşamaz."
};

export async function onRequestPost(
  context
) {
  const {
    request,
    env
  } =
    context;

  const origin =
    request.headers.get(
      "Origin"
    ) || "";

  const fetchImpl =
    env.fetch ||
    fetch;

  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_ANON_KEY
  ) {
    return errorResponse(
      500,
      "CONFIGURATION_ERROR",
      "WarehouseIQ yeniden sayım servisi yapılandırılamadı.",
      origin
    );
  }

  const token =
    extractBearerToken(
      request
    );

  if (!token) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Yeniden sayım miktarı için oturum açmanız gerekir.",
      origin
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Geçerli bir JSON isteği gönderilmelidir.",
      origin
    );
  }

  const normalized =
    normalizeRecountQuantityRequest(
      body,
      request.headers.get(
        "Idempotency-Key"
      )
    );

  if (!normalized.ok) {
    return errorResponse(
      400,
      "INVALID_REQUEST",
      INPUT_MESSAGES[
        normalized.reason
      ] ||
      "Yeniden sayım isteği geçersiz.",
      origin
    );
  }

  let user;

  try {
    user =
      await authenticateUser({
        env,
        token,
        fetchImpl
      });
  } catch {
    return errorResponse(
      502,
      "AUTH_UPSTREAM_UNAVAILABLE",
      "WarehouseIQ oturum servisine şu anda ulaşılamıyor.",
      origin
    );
  }

  if (!user) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "WarehouseIQ oturumunuz doğrulanamadı.",
      origin
    );
  }

  let rpc;

  try {
    rpc =
      await executeRecountQuantity({
        env,
        token,
        input:
          normalized.data,
        fetchImpl
      });
  } catch {
    return errorResponse(
      502,
      "UPSTREAM_UNAVAILABLE",
      "Yeniden sayım servisine şu anda ulaşılamıyor.",
      origin
    );
  }

  if (
    !rpc.response.ok
  ) {
    const status =
      rpcErrorStatus(
        rpc.body?.code
      );

    return errorResponse(
      status,
      errorCodeForStatus(
        status
      ),
      safeRpcMessage(
        status,
        rpc.body
      ),
      origin
    );
  }

  const safeData =
    sanitizeRecountQuantityResult(
      rpc.body,
      normalized.data
    );

  if (!safeData) {
    return errorResponse(
      502,
      "INVALID_UPSTREAM_RESPONSE",
      "Yeniden sayım servisi geçerli bir sonuç döndürmedi.",
      origin
    );
  }

  return jsonResponse(
    {
      ok: true,

      requestId:
        normalized.data
          .requestId,

      data:
        safeData
    },
    200,
    origin
  );
}

export function onRequestOptions({
  request
}) {
  const origin =
    request.headers.get(
      "Origin"
    ) || "";

  return new Response(
    null,
    {
      status: 204,

      headers:
        corsHeaders(
          origin
        )
    }
  );
}
