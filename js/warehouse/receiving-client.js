const RECEIVING_API_URL = "/api/warehouse/receiving";

const WRITE_ACTIONS = Object.freeze([
  "create",
  "add_item",
  "start",
  "receive_quantity",
  "complete"
]);

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

function requireAction(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!WRITE_ACTIONS.includes(normalized)) {
    throw new Error("Desteklenmeyen mal kabul işlemi.");
  }

  return normalized;
}

function normalizePayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Mal kabul işlem verisi nesne olmalıdır.");
  }

  return value;
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

export async function writeReceiving({
  accessToken,
  accountId,
  action,
  payload,
  requestId = createRequestId(),
  fetchImpl = fetch
}) {
  const token = requireAccessToken(accessToken);
  const normalizedAccountId = requireUuid(accountId, "Firma kimliği");
  const normalizedRequestId = requireUuid(requestId, "İstek kimliği");
  const normalizedAction = requireAction(action);
  const normalizedPayload = normalizePayload(payload);

  const response = await fetchImpl(RECEIVING_API_URL, {
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
      action: normalizedAction,
      payload: normalizedPayload
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
          "Bu firma için mal kabul işlemi yapma yetkiniz bulunmuyor."
        )
      );
    }

    if (response.status === 409) {
      throw new Error(
        apiErrorMessage(
          body,
          "Mal kabul işlemi başka bir işlemle çakıştı. Güncel veriyi kontrol edip yeniden deneyin."
        )
      );
    }

    throw new Error(
      apiErrorMessage(
        body,
        "Mal kabul işlemi tamamlanamadı."
      )
    );
  }

  return {
    requestId: normalizedRequestId,
    data: body.data
  };
}

export async function receiveQuantity(input) {
  return writeReceiving({
    ...input,
    action: "receive_quantity"
  });
}

export async function completeReceiving(input) {
  const receivingId = requireUuid(
    input?.receivingId,
    "Mal kabul kimliği"
  );

  return writeReceiving({
    accessToken: input.accessToken,
    accountId: input.accountId,
    action: "complete",
    payload: {
      receivingId
    },
    requestId: input.requestId,
    fetchImpl: input.fetchImpl
  });
}
