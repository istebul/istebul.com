const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let writePending =
  false;

const retryRequestIds =
  new Map();

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
    quantity < 0
  ) {
    throw new Error(
      "Sayılan miktar sıfır veya daha büyük olmalıdır."
    );
  }

  return quantity;
}

function normalizeNotes(
  value
) {
  const normalized =
    String(
      value ?? ""
    ).trim();

  if (
    normalized.length >
    1000
  ) {
    throw new Error(
      "Sayım notu en fazla 1000 karakter olabilir."
    );
  }

  return normalized;
}

function createRequestId() {
  if (
    typeof globalThis.crypto
      ?.randomUUID !==
    "function"
  ) {
    throw new Error(
      "Güvenli istek kimliği üretilemiyor."
    );
  }

  return globalThis.crypto
    .randomUUID();
}

export function buildCycleCountQuantityConfirmation(
  confirmation
) {
  return Object.freeze({
    cycleCountId:
      requireUuid(
        confirmation?.cycleCountId,
        "Sayım kimliği"
      ),

    cycleCountItemId:
      requireUuid(
        confirmation
          ?.cycleCountItemId,
        "Sayım satırı kimliği"
      ),

    taskId:
      requireUuid(
        confirmation?.taskId,
        "Sayım görevi kimliği"
      ),

    countedQuantity:
      normalizeQuantity(
        confirmation
          ?.countedQuantity
      ),

    locationScan:
      requireScan(
        confirmation
          ?.locationScan,
        "Lokasyon taraması"
      ),

    productScan:
      requireScan(
        confirmation
          ?.productScan,
        "Ürün veya SKU taraması"
      ),

    notes:
      normalizeNotes(
        confirmation?.notes
      )
  });
}

function requestFingerprint({
  accountId,
  warehouseId,
  payload
}) {
  return JSON.stringify({
    accountId,
    warehouseId,
    cycleCountId:
      payload.cycleCountId,
    cycleCountItemId:
      payload.cycleCountItemId,
    taskId:
      payload.taskId,
    countedQuantity:
      payload.countedQuantity,
    locationScan:
      payload.locationScan,
    productScan:
      payload.productScan,
    notes:
      payload.notes
  });
}

function requestIdForQuantity(
  scope
) {
  const fingerprint =
    requestFingerprint(
      scope
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
        "./cycle-count-client.js"
      )
    ]);

  return {
    getContext:
      operationsModule
        .getWarehouseOperationsContext,

    getSession:
      operationsModule
        .getWarehouseSession,

    record:
      clientModule
        .recordCycleCountQuantity
  };
}

export async function persistCycleCountQuantity(
  confirmation,
  dependencies = {}
) {
  let defaults = null;

  if (
    !dependencies.getContext ||
    !dependencies.getSession ||
    !dependencies.record
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

  const record =
    dependencies.record ||
    defaults.record;

  const context =
    getContext();

  const accountId =
    requireUuid(
      context?.accountId,
      "Firma kimliği"
    );

  const warehouseId =
    requireUuid(
      context?.warehouseId,
      "Depo kimliği"
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
    buildCycleCountQuantityConfirmation(
      confirmation
    );

  const {
    fingerprint,
    requestId
  } =
    requestIdForQuantity({
      accountId,
      warehouseId,
      payload
    });

  try {
    const result =
      await record({
        accessToken:
          session.access_token,

        accountId,
        warehouseId,

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

async function handleConfirmation(
  event
) {
  if (writePending) {
    return;
  }

  writePending = true;

  const confirmation =
    event?.detail || {};

  dispatchWriteEvent(
    "warehouse:cycle-count-quantity-start",
    {
      confirmation
    }
  );

  try {
    const result =
      await persistCycleCountQuantity(
        confirmation
      );

    dispatchWriteEvent(
      "warehouse:cycle-count-quantity-success",
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
      "warehouse:cycle-count-quantity-error",
      {
        confirmation,

        message:
          error instanceof Error
            ? error.message
            : "Sayım miktarı kaydedilemedi."
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
    "warehouse:cycle-count-quantity-confirm",
    (event) => {
      void handleConfirmation(
        event
      );
    }
  );
}
