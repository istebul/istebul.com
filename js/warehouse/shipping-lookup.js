const SHIPPING_TABLE =
  "warehouse_shippings";

const ASN_TABLE =
  "warehouse_shipping_asns";

const PACKAGE_TABLE =
  "warehouse_shipping_packages";

const EXCEPTION_TABLE =
  "warehouse_shipping_exceptions";

const CARRIER_TABLE =
  "warehouse_shipping_carriers";

const POD_TABLE =
  "warehouse_shipping_proofs_of_delivery";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MOBILE_SHIPPING_STATUSES =
  Object.freeze([
    "draft",
    "planned",
    "loading",
    "loaded",
    "dispatched",
    "in_transit",
    "partially_delivered"
  ]);

function requireClient(client) {
  if (
    !client ||
    typeof client.from !==
      "function"
  ) {
    throw new Error(
      "WarehouseIQ veri bağlantısı kullanılamıyor."
    );
  }
}

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

function text(value) {
  return String(
    value ?? ""
  ).trim();
}

export async function loadShippingOperations({
  client,
  accountId,
  warehouseId
}) {
  requireClient(client);

  const {
    data,
    error
  } =
    await client
      .from(
        SHIPPING_TABLE
      )
      .select(
        "id,shipping_number,warehouse_id,shipping_location_id,packing_id,strategy,status,carrier_id,vehicle_id,dock_id,tracking_number,priority,planned_at,dispatched_at,delivered_at,created_at,updated_at"
      )
      .eq(
        "account_id",
        uuid(
          accountId,
          "Firma kimliği"
        )
      )
      .eq(
        "warehouse_id",
        uuid(
          warehouseId,
          "Depo kimliği"
        )
      )
      .order(
        "priority",
        {
          ascending:
            false
        }
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      );

  if (error) {
    throw new Error(
      "Sevkiyat operasyonları yüklenemedi."
    );
  }

  return Object.freeze(
    (data || []).filter(
      (row) =>
        MOBILE_SHIPPING_STATUSES.includes(
          text(
            row.status
          ).toLowerCase()
        )
    )
  );
}

export async function loadShippingAsns({
  client,
  accountId,
  shippingId
}) {
  requireClient(client);

  const {
    data,
    error
  } =
    await client
      .from(
        ASN_TABLE
      )
      .select(
        "id,shipping_id,asn_number,status,sender_code,receiver_code,planned_dispatch_at,expected_delivery_at,package_count,format,generated_at,sent_at,acknowledged_at,rejection_reason,notes,created_at,updated_at"
      )
      .eq(
        "account_id",
        uuid(
          accountId,
          "Firma kimliği"
        )
      )
      .eq(
        "shipping_id",
        uuid(
          shippingId,
          "Sevkiyat kimliği"
        )
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      );

  if (error) {
    throw new Error(
      "ASN kayıtları yüklenemedi."
    );
  }

  return Object.freeze(
    data || []
  );
}

export async function loadShippingPackages({
  client,
  accountId,
  shippingId
}) {
  requireClient(client);

  const {
    data,
    error
  } =
    await client
      .from(
        PACKAGE_TABLE
      )
      .select(
        "id,shipping_id,status,tracking_number,weight,volume,dispatched_at,created_at,updated_at"
      )
      .eq(
        "account_id",
        uuid(
          accountId,
          "Firma kimliği"
        )
      )
      .eq(
        "shipping_id",
        uuid(
          shippingId,
          "Sevkiyat kimliği"
        )
      )
      .order(
        "created_at",
        {
          ascending:
            true
        }
      );

  if (error) {
    throw new Error(
      "Sevkiyat paketleri yüklenemedi."
    );
  }

  return Object.freeze(
    data || []
  );
}

export async function loadShippingExceptions({
  client,
  accountId,
  shippingId
}) {
  requireClient(client);

  const {
    data,
    error
  } =
    await client
      .from(
        EXCEPTION_TABLE
      )
      .select(
        "id,shipping_id,shipping_item_id,shipping_package_id,task_id,manifest_id,type,message,warehouse_id,dock_id,vehicle_id,carrier_id,resolved,resolved_by,resolved_at,resolution_notes,created_at"
      )
      .eq(
        "account_id",
        uuid(
          accountId,
          "Firma kimliği"
        )
      )
      .eq(
        "shipping_id",
        uuid(
          shippingId,
          "Sevkiyat kimliği"
        )
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      );

  if (error) {
    throw new Error(
      "Sevkiyat istisnaları yüklenemedi."
    );
  }

  return Object.freeze(
    data || []
  );
}

