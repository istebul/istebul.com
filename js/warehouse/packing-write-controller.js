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
        .confirmPackingItem
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
}
