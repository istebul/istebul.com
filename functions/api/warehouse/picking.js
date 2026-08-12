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
  "release",
  "create_task",
  "start",
  "execute_item",
  "complete",
  "resolve_exception",
]);

const PICKING_STRATEGIES = Object.freeze([
  "single_order",
  "batch",
  "wave",
  "zone",
  "cluster",
  "multi_order",
  "fifo",
  "fefo",
  "nearest_location",
  "route_optimized",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BODY_BYTES = 32 * 1024;

export function extractBearerToken(request) {
  const value =
    request.headers.get("Authorization") || "";

  if (!value.startsWith("Bearer ")) {
    return null;
  }

  const token =
    value.slice(7).trim();

  return token || null;
}

export function normalizeUuid(value) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  return UUID_PATTERN.test(normalized)
    ? normalized
    : null;
}

function optionalUuid(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      ok: true,
      value: undefined,
    };
  }

  const normalized =
    normalizeUuid(value);

  return normalized
    ? {
        ok: true,
        value: normalized,
      }
    : {
        ok: false,
      };
}

function optionalText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  return String(value).trim() || undefined;
}

export function normalizeWriteAction(value) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  return WRITE_ACTIONS.includes(normalized)
    ? normalized
    : null;
}

function normalizeStrategy(value) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  return PICKING_STRATEGIES.includes(normalized)
    ? normalized
    : null;
}

function normalizePositiveNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(number) &&
    number > 0
    ? number
    : null;
}

function normalizeNonNegativeNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(number) &&
    number >= 0
    ? number
    : null;
}

function normalizeIntegerRange(
  value,
  minimum,
  maximum,
) {
  const number =
    Number(value);

  return Number.isInteger(number) &&
    number >= minimum &&
    number <= maximum
    ? number
    : null;
}

function normalizeCreatePayload(payload) {
  const warehouseId =
    normalizeUuid(payload.warehouseId);

  if (!warehouseId) {
    return {
      ok: false,
      reason: "warehouse_id_invalid",
    };
  }

  const destinationLocationId =
    normalizeUuid(
      payload.destinationLocationId,
    );

  if (!destinationLocationId) {
    return {
      ok: false,
      reason:
        "destination_location_id_invalid",
    };
  }

  const strategy =
    normalizeStrategy(payload.strategy);

  if (!strategy) {
    return {
      ok: false,
      reason: "strategy_invalid",
    };
  }

  let priority;

  if (payload.priority !== undefined) {
    priority =
      normalizeIntegerRange(
        payload.priority,
        1,
        100,
      );

    if (priority === null) {
      return {
        ok: false,
        reason: "priority_invalid",
      };
    }
  }

  const wave =
    optionalUuid(payload.waveId);

  if (!wave.ok) {
    return {
      ok: false,
      reason: "wave_id_invalid",
    };
  }

  const batch =
    optionalUuid(payload.batchId);

  if (!batch.ok) {
    return {
      ok: false,
      reason: "batch_id_invalid",
    };
  }

  const referenceType =
    optionalText(payload.referenceType);

  const referenceId =
    optionalText(payload.referenceId);

  if (
    (referenceType === undefined) !==
    (referenceId === undefined)
  ) {
    return {
      ok: false,
      reason: "reference_pair_invalid",
    };
  }

  return {
    ok: true,
    payload: {
      warehouseId,
      destinationLocationId,
      strategy,
      ...(priority !== undefined
        ? { priority }
        : {}),
      ...(optionalText(payload.orderId)
        ? {
            orderId:
              optionalText(payload.orderId),
          }
        : {}),
      ...(optionalText(payload.orderNumber)
        ? {
            orderNumber:
              optionalText(
                payload.orderNumber,
              ),
          }
        : {}),
      ...(wave.value
        ? { waveId: wave.value }
        : {}),
      ...(batch.value
        ? { batchId: batch.value }
        : {}),
      ...(referenceType
        ? { referenceType }
        : {}),
      ...(referenceId
        ? { referenceId }
        : {}),
      ...(optionalText(
        payload.referenceNumber,
      )
        ? {
            referenceNumber:
              optionalText(
                payload.referenceNumber,
              ),
          }
        : {}),
      ...(optionalText(payload.plannedAt)
        ? {
            plannedAt:
              optionalText(
                payload.plannedAt,
              ),
          }
        : {}),
      ...(optionalText(payload.notes)
        ? {
            notes:
              optionalText(payload.notes),
          }
        : {}),
    },
  };
}

