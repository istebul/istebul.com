const API_URL =
  "/api/warehouse/cycle-count-recount-quantity";

const ACTION =
  "record_recount_quantity";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? "").trim();
}

function requireUuid(
  value,
  label
) {
  const normalized =
    text(value);

  if (
    !UUID_PATTERN.test(
      normalized
    )
  ) {
    throw new Error(
      `${label} geçerli bir UUID olmalıdır.`
    );
  }

  return normalized;
}

function requireScan(
  value,
  label
) {
  const normalized =
    text(value);

  if (!normalized) {
    throw new Error(
      `${label} gereklidir.`
    );
  }

  return normalized;
}

function normalizeQuantity(
  value
) {
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    typeof value === "boolean"
  ) {
    throw new Error(
      "Yeniden sayılan miktarı girin."
    );
  }

  const quantity =
    Number(value);

  if (
    !Number.isFinite(
      quantity
    )
  ) {
    throw new Error(
      "Yeniden sayılan miktar geçerli bir sayı olmalıdır."
    );
  }

  if (quantity < 0) {
    throw new Error(
      "Yeniden sayılan miktar sıfır veya daha büyük olmalıdır."
    );
  }

  return quantity;
}

function normalizeNotes(
  value
) {
  const notes =
    text(value);

  if (
    notes.length >
    1000
  ) {
    throw new Error(
      "Yeniden sayım notu 1000 karakteri aşamaz."
    );
  }

  return notes;
}

async function readBody(
  response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function responseMessage(
  body,
  fallback
) {
  return (
    body?.error?.message ||
    body?.message ||
    fallback
  );
}

export function buildCycleCountRecountPayload(
  input
) {
  return {
    cycleCountId:
      requireUuid(
        input?.cycleCountId,
        "Cycle Count kimliği"
      ),

    cycleCountItemId:
      requireUuid(
        input?.cycleCountItemId,
        "Cycle Count satırı kimliği"
      ),

    taskId:
      requireUuid(
        input?.taskId,
        "Yeniden sayım görevi kimliği"
      ),

    countedQuantity:
      normalizeQuantity(
        input?.countedQuantity
      ),

    locationScan:
      requireScan(
        input?.locationScan,
        "Lokasyon taraması"
      ),

    productScan:
      requireScan(
        input?.productScan,
        "Ürün / SKU taraması"
      ),

    notes:
      normalizeNotes(
        input?.notes
      )
  };
}

export async function recordCycleCountRecountQuantity({
  accessToken,
  accountId,
  warehouseId,
  cycleCountId,
  cycleCountItemId,
  taskId,
  countedQuantity,
  locationScan,
  productScan,
  notes,
  requestId,
  fetchImpl =
    globalThis.fetch
}) {
  const token =
    text(accessToken);

  if (!token) {
    throw new Error(
      "WarehouseIQ oturumu gereklidir."
    );
  }

  const normalizedAccountId =
    requireUuid(
      accountId,
      "Firma kimliği"
    );

  const normalizedWarehouseId =
    requireUuid(
      warehouseId,
      "Depo kimliği"
    );

  const normalizedRequestId =
    requireUuid(
      requestId,
      "Idempotency-Key"
    );

  if (
    typeof fetchImpl !==
    "function"
  ) {
    throw new Error(
      "Güvenli yeniden sayım bağlantısı kullanılamıyor."
    );
  }

  const payload =
    buildCycleCountRecountPayload({
      cycleCountId,
      cycleCountItemId,
      taskId,
      countedQuantity,
      locationScan,
      productScan,
      notes
    });

  let response;

  try {
    response =
      await fetchImpl(
        API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization:
              `Bearer ${token}`,
            "Idempotency-Key":
              normalizedRequestId
          },
          body:
            JSON.stringify({
              accountId:
                normalizedAccountId,
              warehouseId:
                normalizedWarehouseId,
              action:
                ACTION,
              payload
            })
        }
      );
  } catch (cause) {
    const error =
      new Error(
        "Yeniden sayım miktarı servisine ulaşılamadı."
      );

    error.cause = cause;
    error.retryable = true;

    throw error;
  }

  const body =
    await readBody(
      response
    );

  if (!response.ok) {
    const error =
      new Error(
        responseMessage(
          body,
          "Yeniden sayım miktarı kaydedilemedi."
        )
      );

    error.status =
      response.status;

    error.retryable =
      response.status >= 500;

    throw error;
  }

  if (
    !body ||
    body.ok !== true ||
    !body.data
  ) {
    throw new Error(
      "Yeniden sayım servisi geçerli bir sonuç döndürmedi."
    );
  }

  return {
    ...body.data,
    requestId:
      normalizedRequestId
  };
}
