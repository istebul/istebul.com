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
  "create_from_picking",
  "create_package",
  "confirm_item",
  "seal_package",
  "generate_package_label",
  "resolve_exception",
  "complete",
  "mark_shipping_ready",
  "cancel",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_BODY_BYTES =
  32 * 1024;

export function extractBearerToken(
  request,
) {
  const value =
    request.headers.get("Authorization") ||
    "";

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

export function normalizeWriteAction(
  value,
) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  return WRITE_ACTIONS.includes(normalized)
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
      value: null,
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
      value: null,
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
      normalized || null,
  };
}

function optionalPositiveInteger(
  value,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      ok: true,
      value: null,
    };
  }

  const normalized =
    Number(value);

  if (
    !Number.isInteger(normalized) ||
    normalized < 1 ||
    normalized > 100
  ) {
    return {
      ok: false,
    };
  }

  return {
    ok: true,
    value: normalized,
  };
}

function nonNegativeQuantity(
  value,
  defaultValue,
) {
  const source =
    value === undefined ||
    value === null ||
    value === ""
      ? defaultValue
      : value;

  const normalized =
    Number(source);

  if (
    !Number.isFinite(normalized) ||
    normalized < 0
  ) {
    return null;
  }

  return normalized;
}

function normalizeCreateFromPicking(
  payload,
) {
  const pickingId =
    normalizeUuid(payload.pickingId);

  if (!pickingId) {
    return {
      ok: false,
      reason:
        "picking_id_invalid",
    };
  }

  const packingLocationId =
    normalizeUuid(
      payload.packingLocationId,
    );

  if (!packingLocationId) {
    return {
      ok: false,
      reason:
        "packing_location_id_invalid",
    };
  }

  const shippingLocation =
    optionalUuid(
      payload.shippingLocationId,
    );

  if (!shippingLocation.ok) {
    return {
      ok: false,
      reason:
        "shipping_location_id_invalid",
    };
  }

  const strategy =
    optionalText(payload.strategy);

  if (!strategy.ok) {
    return {
      ok: false,
      reason:
        "strategy_invalid",
    };
  }

  const priority =
    optionalPositiveInteger(
      payload.priority,
    );

  if (!priority.ok) {
    return {
      ok: false,
      reason:
        "priority_invalid",
    };
  }

  const plannedAt =
    optionalText(payload.plannedAt);

  if (!plannedAt.ok) {
    return {
      ok: false,
      reason:
        "planned_at_invalid",
    };
  }

  const notes =
    optionalText(payload.notes);

  if (!notes.ok) {
    return {
      ok: false,
      reason:
        "notes_invalid",
    };
  }

  return {
    ok: true,
    value: {
      pickingId,
      packingLocationId,

      ...(shippingLocation.value
        ? {
            shippingLocationId:
              shippingLocation.value,
          }
        : {}),

      ...(strategy.value
        ? {
            strategy:
              strategy.value,
          }
        : {}),

      ...(priority.value !== null
        ? {
            priority:
              priority.value,
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

function normalizeCreatePackage(
  payload,
) {
  const packingId =
    normalizeUuid(payload.packingId);

  if (!packingId) {
    return {
      ok: false,
      reason:
        "packing_id_invalid",
    };
  }

  const containerId =
    normalizeUuid(payload.containerId);

  if (!containerId) {
    return {
      ok: false,
      reason:
        "container_id_invalid",
    };
  }

  const parentPackage =
    optionalUuid(
      payload.parentPackageId,
    );

  if (!parentPackage.ok) {
    return {
      ok: false,
      reason:
        "parent_package_id_invalid",
    };
  }

  const weightUnit =
    optionalText(payload.weightUnit);

  if (!weightUnit.ok) {
    return {
      ok: false,
      reason:
        "weight_unit_invalid",
    };
  }

  const volumeUnit =
    optionalText(payload.volumeUnit);

  if (!volumeUnit.ok) {
    return {
      ok: false,
      reason:
        "volume_unit_invalid",
    };
  }

  return {
    ok: true,
    value: {
      packingId,
      containerId,

      ...(parentPackage.value
        ? {
            parentPackageId:
              parentPackage.value,
          }
        : {}),

      ...(weightUnit.value
        ? {
            weightUnit:
              weightUnit.value,
          }
        : {}),

      ...(volumeUnit.value
        ? {
            volumeUnit:
              volumeUnit.value,
          }
        : {}),
    },
  };
}

function normalizeConfirmItem(
  payload,
) {
  const packingId =
    normalizeUuid(payload.packingId);

  if (!packingId) {
    return {
      ok: false,
      reason:
        "packing_id_invalid",
    };
  }

  const packingItemId =
    normalizeUuid(
      payload.packingItemId,
    );

  if (!packingItemId) {
    return {
      ok: false,
      reason:
        "packing_item_id_invalid",
    };
  }

  const packageId =
    normalizeUuid(payload.packageId);

  if (!packageId) {
    return {
      ok: false,
      reason:
        "package_id_invalid",
    };
  }

  const quantity =
    nonNegativeQuantity(
      payload.quantity,
      0,
    );

  const damagedQuantity =
    nonNegativeQuantity(
      payload.damagedQuantity,
      0,
    );

  const missingQuantity =
    nonNegativeQuantity(
      payload.missingQuantity,
      0,
    );

  if (
    quantity === null ||
    damagedQuantity === null ||
    missingQuantity === null
  ) {
    return {
      ok: false,
      reason:
        "quantity_invalid",
    };
  }

  if (
    quantity +
      damagedQuantity +
      missingQuantity <=
    0
  ) {
    return {
      ok: false,
      reason:
        "quantity_empty",
    };
  }

  const barcode =
    optionalText(payload.barcode);

  if (!barcode.ok) {
    return {
      ok: false,
      reason:
        "barcode_invalid",
    };
  }

  const lotNumber =
    optionalText(payload.lotNumber);

  if (!lotNumber.ok) {
    return {
      ok: false,
      reason:
        "lot_number_invalid",
    };
  }

  const serialNumber =
    optionalText(
      payload.serialNumber,
    );

  if (!serialNumber.ok) {
    return {
      ok: false,
      reason:
        "serial_number_invalid",
    };
  }

  const notes =
    optionalText(payload.notes);

  if (!notes.ok) {
    return {
      ok: false,
      reason:
        "notes_invalid",
    };
  }

  return {
    ok: true,
    value: {
      packingId,
      packingItemId,
      packageId,
      quantity,
      damagedQuantity,
      missingQuantity,

      ...(barcode.value
        ? {
            barcode:
              barcode.value,
          }
        : {}),

      ...(lotNumber.value
        ? {
            lotNumber:
              lotNumber.value,
          }
        : {}),

      ...(serialNumber.value
        ? {
            serialNumber:
              serialNumber.value,
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


function optionalPositiveQuantity(
  value,
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      ok: true,
      value: null,
    };
  }

  const normalized =
    Number(value);

  if (
    !Number.isFinite(normalized) ||
    normalized <= 0
  ) {
    return {
      ok: false,
    };
  }

  return {
    ok: true,
    value: normalized,
  };
}

function normalizePackingOnly(
  payload,
) {
  const packingId =
    normalizeUuid(payload.packingId);

  if (!packingId) {
    return {
      ok: false,
      reason:
        "packing_id_invalid",
    };
  }

  return {
    ok: true,
    value: {
      packingId,
    },
  };
}

function normalizeSealPackage(
  payload,
) {
  const packingId =
    normalizeUuid(payload.packingId);

  if (!packingId) {
    return {
      ok: false,
      reason:
        "packing_id_invalid",
    };
  }

  const packageId =
    normalizeUuid(payload.packageId);

  if (!packageId) {
    return {
      ok: false,
      reason:
        "package_id_invalid",
    };
  }

  const sealNumber =
    optionalText(payload.sealNumber);

  if (!sealNumber.ok) {
    return {
      ok: false,
      reason:
        "seal_number_invalid",
    };
  }

  const actualWeight =
    optionalPositiveQuantity(
      payload.actualWeight,
    );

  if (!actualWeight.ok) {
    return {
      ok: false,
      reason:
        "actual_weight_invalid",
    };
  }

  const actualVolume =
    optionalPositiveQuantity(
      payload.actualVolume,
    );

  if (!actualVolume.ok) {
    return {
      ok: false,
      reason:
        "actual_volume_invalid",
    };
  }

  return {
    ok: true,
    value: {
      packingId,
      packageId,

      ...(sealNumber.value
        ? {
            sealNumber:
              sealNumber.value,
          }
        : {}),

      ...(actualWeight.value !== null
        ? {
            actualWeight:
              actualWeight.value,
          }
        : {}),

      ...(actualVolume.value !== null
        ? {
            actualVolume:
              actualVolume.value,
          }
        : {}),
    },
  };
}

function normalizeGeneratePackageLabel(
  payload,
) {
  const packingId =
    normalizeUuid(payload.packingId);

  if (!packingId) {
    return {
      ok: false,
      reason:
        "packing_id_invalid",
    };
  }

  const packageId =
    normalizeUuid(payload.packageId);

  if (!packageId) {
    return {
      ok: false,
      reason:
        "package_id_invalid",
    };
  }

  const format =
    optionalText(
      payload.format,
    );

  if (!format.ok) {
    return {
      ok: false,
      reason:
        "label_format_invalid",
    };
  }

  const normalizedFormat =
    (
      format.value ||
      "zpl"
    ).toLowerCase();

  if (
    ![
      "zpl",
      "pdf",
      "png",
      "svg",
      "text",
    ].includes(
      normalizedFormat,
    )
  ) {
    return {
      ok: false,
      reason:
        "label_format_invalid",
    };
  }

  const printerId =
    optionalText(
      payload.printerId,
    );

  if (!printerId.ok) {
    return {
      ok: false,
      reason:
        "printer_id_invalid",
    };
  }

  return {
    ok: true,
    value: {
      packingId,
      packageId,
      format:
        normalizedFormat,

      ...(printerId.value
        ? {
            printerId:
              printerId.value,
          }
        : {}),
    },
  };
}

function normalizeResolveException(
  payload,
) {
  const packingId =
    normalizeUuid(payload.packingId);

  if (!packingId) {
    return {
      ok: false,
      reason:
        "packing_id_invalid",
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

  if (!resolutionNotes.ok) {
    return {
      ok: false,
      reason:
        "resolution_notes_invalid",
    };
  }

  return {
    ok: true,
    value: {
      packingId,
      exceptionId,

      ...(resolutionNotes.value
        ? {
            resolutionNotes:
              resolutionNotes.value,
          }
        : {}),
    },
  };
}

function normalizeCancel(
  payload,
) {
  const base =
    normalizePackingOnly(
      payload,
    );

  if (!base.ok) {
    return base;
  }

  const reason =
    optionalText(
      payload.reason,
    );

  if (
    !reason.ok ||
    !reason.value
  ) {
    return {
      ok: false,
      reason:
        "cancellation_reason_invalid",
    };
  }

  return {
    ok: true,
    value: {
      packingId:
        base.value.packingId,
      reason:
        reason.value,
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
    normalizeUuid(body.accountId);

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
    normalizeUuid(requestId);

  if (!normalizedRequestId) {
    return {
      ok: false,
      reason:
        "request_id_invalid",
    };
  }

  const payload =
    body.payload &&
    typeof body.payload === "object" &&
    !Array.isArray(body.payload)
      ? body.payload
      : {};

  let normalizedPayload;

  if (
    action ===
    "create_from_picking"
  ) {
    normalizedPayload =
      normalizeCreateFromPicking(
        payload,
      );
  } else if (
    action ===
    "create_package"
  ) {
    normalizedPayload =
      normalizeCreatePackage(
        payload,
      );
  } else if (
    action ===
    "confirm_item"
  ) {
    normalizedPayload =
      normalizeConfirmItem(
        payload,
      );
  } else if (
    action ===
    "seal_package"
  ) {
    normalizedPayload =
      normalizeSealPackage(
        payload,
      );
  } else if (
    action ===
    "generate_package_label"
  ) {
    normalizedPayload =
      normalizeGeneratePackageLabel(
        payload,
      );
  } else if (
    action ===
    "resolve_exception"
  ) {
    normalizedPayload =
      normalizeResolveException(
        payload,
      );
  } else if (
    action ===
    "cancel"
  ) {
    normalizedPayload =
      normalizeCancel(
        payload,
      );
  } else {
    normalizedPayload =
      normalizePackingOnly(
        payload,
      );
  }

  if (!normalizedPayload.ok) {
    return normalizedPayload;
  }

  return {
    ok: true,
    value: {
      accountId,
      action,
      requestId:
        normalizedRequestId,
      payload:
        normalizedPayload.value,
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

function packingRpcRequest(
  input,
) {
  if (
    input.action ===
    "create_from_picking"
  ) {
    return {
      path:
        "/rest/v1/rpc/warehouse_packing_create_from_picking",

      body: {
        p_request_id:
          input.requestId,

        p_account_id:
          input.accountId,

        p_picking_id:
          input.payload.pickingId,

        p_packing_location_id:
          input.payload
            .packingLocationId,

        p_shipping_location_id:
          input.payload
            .shippingLocationId ??
          null,

        p_strategy:
          input.payload.strategy ??
          "cartonization",

        p_priority:
          input.payload.priority ??
          null,

        p_planned_at:
          input.payload.plannedAt ??
          null,

        p_notes:
          input.payload.notes ??
          null,
      },
    };
  }

  if (
    input.action ===
    "confirm_item"
  ) {
    return {
      path:
        "/rest/v1/rpc/warehouse_packing_confirm_item_write",

      body: {
        p_request_id:
          input.requestId,

        p_account_id:
          input.accountId,

        p_packing_id:
          input.payload.packingId,

        p_packing_item_id:
          input.payload
            .packingItemId,

        p_package_id:
          input.payload.packageId,

        p_quantity:
          input.payload.quantity,

        p_damaged_quantity:
          input.payload
            .damagedQuantity,

        p_missing_quantity:
          input.payload
            .missingQuantity,

        p_barcode:
          input.payload.barcode ??
          null,

        p_lot_number:
          input.payload.lotNumber ??
          null,

        p_serial_number:
          input.payload
            .serialNumber ??
          null,

        p_notes:
          input.payload.notes ??
          null,
      },
    };
  }

  if (
    input.action ===
    "seal_package"
  ) {
    return {
      path:
        "/rest/v1/rpc/warehouse_packing_seal_package_write",

      body: {
        p_request_id:
          input.requestId,
        p_account_id:
          input.accountId,
        p_packing_id:
          input.payload.packingId,
        p_package_id:
          input.payload.packageId,
        p_seal_number:
          input.payload.sealNumber ??
          null,
        p_actual_weight:
          input.payload.actualWeight ??
          null,
        p_actual_volume:
          input.payload.actualVolume ??
          null,
      },
    };
  }

  if (
    input.action ===
    "generate_package_label"
  ) {
    return {
      path:
        "/rest/v1/rpc/warehouse_packing_generate_package_label_write",

      body: {
        p_request_id:
          input.requestId,
        p_account_id:
          input.accountId,
        p_packing_id:
          input.payload.packingId,
        p_package_id:
          input.payload.packageId,
        p_format:
          input.payload.format ??
          "zpl",
        p_printer_id:
          input.payload.printerId ??
          null,
      },
    };
  }

  if (
    input.action ===
    "resolve_exception"
  ) {
    return {
      path:
        "/rest/v1/rpc/warehouse_packing_resolve_exception_write",

      body: {
        p_request_id:
          input.requestId,
        p_account_id:
          input.accountId,
        p_packing_id:
          input.payload.packingId,
        p_exception_id:
          input.payload.exceptionId,
        p_resolution_notes:
          input.payload
            .resolutionNotes ??
          null,
      },
    };
  }

  if (
    input.action ===
    "complete"
  ) {
    return {
      path:
        "/rest/v1/rpc/warehouse_packing_complete_write",

      body: {
        p_request_id:
          input.requestId,
        p_account_id:
          input.accountId,
        p_packing_id:
          input.payload.packingId,
      },
    };
  }

  if (
    input.action ===
    "mark_shipping_ready"
  ) {
    return {
      path:
        "/rest/v1/rpc/warehouse_packing_mark_shipping_ready_write",

      body: {
        p_request_id:
          input.requestId,
        p_account_id:
          input.accountId,
        p_packing_id:
          input.payload.packingId,
      },
    };
  }

  if (
    input.action ===
    "cancel"
  ) {
    return {
      path:
        "/rest/v1/rpc/warehouse_packing_cancel_write",

      body: {
        p_request_id:
          input.requestId,
        p_account_id:
          input.accountId,
        p_packing_id:
          input.payload.packingId,
        p_reason:
          input.payload.reason,
      },
    };
  }

  return {
    path:
      "/rest/v1/rpc/warehouse_packing_write",

    body: {
      p_action:
        input.action,

      p_request_id:
        input.requestId,

      p_account_id:
        input.accountId,

      p_payload:
        input.payload,
    },
  };
}

async function invokePackingWrite(
  env,
  token,
  input,
  fetchImpl,
) {
  const rpc =
    packingRpcRequest(input);

  const response =
    await fetchImpl(
      new URL(
        rpc.path,
        env.SUPABASE_URL,
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
            "application/json",

          Accept:
            "application/json",
        },

        body:
          JSON.stringify(
            rpc.body,
          ),
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
      result?.data?.code ||
      "",
    );

  const message =
    String(
      result?.data?.message ||
        "Paketleme işlemi tamamlanamadı.",
    );

  if (code === "42501") {
    return {
      status: 403,
      code:
        API_ERROR_CODES.FORBIDDEN,
      message,
    };
  }

  if (code === "23505") {
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
    code === "22007" ||
    code === "23514"
  ) {
    return {
      status: 400,
      code:
        API_ERROR_CODES.BAD_REQUEST,
      message,
    };
  }

  if (code === "40001") {
    return {
      status: 409,
      code:
        API_ERROR_CODES.CONFLICT,
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
        ? API_ERROR_CODES
            .UPSTREAM_ERROR
        : API_ERROR_CODES
            .BAD_REQUEST,

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
    context.fetch ??
    fetch;

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
          API_ERROR_CODES
            .SERVER_MISCONFIGURED,
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
          "Paketleme işlemi desteklenmiyor.",

        request_id_invalid:
          "Idempotency-Key başlığı geçerli bir UUID olmalıdır.",

        picking_id_invalid:
          "Toplama kimliği geçerli bir UUID olmalıdır.",

        packing_id_invalid:
          "Paketleme kimliği geçerli bir UUID olmalıdır.",

        packing_item_id_invalid:
          "Paketleme satır kimliği geçerli bir UUID olmalıdır.",

        packing_location_id_invalid:
          "Paketleme lokasyonu geçerli bir UUID olmalıdır.",

        shipping_location_id_invalid:
          "Sevkiyat lokasyonu geçerli bir UUID olmalıdır.",

        container_id_invalid:
          "Ambalaj kimliği geçerli bir UUID olmalıdır.",

        parent_package_id_invalid:
          "Üst paket kimliği geçerli bir UUID olmalıdır.",

        package_id_invalid:
          "Paket kimliği geçerli bir UUID olmalıdır.",

        strategy_invalid:
          "Paketleme stratejisi metin olmalıdır.",

        priority_invalid:
          "Paketleme önceliği 1 ile 100 arasında tam sayı olmalıdır.",

        planned_at_invalid:
          "Planlanan zaman metin olmalıdır.",

        weight_unit_invalid:
          "Ağırlık birimi metin olmalıdır.",

        volume_unit_invalid:
          "Hacim birimi metin olmalıdır.",

        quantity_invalid:
          "Paketleme miktarları sıfır veya sıfırdan büyük sayılar olmalıdır.",

        quantity_empty:
          "Paketlenen, hasarlı veya eksik miktardan en az biri sıfırdan büyük olmalıdır.",

        barcode_invalid:
          "Barkod metin olmalıdır.",

        lot_number_invalid:
          "Lot numarası metin olmalıdır.",

        serial_number_invalid:
          "Seri numarası metin olmalıdır.",

        notes_invalid:
          "Paketleme notu metin olmalıdır.",

        seal_number_invalid:
          "Mühür numarası metin olmalıdır.",

        actual_weight_invalid:
          "Gerçek paket ağırlığı sıfırdan büyük sayı olmalıdır.",

        actual_volume_invalid:
          "Gerçek paket hacmi sıfırdan büyük sayı olmalıdır.",

        label_format_invalid:
          "Etiket formatı zpl, pdf, png, svg veya text olmalıdır.",

        printer_id_invalid:
          "Yazıcı kimliği metin olmalıdır.",

        exception_id_invalid:
          "Paketleme istisnası kimliği geçerli bir UUID olmalıdır.",

        resolution_notes_invalid:
          "İstisna çözüm notu metin olmalıdır.",

        cancellation_reason_invalid:
          "Paketleme iptal nedeni boş bırakılamaz.",
      };

      return corsJsonError(
        400,
        API_ERROR_CODES.BAD_REQUEST,
        messages[
          normalized.reason
        ] ||
          "Paketleme isteği geçersizdir.",
        origin,
        undefined,
        responseHeaders(),
      );
    }

    const result =
      await invokePackingWrite(
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

        "warehouse_packing_write_failed",

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
      "warehouse_packing_write_succeeded",
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
      "warehouse_packing_write_unhandled",
      {
        message:
          error instanceof Error
            ? error.message
            : "Bilinmeyen hata",
      },
    );

    return corsJsonError(
      500,
      API_ERROR_CODES.INTERNAL_ERROR,
      "Paketleme işlemi sırasında beklenmeyen bir hata oluştu.",
      origin,
      undefined,
      responseHeaders(),
    );
  }
}

export function onRequestOptions(
  context,
) {
  const origin =
    context.request.headers.get(
      "Origin",
    );

  return new Response(
    null,
    {
      status: 204,

      headers:
        buildCorsJsonHeaders(
          origin,
          responseHeaders(),
        ),
    },
  );
}
