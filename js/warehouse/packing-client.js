const PACKING_API_URL =
  "/api/warehouse/packing";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTIONS = Object.freeze([
  "create_from_picking",
  "create_package",
  "confirm_item",
  "seal_package",
  "generate_package_label",
  "resolve_exception",
  "complete",
  "mark_shipping_ready",
  "cancel"
]);

function uuid(value, label) {
  const result =
    String(value || "")
      .trim()
      .toLowerCase();

  if (!UUID.test(result)) {
    throw new Error(
      `${label} geçerli bir UUID olmalıdır.`
    );
  }

  return result;
}

function optionalUuid(value, label) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  return uuid(value, label);
}

function token(value) {
  const result =
    String(value || "").trim();

  if (!result) {
    throw new Error(
      "WarehouseIQ oturumu gerekli."
    );
  }

  return result;
}

function optionalText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function quantity(value, label) {
  const result = Number(value);

  if (
    !Number.isFinite(result) ||
    result < 0
  ) {
    throw new Error(
      `${label} sıfır veya sıfırdan büyük olmalıdır.`
    );
  }

  return result;
}

function requestId() {
  if (
    typeof globalThis.crypto?.randomUUID !==
    "function"
  ) {
    throw new Error(
      "Güvenli istek kimliği üretilemiyor."
    );
  }

  return globalThis.crypto.randomUUID();
}

async function responseBody(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function buildPackingCreateFromPickingPayload(
  input
) {
  const shippingLocationId =
    optionalUuid(
      input?.shippingLocationId,
      "Sevkiyat lokasyonu kimliği"
    );

  const strategy =
    optionalText(input?.strategy);

  const plannedAt =
    optionalText(input?.plannedAt);

  const notes =
    optionalText(input?.notes);

  let priority = null;

  if (
    input?.priority !== undefined &&
    input?.priority !== null &&
    String(input.priority).trim() !== ""
  ) {
    priority = Number(input.priority);

    if (
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 100
    ) {
      throw new Error(
        "Öncelik 1 ile 100 arasında tam sayı olmalıdır."
      );
    }
  }

  return Object.freeze({
    pickingId:
      uuid(
        input?.pickingId,
        "Toplama kimliği"
      ),

    packingLocationId:
      uuid(
        input?.packingLocationId,
        "Paketleme lokasyonu kimliği"
      ),

    ...(shippingLocationId
      ? { shippingLocationId }
      : {}),

    ...(strategy
      ? { strategy }
      : {}),

    ...(priority !== null
      ? { priority }
      : {}),

    ...(plannedAt
      ? { plannedAt }
      : {}),

    ...(notes
      ? { notes }
      : {})
  });
}

export function buildPackingCreatePackagePayload(
  input
) {
  const parentPackageId =
    optionalUuid(
      input?.parentPackageId,
      "Üst paket kimliği"
    );

  const weightUnit =
    optionalText(
      input?.weightUnit
    );

  const volumeUnit =
    optionalText(
      input?.volumeUnit
    );

  return Object.freeze({
    packingId:
      uuid(
        input?.packingId,
        "Paketleme kimliği"
      ),

    containerId:
      uuid(
        input?.containerId,
        "Ambalaj kimliği"
      ),

    ...(parentPackageId
      ? { parentPackageId }
      : {}),

    ...(weightUnit
      ? { weightUnit }
      : {}),

    ...(volumeUnit
      ? { volumeUnit }
      : {})
  });
}

export function buildPackingConfirmItemPayload(
  input
) {
  const packed =
    quantity(
      input?.quantity ?? 0,
      "Paketlenen miktar"
    );

  const damaged =
    quantity(
      input?.damagedQuantity ?? 0,
      "Hasarlı miktar"
    );

  const missing =
    quantity(
      input?.missingQuantity ?? 0,
      "Eksik miktar"
    );

  if (
    packed +
      damaged +
      missing <=
    0
  ) {
    throw new Error(
      "Paketlenen, hasarlı veya eksik miktardan en az biri sıfırdan büyük olmalıdır."
    );
  }

  const barcode =
    optionalText(
      input?.barcode
    );

  const lotNumber =
    optionalText(
      input?.lotNumber
    );

  const serialNumber =
    optionalText(
      input?.serialNumber
    );

  const notes =
    optionalText(
      input?.notes
    );

  return Object.freeze({
    packingId:
      uuid(
        input?.packingId,
        "Paketleme kimliği"
      ),

    packingItemId:
      uuid(
        input?.packingItemId,
        "Paketleme satır kimliği"
      ),

    packageId:
      uuid(
        input?.packageId,
        "Paket kimliği"
      ),

    quantity:
      packed,

    damagedQuantity:
      damaged,

    missingQuantity:
      missing,

    ...(barcode
      ? { barcode }
      : {}),

    ...(lotNumber
      ? { lotNumber }
      : {}),

    ...(serialNumber
      ? { serialNumber }
      : {}),

    ...(notes
      ? { notes }
      : {})
  });
}


function positiveOptionalQuantity(
  value,
  label
) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const result =
    Number(value);

  if (
    !Number.isFinite(result) ||
    result <= 0
  ) {
    throw new Error(
      `${label} sıfırdan büyük olmalıdır.`
    );
  }

  return result;
}

