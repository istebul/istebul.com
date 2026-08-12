const PICKING_API_URL =
  "/api/warehouse/picking";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(
  value,
  fieldLabel
) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(
      `${fieldLabel} geçerli bir UUID olmalıdır.`
    );
  }

  return normalized;
}

function requireAccessToken(value) {
  const normalized =
    String(value || "").trim();

  if (!normalized) {
    throw new Error(
      "WarehouseIQ oturumu gerekli."
    );
  }

  return normalized;
}

function normalizeNonNegativeQuantity(
  value,
  fieldLabel
) {
  const quantity =
    Number(value);

  if (
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    throw new Error(
      `${fieldLabel} sıfır veya sıfırdan büyük olmalıdır.`
    );
  }

  return quantity;
}

function requireBarcode(value) {
  const normalized =
    String(value || "").trim();

  if (!normalized) {
    throw new Error(
      "Doğrulanmış ürün veya SKU barkodu zorunludur."
    );
  }

  if (normalized.length > 128) {
    throw new Error(
      "Barkod en fazla 128 karakter olabilir."
    );
  }

  return normalized;
}

function optionalText(
  value,
  fieldLabel
) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error(
      `${fieldLabel} metin olmalıdır.`
    );
  }

  return value.trim();
}

function createRequestId() {
  if (
    typeof globalThis.crypto?.randomUUID !==
    "function"
  ) {
    throw new Error(
      "Güvenli istek kimliği üretilemiyor. Tarayıcınızı güncelleyip yeniden deneyin."
    );
  }

  return globalThis.crypto.randomUUID();
}

