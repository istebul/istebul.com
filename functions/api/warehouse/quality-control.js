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
  "start",
]);

const QUALITY_CONTROL_TYPES = Object.freeze([
  "receiving_inspection",
  "sampling_inspection",
  "visual_inspection",
  "dimensional_inspection",
  "temperature_inspection",
  "packaging_inspection",
  "barcode_inspection",
  "label_inspection",
  "laboratory_inspection",
  "final_inspection",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BODY_BYTES =
  32 * 1024;


export function extractBearerToken(
  request,
) {
  const value =
    request.headers.get(
      "Authorization",
    ) || "";

  if (!value.startsWith("Bearer ")) {
    return null;
  }

  const token =
    value.slice(7).trim();

  return token || null;
}


export function normalizeUuid(
  value,
) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  return UUID_PATTERN.test(normalized)
    ? normalized
    : null;
}


function optionalUuid(
  value,
) {
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


function optionalText(
  value,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return {
      ok: true,
      value: undefined,
    };
  }

  if (typeof value !== "string") {
    return {
      ok: false,
    };
  }

  const normalized =
    value.trim();

  return {
    ok: true,
    value:
      normalized || undefined,
  };
}


function requiredText(
  value,
) {
  if (typeof value !== "string") {
    return null;
  }

  return value.trim() || null;
}


export function normalizeWriteAction(
  value,
) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  return WRITE_ACTIONS.includes(
    normalized,
  )
    ? normalized
    : null;
}


function normalizeCreatePayload(
  payload,
) {
  const warehouseId =
    normalizeUuid(
      payload.warehouseId,
    );

  if (!warehouseId) {
    return {
      ok: false,
      reason:
        "warehouse_id_invalid",
    };
  }

  const locationId =
    normalizeUuid(
      payload.locationId,
    );

  if (!locationId) {
    return {
      ok: false,
      reason:
        "location_id_invalid",
    };
  }

  const receiving =
    optionalUuid(
      payload.receivingId,
    );

  if (!receiving.ok) {
    return {
      ok: false,
      reason:
        "receiving_id_invalid",
    };
  }

  const referenceType =
    optionalText(
      payload.referenceType,
    );

  if (!referenceType.ok) {
    return {
      ok: false,
      reason:
        "reference_type_invalid",
    };
  }

  const referenceId =
    optionalText(
      payload.referenceId,
    );

  if (!referenceId.ok) {
    return {
      ok: false,
      reason:
        "reference_id_invalid",
    };
  }

  const referenceNumber =
    optionalText(
      payload.referenceNumber,
    );

  if (!referenceNumber.ok) {
    return {
      ok: false,
      reason:
        "reference_number_invalid",
    };
  }

  const plannedAt =
    optionalText(
      payload.plannedAt,
    );

  if (!plannedAt.ok) {
    return {
      ok: false,
      reason:
        "planned_at_invalid",
    };
  }

  const notes =
    optionalText(
      payload.notes,
    );

  if (!notes.ok) {
    return {
      ok: false,
      reason:
        "notes_invalid",
    };
  }

  return {
    ok: true,
    payload: {
      warehouseId,
      locationId,

      ...(receiving.value
        ? {
            receivingId:
              receiving.value,
          }
        : {}),

      ...(referenceType.value
        ? {
            referenceType:
              referenceType.value,
          }
        : {}),

      ...(referenceId.value
        ? {
            referenceId:
              referenceId.value,
          }
        : {}),

      ...(referenceNumber.value
        ? {
            referenceNumber:
              referenceNumber.value,
          }
        : {}),

      ...(plannedAt.value
        ? {
            plannedAt:
              plannedAt.value,
          }
        : {}),

      ...(notes.value
        ? {
            notes:
              notes.value,
          }
        : {}),
    },
  };
}