function normalizeAddItemPayload(payload) {
  const pickingId =
    normalizeUuid(payload.pickingId);

  if (!pickingId) {
    return {
      ok: false,
      reason: "picking_id_invalid",
    };
  }

  const warehouseId =
    normalizeUuid(payload.warehouseId);

  if (!warehouseId) {
    return {
      ok: false,
      reason: "warehouse_id_invalid",
    };
  }

  const productId =
    normalizeUuid(payload.productId);

  if (!productId) {
    return {
      ok: false,
      reason: "product_id_invalid",
    };
  }

  const requestedQuantity =
    normalizePositiveNumber(
      payload.requestedQuantity,
    );

  if (requestedQuantity === null) {
    return {
      ok: false,
      reason: "quantity_invalid",
    };
  }

  const unit =
    optionalText(payload.unit)
      ?.toLowerCase();

  if (!unit) {
    return {
      ok: false,
      reason: "unit_invalid",
    };
  }

  const strategy =
    normalizeStrategy(payload.strategy);

  if (!strategy) {
    return {
      ok: false,
      reason: "strategy_invalid",
    };
  }

  const sku =
    optionalUuid(payload.skuId);

  if (!sku.ok) {
    return {
      ok: false,
      reason: "sku_id_invalid",
    };
  }

  const source =
    optionalUuid(
      payload.sourceLocationId,
    );

  if (!source.ok) {
    return {
      ok: false,
      reason:
        "source_location_id_invalid",
    };
  }

  const destination =
    optionalUuid(
      payload.destinationLocationId,
    );

  if (!destination.ok) {
    return {
      ok: false,
      reason:
        "destination_location_id_invalid",
    };
  }

  const reservation =
    optionalUuid(payload.reservationId);

  if (!reservation.ok) {
    return {
      ok: false,
      reason: "reservation_id_invalid",
    };
  }

  const suggestion =
    optionalUuid(payload.suggestionId);

  if (!suggestion.ok) {
    return {
      ok: false,
      reason: "suggestion_id_invalid",
    };
  }

  if (
    payload.tracking !== undefined &&
    (
      !payload.tracking ||
      typeof payload.tracking !== "object" ||
      Array.isArray(payload.tracking)
    )
  ) {
    return {
      ok: false,
      reason: "tracking_invalid",
    };
  }

  return {
    ok: true,
    payload: {
      pickingId,
      warehouseId,
      productId,
      requestedQuantity,
      unit,
      strategy,
      ...(sku.value
        ? { skuId: sku.value }
        : {}),
      ...(source.value
        ? {
            sourceLocationId:
              source.value,
          }
        : {}),
      ...(destination.value
        ? {
            destinationLocationId:
              destination.value,
          }
        : {}),
      ...(reservation.value
        ? {
            reservationId:
              reservation.value,
          }
        : {}),
      ...(suggestion.value
        ? {
            suggestionId:
              suggestion.value,
          }
        : {}),
      ...(optionalText(
        payload.stockStatus,
      )
        ? {
            stockStatus:
              optionalText(
                payload.stockStatus,
              ).toLowerCase(),
          }
        : {}),
      ...(payload.tracking !== undefined
        ? {
            tracking:
              payload.tracking,
          }
        : {}),
      ...(optionalText(payload.notes)
        ? {
            notes:
              optionalText(payload.notes),
          }
        : {}),
    },
  };
}

function normalizeParentPayload(payload) {
  const pickingId =
    normalizeUuid(payload.pickingId);

  if (!pickingId) {
    return {
      ok: false,
      reason: "picking_id_invalid",
    };
  }

  return {
    ok: true,
    payload: {
      pickingId,
    },
  };
}