export function buildPackingSealPackagePayload(
  input
) {
  const sealNumber =
    optionalText(
      input?.sealNumber
    );

  const actualWeight =
    positiveOptionalQuantity(
      input?.actualWeight,
      "Gerçek paket ağırlığı"
    );

  const actualVolume =
    positiveOptionalQuantity(
      input?.actualVolume,
      "Gerçek paket hacmi"
    );

  return Object.freeze({
    packingId:
      uuid(
        input?.packingId,
        "Paketleme kimliği"
      ),

    packageId:
      uuid(
        input?.packageId,
        "Paket kimliği"
      ),

    ...(sealNumber
      ? { sealNumber }
      : {}),

    ...(actualWeight !== null
      ? { actualWeight }
      : {}),

    ...(actualVolume !== null
      ? { actualVolume }
      : {})
  });
}

export function buildPackingGeneratePackageLabelPayload(
  input
) {
  const format =
    (
      optionalText(
        input?.format
      ) ||
      "zpl"
    ).toLowerCase();

  if (
    ![
      "zpl",
      "pdf",
      "png",
      "svg",
      "text"
    ].includes(format)
  ) {
    throw new Error(
      "Etiket formatı geçersizdir."
    );
  }

  const printerId =
    optionalText(
      input?.printerId
    );

  return Object.freeze({
    packingId:
      uuid(
        input?.packingId,
        "Paketleme kimliği"
      ),

    packageId:
      uuid(
        input?.packageId,
        "Paket kimliği"
      ),

    format,

    ...(printerId
      ? { printerId }
      : {})
  });
}

export function buildPackingResolveExceptionPayload(
  input
) {
  const resolutionNotes =
    optionalText(
      input?.resolutionNotes
    );

  return Object.freeze({
    packingId:
      uuid(
        input?.packingId,
        "Paketleme kimliği"
      ),

    exceptionId:
      uuid(
        input?.exceptionId,
        "Paketleme istisnası kimliği"
      ),

    ...(resolutionNotes
      ? { resolutionNotes }
      : {})
  });
}

export function buildPackingCompletePayload(
  input
) {
  return Object.freeze({
    packingId:
      uuid(
        input?.packingId,
        "Paketleme kimliği"
      )
  });
}

export function buildPackingMarkShippingReadyPayload(
  input
) {
  return Object.freeze({
    packingId:
      uuid(
        input?.packingId,
        "Paketleme kimliği"
      )
  });
}

export function buildPackingCancelPayload(
  input
) {
  const reason =
    optionalText(
      input?.reason
    );

  if (!reason) {
    throw new Error(
      "Paketleme iptal nedeni zorunludur."
    );
  }

  return Object.freeze({
    packingId:
      uuid(
        input?.packingId,
        "Paketleme kimliği"
      ),
    reason
  });
}

