async function loadDefaultDependencies() {
  const [operationsModule, clientModule] = await Promise.all([
    import("./operations-center.js"),
    import("./putaway-client.js")
  ]);

  return {
    getContext:
      operationsModule.getWarehouseOperationsContext,
    getSession:
      operationsModule.getWarehouseSession,
    execute:
      clientModule.executePutawayItem,
    complete:
      clientModule.completePutaway
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let writePending = false;
const retryRequestIds = new Map();
const completionRetryRequestIds = new Map();

function createRequestId() {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error(
      "Güvenli istek kimliği üretilemiyor. Tarayıcınızı güncelleyip yeniden deneyin."
    );
  }

  return globalThis.crypto.randomUUID();
}

function requireUuid(value, fieldLabel) {
  const normalized =
    String(value || "").trim().toLowerCase();

  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(
      `${fieldLabel} geçerli bir UUID olmalıdır.`
    );
  }

  return normalized;
}

function requirePositiveQuantity(value) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(
      "Yerleştirme miktarı sıfırdan büyük olmalıdır."
    );
  }

  return quantity;
}

export function buildPutawayExecutionPayload(
  confirmation
) {
  return Object.freeze({
    putawayId: requireUuid(
      confirmation?.putawayId,
      "Yerleştirme kimliği"
    ),
    putawayItemId: requireUuid(
      confirmation?.putawayItemId,
      "Yerleştirme satır kimliği"
    ),
    targetLocationId: requireUuid(
      confirmation?.targetLocationId,
      "Hedef lokasyon kimliği"
    ),
    quantity: requirePositiveQuantity(
      confirmation?.quantity
    )
  });
}

function executionFingerprint(payload) {
  return [
    payload.putawayId,
    payload.putawayItemId,
    payload.targetLocationId,
    String(payload.quantity)
  ].join(":");
}

function requestIdForExecution(payload) {
  const fingerprint =
    executionFingerprint(payload);

  const existing =
    retryRequestIds.get(fingerprint);

  if (existing) {
    return {
      fingerprint,
      requestId: existing
    };
  }

  const requestId = createRequestId();

  retryRequestIds.set(
    fingerprint,
    requestId
  );

  return {
    fingerprint,
    requestId
  };
}

function completionFingerprint(input) {
  return String(
    input?.putawayId || ""
  ).trim().toLowerCase();
}

function requestIdForCompletion(input) {
  const fingerprint =
    completionFingerprint(
      input
    );

  const existing =
    completionRetryRequestIds.get(
      fingerprint
    );

  if (existing) {
    return {
      fingerprint,
      requestId: existing
    };
  }

  const requestId =
    createRequestId();

  completionRetryRequestIds.set(
    fingerprint,
    requestId
  );

  return {
    fingerprint,
    requestId
  };
}

export async function persistPutawayConfirmation(
  confirmation,
  dependencies = {}
) {
  let defaults = null;

  if (
    !dependencies.getContext ||
    !dependencies.getSession ||
    !dependencies.execute
  ) {
    defaults = await loadDefaultDependencies();
  }

  const getContext =
    dependencies.getContext ||
    defaults.getContext;
  const getSession =
    dependencies.getSession ||
    defaults.getSession;
  const execute =
    dependencies.execute ||
    defaults.execute;

  const context = getContext();
  const accountId = requireUuid(
    context?.accountId,
    "Firma kimliği"
  );
  const session = await getSession();

  if (!session?.access_token) {
    throw new Error(
      "WarehouseIQ oturumu geçersiz veya süresi dolmuş."
    );
  }

  const payload =
    buildPutawayExecutionPayload(
      confirmation
    );

  const {
    fingerprint,
    requestId
  } = requestIdForExecution(payload);

  try {
    const result = await execute({
      accessToken:
        session.access_token,
      accountId,
      ...payload,
      requestId
    });

    retryRequestIds.delete(
      fingerprint
    );

    return result;
  } catch (error) {
    throw error;
  }
}

export async function persistPutawayCompletion(
  completion,
  dependencies = {}
) {
  let defaults = null;

  if (
    !dependencies.getContext ||
    !dependencies.getSession ||
    !dependencies.complete
  ) {
    defaults =
      await loadDefaultDependencies();
  }

  const getContext =
    dependencies.getContext ||
    defaults.getContext;

  const getSession =
    dependencies.getSession ||
    defaults.getSession;

  const complete =
    dependencies.complete ||
    defaults.complete;

  const context =
    getContext();

  const accountId =
    requireUuid(
      context?.accountId,
      "Firma kimliği"
    );

  const putawayId =
    requireUuid(
      completion?.putawayId,
      "Yerleştirme kimliği"
    );

  const session =
    await getSession();

  if (!session?.access_token) {
    throw new Error(
      "WarehouseIQ oturumu geçersiz veya süresi dolmuş."
    );
  }

  const {
    fingerprint,
    requestId
  } = requestIdForCompletion({
    putawayId
  });

  try {
    const result =
      await complete({
        accessToken:
          session.access_token,
        accountId,
        putawayId,
        requestId
      });

    completionRetryRequestIds.delete(
      fingerprint
    );

    return result;
  } catch (error) {
    throw error;
  }
}

function dispatchWriteEvent(name, detail) {
  document.dispatchEvent(
    new CustomEvent(name, {
      detail:
        Object.freeze(detail)
    })
  );
}

async function handlePutawayConfirmation(event) {
  if (writePending) {
    return;
  }

  writePending = true;

  const confirmation =
    event?.detail || {};

  dispatchWriteEvent(
    "warehouse:putaway-write-start",
    { confirmation }
  );

  try {
    const result =
      await persistPutawayConfirmation(
        confirmation
      );

    dispatchWriteEvent(
      "warehouse:putaway-write-success",
      {
        confirmation,
        requestId:
          result.requestId,
        data:
          result.data
      }
    );
  } catch (error) {
    dispatchWriteEvent(
      "warehouse:putaway-write-error",
      {
        confirmation,
        message:
          error instanceof Error
            ? error.message
            : "Yerleştirme işlemi kaydedilemedi."
      }
    );
  } finally {
    writePending = false;
  }
}

async function handlePutawayCompletion(event) {
  if (writePending) {
    return;
  }

  writePending = true;

  const completion =
    event?.detail || {};

  dispatchWriteEvent(
    "warehouse:putaway-complete-start",
    {
      completion
    }
  );

  try {
    const result =
      await persistPutawayCompletion(
        completion
      );

    dispatchWriteEvent(
      "warehouse:putaway-complete-success",
      {
        completion,
        requestId:
          result.requestId,
        data:
          result.data
      }
    );
  } catch (error) {
    dispatchWriteEvent(
      "warehouse:putaway-complete-error",
      {
        completion,
        message:
          error instanceof Error
            ? error.message
            : "Yerleştirme tamamlanamadı."
      }
    );
  } finally {
    writePending = false;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener(
    "warehouse:putaway-confirm",
    (event) => {
      void handlePutawayConfirmation(
        event
      );
    }
  );

  document.addEventListener(
    "warehouse:putaway-complete-confirm",
    (event) => {
      void handlePutawayCompletion(
        event
      );
    }
  );
}
