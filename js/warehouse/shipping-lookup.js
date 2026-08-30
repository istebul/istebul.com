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
    proofsOfDelivery,
    items,
    manifests
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
      }),

      loadShippingItems({
        client,
        accountId:
          normalizedAccountId,
        shippingId:
          normalizedShippingId
      }),

      loadShippingManifests({
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
    items,
    manifests,

    activeManifest:
      Object.freeze(
        manifests.find(
          (m) => !["cancelled", "rejected"].includes(m.status)
        ) || null
      ),

    loadableItems:
      Object.freeze(
        items.filter(
          (item) => Number(item.remaining_quantity) > 0
        )
      ),

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

const ITEM_TABLE = "warehouse_shipping_items";
const MANIFEST_TABLE = "warehouse_shipping_manifests";

export async function loadShippingItems({
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
      .from(ITEM_TABLE)
      .select(
        "id,shipping_id,line_number,product_id,sku_id,packing_id,requested_quantity,loaded_quantity,damaged_quantity,missing_quantity,remaining_quantity,unit,notes,created_at,updated_at"
      )
      .eq(
        "account_id",
        uuid(accountId, "Firma kimliği")
      )
      .eq(
        "shipping_id",
        uuid(shippingId, "Sevkiyat kimliği")
      )
      .order("line_number", { ascending: true });

  if (error) {
    throw new Error("Sevkiyat satırları yüklenemedi.");
  }

  return Object.freeze(data || []);
}

export async function loadShippingManifests({
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
      .from(MANIFEST_TABLE)
      .select(
        "id,shipping_id,manifest_number,status,carrier_id,service_level_id,vehicle_id,package_count,total_weight,total_volume,weight_unit,volume_unit,generated_by,generated_at,approved_by,approved_at,submitted_at,accepted_at,rejection_reason,notes,created_by,created_at,updated_at"
      )
      .eq(
        "account_id",
        uuid(accountId, "Firma kimliği")
      )
      .eq(
        "shipping_id",
        uuid(shippingId, "Sevkiyat kimliği")
      )
      .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Sevkiyat manifestleri yüklenemedi.");
  }

  return Object.freeze(data || []);
}

export function canStartLoading(shipping) {
  return (
    !!shipping &&
    ["released", "loading_ready"].includes(text(shipping.status))
  );
}

export function canCompleteLoadingShipping(shipping) {
  return !!shipping && text(shipping.status) === "loading";
}

export function isShippingItemLoadable(shipping, item) {
  return (
    !!shipping &&
    text(shipping.status) === "loading" &&
    !!item &&
    Number(item.remaining_quantity) > 0
  );
}

export function isShippingPackageLoadable(shipping, shippingPackage) {
  return (
    !!shipping &&
    text(shipping.status) === "loading" &&
    !!shippingPackage &&
    ["loading_ready", "loading"].includes(text(shippingPackage.status))
  );
}

export function canCreateManifest(shipping, manifests) {
  if (!shipping || text(shipping.status) !== "loaded") return false;
  return !(manifests || []).some(
    (m) => !["cancelled", "rejected"].includes(text(m.status))
  );
}

export function canGenerateManifest(manifest) {
  return !!manifest && ["draft", "rejected"].includes(text(manifest.status));
}

export function canApproveManifest(manifest) {
  return !!manifest && text(manifest.status) === "generated";
}

export function canSubmitManifest(manifest) {
  return !!manifest && text(manifest.status) === "approved";
}

export function canCreateAsn(shipping, asns) {
  if (!shipping || !["loaded", "dispatched"].includes(text(shipping.status))) {
    return false;
  }
  return !(asns || []).some(
    (a) => !["cancelled", "rejected"].includes(text(a.status))
  );
}

export function canGenerateAsnDraft(asn) {
  return !!asn && ["draft", "rejected"].includes(text(asn.status));
}
