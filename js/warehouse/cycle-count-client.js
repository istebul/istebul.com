const API_URL =
  "/api/warehouse/cycle-count-quantity";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_QUANTITY =
  999999999999.999999;

function requireUuid(
  value,
  label
) {
  const normalized =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

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

function requireAccessToken(
  value
) {
  const normalized =
    String(
      value || ""
    ).trim();

  if (!normalized) {
    throw new Error(
      "WarehouseIQ oturumu gerekli."
    );
  }

  return normalized;
}

function requireScan(
  value,
  label
) {
  const normalized =
    String(
      value || ""
    ).trim();

  if (!normalized) {
    throw new Error(
      `${label} zorunludur.`
    );
  }

  if (
    normalized.length >
    255
  ) {
    throw new Error(
      `${label} en fazla 255 karakter olabilir.`
    );
  }

  return normalized;
}

function normalizeQuantity(
  value
) {
  const quantity =
    Number(value);

  if (
    !Number.isFinite(
      quantity
    ) ||
    quantity < 0 ||
    quantity >
      MAX_QUANTITY
  ) {
    throw new Error(
      "Sayılan miktar sıfır veya daha büyük geçerli bir sayı olmalıdır."
    );
  }

  return quantity;
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
    throw new Error(
      "Sayım notu metin olmalıdır."
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length >
    1000
  ) {
    throw new Error(
      "Sayım notu en fazla 1000 karakter olabilir."
    );
  }

  return normalized || null;
}

function createRequestId() {
  if (
    typeof globalThis.crypto
      ?.randomUUID !==
    "function"
  ) {
    throw new Error(
      "Güvenli istek kimliği üretilemiyor. Tarayıcınızı güncelleyip yeniden deneyin."
    );
  }

  return globalThis.crypto
    .randomUUID();
}

async function readJsonSafely(
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

export function buildCycleCountQuantityPayload(
  input
) {
  return Object.freeze({
    cycleCountId:
      requireUuid(
        input?.cycleCountId,
        "Sayım kimliği"
      ),

    cycleCountItemId:
      requireUuid(
        input?.cycleCountItemId,
        "Sayım satırı kimliği"
      ),

    taskId:
      requireUuid(
        input?.taskId,
        "Sayım görevi kimliği"
      ),

    countedQuantity:
      normalizeQuantity(
        input?.countedQuantity
      ),

    locationScan:
      requireScan(
        input?.locationScan,
        "Doğrulanmış lokasyon taraması"
      ),

    productScan:
      requireScan(
        input?.productScan,
        "Doğrulanmış ürün veya SKU taraması"
      ),

    notes:
      normalizeNotes(
        input?.notes
      )
  });
}

export async function recordCycleCountQuantity({
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
  requestId = createRequestId(),
  fetchImpl = fetch
}) {
  const token =
    requireAccessToken(
      accessToken
    );

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
      "İstek kimliği"
    );

  const payload =
    buildCycleCountQuantityPayload({
      cycleCountId,
      cycleCountItemId,
      taskId,
      countedQuantity,
      locationScan,
      productScan,
      notes
    });

  const response =
    await fetchImpl(
      API_URL,
      {
        method:
          "POST",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${token}`,

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

            warehouseId:
              normalizedWarehouseId,

            action:
              "record_quantity",

            payload
          })
      }
    );

  const body =
    await readJsonSafely(
      response
    );

  if (
    !response.ok ||
    !body?.ok
  ) {
    if (
      response.status ===
      401
    ) {
      throw new Error(
        responseMessage(
          body,
          "WarehouseIQ oturumunuz geçersiz veya süresi dolmuş."
        )
      );
    }

    if (
      response.status ===
      403
    ) {
      throw new Error(
        responseMessage(
          body,
          "Bu sayım görevi için miktar kaydetme yetkiniz bulunmuyor."
        )
      );
    }

    if (
      response.status ===
      404
    ) {
      throw new Error(
        responseMessage(
          body,
          "Sayım görevi veya sayım satırı artık bulunamıyor."
        )
      );
    }

    if (
      response.status ===
      409
    ) {
      throw new Error(
        responseMessage(
          body,
          "Bu ilk sayım daha önce kaydedilmiş veya başka bir işlemle çakışmış olabilir."
        )
      );
    }

    if (
      response.status ===
      422
    ) {
      throw new Error(
        responseMessage(
          body,
          "Sayım miktarı veya doğrulama bilgileri geçerli değil."
        )
      );
    }

    throw new Error(
      responseMessage(
        body,
        "Sayım miktarı kaydedilemedi."
      )
    );
  }

  return Object.freeze({
    requestId:
      normalizedRequestId,

    data:
      body.data
  });
}