function normalizeTaskPayload(payload) {
  const pickingId =
    normalizeUuid(payload.pickingId);

  if (!pickingId) {
    return {
      ok: false,
      reason: "picking_id_invalid",
    };
  }

  const warehouseId =
    normalizeUuid(payload.warehouseId);

  if (!warehouseId) {
    return {
      ok: false,
      reason: "warehouse_id_invalid",
    };
  }

  const sourceLocationId =
    normalizeUuid(
      payload.sourceLocationId,
    );

  if (!sourceLocationId) {
    return {
      ok: false,
      reason:
        "source_location_id_invalid",
    };
  }

  const pickingItem =
    optionalUuid(payload.pickingItemId);

  if (!pickingItem.ok) {
    return {
      ok: false,
      reason:
        "picking_item_id_invalid",
    };
  }

  const destination =
    optionalUuid(
      payload.destinationLocationId,
    );

  if (!destination.ok) {
    return {
      ok: false,
      reason:
        "destination_location_id_invalid",
    };
  }

  const assignedUser =
    optionalUuid(
      payload.assignedUserId,
    );

  if (!assignedUser.ok) {
    return {
      ok: false,
      reason:
        "assigned_user_id_invalid",
    };
  }

  const equipment =
    optionalUuid(
      payload.assignedEquipmentId,
    );

  if (!equipment.ok) {
    return {
      ok: false,
      reason:
        "assigned_equipment_id_invalid",
    };
  }

  let priority;

  if (payload.priority !== undefined) {
    priority =
      normalizeIntegerRange(
        payload.priority,
        1,
        100,
      );

    if (priority === null) {
      return {
        ok: false,
        reason: "priority_invalid",
      };
    }
  }

  let sequence;

  if (payload.sequence !== undefined) {
    sequence =
      normalizeIntegerRange(
        payload.sequence,
        1,
        Number.MAX_SAFE_INTEGER,
      );

    if (sequence === null) {
      return {
        ok: false,
        reason: "sequence_invalid",
      };
    }
  }

  return {
    ok: true,
    payload: {
      pickingId,
      warehouseId,
      sourceLocationId,
      ...(pickingItem.value
        ? {
            pickingItemId:
              pickingItem.value,
          }
        : {}),
      ...(destination.value
        ? {
            destinationLocationId:
              destination.value,
          }
        : {}),
      ...(assignedUser.value
        ? {
            assignedUserId:
              assignedUser.value,
          }
        : {}),
      ...(equipment.value
        ? {
            assignedEquipmentId:
              equipment.value,
          }
        : {}),
      ...(priority !== undefined
        ? { priority }
        : {}),
      ...(sequence !== undefined
        ? { sequence }
        : {}),
      ...(optionalText(payload.plannedAt)
        ? {
            plannedAt:
              optionalText(
                payload.plannedAt,
              ),
          }
        : {}),
      ...(optionalText(payload.notes)
        ? {
            notes:
              optionalText(payload.notes),
          }
        : {}),
    },
  };
}

function normalizeExecutePayload(payload) {
  const pickingId =
    normalizeUuid(payload.pickingId);

  if (!pickingId) {
    return {
      ok: false,
      reason: "picking_id_invalid",
    };
  }

  const pickingItemId =
    normalizeUuid(
      payload.pickingItemId,
    );

  if (!pickingItemId) {
    return {
      ok: false,
      reason: "picking_item_id_invalid",
    };
  }

  const sourceLocationId =
    normalizeUuid(
      payload.sourceLocationId,
    );

  if (!sourceLocationId) {
    return {
      ok: false,
      reason:
        "source_location_id_invalid",
    };
  }

  const destinationLocationId =
    normalizeUuid(
      payload.destinationLocationId,
    );

  if (!destinationLocationId) {
    return {
      ok: false,
      reason:
        "destination_location_id_invalid",
    };
  }

  if (
    sourceLocationId ===
    destinationLocationId
  ) {
    return {
      ok: false,
      reason:
        "source_destination_same",
    };
  }

  const quantity =
    normalizeNonNegativeNumber(
      payload.quantity,
    );

  if (quantity === null) {
    return {
      ok: false,
      reason:
        "execute_quantity_invalid",
    };
  }

  const shortQuantity =
    payload.shortQuantity === undefined
      ? 0
      : normalizeNonNegativeNumber(
          payload.shortQuantity,
        );

  if (shortQuantity === null) {
    return {
      ok: false,
      reason:
        "short_quantity_invalid",
    };
  }

  if (
    quantity +
      shortQuantity <=
    0
  ) {
    return {
      ok: false,
      reason:
        "processed_quantity_invalid",
    };
  }

  return {
    ok: true,
    payload: {
      pickingId,
      pickingItemId,
      sourceLocationId,
      destinationLocationId,
      quantity,
      shortQuantity,

      ...(optionalText(payload.barcode)
        ? {
            barcode:
              optionalText(
                payload.barcode,
              ),
          }
        : {}),

      ...(optionalText(payload.lotNumber)
        ? {
            lotNumber:
              optionalText(
                payload.lotNumber,
              ),
          }
        : {}),

      ...(optionalText(
        payload.serialNumber,
      )
        ? {
            serialNumber:
              optionalText(
                payload.serialNumber,
              ),
          }
        : {}),

      ...(optionalText(payload.notes)
        ? {
            notes:
              optionalText(
                payload.notes,
              ),
          }
        : {}),
    },
  };
}

