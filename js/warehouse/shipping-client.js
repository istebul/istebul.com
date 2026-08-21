const SHIPPING_API =
  "/api/warehouse/shipping";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STRATEGIES = Object.freeze([
  "single_shipment",
  "multi_order",
  "consolidated",
  "direct_delivery",
  "cross_dock",
  "parcel",
  "less_than_truckload",
  "full_truckload",
  "milk_run",
  "route_optimized",
  "carrier_optimized",
  "cost_optimized",
  "service_level_optimized",
  "temperature_controlled",
  "hazardous_material"
]);

function uuid(
  value,
  label
) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  if (!UUID.test(normalized)) {
    throw new Error(
      `${label} geçerli bir UUID olmalıdır.`
    );
  }

  return normalized;
}

function timestamp(
  value,
  label
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (
    typeof value !== "string" ||
    !Number.isFinite(
      Date.parse(value)
    )
  ) {
    throw new Error(
      `${label} geçersizdir.`
    );
  }

  return value.trim();
}

export function buildShippingCreateFromPackingPayload(
  input
) {
  let priority = null;

  if (
    input?.priority !== undefined &&
    input?.priority !== null &&
    input?.priority !== ""
  ) {
    priority =
      Number(input.priority);

    if (
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 100
    ) {
      throw new Error(
        "Sevkiyat önceliği 1 ile 100 arasında olmalıdır."
      );
    }
  }

  const strategy =
    String(
      input?.strategy ||
      "single_shipment"
    )
      .trim()
      .toLowerCase();

  if (!STRATEGIES.includes(strategy)) {
    throw new Error(
      "Sevkiyat stratejisi geçersizdir."
    );
  }

  const plannedAt =
    timestamp(
      input?.plannedAt,
      "Planlanan sevkiyat zamanı"
    );

  const expectedDeliveryAt =
    timestamp(
      input?.expectedDeliveryAt,
      "Beklenen teslimat zamanı"
    );

  let notes = null;

  if (
    input?.notes !== undefined &&
    input?.notes !== null &&
    input?.notes !== ""
  ) {
    if (
      typeof input.notes !== "string"
    ) {
      throw new Error(
        "Sevkiyat notu geçersizdir."
      );
    }

    notes =
      input.notes.trim();

    if (notes.length > 4000) {
      throw new Error(
        "Sevkiyat notu çok uzundur."
      );
    }

    notes ||= null;
  }

  return Object.freeze({
    packingId:
      uuid(
        input?.packingId,
        "Paketleme kimliği"
      ),

    shippingLocationId:
      uuid(
        input?.shippingLocationId,
        "Sevkiyat lokasyonu"
      ),

    strategy,

    ...(priority !== null
      ? { priority }
      : {}),

    ...(plannedAt
      ? { plannedAt }
      : {}),

    ...(expectedDeliveryAt
      ? { expectedDeliveryAt }
      : {}),

    ...(notes
      ? { notes }
      : {})
  });
}

export async function createShippingFromPacking(
  input
) {
  const accessToken =
    String(
      input?.accessToken ||
      ""
    ).trim();

  if (!accessToken) {
    throw new Error(
      "WarehouseIQ oturumu geçersiz veya süresi dolmuş."
    );
  }

  const accountId =
    uuid(
      input?.accountId,
      "Firma kimliği"
    );

  const generatedRequestId =
    input?.requestId ??
    globalThis.crypto
      ?.randomUUID?.();

  const requestId =
    uuid(
      generatedRequestId,
      "İstek kimliği"
    );

  const payload =
    buildShippingCreateFromPackingPayload(
      input
    );

  const fetchImpl =
    input?.fetchImpl ??
    fetch;

  const response =
    await fetchImpl(
      SHIPPING_API,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",

          "Idempotency-Key":
            requestId
        },

        cache: "no-store",

        body:
          JSON.stringify({
            accountId,
            action:
              "create_from_packing",
            payload
          })
      }
    );

  let body = null;

  try {
    body =
      await response.json();
  } catch {
    body = null;
  }

  if (
    !response.ok ||
    body?.ok !== true
  ) {
    throw new Error(
      body?.error?.message ||
      body?.message ||
      "Sevkiyat oluşturulamadı."
    );
  }

  if (
    String(
      body.requestId || ""
    )
      .trim()
      .toLowerCase() !==
    requestId
  ) {
    throw new Error(
      "Sevkiyat servisi beklenmeyen istek kimliği döndürdü."
    );
  }

  if (
    body?.data?.action !==
      "create_from_packing"
  ) {
    throw new Error(
      "Sevkiyat servisi geçerli sonuç döndürmedi."
    );
  }

  return Object.freeze({
    requestId,
    data:
      body.data
  });
}