export async function writePacking({
  accessToken,
  accountId,
  action,
  payload,
  requestId: suppliedRequestId =
    requestId(),
  fetchImpl = fetch
}) {
  const bearer =
    token(accessToken);

  const normalizedAccountId =
    uuid(
      accountId,
      "Firma kimliği"
    );

  const normalizedRequestId =
    uuid(
      suppliedRequestId,
      "İstek kimliği"
    );

  const normalizedAction =
    String(action || "")
      .trim()
      .toLowerCase();

  if (
    !ACTIONS.includes(
      normalizedAction
    )
  ) {
    throw new Error(
      "Desteklenmeyen paketleme işlemi."
    );
  }

  const response =
    await fetchImpl(
      PACKING_API_URL,
      {
        method:
          "POST",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${bearer}`,

          "Content-Type":
            "application/json",

          "Idempotency-Key":
            normalizedRequestId
        },

        cache:
          "no-store",

        body:
          JSON.stringify({
            accountId:
              normalizedAccountId,

            action:
              normalizedAction,

            payload
          })
      }
    );

  const body =
    await responseBody(
      response
    );

  if (
    !response.ok ||
    !body?.ok
  ) {
    throw new Error(
      body?.error?.message ||
      body?.message ||
      "Paketleme işlemi tamamlanamadı."
    );
  }

  return Object.freeze({
    requestId:
      normalizedRequestId,

    data:
      body.data
  });
}

export async function createPackingFromPicking(
  input
) {
  return writePacking({
    accessToken:
      input.accessToken,

    accountId:
      input.accountId,

    action:
      "create_from_picking",

    payload:
      buildPackingCreateFromPickingPayload(
        input
      ),

    requestId:
      input.requestId,

    fetchImpl:
      input.fetchImpl
  });
}

export async function createPackingPackage(
  input
) {
  return writePacking({
    accessToken:
      input.accessToken,

    accountId:
      input.accountId,

    action:
      "create_package",

    payload:
      buildPackingCreatePackagePayload(
        input
      ),

    requestId:
      input.requestId,

    fetchImpl:
      input.fetchImpl
  });
}

export async function confirmPackingItem(
  input
) {
  return writePacking({
    accessToken:
      input.accessToken,

    accountId:
      input.accountId,

    action:
      "confirm_item",

    payload:
      buildPackingConfirmItemPayload(
        input
      ),

    requestId:
      input.requestId,

    fetchImpl:
      input.fetchImpl
  });
}

export async function sealPackingPackage(
  input
) {
  return writePacking({
    accessToken:
      input.accessToken,
    accountId:
      input.accountId,
    action:
      "seal_package",
    payload:
      buildPackingSealPackagePayload(
        input
      ),
    requestId:
      input.requestId,
    fetchImpl:
      input.fetchImpl
  });
}

export async function generatePackingPackageLabel(
  input
) {
  return writePacking({
    accessToken:
      input.accessToken,
    accountId:
      input.accountId,
    action:
      "generate_package_label",
    payload:
      buildPackingGeneratePackageLabelPayload(
        input
      ),
    requestId:
      input.requestId,
    fetchImpl:
      input.fetchImpl
  });
}

export async function resolvePackingException(
  input
) {
  return writePacking({
    accessToken:
      input.accessToken,
    accountId:
      input.accountId,
    action:
      "resolve_exception",
    payload:
      buildPackingResolveExceptionPayload(
        input
      ),
    requestId:
      input.requestId,
    fetchImpl:
      input.fetchImpl
  });
}

export async function completePacking(
  input
) {
  return writePacking({
    accessToken:
      input.accessToken,
    accountId:
      input.accountId,
    action:
      "complete",
    payload:
      buildPackingCompletePayload(
        input
      ),
    requestId:
      input.requestId,
    fetchImpl:
      input.fetchImpl
  });
}

export async function markPackingShippingReady(
  input
) {
  return writePacking({
    accessToken:
      input.accessToken,
    accountId:
      input.accountId,
    action:
      "mark_shipping_ready",
    payload:
      buildPackingMarkShippingReadyPayload(
        input
      ),
    requestId:
      input.requestId,
    fetchImpl:
      input.fetchImpl
  });
}

export async function cancelPacking(
  input
) {
  return writePacking({
    accessToken:
      input.accessToken,
    accountId:
      input.accountId,
    action:
      "cancel",
    payload:
      buildPackingCancelPayload(
        input
      ),
    requestId:
      input.requestId,
    fetchImpl:
      input.fetchImpl
  });
}