function normalizeAddItemPayload(
  payload,
) {
  const inspectionId =
    normalizeUuid(
      payload.inspectionId,
    );

  if (!inspectionId) {
    return {
      ok: false,
      reason:
        "inspection_id_invalid",
    };
  }

  const productId =
    normalizeUuid(
      payload.productId,
    );

  if (!productId) {
    return {
      ok: false,
      reason:
        "product_id_invalid",
    };
  }

  const warehouseId =
    normalizeUuid(
      payload.warehouseId,
    );

  if (!warehouseId) {
    return {
      ok: false,
      reason:
        "warehouse_id_invalid",
    };
  }

  const locationId =
    normalizeUuid(
      payload.locationId,
    );

  if (!locationId) {
    return {
      ok: false,
      reason:
        "location_id_invalid",
    };
  }

  const sku =
    optionalUuid(
      payload.skuId,
    );

  if (!sku.ok) {
    return {
      ok: false,
      reason:
        "sku_id_invalid",
    };
  }

  const receiving =
    optionalUuid(
      payload.receivingId,
    );

  if (!receiving.ok) {
    return {
      ok: false,
      reason:
        "receiving_id_invalid",
    };
  }

  const receivingItem =
    optionalUuid(
      payload.receivingItemId,
    );

  if (!receivingItem.ok) {
    return {
      ok: false,
      reason:
        "receiving_item_id_invalid",
    };
  }

  if (
    receivingItem.value &&
    !receiving.value
  ) {
    return {
      ok: false,
      reason:
        "receiving_pair_invalid",
    };
  }

  const controlType =
    String(
      payload.controlType || "",
    )
      .trim()
      .toLowerCase();

  if (
    !QUALITY_CONTROL_TYPES.includes(
      controlType,
    )
  ) {
    return {
      ok: false,
      reason:
        "control_type_invalid",
    };
  }

  const inspectedQuantity =
    Number(
      payload.inspectedQuantity,
    );

  if (
    !Number.isFinite(
      inspectedQuantity,
    ) ||
    inspectedQuantity <= 0
  ) {
    return {
      ok: false,
      reason:
        "quantity_invalid",
    };
  }

  const unit =
    requiredText(
      payload.unit,
    );

  if (!unit) {
    return {
      ok: false,
      reason:
        "unit_invalid",
    };
  }

  if (
    payload.tracking !==
      undefined &&
    payload.tracking !== null &&
    (
      typeof payload.tracking !==
        "object" ||
      Array.isArray(
        payload.tracking,
      )
    )
  ) {
    return {
      ok: false,
      reason:
        "tracking_invalid",
    };
  }

  if (
    payload.expectedValue !==
      undefined &&
    payload.expectedValue !== null &&
    ![
      "string",
      "number",
      "boolean",
    ].includes(
      typeof payload.expectedValue,
    )
  ) {
    return {
      ok: false,
      reason:
        "expected_value_invalid",
    };
  }

  if (
    typeof payload.expectedValue ===
      "number" &&
    !Number.isFinite(
      payload.expectedValue,
    )
  ) {
    return {
      ok: false,
      reason:
        "expected_value_invalid",
    };
  }

  const notes =
    optionalText(
      payload.notes,
    );

  if (!notes.ok) {
    return {
      ok: false,
      reason:
        "notes_invalid",
    };
  }

  return {
    ok: true,
    payload: {
      inspectionId,
      productId,
      warehouseId,
      locationId,
      controlType,
      inspectedQuantity,
      unit,

      ...(sku.value
        ? {
            skuId:
              sku.value,
          }
        : {}),

      ...(receiving.value
        ? {
            receivingId:
              receiving.value,
          }
        : {}),

      ...(receivingItem.value
        ? {
            receivingItemId:
              receivingItem.value,
          }
        : {}),

      ...(payload.tracking !==
        undefined &&
      payload.tracking !== null
        ? {
            tracking:
              payload.tracking,
          }
        : {}),

      ...(payload.expectedValue !==
        undefined &&
      payload.expectedValue !== null
        ? {
            expectedValue:
              payload.expectedValue,
          }
        : {}),

      ...(notes.value
        ? {
            notes:
              notes.value,
          }
        : {}),
    },
  };
}


function normalizeStartPayload(
  payload,
) {
  const inspectionId =
    normalizeUuid(
      payload.inspectionId,
    );

  if (!inspectionId) {
    return {
      ok: false,
      reason:
        "inspection_id_invalid",
    };
  }

  return {
    ok: true,
    payload: {
      inspectionId,
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
      reason:
        "body_invalid",
    };
  }

  const accountId =
    normalizeUuid(
      body.accountId,
    );

  if (!accountId) {
    return {
      ok: false,
      reason:
        "account_invalid",
    };
  }

  const action =
    normalizeWriteAction(
      body.action,
    );

  if (!action) {
    return {
      ok: false,
      reason:
        "action_invalid",
    };
  }

  const normalizedRequestId =
    normalizeUuid(
      requestId,
    );

  if (!normalizedRequestId) {
    return {
      ok: false,
      reason:
        "request_id_invalid",
    };
  }

  if (
    !body.payload ||
    typeof body.payload !==
      "object" ||
    Array.isArray(
      body.payload,
    )
  ) {
    return {
      ok: false,
      reason:
        "payload_invalid",
    };
  }

  let payloadResult;

  if (action === "create") {
    payloadResult =
      normalizeCreatePayload(
        body.payload,
      );
  } else if (
    action === "add_item"
  ) {
    payloadResult =
      normalizeAddItemPayload(
        body.payload,
      );
  } else {
    payloadResult =
      normalizeStartPayload(
        body.payload,
      );
  }

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


async function readJsonSafely(
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
  fetchImpl,
) {
  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_ANON_KEY
  ) {
    return {
      ok: false,
      reason:
        "server_misconfigured",
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
      reason:
        "unauthorized",
    };
  }

  const user =
    await readJsonSafely(
      response,
    );

  if (!user?.id) {
    return {
      ok: false,
      reason:
        "unauthorized",
    };
  }

  return {
    ok: true,
    user,
  };
}