export async function loadShippingProofsOfDelivery({
  client,
  accountId,
  shippingId
}) {
  requireClient(client);

  const {
    data,
    error
  } =
    await client
      .from(
        POD_TABLE
      )
      .select(
        "id,shipping_id,status,recipient_name,delivered_at,captured_by,created_at"
      )
      .eq(
        "account_id",
        uuid(
          accountId,
          "Firma kimliği"
        )
      )
      .eq(
        "shipping_id",
        uuid(
          shippingId,
          "Sevkiyat kimliği"
        )
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      );

  if (error) {
    throw new Error(
      "Teslimat kanıtları yüklenemedi."
    );
  }

  return Object.freeze(
    data || []
  );
}

export function canSendAsn(asn) {
  return (
    !!asn &&
    text(asn.status) === "generated"
  );
}

export function canAcknowledgeAsn(asn) {
  return (
    !!asn &&
    text(asn.status) === "sent"
  );
}

export function canRejectAsn(asn) {
  return (
    !!asn &&
    text(asn.status) === "sent"
  );
}

export function canCancelAsn(asn) {
  return (
    !!asn &&
    !["acknowledged", "cancelled"].includes(
      text(asn.status)
    )
  );
}

export function canDispatchShipping(shipping) {
  return (
    !!shipping &&
    text(shipping.status) === "loaded"
  );
}

export function canRecordProofOfDelivery(shipping) {
  return (
    !!shipping &&
    [
      "dispatched",
      "in_transit",
      "partially_delivered"
    ].includes(
      text(shipping.status)
    )
  );
}

export function canResolveException(exception) {
  return (
    !!exception &&
    exception.resolved !== true
  );
}

export async function loadShippingContext({
  client,
  accountId,
  warehouseId,
  shippingId
}) {
  requireClient(client);

  const normalizedAccountId =
    uuid(
      accountId,
      "Firma kimliği"
    );

  const normalizedWarehouseId =
    uuid(
      warehouseId,
      "Depo kimliği"
    );

  const normalizedShippingId =
    uuid(
      shippingId,
      "Sevkiyat kimliği"
    );

  const {
    data: shipping,
    error
  } =
    await client
      .from(
        SHIPPING_TABLE
      )
      .select(
        "id,shipping_number,warehouse_id,shipping_location_id,packing_id,strategy,status,carrier_id,vehicle_id,dock_id,tracking_number,priority,planned_at,dispatched_at,delivered_at,created_at,updated_at"
      )
      .eq(
        "account_id",
        normalizedAccountId
      )
      .eq(
        "warehouse_id",
        normalizedWarehouseId
      )
      .eq(
        "id",
        normalizedShippingId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      "Sevkiyat operasyonu doğrulanamadı."
    );
  }

  if (!shipping) {
    return null;
  }

  const [
    asns,
    packages,
    exceptions,
    proofsOfDelivery
  ] =
    await Promise.all([
      loadShippingAsns({
        client,
        accountId:
          normalizedAccountId,
        shippingId:
          normalizedShippingId
      }),

      loadShippingPackages({
        client,
        accountId:
          normalizedAccountId,
        shippingId:
          normalizedShippingId
      }),

      loadShippingExceptions({
        client,
        accountId:
          normalizedAccountId,
        shippingId:
          normalizedShippingId
      }),

      loadShippingProofsOfDelivery({
        client,
        accountId:
          normalizedAccountId,
        shippingId:
          normalizedShippingId
      })
    ]);

  return Object.freeze({
    shipping,
    asns,
    packages,
    exceptions,
    proofsOfDelivery,

    sendableAsns:
      Object.freeze(
        asns.filter(canSendAsn)
      ),

    acknowledgeableAsns:
      Object.freeze(
        asns.filter(canAcknowledgeAsn)
      ),

    rejectableAsns:
      Object.freeze(
        asns.filter(canRejectAsn)
      ),

    cancellableAsns:
      Object.freeze(
        asns.filter(canCancelAsn)
      ),

    unresolvedExceptions:
      Object.freeze(
        exceptions.filter(
          (row) =>
            row.resolved !== true
        )
      ),

    canDispatch:
      canDispatchShipping(
        shipping
      ),

    canRecordProofOfDelivery:
      canRecordProofOfDelivery(
        shipping
      )
  });
}
