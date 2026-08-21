const retryRequestIds =
  new Map();

const pending =
  new Set();

function stable(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (Array.isArray(value)) {
    return value
      .map(stable)
      .join(",");
  }

  if (
    typeof value ===
    "object"
  ) {
    return Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${key}=${stable(
            value[key]
          )}`
      )
      .join("&");
  }

  return String(value);
}

function keyFor(
  action,
  payload
) {
  return `${action}:${stable(
    payload
  )}`;
}

function requestIdFor(
  action,
  payload
) {
  const key =
    keyFor(
      action,
      payload
    );

  let requestId =
    retryRequestIds.get(key);

  if (!requestId) {
    if (
      typeof globalThis.crypto
        ?.randomUUID !==
      "function"
    ) {
      throw new Error(
        "Güvenli istek kimliği üretilemiyor."
      );
    }

    requestId =
      globalThis.crypto.randomUUID();

    retryRequestIds.set(
      key,
      requestId
    );
  }

  return {
    key,
    requestId
  };
}

async function dependencies() {
  const [
    operations,
    client
  ] =
    await Promise.all([
      import(
        "./operations-center.js"
      ),
      import(
        "./packing-client.js"
      )
    ]);

  return {
    getContext:
      operations
        .getWarehouseOperationsContext,

    getSession:
      operations
        .getWarehouseSession,

    createFromPicking:
      client
        .createPackingFromPicking,

    createPackage:
      client
        .createPackingPackage,

    confirmItem:
      client
        .confirmPackingItem,

    sealPackage:
      client
        .sealPackingPackage,

    generatePackageLabel:
      client
        .generatePackingPackageLabel,

    resolveException:
      client
        .resolvePackingException,

    complete:
      client
        .completePacking,

    markShippingReady:
      client
        .markPackingShippingReady,

    createLabel:
      client
        .createPackingLabel,

    generateLabel:
      client
        .generatePackingLabel,

    markLabelPrinted:
      client
        .markPackingLabelPrinted,

    markLabelFailed:
      client
        .markPackingLabelFailed,

    cancelLabel:
      client
        .cancelPackingLabel,

    cancel:
      client
        .cancelPacking
  };
}

async function persist({
  action,
  payload,
  method,
  injected = {}
}) {
  const defaults =
    (
      injected.getContext &&
      injected.getSession &&
      injected[method]
    )
      ? null
      : await dependencies();

  const getContext =
    injected.getContext ||
    defaults.getContext;

  const getSession =
    injected.getSession ||
    defaults.getSession;

  const execute =
    injected[method] ||
    defaults[method];

  const context =
    getContext();

  if (!context?.accountId) {
    throw new Error(
      "Firma kapsamı bulunamadı."
    );
  }

  const session =
    await getSession();

  if (!session?.access_token) {
    throw new Error(
      "WarehouseIQ oturumu geçersiz veya süresi dolmuş."
    );
  }

  const {
    key,
    requestId
  } =
    requestIdFor(
      action,
      payload
    );

  const result =
    await execute({
      accessToken:
        session.access_token,

      accountId:
        context.accountId,

      ...payload,

      requestId
    });

  retryRequestIds.delete(
    key
  );

  return result;
}

export async function persistPackingCreateFromPicking(
  payload,
  injected = {}
) {
  return persist({
    action:
      "create_from_picking",
    payload,
    method:
      "createFromPicking",
    injected
  });
}

export async function persistPackingPackageCreation(
  payload,
  injected = {}
) {
  return persist({
    action:
      "create_package",
    payload,
    method:
      "createPackage",
    injected
  });
}

export async function persistPackingConfirmation(
  payload,
  injected = {}
) {
  return persist({
    action:
      "confirm_item",
    payload,
    method:
      "confirmItem",
    injected
  });
}


export async function persistPackingSealPackage(
  payload,
  injected = {}
) {
  return persist({
    action:
      "seal_package",
    payload,
    method:
      "sealPackage",
    injected
  });
}

export async function persistPackingGeneratePackageLabel(
  payload,
  injected = {}
) {
  return persist({
    action:
      "generate_package_label",
    payload,
    method:
      "generatePackageLabel",
    injected
  });
}

export async function persistPackingResolveException(
  payload,
  injected = {}
) {
  return persist({
    action:
      "resolve_exception",
    payload,
    method:
      "resolveException",
    injected
  });
}

export async function persistPackingComplete(
  payload,
  injected = {}
) {
  return persist({
    action:
      "complete",
    payload,
    method:
      "complete",
    injected
  });
}

export async function persistPackingShippingReady(
  payload,
  injected = {}
) {
  return persist({
    action:
      "mark_shipping_ready",
    payload,
    method:
      "markShippingReady",
    injected
  });
}

export async function persistPackingCancel(
  payload,
  injected = {}
) {
  return persist({
    action:
      "cancel",
    payload,
    method:
      "cancel",
    injected
  });
}


export async function persistPackingCreateLabel(
  payload,
  injected = {}
) {
  return persist({
    action:
      "create_label",
    payload,
    method:
      "createLabel",
    injected
  });
}

export async function persistPackingGenerateLabel(
  payload,
  injected = {}
) {
  return persist({
    action:
      "generate_label",
    payload,
    method:
      "generateLabel",
    injected
  });
}

export async function persistPackingMarkLabelPrinted(
  payload,
  injected = {}
) {
  return persist({
    action:
      "mark_label_printed",
    payload,
    method:
      "markLabelPrinted",
    injected
  });
}

export async function persistPackingMarkLabelFailed(
  payload,
  injected = {}
) {
  return persist({
    action:
      "mark_label_failed",
    payload,
    method:
      "markLabelFailed",
    injected
  });
}

export async function persistPackingCancelLabel(
  payload,
  injected = {}
) {
  return persist({
    action:
      "cancel_label",
    payload,
    method:
      "cancelLabel",
    injected
  });
}


function emit(
  name,
  detail
) {
  document.dispatchEvent(
    new CustomEvent(
      name,
      {
        detail
      }
    )
  );
}

async function handle({
  action,
  event,
  execute,
  start,
  success,
  failure
}) {
  if (pending.has(action)) {
    return;
  }

  pending.add(action);

  const payload =
    event?.detail || {};

  emit(
    start,
    {
      payload
    }
  );

  try {
    const result =
      await execute(
        payload
      );

    emit(
      success,
      {
        payload,
        requestId:
          result.requestId,
        data:
          result.data
      }
    );
  } catch (error) {
    emit(
      failure,
      {
        payload,
        message:
          error instanceof Error
            ? error.message
            : "Paketleme işlemi tamamlanamadı."
      }
    );
  } finally {
    pending.delete(action);
  }
}

if (
  typeof document !==
  "undefined"
) {
  document.addEventListener(
    "warehouse:packing-create-from-picking-confirm",
    (event) => {
      void handle({
        action:
          "create_from_picking",
        event,
        execute:
          persistPackingCreateFromPicking,
        start:
          "warehouse:packing-create-from-picking-start",
        success:
          "warehouse:packing-create-from-picking-success",
        failure:
          "warehouse:packing-create-from-picking-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-create-package-confirm",
    (event) => {
      void handle({
        action:
          "create_package",
        event,
        execute:
          persistPackingPackageCreation,
        start:
          "warehouse:packing-create-package-start",
        success:
          "warehouse:packing-create-package-success",
        failure:
          "warehouse:packing-create-package-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-confirm",
    (event) => {
      void handle({
        action:
          "confirm_item",
        event,
        execute:
          persistPackingConfirmation,
        start:
          "warehouse:packing-write-start",
        success:
          "warehouse:packing-write-success",
        failure:
          "warehouse:packing-write-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-seal-package-confirm",
    (event) => {
      void handle({
        action:
          "seal_package",
        event,
        execute:
          persistPackingSealPackage,
        start:
          "warehouse:packing-seal-package-start",
        success:
          "warehouse:packing-seal-package-success",
        failure:
          "warehouse:packing-seal-package-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-generate-package-label-confirm",
    (event) => {
      void handle({
        action:
          "generate_package_label",
        event,
        execute:
          persistPackingGeneratePackageLabel,
        start:
          "warehouse:packing-generate-package-label-start",
        success:
          "warehouse:packing-generate-package-label-success",
        failure:
          "warehouse:packing-generate-package-label-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-resolve-exception-confirm",
    (event) => {
      void handle({
        action:
          "resolve_exception",
        event,
        execute:
          persistPackingResolveException,
        start:
          "warehouse:packing-resolve-exception-start",
        success:
          "warehouse:packing-resolve-exception-success",
        failure:
          "warehouse:packing-resolve-exception-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-complete-confirm",
    (event) => {
      void handle({
        action:
          "complete",
        event,
        execute:
          persistPackingComplete,
        start:
          "warehouse:packing-complete-start",
        success:
          "warehouse:packing-complete-success",
        failure:
          "warehouse:packing-complete-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-shipping-ready-confirm",
    (event) => {
      void handle({
        action:
          "mark_shipping_ready",
        event,
        execute:
          persistPackingShippingReady,
        start:
          "warehouse:packing-shipping-ready-start",
        success:
          "warehouse:packing-shipping-ready-success",
        failure:
          "warehouse:packing-shipping-ready-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-cancel-confirm",
    (event) => {
      void handle({
        action:
          "cancel",
        event,
        execute:
          persistPackingCancel,
        start:
          "warehouse:packing-cancel-start",
        success:
          "warehouse:packing-cancel-success",
        failure:
          "warehouse:packing-cancel-error"
      });
    }
  );
}

if (
  typeof document !==
  "undefined"
) {
  document.addEventListener(
    "warehouse:packing-create-label-confirm",
    (event) => {
      void handle({
        action:
          "create_label",
        event,
        execute:
          persistPackingCreateLabel,
        start:
          "warehouse:packing-create-label-start",
        success:
          "warehouse:packing-create-label-success",
        failure:
          "warehouse:packing-create-label-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-generate-label-confirm",
    (event) => {
      void handle({
        action:
          "generate_label",
        event,
        execute:
          persistPackingGenerateLabel,
        start:
          "warehouse:packing-generate-label-start",
        success:
          "warehouse:packing-generate-label-success",
        failure:
          "warehouse:packing-generate-label-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-mark-label-printed-confirm",
    (event) => {
      void handle({
        action:
          "mark_label_printed",
        event,
        execute:
          persistPackingMarkLabelPrinted,
        start:
          "warehouse:packing-mark-label-printed-start",
        success:
          "warehouse:packing-mark-label-printed-success",
        failure:
          "warehouse:packing-mark-label-printed-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-mark-label-failed-confirm",
    (event) => {
      void handle({
        action:
          "mark_label_failed",
        event,
        execute:
          persistPackingMarkLabelFailed,
        start:
          "warehouse:packing-mark-label-failed-start",
        success:
          "warehouse:packing-mark-label-failed-success",
        failure:
          "warehouse:packing-mark-label-failed-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:packing-cancel-label-confirm",
    (event) => {
      void handle({
        action:
          "cancel_label",
        event,
        execute:
          persistPackingCancelLabel,
        start:
          "warehouse:packing-cancel-label-start",
        success:
          "warehouse:packing-cancel-label-success",
        failure:
          "warehouse:packing-cancel-label-error"
      });
    }
  );
}