function apiErrorMessage(
  body,
  fallback
) {
  return (
    body?.error?.message ||
    body?.message ||
    fallback
  );
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

export function buildPickingExecuteItemPayload(
  input
) {
  const sourceLocationId =
    requireUuid(
      input?.sourceLocationId,
      "Kaynak lokasyon kimliği"
    );

  const destinationLocationId =
    requireUuid(
      input?.destinationLocationId,
      "Hedef lokasyon kimliği"
    );

  if (
    sourceLocationId ===
    destinationLocationId
  ) {
    throw new Error(
      "Kaynak ve hedef lokasyon aynı olamaz."
    );
  }

  const quantity =
    normalizeNonNegativeQuantity(
      input?.quantity,
      "Toplanan miktar"
    );

  const shortQuantity =
    normalizeNonNegativeQuantity(
      input?.shortQuantity ?? 0,
      "Eksik toplama miktarı"
    );

  if (
    quantity +
      shortQuantity <=
    0
  ) {
    throw new Error(
      "Toplanan miktar veya eksik toplama miktarından en az biri sıfırdan büyük olmalıdır."
    );
  }

  const barcode =
    requireBarcode(
      input?.barcode
    );

  const lotNumber =
    optionalText(
      input?.lotNumber,
      "Lot numarası"
    );

  const serialNumber =
    optionalText(
      input?.serialNumber,
      "Seri numarası"
    );

  const notes =
    optionalText(
      input?.notes,
      "Toplama notu"
    );

  return Object.freeze({
    pickingId:
      requireUuid(
        input?.pickingId,
        "Toplama kimliği"
      ),

    pickingItemId:
      requireUuid(
        input?.pickingItemId,
        "Toplama satır kimliği"
      ),

    sourceLocationId,
    destinationLocationId,
    quantity,
    shortQuantity,
    barcode,

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

export async function executePickingItem({
  accessToken,
  accountId,
  pickingId,
  pickingItemId,
  sourceLocationId,
  destinationLocationId,
  quantity,
  shortQuantity = 0,
  barcode,
  lotNumber,
  serialNumber,
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

  const normalizedRequestId =
    requireUuid(
      requestId,
      "İstek kimliği"
    );

  const payload =
    buildPickingExecuteItemPayload({
      pickingId,
      pickingItemId,
      sourceLocationId,
      destinationLocationId,
      quantity,
      shortQuantity,
      barcode,
      lotNumber,
      serialNumber,
      notes
    });

  const response =
    await fetchImpl(
      PICKING_API_URL,
      {
        method: "POST",

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

            action:
              "execute_item",

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
      response.status === 401
    ) {
      throw new Error(
        apiErrorMessage(
          body,
          "WarehouseIQ oturumunuz geçersiz veya süresi dolmuş."
        )
      );
    }

    if (
      response.status === 403
    ) {
      throw new Error(
        apiErrorMessage(
          body,
          "Bu firma için toplama işlemi yapma yetkiniz bulunmuyor."
        )
      );
    }

    if (
      response.status === 409
    ) {
      throw new Error(
        apiErrorMessage(
          body,
          "Toplama işlemi başka bir işlemle çakıştı. Güncel görevi kontrol edip yeniden deneyin."
        )
      );
    }

    throw new Error(
      apiErrorMessage(
        body,
        "Toplama işlemi tamamlanamadı."
      )
    );
  }

  return {
    requestId:
      normalizedRequestId,

    data:
      body.data
  };
}

/* A6.4.1 — Explicit Picking Complete */

export function buildPickingCompletePayload(
  input
) {
  return Object.freeze({
    pickingId:
      requireUuid(
        input?.pickingId,
        "Toplama kimliği"
      )
  });
}

export async function completePicking({
  accessToken,
  accountId,
  pickingId,
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

  const normalizedRequestId =
    requireUuid(
      requestId,
      "İstek kimliği"
    );

  const payload =
    buildPickingCompletePayload({
      pickingId
    });

  const response =
    await fetchImpl(
      PICKING_API_URL,
      {
        method: "POST",

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

            action:
              "complete",

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
      response.status === 401
    ) {
      throw new Error(
        apiErrorMessage(
          body,
          "WarehouseIQ oturumunuz geçersiz veya süresi dolmuş."
        )
      );
    }

    if (
      response.status === 403
    ) {
      throw new Error(
        apiErrorMessage(
          body,
          "Bu firma için toplamayı tamamlama yetkiniz bulunmuyor."
        )
      );
    }

    if (
      response.status === 409
    ) {
      throw new Error(
        apiErrorMessage(
          body,
          "Toplama henüz tamamlanamaz. Kalan satırları ve açık istisnaları kontrol edin."
        )
      );
    }

    throw new Error(
      apiErrorMessage(
        body,
        "Toplama tamamlanamadı."
      )
    );
  }

  return {
    requestId:
      normalizedRequestId,

    data:
      body.data
  };
}

/* A6.5.1 — Explicit Picking Exception Resolution */

function normalizePickingResolutionNotes(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(
      "İstisna çözüm notu metin olmalıdır."
    );
  }

  return value.trim() ||
    undefined;
}

export function buildPickingResolveExceptionPayload(
  input
) {
  const resolutionNotes =
    normalizePickingResolutionNotes(
      input?.resolutionNotes
    );

  return Object.freeze({
    pickingId:
      requireUuid(
        input?.pickingId,
        "Toplama kimliği"
      ),

    exceptionId:
      requireUuid(
        input?.exceptionId,
        "Toplama istisnası kimliği"
      ),

    ...(resolutionNotes
      ? {
          resolutionNotes
        }
      : {})
  });
}

export async function resolvePickingException({
  accessToken,
  accountId,
  pickingId,
  exceptionId,
  resolutionNotes,
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

  const normalizedRequestId =
    requireUuid(
      requestId,
      "İstek kimliği"
    );

  const payload =
    buildPickingResolveExceptionPayload({
      pickingId,
      exceptionId,
      resolutionNotes
    });

  const response =
    await fetchImpl(
      PICKING_API_URL,
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

            action:
              "resolve_exception",

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
      response.status === 401
    ) {
      throw new Error(
        apiErrorMessage(
          body,
          "WarehouseIQ oturumunuz geçersiz veya süresi dolmuş."
        )
      );
    }

    if (
      response.status === 403
    ) {
      throw new Error(
        apiErrorMessage(
          body,
          "Bu firma için toplama istisnası çözme yetkiniz bulunmuyor."
        )
      );
    }

    if (
      response.status === 409
    ) {
      throw new Error(
        apiErrorMessage(
          body,
          "Toplama istisnası çözüm isteği başka bir işlemle çakıştı. Güncel durumu kontrol edip yeniden deneyin."
        )
      );
    }

    throw new Error(
      apiErrorMessage(
        body,
        "Toplama istisnası çözülemedi."
      )
    );
  }

  return {
    requestId:
      normalizedRequestId,

    data:
      body.data
  };
}
