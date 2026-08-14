const API_URL =
  "/api/warehouse/cycle-count-recount-evaluation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function requireToken(
  value
) {
  const token =
    String(
      value || ""
    ).trim();

  if (!token) {
    throw new Error(
      "WarehouseIQ oturumu gerekli."
    );
  }

  return token;
}

function createRequestId() {
  if (
    typeof globalThis.crypto
      ?.randomUUID !==
    "function"
  ) {
    throw new Error(
      "Güvenli değerlendirme istek kimliği üretilemiyor."
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

export function buildCycleCountRecountEvaluationPayload(
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
      )
  });
}

export async function evaluateCycleCountRecount({
  accessToken,
  accountId,
  warehouseId,
  cycleCountId,
  cycleCountItemId,
  taskId,
  requestId =
    createRequestId(),
  fetchImpl =
    fetch
}) {
  const token =
    requireToken(
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
    buildCycleCountRecountEvaluationPayload({
      cycleCountId,
      cycleCountItemId,
      taskId
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
              "evaluate_recount",

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
          "Bu yeniden sayım değerlendirmesi için yetkiniz bulunmuyor."
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
          "Değerlendirilecek yeniden sayım görevi artık bulunamıyor."
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
          "Yeniden yeniden sayım değerlendirmesi başka bir işlemle çakıştı."
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
          "Yeniden yeniden sayım değerlendirmesi için mevcut görev durumu uygun değil."
        )
      );
    }

    throw new Error(
      responseMessage(
        body,
        "Yeniden yeniden sayım değerlendirmesi tamamlanamadı."
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
