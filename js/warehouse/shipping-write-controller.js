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
        "./shipping-client.js"
      )
    ]);

  return {
    getContext:
      operations
        .getWarehouseOperationsContext,

    getSession:
      operations
        .getWarehouseSession,

    sendAsn:
      client
        .sendShippingAsn,

    acknowledgeAsn:
      client
        .acknowledgeShippingAsn,

    rejectAsn:
      client
        .rejectShippingAsn,

    cancelAsn:
      client
        .cancelShippingAsn,

    dispatch:
      client
        .dispatchShipping,

    recordProofOfDelivery:
      client
        .recordShippingProofOfDelivery,

    createException:
      client
        .createShippingException,

    resolveException:
      client
        .resolveShippingException
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

export async function persistShippingSendAsn(
  payload,
  injected = {}
) {
  return persist({
    action:
      "send_asn",
    payload,
    method:
      "sendAsn",
    injected
  });
}

export async function persistShippingAcknowledgeAsn(
  payload,
  injected = {}
) {
  return persist({
    action:
      "acknowledge_asn",
    payload,
    method:
      "acknowledgeAsn",
    injected
  });
}

export async function persistShippingRejectAsn(
  payload,
  injected = {}
) {
  return persist({
    action:
      "reject_asn",
    payload,
    method:
      "rejectAsn",
    injected
  });
}

export async function persistShippingCancelAsn(
  payload,
  injected = {}
) {
  return persist({
    action:
      "cancel_asn",
    payload,
    method:
      "cancelAsn",
    injected
  });
}

export async function persistShippingDispatch(
  payload,
  injected = {}
) {
  return persist({
    action:
      "dispatch",
    payload,
    method:
      "dispatch",
    injected
  });
}

export async function persistShippingRecordProofOfDelivery(
  payload,
  injected = {}
) {
  return persist({
    action:
      "record_proof_of_delivery",
    payload,
    method:
      "recordProofOfDelivery",
    injected
  });
}

export async function persistShippingCreateException(
  payload,
  injected = {}
) {
  return persist({
    action:
      "create_exception",
    payload,
    method:
      "createException",
    injected
  });
}

export async function persistShippingResolveException(
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
            : "Sevkiyat işlemi tamamlanamadı."
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
    "warehouse:shipping-send-asn-confirm",
    (event) => {
      void handle({
        action:
          "send_asn",
        event,
        execute:
          persistShippingSendAsn,
        start:
          "warehouse:shipping-send-asn-start",
        success:
          "warehouse:shipping-send-asn-success",
        failure:
          "warehouse:shipping-send-asn-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:shipping-acknowledge-asn-confirm",
    (event) => {
      void handle({
        action:
          "acknowledge_asn",
        event,
        execute:
          persistShippingAcknowledgeAsn,
        start:
          "warehouse:shipping-acknowledge-asn-start",
        success:
          "warehouse:shipping-acknowledge-asn-success",
        failure:
          "warehouse:shipping-acknowledge-asn-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:shipping-reject-asn-confirm",
    (event) => {
      void handle({
        action:
          "reject_asn",
        event,
        execute:
          persistShippingRejectAsn,
        start:
          "warehouse:shipping-reject-asn-start",
        success:
          "warehouse:shipping-reject-asn-success",
        failure:
          "warehouse:shipping-reject-asn-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:shipping-cancel-asn-confirm",
    (event) => {
      void handle({
        action:
          "cancel_asn",
        event,
        execute:
          persistShippingCancelAsn,
        start:
          "warehouse:shipping-cancel-asn-start",
        success:
          "warehouse:shipping-cancel-asn-success",
        failure:
          "warehouse:shipping-cancel-asn-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:shipping-dispatch-confirm",
    (event) => {
      void handle({
        action:
          "dispatch",
        event,
        execute:
          persistShippingDispatch,
        start:
          "warehouse:shipping-dispatch-start",
        success:
          "warehouse:shipping-dispatch-success",
        failure:
          "warehouse:shipping-dispatch-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:shipping-record-proof-of-delivery-confirm",
    (event) => {
      void handle({
        action:
          "record_proof_of_delivery",
        event,
        execute:
          persistShippingRecordProofOfDelivery,
        start:
          "warehouse:shipping-record-proof-of-delivery-start",
        success:
          "warehouse:shipping-record-proof-of-delivery-success",
        failure:
          "warehouse:shipping-record-proof-of-delivery-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:shipping-create-exception-confirm",
    (event) => {
      void handle({
        action:
          "create_exception",
        event,
        execute:
          persistShippingCreateException,
        start:
          "warehouse:shipping-create-exception-start",
        success:
          "warehouse:shipping-create-exception-success",
        failure:
          "warehouse:shipping-create-exception-error"
      });
    }
  );

  document.addEventListener(
    "warehouse:shipping-resolve-exception-confirm",
    (event) => {
      void handle({
        action:
          "resolve_exception",
        event,
        execute:
          persistShippingResolveException,
        start:
          "warehouse:shipping-resolve-exception-start",
        success:
          "warehouse:shipping-resolve-exception-success",
        failure:
          "warehouse:shipping-resolve-exception-error"
      });
    }
  );
}

async function dependencies2() {
  const [
    operations,
    client
  ] =
    await Promise.all([
      import(
        "./operations-center.js"
      ),
      import(
        "./shipping-client.js"
      )
    ]);

  return {
    getContext:
      operations
        .getWarehouseOperationsContext,

    getSession:
      operations
        .getWarehouseSession,

    startLoading:
      client
        .startShippingLoading,

    confirmItemLoad:
      client
        .confirmShippingItemLoad,

    loadPackageOnVehicle:
      client
        .loadShippingPackageOnVehicle,

    completeLoading:
      client
        .completeShippingLoading,

    createManifest:
      client
        .createShippingManifest,

    generateManifest:
      client
        .generateShippingManifest,

    approveManifest:
      client
        .approveShippingManifest,

    submitManifest:
      client
        .submitShippingManifest,

    createAsn:
      client
        .createShippingAsn,

    generateAsn:
      client
        .generateShippingAsn
  };
}

async function persist2({
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
      : await dependencies2();

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

export async function persistShippingStartLoading(
  payload,
  injected = {}
) {
  return persist2({
    action: "start_loading",
    payload,
    method: "startLoading",
    injected
  });
}

export async function persistShippingConfirmItemLoad(
  payload,
  injected = {}
) {
  return persist2({
    action: "confirm_item_load",
    payload,
    method: "confirmItemLoad",
    injected
  });
}

export async function persistShippingLoadPackageOnVehicle(
  payload,
  injected = {}
) {
  return persist2({
    action: "load_package",
    payload,
    method: "loadPackageOnVehicle",
    injected
  });
}

export async function persistShippingCompleteLoading(
  payload,
  injected = {}
) {
  return persist2({
    action: "complete_loading",
    payload,
    method: "completeLoading",
    injected
  });
}

export async function persistShippingCreateManifest(
  payload,
  injected = {}
) {
  return persist2({
    action: "create_manifest",
    payload,
    method: "createManifest",
    injected
  });
}

export async function persistShippingGenerateManifest(
  payload,
  injected = {}
) {
  return persist2({
    action: "generate_manifest",
    payload,
    method: "generateManifest",
    injected
  });
}

export async function persistShippingApproveManifest(
  payload,
  injected = {}
) {
  return persist2({
    action: "approve_manifest",
    payload,
    method: "approveManifest",
    injected
  });
}

export async function persistShippingSubmitManifest(
  payload,
  injected = {}
) {
  return persist2({
    action: "submit_manifest",
    payload,
    method: "submitManifest",
    injected
  });
}

export async function persistShippingCreateAsn(
  payload,
  injected = {}
) {
  return persist2({
    action: "create_asn",
    payload,
    method: "createAsn",
    injected
  });
}

export async function persistShippingGenerateAsn(
  payload,
  injected = {}
) {
  return persist2({
    action: "generate_asn",
    payload,
    method: "generateAsn",
    injected
  });
}

const SHIPPING_LOADING_MANIFEST_ASN_ACTIONS = [
  {
    kebab: "start-loading",
    action: "start_loading",
    execute: persistShippingStartLoading
  },
  {
    kebab: "confirm-item-load",
    action: "confirm_item_load",
    execute: persistShippingConfirmItemLoad
  },
  {
    kebab: "load-package",
    action: "load_package",
    execute: persistShippingLoadPackageOnVehicle
  },
  {
    kebab: "complete-loading",
    action: "complete_loading",
    execute: persistShippingCompleteLoading
  },
  {
    kebab: "create-manifest",
    action: "create_manifest",
    execute: persistShippingCreateManifest
  },
  {
    kebab: "generate-manifest",
    action: "generate_manifest",
    execute: persistShippingGenerateManifest
  },
  {
    kebab: "approve-manifest",
    action: "approve_manifest",
    execute: persistShippingApproveManifest
  },
  {
    kebab: "submit-manifest",
    action: "submit_manifest",
    execute: persistShippingSubmitManifest
  },
  {
    kebab: "create-asn",
    action: "create_asn",
    execute: persistShippingCreateAsn
  },
  {
    kebab: "generate-asn",
    action: "generate_asn",
    execute: persistShippingGenerateAsn
  }
];

if (
  typeof document !==
  "undefined"
) {
  SHIPPING_LOADING_MANIFEST_ASN_ACTIONS.forEach(
    ({ kebab, action, execute }) => {
      document.addEventListener(
        `warehouse:shipping-${kebab}-confirm`,
        (event) => {
          void handle({
            action,
            event,
            execute,
            start:
              `warehouse:shipping-${kebab}-start`,
            success:
              `warehouse:shipping-${kebab}-success`,
            failure:
              `warehouse:shipping-${kebab}-error`
          });
        }
      );
    }
  );
}