function normalizeResolveExceptionPayload(
  payload,
) {
  const pickingId =
    normalizeUuid(
      payload.pickingId,
    );

  if (!pickingId) {
    return {
      ok: false,
      reason:
        "picking_id_invalid",
    };
  }

  const exceptionId =
    normalizeUuid(
      payload.exceptionId,
    );

  if (!exceptionId) {
    return {
      ok: false,
      reason:
        "exception_id_invalid",
    };
  }

  const resolutionNotes =
    optionalText(
      payload.resolutionNotes,
    );

  return {
    ok: true,
    payload: {
      pickingId,
      exceptionId,

      ...(resolutionNotes
        ? {
            resolutionNotes,
          }
        : {}),
    },
  };
}

export function normalizeWriteRequest(
  body,
  requestId,
) {
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

  const accountId =
    normalizeUuid(body.accountId);

  if (!accountId) {
    return {
      ok: false,
      reason: "account_invalid",
    };
  }

  const action =
    normalizeWriteAction(body.action);

  if (!action) {
    return {
      ok: false,
      reason: "action_invalid",
    };
  }

  const normalizedRequestId =
    normalizeUuid(requestId);

  if (!normalizedRequestId) {
    return {
      ok: false,
      reason: "request_id_invalid",
    };
  }

  if (
    body.payload !== undefined &&
    (
      !body.payload ||
      typeof body.payload !== "object" ||
      Array.isArray(body.payload)
    )
  ) {
    return {
      ok: false,
      reason: "payload_invalid",
    };
  }

  const payload =
    body.payload ?? {};

  const payloadResult =
    action === "create"
      ? normalizeCreatePayload(payload)
      : action === "add_item"
        ? normalizeAddItemPayload(payload)
        : action === "create_task"
          ? normalizeTaskPayload(payload)
          : action === "execute_item"
            ? normalizeExecutePayload(payload)
            : action === "resolve_exception"
              ? normalizeResolveExceptionPayload(payload)
              : normalizeParentPayload(payload);

  if (!payloadResult.ok) {
    return payloadResult;
  }

  return {
    ok: true,
    value: {
      accountId,
      action,
      requestId:
        normalizedRequestId,
      payload:
        payloadResult.payload,
    },
  };
}

