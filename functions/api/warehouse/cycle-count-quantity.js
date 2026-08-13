const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTION =
  "record_quantity";

const RPC_PATH =
  "/rest/v1/rpc/warehouse_cycle_count_record_quantity_write";

const MAX_QUANTITY =
  999999999999.999999;

function normalizeText(
  value
) {
  return String(
    value ?? ""
  ).trim();
}

export function normalizeUuid(
  value
) {
  const normalized =
    normalizeText(
      value
    );

  return UUID.test(
    normalized
  )
    ? normalized
    : null;
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

  const token =
    value
      .slice(7)
      .trim();

  return token || null;
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
  object,
  allowed
) {
  return Object.keys(
    object
  ).every(
    (key) =>
      allowed.has(
        key
      )
  );
}

function normalizeScan(
  value
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      255
  ) {
    return null;
  }

  return normalized;
}

function normalizeNotes(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  if (
    normalized.length >
    1000
  ) {
    return undefined;
  }

  return normalized || null;
}

function normalizeQuantity(
  value
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    ) ||
    value < 0 ||
    value >
      MAX_QUANTITY
  ) {
    return null;
  }

  return value;
}

export function normalizeWriteRequest(
  body,
  requestId
) {
  const normalizedRequestId =
    normalizeUuid(
      requestId
    );

  if (
    !normalizedRequestId
  ) {
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

  if (!accountId) {
    return {
      ok: false,
      reason:
        "account_id_invalid"
    };
  }

  const warehouseId =
    normalizeUuid(
      body.warehouseId
    );

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

  if (!cycleCountId) {
    return {
      ok: false,
      reason:
        "cycle_count_id_invalid"
    };
  }

  const cycleCountItemId =
    normalizeUuid(
      body.payload
        .cycleCountItemId
    );

  if (
    !cycleCountItemId
  ) {
    return {
      ok: false,
      reason:
        "cycle_count_item_id_invalid"
    };
  }

  const taskId =
    normalizeUuid(
      body.payload
        .taskId
    );

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
        "counted_quantity_invalid"
    };
  }

  const locationScan =
    normalizeScan(
      body.payload
        .locationScan
    );

  if (
    !locationScan
  ) {
    return {
      ok: false,
      reason:
        "location_scan_invalid"
    };
  }

  const productScan =
    normalizeScan(
      body.payload
        .productScan
    );

  if (
    !productScan
  ) {
    return {
      ok: false,
      reason:
        "product_scan_invalid"
    };
  }

  const notes =
    normalizeNotes(
      body.payload
        .notes
    );

  if (
    notes ===
    undefined
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
        notes
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
    !body?.id
  ) {
    return null;
  }

  return body;
}

async function executeQuantityWrite({
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
    ] || 500
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
    status >= 500
  ) {
    return "Sayım miktarı şu anda kaydedilemedi.";
  }

  const message =
    normalizeText(
      body?.message
    );

  return (
    message ||
    "Sayım miktarı kaydedilemedi."
  );
}

const INPUT_MESSAGES = {
  request_id_invalid:
    "Geçerli bir Idempotency-Key zorunludur.",

  body_invalid:
    "İstek gövdesi geçerli bir JSON nesnesi olmalıdır.",

  body_fields_invalid:
    "Sayım isteği desteklenmeyen üst seviye alan içeriyor.",

  action_invalid:
    "Bu Cycle Count işlemi desteklenmiyor.",

  account_id_invalid:
    "Firma kimliği geçersiz.",

  warehouse_id_invalid:
    "Depo kimliği geçersiz.",

  payload_invalid:
    "Sayım payloadı geçerli bir JSON nesnesi olmalıdır.",

  payload_fields_invalid:
    "Sayım payloadı desteklenmeyen alan içeriyor.",

  cycle_count_id_invalid:
    "Sayım kimliği geçersiz.",

  cycle_count_item_id_invalid:
    "Sayım satırı kimliği geçersiz.",

  task_id_invalid:
    "Sayım görevi kimliği geçersiz.",

  counted_quantity_invalid:
    "Sayılan miktar sıfır veya daha büyük geçerli bir sayı olmalıdır.",

  location_scan_invalid:
    "Doğrulanmış lokasyon taraması zorunludur.",

  product_scan_invalid:
    "Doğrulanmış ürün veya SKU taraması zorunludur.",

  notes_invalid:
    "Sayım notu en fazla 1000 karakter olmalıdır."
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
    env.fetch || fetch;

  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_ANON_KEY
  ) {
    return errorResponse(
      500,
      "CONFIGURATION_ERROR",
      "WarehouseIQ sayım servisi yapılandırılamadı.",
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
      "Sayım miktarı kaydetmek için oturum açmanız gerekir.",
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
    normalizeWriteRequest(
      body,
      request.headers.get(
        "Idempotency-Key"
      )
    );

  if (
    !normalized.ok
  ) {
    return errorResponse(
      400,
      "INVALID_REQUEST",
      INPUT_MESSAGES[
        normalized.reason
      ] ||
        "Sayım isteği geçersiz.",
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
      await executeQuantityWrite({
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
      "Sayım servisine şu anda ulaşılamıyor.",
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

  return jsonResponse(
    {
      ok: true,

      requestId:
        normalized.data
          .requestId,

      data:
        rpc.body
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
