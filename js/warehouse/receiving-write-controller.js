async function loadDefaultDependencies() {
  const [
    operationsModule,
    clientModule
  ] = await Promise.all([
    import("./operations-center.js"),
    import("./receiving-client.js")
  ]);

  return {
    getContext:
      operationsModule.getWarehouseOperationsContext,
    getSession:
      operationsModule.getWarehouseSession,
    write:
      clientModule.receiveQuantity,
    complete:
      clientModule.completeReceiving
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let writePending = false;

const retryRequestIds = new Map();
const completionRetryRequestIds = new Map();

function createRequestId() {
  if (
    typeof globalThis.crypto?.randomUUID !== "function"
  ) {
    throw new Error(
      "Güvenli istek kimliği üretilemiyor. Tarayıcınızı güncelleyip yeniden deneyin."
    );
  }

  return globalThis.crypto.randomUUID();
}

function confirmationFingerprint(
  confirmation
) {
  return [
    String(
      confirmation?.receivingId || ""
    ).trim().toLowerCase(),
    String(
      confirmation?.itemId || ""
    ).trim().toLowerCase(),
    String(
      confirmation?.receivedQuantity || ""
    ).trim()
  ].join(":");
}

function requestIdForConfirmation(
  confirmation
) {
  const fingerprint =
    confirmationFingerprint(
      confirmation
    );

  const existing =
    retryRequestIds.get(
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

  retryRequestIds.set(
    fingerprint,
    requestId
  );

  return {
    fingerprint,
    requestId
  };
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

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Kabul miktarı sıfırdan büyük olmalıdır."
    );
  }

  return quantity;
}

export function buildAcceptedQuantityPayload(
  confirmation
) {
  const quantity =
    requirePositiveQuantity(
      confirmation?.receivedQuantity
    );

  return Object.freeze({
    receivingId: requireUuid(
      confirmation?.receivingId,
      "Mal kabul kimliği"
    ),
    receivingItemId: requireUuid(
      confirmation?.itemId,
      "Mal kabul satır kimliği"
    ),
    receivedQuantity: quantity,
    acceptedQuantity: quantity,
    rejectedQuantity: 0,
    damagedQuantity: 0
  });
}

function completionFingerprint(
  input
) {
  return String(
    input?.receivingId || ""
  ).trim().toLowerCase();
}

function requestIdForCompletion(
  input
) {
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

export async function persistReceivingCompletion(
  input,
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

  const context = getContext();

  const accountId =
    requireUuid(
      context?.accountId,
      "Firma kimliği"
    );

  const receivingId =
    requireUuid(
      input?.receivingId,
      "Mal kabul kimliği"
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
  } = requestIdForCompletion(
    {
      receivingId
    }
  );

  try {
    const result = await complete({
      accessToken:
        session.access_token,
      accountId,
      receivingId,
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

export async function persistReceivingConfirmation(
  confirmation,
  dependencies = {}
) {
  let defaults = null;

  if (
    !dependencies.getContext ||
    !dependencies.getSession ||
    !dependencies.write
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

  const write =
    dependencies.write ||
    defaults.write;

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
    buildAcceptedQuantityPayload(
      confirmation
    );

  const {
    fingerprint,
    requestId
  } = requestIdForConfirmation(
    confirmation
  );

  try {
    const result = await write({
      accessToken:
        session.access_token,
      accountId,
      payload,
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

function dispatchWriteEvent(
  name,
  detail
) {
  document.dispatchEvent(
    new CustomEvent(name, {
      detail: Object.freeze(detail)
    })
  );
}

async function handleReceivingConfirmation(
  event
) {
  if (writePending) {
    return;
  }

  writePending = true;

  const confirmation =
    event?.detail || {};

  dispatchWriteEvent(
    "warehouse:receiving-write-start",
    {
      confirmation
    }
  );

  try {
    const result =
      await persistReceivingConfirmation(
        confirmation
      );

    dispatchWriteEvent(
      "warehouse:receiving-write-success",
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
      "warehouse:receiving-write-error",
      {
        confirmation,
        message:
          error instanceof Error
            ? error.message
            : "Mal kabul miktarı kaydedilemedi."
      }
    );
  } finally {
    writePending = false;
  }
}

async function handleReceivingCompletion(
  event
) {
  if (writePending) {
    return;
  }

  writePending = true;

  const completion =
    event?.detail || {};

  dispatchWriteEvent(
    "warehouse:receiving-complete-start",
    {
      completion
    }
  );

  try {
    const result =
      await persistReceivingCompletion(
        completion
      );

    dispatchWriteEvent(
      "warehouse:receiving-complete-success",
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
      "warehouse:receiving-complete-error",
      {
        completion,
        message:
          error instanceof Error
            ? error.message
            : "Mal kabul tamamlanamadı."
      }
    );
  } finally {
    writePending = false;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener(
    "warehouse:receiving-confirm",
    (event) => {
      void handleReceivingConfirmation(
        event
      );
    }
  );

  document.addEventListener(
    "warehouse:receiving-complete-confirm",
    (event) => {
      void handleReceivingCompletion(
        event
      );
    }
  );
}
