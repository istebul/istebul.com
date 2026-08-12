async function loadDefaultDependencies() {
  const [
    operationsModule,
    clientModule
  ] =
    await Promise.all([
      import(
        "./operations-center.js"
      ),
      import(
        "./picking-client.js"
      )
    ]);

  return {
    getContext:
      operationsModule
        .getWarehouseOperationsContext,

    getSession:
      operationsModule
        .getWarehouseSession,

    execute:
      clientModule
        .executePickingItem
  };
}

const UUID_PATTERN_CANONICAL =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let writePending = false;

const retryRequestIds =
  new Map();

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

function requireUuid(
  value,
  fieldLabel
) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    !UUID_PATTERN_CANONICAL.test(
      normalized
    )
  ) {
    throw new Error(
      `${fieldLabel} geçerli bir UUID olmalıdır.`
    );
  }

  return normalized;
}

function nonNegativeQuantity(
  value,
  fieldLabel
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    throw new Error(
      `${fieldLabel} sıfır veya sıfırdan büyük olmalıdır.`
    );
  }

  return number;
}

function requireBarcode(value) {
  const normalized =
    String(value || "").trim();

  if (!normalized) {
    throw new Error(
      "Doğrulanmış ürün veya SKU barkodu zorunludur."
    );
  }

  return normalized;
}

function optionalText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error(
      "Opsiyonel toplama alanı metin olmalıdır."
    );
  }

  return value.trim();
}

