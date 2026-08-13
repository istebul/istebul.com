import {
  recordCycleCountRecountQuantity
} from "./cycle-count-recount-client.js";

const retryRequestIds =
  new Map();

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value) {
  return String(value ?? "").trim();
}

function requireUuid(
  value,
  label
) {
  const normalized =
    text(value);

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
    text(value);

  if (!normalized) {
    throw new Error(
      `${label} gereklidir.`
    );
  }

  return normalized;
}

function normalizeQuantity(
  value
) {
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    typeof value === "boolean"
  ) {
    throw new Error(
      "Yeniden sayılan miktarı girin."
    );
  }

  const quantity =
    Number(value);

  if (
    !Number.isFinite(
      quantity
    )
  ) {
    throw new Error(
      "Yeniden sayılan miktar geçerli bir sayı olmalıdır."
    );
  }

  if (quantity < 0) {
    throw new Error(
      "Yeniden sayılan miktar sıfır veya daha büyük olmalıdır."
    );
  }

  return quantity;
}

function normalizeNotes(
  value
) {
  const notes =
    text(value);

  if (
    notes.length >
    1000
  ) {
    throw new Error(
      "Yeniden sayım notu 1000 karakteri aşamaz."
    );
  }

  return notes;
}

function retryFingerprint(
  confirmation
) {
  return JSON.stringify({
    cycleCountId:
      confirmation.cycleCountId,
    cycleCountItemId:
      confirmation.cycleCountItemId,
    taskId:
      confirmation.taskId,
    countedQuantity:
      confirmation.countedQuantity,
    locationScan:
      confirmation.locationScan,
    productScan:
      confirmation.productScan,
    notes:
      confirmation.notes
  });
}

function createRequestId(
  factory
) {
  const requestIdFactory =
    factory ||
    globalThis.crypto
      ?.randomUUID
      ?.bind(
        globalThis.crypto
      );

  if (
    typeof requestIdFactory !==
    "function"
  ) {
    throw new Error(
      "Güvenli işlem kimliği üretilemedi."
    );
  }

  return requireUuid(
    requestIdFactory(),
    "İşlem kimliği"
  );
}

function requestIdForRecount(
  confirmation,
  factory
) {
  const fingerprint =
    retryFingerprint(
      confirmation
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
    createRequestId(
      factory
    );

  retryRequestIds.set(
    fingerprint,
    requestId
  );

  return {
    fingerprint,
    requestId
  };
}

async function resolveWarehouseRuntime(
  dependencies
) {
  let getContext =
    dependencies
      .getWarehouseOperationsContext;

  let getSession =
    dependencies
      .getWarehouseSession;

  if (
    typeof getContext ===
      "function" &&
    typeof getSession ===
      "function"
  ) {
    return {
      getContext,
      getSession
    };
  }

  /*
   * Browser runtime bağımlılığı lazy yüklenir.
   * Böylece Node unit testleri operations-center içindeki
   * browser/CDN ESM zincirini import etmek zorunda kalmaz.
   */
  const runtime =
    await import(
      "./operations-center.js"
    );

  getContext =
    getContext ||
    runtime
      .getWarehouseOperationsContext;

  getSession =
    getSession ||
    runtime
      .getWarehouseSession;

  if (
    typeof getContext !==
      "function" ||
    typeof getSession !==
      "function"
  ) {
    throw new Error(
      "WarehouseIQ operasyon oturumu kullanılamıyor."
    );
  }

  return {
    getContext,
    getSession
  };
}

function dispatch(
  name,
  detail
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  document.dispatchEvent(
    new CustomEvent(
      name,
      {
        detail
      }
    )
  );
}

export function buildCycleCountRecountConfirmation(
  detail
) {
  return {
    cycleCountId:
      requireUuid(
        detail?.cycleCountId,
        "Cycle Count kimliği"
      ),

    cycleCountItemId:
      requireUuid(
        detail?.cycleCountItemId,
        "Cycle Count satırı kimliği"
      ),

    taskId:
      requireUuid(
        detail?.taskId,
        "Yeniden sayım görevi kimliği"
      ),

    countedQuantity:
      normalizeQuantity(
        detail?.countedQuantity
      ),

    locationScan:
      requireScan(
        detail?.locationScan,
        "Lokasyon taraması"
      ),

    productScan:
      requireScan(
        detail?.productScan,
        "Ürün / SKU taraması"
      ),

    notes:
      normalizeNotes(
        detail?.notes
      )
  };
}

export async function persistCycleCountRecountQuantity(
  detail,
  dependencies = {}
) {
  const confirmation =
    buildCycleCountRecountConfirmation(
      detail
    );

  const {
    getContext,
    getSession
  } =
    await resolveWarehouseRuntime(
      dependencies
    );

  const record =
    dependencies
      .recordCycleCountRecountQuantity ||
    recordCycleCountRecountQuantity;

  const context =
    getContext();

  if (
    !context?.accountId ||
    !context?.warehouseId
  ) {
    throw new Error(
      "Firma ve depo seçimi gereklidir."
    );
  }

  const session =
    await getSession();

  if (
    !session?.access_token
  ) {
    throw new Error(
      "Yeniden sayım miktarını kaydetmek için WarehouseIQ oturumu gereklidir."
    );
  }

  const {
    fingerprint,
    requestId
  } =
    requestIdForRecount(
      confirmation,
      dependencies
        .requestIdFactory
    );

  const result =
    await record({
      accessToken:
        session.access_token,

      accountId:
        context.accountId,

      warehouseId:
        context.warehouseId,

      ...confirmation,

      requestId,

      fetchImpl:
        dependencies.fetchImpl
    });

  retryRequestIds.delete(
    fingerprint
  );

  return {
    confirmation,
    result,
    requestId
  };
}

async function handleConfirm(
  event
) {
  let confirmation =
    null;

  try {
    confirmation =
      buildCycleCountRecountConfirmation(
        event?.detail
      );

    dispatch(
      "warehouse:cycle-count-recount-start",
      {
        confirmation
      }
    );

    const persisted =
      await persistCycleCountRecountQuantity(
        confirmation
      );

    dispatch(
      "warehouse:cycle-count-recount-success",
      {
        confirmation:
          persisted.confirmation,

        result:
          persisted.result,

        requestId:
          persisted.requestId
      }
    );
  } catch (error) {
    dispatch(
      "warehouse:cycle-count-recount-error",
      {
        confirmation,

        message:
          error instanceof Error
            ? error.message
            : "Yeniden sayım miktarı kaydedilemedi."
      }
    );
  }
}

if (
  typeof document !==
  "undefined"
) {
  document.addEventListener(
    "warehouse:cycle-count-recount-confirm",
    (event) => {
      void handleConfirm(
        event
      );
    }
  );
}