function responseHeaders() {
  return {
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Idempotency-Key",
    "Access-Control-Allow-Methods":
      "POST, OPTIONS",
    "Cache-Control":
      "private, no-store",
    Vary:
      "Authorization, Origin",
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
  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_ANON_KEY
  ) {
    return {
      ok: false,
      reason: "server_misconfigured",
    };
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

  if (!response.ok) {
    return {
      ok: false,
      reason: "unauthorized",
    };
  }

  const user =
    await readJsonSafely(response);

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

async function invokePickingWrite(
  env,
  token,
  input,
  fetchImpl,
) {
  const execute =
    input.action ===
    "execute_item";

  const complete =
    input.action ===
    "complete";

  const resolveException =
    input.action ===
    "resolve_exception";

  const rpcPath =
    execute
      ? "/rest/v1/rpc/warehouse_picking_execute_write"
      : complete
        ? "/rest/v1/rpc/warehouse_picking_complete_write"
        : resolveException
          ? "/rest/v1/rpc/warehouse_picking_resolve_exception_write"
          : "/rest/v1/rpc/warehouse_picking_write";

  const rpcBody =
    execute
      ? {
          p_request_id:
            input.requestId,
          p_account_id:
            input.accountId,
          p_picking_id:
            input.payload
              .pickingId,
          p_picking_item_id:
            input.payload
              .pickingItemId,
          p_source_location_id:
            input.payload
              .sourceLocationId,
          p_destination_location_id:
            input.payload
              .destinationLocationId,
          p_quantity:
            input.payload
              .quantity,
          p_short_quantity:
            input.payload
              .shortQuantity,
          p_barcode:
            input.payload
              .barcode ??
            null,
          p_lot_number:
            input.payload
              .lotNumber ??
            null,
          p_serial_number:
            input.payload
              .serialNumber ??
            null,
          p_notes:
            input.payload
              .notes ??
            null,
        }
      : complete
        ? {
            p_request_id:
              input.requestId,
            p_account_id:
              input.accountId,
            p_picking_id:
              input.payload
                .pickingId,
          }
        : resolveException
          ? {
              p_request_id:
                input.requestId,
              p_account_id:
                input.accountId,
              p_picking_id:
                input.payload
                  .pickingId,
              p_exception_id:
                input.payload
                  .exceptionId,
              p_resolution_notes:
                input.payload
                  .resolutionNotes ??
                null,
            }
          : {
              p_action:
                input.action,
              p_request_id:
                input.requestId,
              p_account_id:
                input.accountId,
              p_payload:
                input.payload,
            };

  const response =
    await fetchImpl(
      new URL(
        rpcPath,
        env.SUPABASE_URL,
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
            "application/json",
        },
        body:
          JSON.stringify(
            rpcBody,
          ),
      },
    );

  const data =
    await readJsonSafely(
      response,
    );

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export function mapRpcError(result) {
  const code =
    String(
      result?.data?.code || "",
    );

  const message =
    String(
      result?.data?.message ||
        "Toplama işlemi tamamlanamadı.",
    );

  if (code === "42501") {
    return {
      status: 403,
      code:
        API_ERROR_CODES.FORBIDDEN,
      message,
    };
  }

  if (
    code === "23505" ||
    code === "40001"
  ) {
    return {
      status: 409,
      code:
        API_ERROR_CODES.CONFLICT,
      message,
    };
  }

  if (code === "P0002") {
    return {
      status: 404,
      code:
        API_ERROR_CODES.NOT_FOUND,
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
      code:
        API_ERROR_CODES.BAD_REQUEST,
      message,
    };
  }

  return {
    status:
      result?.status >= 500
        ? 502
        : 400,
    code:
      result?.status >= 500
        ? API_ERROR_CODES.UPSTREAM_ERROR
        : API_ERROR_CODES.BAD_REQUEST,
    message,
  };
}

export async function onRequestPost(
  context,
) {
  const origin =
    context.request.headers.get(
      "Origin",
    );

  const fetchImpl =
    context.fetch ?? fetch;

  try {
    const contentLength =
      Number(
        context.request.headers.get(
          "Content-Length",
        ) || "0",
      );

    if (
      Number.isFinite(
        contentLength,
      ) &&
      contentLength >
        MAX_BODY_BYTES
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
        responseHeaders(),
      );
    }

    const auth =
      await getAuthenticatedUser(
        context.env,
        token,
        fetchImpl,
      );

    if (!auth.ok) {
      if (
        auth.reason ===
        "server_misconfigured"
      ) {
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
      body =
        await context.request.json();
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

    const normalized =
      normalizeWriteRequest(
        body,
        context.request.headers.get(
          "Idempotency-Key",
        ),
      );

    if (!normalized.ok) {
      const messages = {
        body_invalid:
          "İstek gövdesi geçersizdir.",

        account_invalid:
          "Firma kimliği geçerli bir UUID olmalıdır.",

        action_invalid:
          "Toplama işlemi desteklenmiyor.",

        request_id_invalid:
          "Idempotency-Key başlığı geçerli bir UUID olmalıdır.",

        payload_invalid:
          "Toplama işlem verisi JSON nesnesi olmalıdır.",

        warehouse_id_invalid:
          "Depo kimliği geçerli bir UUID olmalıdır.",

        destination_location_id_invalid:
          "Hedef lokasyon kimliği geçerli bir UUID olmalıdır.",

        source_location_id_invalid:
          "Kaynak lokasyon kimliği geçerli bir UUID olmalıdır.",

        picking_id_invalid:
          "Toplama kimliği geçerli bir UUID olmalıdır.",

        picking_item_id_invalid:
          "Toplama satırı kimliği geçerli bir UUID olmalıdır.",

        exception_id_invalid:
          "Toplama istisnası kimliği geçerli bir UUID olmalıdır.",

        product_id_invalid:
          "Ürün kimliği geçerli bir UUID olmalıdır.",

        sku_id_invalid:
          "SKU kimliği geçerli bir UUID olmalıdır.",

        reservation_id_invalid:
          "Rezervasyon kimliği geçerli bir UUID olmalıdır.",

        suggestion_id_invalid:
          "Toplama önerisi kimliği geçerli bir UUID olmalıdır.",

        assigned_user_id_invalid:
          "Atanan kullanıcı kimliği geçerli bir UUID olmalıdır.",

        assigned_equipment_id_invalid:
          "Atanan ekipman kimliği geçerli bir UUID olmalıdır.",

        wave_id_invalid:
          "Toplama dalga kimliği geçerli bir UUID olmalıdır.",

        batch_id_invalid:
          "Toplama batch kimliği geçerli bir UUID olmalıdır.",

        strategy_invalid:
          "Toplama stratejisi geçersizdir.",

        priority_invalid:
          "Toplama önceliği 1 ile 100 arasında tam sayı olmalıdır.",

        sequence_invalid:
          "Görev sırası sıfırdan büyük tam sayı olmalıdır.",

        quantity_invalid:
          "İstenen toplama miktarı sıfırdan büyük olmalıdır.",

        unit_invalid:
          "Ölçü birimi zorunludur.",

        tracking_invalid:
          "Ürün takip bilgisi JSON nesnesi olmalıdır.",

        reference_pair_invalid:
          "Referans türü ve referans kimliği birlikte verilmelidir.",

        source_destination_same:
          "Kaynak ve hedef lokasyon aynı olamaz.",

        execute_quantity_invalid:
          "Toplanan miktar negatif olamaz.",

        short_quantity_invalid:
          "Eksik toplama miktarı negatif olamaz.",

        processed_quantity_invalid:
          "Toplanan veya eksik bildirilen miktarlardan en az biri sıfırdan büyük olmalıdır.",
      };

      return corsJsonError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        messages[
          normalized.reason
        ] ||
          "Toplama isteği geçersizdir.",
        origin,
        undefined,
        responseHeaders(),
      );
    }

    const result =
      await invokePickingWrite(
        context.env,
        token,
        normalized.value,
        fetchImpl,
      );

    if (!result.ok) {
      const mapped =
        mapRpcError(result);

      logApiEvent(
        mapped.status >= 500
          ? "error"
          : "warn",
        "warehouse_picking_write_failed",
        {
          userId:
            auth.user.id,
          accountId:
            normalized.value
              .accountId,
          action:
            normalized.value.action,
          requestId:
            normalized.value
              .requestId,
          status:
            mapped.status,
          databaseCode:
            result?.data?.code ??
            null,
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

    logApiEvent(
      "info",
      "warehouse_picking_write_succeeded",
      {
        userId:
          auth.user.id,
        accountId:
          normalized.value
            .accountId,
        action:
          normalized.value.action,
        requestId:
          normalized.value
            .requestId,
      },
    );

    return corsJson(
      apiSuccessBody(
        result.data,
      ),
      200,
      origin,
      undefined,
      responseHeaders(),
    );
  } catch (error) {
    logApiEvent(
      "error",
      "warehouse_picking_write_unhandled",
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
      "Toplama işlemi sırasında beklenmeyen bir hata oluştu.",
      origin,
      undefined,
      responseHeaders(),
    );
  }
}

export function onRequestOptions(
  context,
) {
  return new Response(
    null,
    {
      status: 204,
      headers:
        buildCorsJsonHeaders(
          context.request.headers.get(
            "Origin",
          ),
          responseHeaders(),
        ),
    },
  );
}