export function buildPickingExecutionPayload(
  confirmation
) {
  const sourceLocationId =
    requireUuid(
      confirmation
        ?.sourceLocationId,
      "Kaynak lokasyon kimliği"
    );

  const destinationLocationId =
    requireUuid(
      confirmation
        ?.destinationLocationId,
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
    nonNegativeQuantity(
      confirmation?.quantity,
      "Toplanan miktar"
    );

  const shortQuantity =
    nonNegativeQuantity(
      confirmation
        ?.shortQuantity ?? 0,
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

  const lotNumber =
    optionalText(
      confirmation?.lotNumber
    );

  const serialNumber =
    optionalText(
      confirmation?.serialNumber
    );

  const notes =
    optionalText(
      confirmation?.notes
    );

  return Object.freeze({
    pickingId:
      requireUuid(
        confirmation?.pickingId,
        "Toplama kimliği"
      ),

    pickingItemId:
      requireUuid(
        confirmation
          ?.pickingItemId,
        "Toplama satır kimliği"
      ),

    sourceLocationId,
    destinationLocationId,
    quantity,
    shortQuantity,

    barcode:
      requireBarcode(
        confirmation?.barcode
      ),

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

function executionFingerprint(
  payload
) {
  return [
    payload.pickingId,
    payload.pickingItemId,
    payload.sourceLocationId,
    payload.destinationLocationId,
    String(payload.quantity),
    String(payload.shortQuantity),
    payload.barcode,
    payload.lotNumber || "",
    payload.serialNumber || "",
    payload.notes || ""
  ].join(":");
}

function requestIdForExecution(
  payload
) {
  const fingerprint =
    executionFingerprint(
      payload
    );

  const existing =
    retryRequestIds.get(
      fingerprint
    );

  if (existing) {
    return {
      fingerprint,
      requestId:
        existing
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

export async function persistPickingConfirmation(
  confirmation,
  dependencies = {}
) {
  let defaults = null;

  if (
    !dependencies.getContext ||
    !dependencies.getSession ||
    !dependencies.execute
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

  const execute =
    dependencies.execute ||
    defaults.execute;

  const context =
    getContext();

  const accountId =
    requireUuid(
      context?.accountId,
      "Firma kimliği"
    );

  const session =
    await getSession();

  if (
    !session?.access_token
  ) {
    throw new Error(
      "WarehouseIQ oturumu geçersiz veya süresi dolmuş."
    );
  }

  const payload =
    buildPickingExecutionPayload(
      confirmation
    );

  const {
    fingerprint,
    requestId
  } =
    requestIdForExecution(
      payload
    );

  try {
    const result =
      await execute({
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
    /*
     * Hata durumunda fingerprint -> requestId eşleşmesi
     * bilerek korunur. Aynı kullanıcı onayı retry edildiğinde
     * aynı Idempotency-Key yeniden kullanılır.
     */
    throw error;
  }
}

function dispatchWriteEvent(
  name,
  detail
) {
  document.dispatchEvent(
    new CustomEvent(
      name,
      {
        detail:
          Object.freeze(
            detail
          )
      }
    )
  );
}

async function handlePickingConfirmation(
  event
) {
  if (writePending) {
    return;
  }

  writePending = true;

  const confirmation =
    event?.detail || {};

  dispatchWriteEvent(
    "warehouse:picking-write-start",
    {
      confirmation
    }
  );

  try {
    const result =
      await persistPickingConfirmation(
        confirmation
      );

    dispatchWriteEvent(
      "warehouse:picking-write-success",
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
      "warehouse:picking-write-error",
      {
        confirmation,

        message:
          error instanceof Error
            ? error.message
            : "Toplama işlemi kaydedilemedi."
      }
    );
  } finally {
    writePending = false;
  }
}

if (
  typeof document !==
  "undefined"
) {
  document.addEventListener(
    "warehouse:picking-confirm",
    (event) => {
      void handlePickingConfirmation(
        event
      );
    }
  );
}

/* A6.4.1 — Explicit Picking Complete Controller */

let completePending =
  false;

const completeRetryRequestIds =
  new Map();

function completionFingerprint(
  completion
) {
  return requireUuid(
    completion?.pickingId,
    "Toplama kimliği"
  );
}

function requestIdForCompletion(
  completion
) {
  const fingerprint =
    completionFingerprint(
      completion
    );

  const existing =
    completeRetryRequestIds.get(
      fingerprint
    );

  if (existing) {
    return {
      fingerprint,
      requestId:
        existing
    };
  }

  const requestId =
    createRequestId();

  completeRetryRequestIds.set(
    fingerprint,
    requestId
  );

  return {
    fingerprint,
    requestId
  };
}

export function buildPickingCompletionPayload(
  completion
) {
  return Object.freeze({
    pickingId:
      requireUuid(
        completion?.pickingId,
        "Toplama kimliği"
      )
  });
}

async function loadPickingCompleteDependencies() {
  const [
    operationsModule,
    clientModule
  ] =
    await Promise.all([
      import(
        "./operations-center.js"
      ),
      import(
        "./picking-client.js"
      )
    ]);

  return {
    getContext:
      operationsModule
        .getWarehouseOperationsContext,

    getSession:
      operationsModule
        .getWarehouseSession,

    complete:
      clientModule
        .completePicking
  };
}

export async function persistPickingCompletion(
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
      await loadPickingCompleteDependencies();
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

  const session =
    await getSession();

  if (
    !session?.access_token
  ) {
    throw new Error(
      "WarehouseIQ oturumu geçersiz veya süresi dolmuş."
    );
  }

  const payload =
    buildPickingCompletionPayload(
      completion
    );

  const {
    fingerprint,
    requestId
  } =
    requestIdForCompletion(
      payload
    );

  try {
    const result =
      await complete({
        accessToken:
          session.access_token,

        accountId,

        pickingId:
          payload.pickingId,

        requestId
      });

    /*
     * Başarılı complete sonrasında aynı Picking için
     * yeni bir kullanıcı tamamlama aksiyonu yeni
     * Idempotency-Key üretmelidir.
     */
    completeRetryRequestIds.delete(
      fingerprint
    );

    return result;
  } catch (error) {
    /*
     * Ağ veya API hatasında eşleşme bilerek korunur.
     * Aynı explicit kullanıcı tamamlama retry'ı
     * aynı Idempotency-Key ile devam eder.
     */
    throw error;
  }
}

async function handlePickingCompletion(
  event
) {
  if (completePending) {
    return;
  }

  completePending =
    true;

  const completion =
    event?.detail || {};

  dispatchWriteEvent(
    "warehouse:picking-complete-start",
    {
      completion
    }
  );

  try {
    const result =
      await persistPickingCompletion(
        completion
      );

    dispatchWriteEvent(
      "warehouse:picking-complete-success",
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
      "warehouse:picking-complete-error",
      {
        completion,

        message:
          error instanceof Error
            ? error.message
            : "Toplama tamamlanamadı."
      }
    );
  } finally {
    completePending =
      false;
  }
}

if (
  typeof document !==
  "undefined"
) {
  document.addEventListener(
    "warehouse:picking-complete-confirm",
    (event) => {
      void handlePickingCompletion(
        event
      );
    }
  );
}