async function invokeQualityWrite(
  env,
  token,
  input,
  fetchImpl,
) {
  const response =
    await fetchImpl(
      new URL(
        "/rest/v1/rpc/warehouse_quality_control_write",
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
          JSON.stringify({
            p_action:
              input.action,

            p_request_id:
              input.requestId,

            p_account_id:
              input.accountId,

            p_payload:
              input.payload,
          }),
      },
    );

  const data =
    await readJsonSafely(
      response,
    );

  return {
    ok:
      response.ok,

    status:
      response.status,

    data,
  };
}


export function mapRpcError(
  result,
) {
  const code =
    String(
      result?.data?.code || "",
    );

  const message =
    String(
      result?.data?.message ||
        "Kalite kontrol işlemi tamamlanamadı.",
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
          "Kalite kontrol işlemi desteklenmiyor.",

        request_id_invalid:
          "Idempotency-Key başlığı geçerli bir UUID olmalıdır.",

        payload_invalid:
          "Kalite kontrol işlem verisi JSON nesnesi olmalıdır.",

        warehouse_id_invalid:
          "Depo kimliği geçerli bir UUID olmalıdır.",

        location_id_invalid:
          "Lokasyon kimliği geçerli bir UUID olmalıdır.",

        inspection_id_invalid:
          "Kalite kontrol kimliği geçerli bir UUID olmalıdır.",

        product_id_invalid:
          "Ürün kimliği geçerli bir UUID olmalıdır.",

        sku_id_invalid:
          "SKU kimliği geçerli bir UUID olmalıdır.",

        receiving_id_invalid:
          "Mal kabul kimliği geçerli bir UUID olmalıdır.",

        receiving_item_id_invalid:
          "Mal kabul satırı kimliği geçerli bir UUID olmalıdır.",

        receiving_pair_invalid:
          "Mal kabul satırı kullanıldığında mal kabul kimliği de zorunludur.",

        control_type_invalid:
          "Kalite kontrol türü desteklenmiyor.",

        quantity_invalid:
          "Kontrol miktarı sıfırdan büyük olmalıdır.",

        unit_invalid:
          "Ölçü birimi boş bırakılamaz.",

        tracking_invalid:
          "Takip bilgisi JSON nesnesi olmalıdır.",

        expected_value_invalid:
          "Beklenen değer metin, sayı veya boolean olmalıdır.",

        reference_type_invalid:
          "Referans türü metin olmalıdır.",

        reference_id_invalid:
          "Referans kimliği metin olmalıdır.",

        reference_number_invalid:
          "Referans numarası metin olmalıdır.",

        planned_at_invalid:
          "Planlanan tarih metin olmalıdır.",

        notes_invalid:
          "Kalite kontrol notu metin olmalıdır.",
      };

      return corsJsonError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        messages[
          normalized.reason
        ] ||
          "Kalite kontrol isteği geçersizdir.",
        origin,
        undefined,
        responseHeaders(),
      );
    }

    const result =
      await invokeQualityWrite(
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
        "warehouse_quality_control_write_failed",
        {
          userId:
            auth.user.id,

          accountId:
            normalized.value
              .accountId,

          action:
            normalized.value
              .action,

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
      "warehouse_quality_control_write_succeeded",
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
        result.data ?? {},
      ),
      200,
      origin,
      responseHeaders(),
    );
  } catch (error) {
    logApiEvent(
      "error",
      "warehouse_quality_control_write_unhandled",
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
      "Kalite kontrol işlemi sırasında beklenmeyen bir hata oluştu.",
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
