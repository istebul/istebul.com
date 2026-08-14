const COMPLETION_API_URL =
  "/api/warehouse/cycle-count-completion";

const REPORT_API_URL =
  "/api/warehouse/cycle-count-report";

const ACTIONS =
  new Set([
    "approve_count",
    "prepare_adjustments",
    "approve_adjustments",
    "reject_adjustments",
    "process_adjustments",
    "complete_count"
  ]);

function text(value) {
  return String(
    value ?? ""
  ).trim();
}

function requestId() {
  const value =
    globalThis.crypto
      ?.randomUUID?.();

  if (!value) {
    throw new Error(
      "Güvenli işlem kimliği üretilemedi."
    );
  }

  return value;
}

async function readJson(
  response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function responseError(
  response,
  body,
  fallback
) {
  const error =
    new Error(
      body?.error?.message ||
      fallback
    );

  error.status =
    response.status;

  error.code =
    body?.error?.code ||
    null;

  return error;
}

export async function writeCycleCountCompletion({
  accessToken,
  accountId,
  warehouseId,
  cycleCountId,
  action,
  notes = null,
  requestId: explicitRequestId = null,
  fetchImpl = fetch
}) {
  if (!text(accessToken)) {
    throw new Error(
      "WarehouseIQ oturumu bulunamadı."
    );
  }

  if (!ACTIONS.has(action)) {
    throw new Error(
      "Cycle Count işlemi desteklenmiyor."
    );
  }

  const operationRequestId =
    explicitRequestId ||
    requestId();

  const response =
    await fetchImpl(
      COMPLETION_API_URL,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${accessToken}`,

          "Idempotency-Key":
            operationRequestId
        },

        cache:
          "no-store",

        body:
          JSON.stringify({
            accountId,
            warehouseId,
            action,

            payload: {
              cycleCountId,

              notes:
                text(notes) ||
                null
            }
          })
      }
    );

  const body =
    await readJson(response);

  if (
    !response.ok ||
    body?.ok !== true
  ) {
    throw responseError(
      response,
      body,
      "Cycle Count işlemi tamamlanamadı."
    );
  }

  return {
    requestId:
      operationRequestId,

    ...(body.data || {})
  };
}

export async function loadCycleCountManagement({
  accessToken,
  accountId,
  warehouseId,
  cycleCountId = null,
  fetchImpl = fetch
}) {
  if (!text(accessToken)) {
    throw new Error(
      "WarehouseIQ oturumu bulunamadı."
    );
  }

  const params =
    new URLSearchParams({
      accountId,
      warehouseId
    });

  if (text(cycleCountId)) {
    params.set(
      "cycleCountId",
      cycleCountId
    );
  }

  const response =
    await fetchImpl(
      `${REPORT_API_URL}?${params.toString()}`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${accessToken}`
        },

        cache:
          "no-store"
      }
    );

  const body =
    await readJson(response);

  if (
    !response.ok ||
    body?.ok !== true
  ) {
    throw responseError(
      response,
      body,
      "Cycle Count yönetim verisi alınamadı."
    );
  }

  return body.data || {};
}
