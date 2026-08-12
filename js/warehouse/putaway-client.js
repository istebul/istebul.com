const PUTAWAY_API_URL = "/api/warehouse/putaway";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value, fieldLabel) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${fieldLabel} geçerli bir UUID olmalıdır.`);
  }

  return normalized;
}

function requireAccessToken(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error("WarehouseIQ oturumu gerekli.");
  }

  return normalized;
}

function requirePositiveQuantity(value) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Yerleştirme miktarı sıfırdan büyük olmalıdır.");
  }

  return quantity;
}

function normalizeNotes(value) {
  if (
    value !== undefined &&
    value !== null &&
    typeof value !== "string"
  ) {
    throw new Error("Yerleştirme notu metin olmalıdır.");
  }

  return typeof value === "string" ? value.trim() : "";
}

function createRequestId() {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error(
      "Güvenli istek kimliği üretilemiyor. Tarayıcınızı güncelleyip yeniden deneyin."
    );
  }

  return globalThis.crypto.randomUUID();
}

function apiErrorMessage(body, fallback) {
  return body?.error?.message || body?.message || fallback;
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function buildExecuteItemPayload(input) {
  const notes = normalizeNotes(input?.notes);

  return Object.freeze({
    putawayId: requireUuid(
      input?.putawayId,
      "Yerleştirme kimliği"
    ),
    putawayItemId: requireUuid(
      input?.putawayItemId,
      "Yerleştirme satır kimliği"
    ),
    targetLocationId: requireUuid(
      input?.targetLocationId,
      "Hedef lokasyon kimliği"
    ),
    quantity: requirePositiveQuantity(input?.quantity),
    ...(notes ? { notes } : {})
  });
}

export async function executePutawayItem({
  accessToken,
  accountId,
  putawayId,
  putawayItemId,
  targetLocationId,
  quantity,
  notes,
  requestId = createRequestId(),
  fetchImpl = fetch
}) {
  const token = requireAccessToken(accessToken);
  const normalizedAccountId = requireUuid(
    accountId,
    "Firma kimliği"
  );
  const normalizedRequestId = requireUuid(
    requestId,
    "İstek kimliği"
  );
  const payload = buildExecuteItemPayload({
    putawayId,
    putawayItemId,
    targetLocationId,
    quantity,
    notes
  });

  const response = await fetchImpl(PUTAWAY_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": normalizedRequestId
    },
    cache: "no-store",
    body: JSON.stringify({
      accountId: normalizedAccountId,
      action: "execute_item",
      payload
    })
  });

  const body = await readJsonSafely(response);

  if (!response.ok || !body?.ok) {
    if (response.status === 401) {
      throw new Error(
        apiErrorMessage(
          body,
          "WarehouseIQ oturumunuz geçersiz veya süresi dolmuş."
        )
      );
    }

    if (response.status === 403) {
      throw new Error(
        apiErrorMessage(
          body,
          "Bu firma için yerleştirme işlemi yapma yetkiniz bulunmuyor."
        )
      );
    }

    if (response.status === 409) {
      throw new Error(
        apiErrorMessage(
          body,
          "Yerleştirme işlemi başka bir işlemle çakıştı. Güncel veriyi kontrol edip yeniden deneyin."
        )
      );
    }

    throw new Error(
      apiErrorMessage(
        body,
        "Yerleştirme işlemi tamamlanamadı."
      )
    );
  }

  return {
    requestId: normalizedRequestId,
    data: body.data
  };
}

export async function completePutaway({
  accessToken,
  accountId,
  putawayId,
  requestId = createRequestId(),
  fetchImpl = fetch
}) {
  const token =
    requireAccessToken(accessToken);

  const normalizedAccountId =
    requireUuid(
      accountId,
      "Firma kimliği"
    );

  const normalizedPutawayId =
    requireUuid(
      putawayId,
      "Yerleştirme kimliği"
    );

  const normalizedRequestId =
    requireUuid(
      requestId,
      "İstek kimliği"
    );

  const response =
    await fetchImpl(
      PUTAWAY_API_URL,
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
        cache: "no-store",
        body: JSON.stringify({
          accountId:
            normalizedAccountId,
          action: "complete",
          payload: {
            putawayId:
              normalizedPutawayId
          }
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
    if (response.status === 401) {
      throw new Error(
        apiErrorMessage(
          body,
          "WarehouseIQ oturumunuz geçersiz veya süresi dolmuş."
        )
      );
    }

    if (response.status === 403) {
      throw new Error(
        apiErrorMessage(
          body,
          "Bu firma için yerleştirme tamamlama yetkiniz bulunmuyor."
        )
      );
    }

    if (response.status === 409) {
      throw new Error(
        apiErrorMessage(
          body,
          "Yerleştirme tamamlama işlemi başka bir işlemle çakıştı. Güncel veriyi kontrol edip yeniden deneyin."
        )
      );
    }

    throw new Error(
      apiErrorMessage(
        body,
        "Yerleştirme tamamlanamadı."
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
