const PACKING_TABLE =
  "warehouse_packings";

const ITEM_TABLE =
  "warehouse_packing_items";

const CONTAINER_TABLE =
  "warehouse_packing_containers";

const PACKAGE_TABLE =
  "warehouse_packing_packages";

const PICKING_TABLE =
  "warehouse_pickings";

const LOCATION_TABLE =
  "warehouse_locations";

const BARCODE_TABLE =
  "warehouse_product_barcodes";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MOBILE_PACKING_STATUSES =
  Object.freeze([
    "draft",
    "planned",
    "released",
    "in_progress",
    "partially_packed"
  ]);

const CONFIRMABLE =
  Object.freeze([
    "in_progress",
    "partially_packed"
  ]);

const OPEN_PACKAGES =
  Object.freeze([
    "open",
    "in_progress"
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

  return client;
}

function uuid(value, label) {
  const result =
    String(value || "")
      .trim()
      .toLowerCase();

  if (!UUID.test(result)) {
    throw new Error(
      `${label} geçerli bir UUID olmalıdır.`
    );
  }

  return result;
}

function text(value) {
  return String(
    value ?? ""
  ).trim();
}

function numeric(value) {
  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}

function barcode(value) {
  const result =
    text(value);

  if (!result) {
    throw new Error(
      "Barkod değeri zorunludur."
    );
  }

  return result;
}

export function packingRemainingQuantity(
  item
) {
  return Math.max(
    0,
    numeric(
      item?.remaining_quantity
    )
  );
}

export function isPackingConfirmable(
  packing
) {
  return (
    Boolean(packing) &&
    CONFIRMABLE.includes(
      text(
        packing.status
      ).toLowerCase()
    )
  );
}

export function isPackingPackageOpen(
  packingPackage
) {
  return (
    Boolean(packingPackage) &&
    OPEN_PACKAGES.includes(
      text(
        packingPackage.status
      ).toLowerCase()
    )
  );
}

function trackingValue(
  item,
  camel,
  snake,
  fallback
) {
  const tracking =
    item?.tracking &&
    typeof item.tracking ===
      "object"
      ? item.tracking
      : {};

  return text(
    tracking[camel] ??
    tracking[snake] ??
    tracking[fallback] ??
    ""
  );
}

export function expectedPackingLot(
  item
) {
  return trackingValue(
    item,
    "lotNumber",
    "lot_number",
    "lot"
  );
}

export function expectedPackingSerial(
  item
) {
  return trackingValue(
    item,
    "serialNumber",
    "serial_number",
    "serial"
  );
}

export async function loadPackingOperations({
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
        PACKING_TABLE
      )
      .select(
        "id,packing_number,warehouse_id,packing_location_id,shipping_location_id,strategy,status,picking_id,order_id,order_number,priority,planned_at,released_at,started_at,created_at,updated_at"
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
      "Paketleme operasyonları yüklenemedi."
    );
  }

  return Object.freeze(
    (data || []).filter(
      (row) =>
        MOBILE_PACKING_STATUSES.includes(
          text(
            row.status
          ).toLowerCase()
        )
    )
  );
}

export async function loadPackingItems({
  client,
  accountId,
  packingId
}) {
  requireClient(client);

  const {
    data,
    error
  } =
    await client
      .from(
        ITEM_TABLE
      )
      .select(
        "id,packing_id,line_number,picking_id,picking_item_id,warehouse_id,packing_location_id,product_id,sku_id,requested_quantity,packed_quantity,damaged_quantity,missing_quantity,remaining_quantity,unit,tracking,barcode,temperature_controlled,hazardous_material,notes,updated_at"
      )
      .eq(
        "account_id",
        uuid(
          accountId,
          "Firma kimliği"
        )
      )
      .eq(
        "packing_id",
        uuid(
          packingId,
          "Paketleme kimliği"
        )
      )
      .order(
        "line_number",
        {
          ascending:
            true
        }
      );

  if (error) {
    throw new Error(
      "Paketleme satırları yüklenemedi."
    );
  }

  return Object.freeze(
    data || []
  );
}

export async function loadPackingContainers({
  client,
  accountId
}) {
  requireClient(client);

  const {
    data,
    error
  } =
    await client
      .from(
        CONTAINER_TABLE
      )
      .select(
        "id,code,name,type,weight_unit,volume_unit,temperature_controlled,hazardous_material_allowed,reusable,active"
      )
      .eq(
        "account_id",
        uuid(
          accountId,
          "Firma kimliği"
        )
      )
      .eq(
        "active",
        true
      )
      .order(
        "name",
        {
          ascending:
            true
        }
      );

  if (error) {
    throw new Error(
      "Paketleme ambalajları yüklenemedi."
    );
  }

  return Object.freeze(
    data || []
  );
}

export async function loadPackingPackages({
  client,
  accountId,
  packingId
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
        "id,packing_id,package_number,container_id,parent_package_id,status,weight_unit,volume_unit,created_at,updated_at"
      )
      .eq(
        "account_id",
        uuid(
          accountId,
          "Firma kimliği"
        )
      )
      .eq(
        "packing_id",
        uuid(
          packingId,
          "Paketleme kimliği"
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
      "Paketler yüklenemedi."
    );
  }

  return Object.freeze(
    data || []
  );
}

export async function loadPackingContext({
  client,
  accountId,
  warehouseId,
  packingId
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

  const normalizedPackingId =
    uuid(
      packingId,
      "Paketleme kimliği"
    );

  const {
    data: packing,
    error
  } =
    await client
      .from(
        PACKING_TABLE
      )
      .select(
        "id,packing_number,warehouse_id,packing_location_id,shipping_location_id,strategy,status,picking_id,order_id,order_number,priority,created_at,updated_at"
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
        normalizedPackingId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      "Paketleme operasyonu doğrulanamadı."
    );
  }

  if (!packing) {
    return null;
  }

  const [
    items,
    containers,
    packages
  ] =
    await Promise.all([
      loadPackingItems({
        client,
        accountId:
          normalizedAccountId,
        packingId:
          normalizedPackingId
      }),

      loadPackingContainers({
        client,
        accountId:
          normalizedAccountId
      }),

      loadPackingPackages({
        client,
        accountId:
          normalizedAccountId,
        packingId:
          normalizedPackingId
      })
    ]);

  return Object.freeze({
    packing,
    items,
    containers,
    packages,

    remainingItems:
      Object.freeze(
        items.filter(
          (item) =>
            packingRemainingQuantity(
              item
            ) > 0
        )
      ),

    openPackages:
      Object.freeze(
        packages.filter(
          isPackingPackageOpen
        )
      )
  });
}

export async function loadPackingCreationOptions({
  client,
  accountId,
  warehouseId
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

  const [
    pickingResult,
    packingResult,
    locationResult
  ] =
    await Promise.all([
      client
        .from(
          PICKING_TABLE
        )
        .select(
          "id,picking_number,warehouse_id,status,completed_at"
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
          "status",
          "completed"
        )
        .order(
          "completed_at",
          {
            ascending:
              false
          }
        ),

      client
        .from(
          PACKING_TABLE
        )
        .select(
          "id,picking_id"
        )
        .eq(
          "account_id",
          normalizedAccountId
        )
        .eq(
          "warehouse_id",
          normalizedWarehouseId
        ),

      client
        .from(
          LOCATION_TABLE
        )
        .select(
          "id,code,barcode,active"
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
          "active",
          true
        )
        .order(
          "code",
          {
            ascending:
              true
          }
        )
    ]);

  if (pickingResult.error) {
    throw new Error(
      "Tamamlanmış toplama kayıtları yüklenemedi."
    );
  }

  if (packingResult.error) {
    throw new Error(
      "Mevcut paketleme bağlantıları doğrulanamadı."
    );
  }

  if (locationResult.error) {
    throw new Error(
      "Paketleme lokasyonları yüklenemedi."
    );
  }

  const usedPickingIds =
    new Set(
      (packingResult.data || [])
        .map(
          (row) =>
            text(
              row.picking_id
            )
        )
        .filter(Boolean)
    );

  return Object.freeze({
    pickings:
      Object.freeze(
        (pickingResult.data || [])
          .filter(
            (row) =>
              !usedPickingIds.has(
                text(row.id)
              )
          )
      ),

    locations:
      Object.freeze(
        locationResult.data || []
      )
  });
}

export function validatePackingBarcode({
  item,
  barcode: barcodeRow,
  scanned
}) {
  if (!item) {
    return Object.freeze({
      status:
        "item_not_found",
      message:
        "Paketleme satırı bulunamadı."
    });
  }

  if (
    packingRemainingQuantity(
      item
    ) <= 0
  ) {
    return Object.freeze({
      status:
        "line_complete",
      message:
        "Paketleme satırı tamamen işlendi."
    });
  }

  const scannedValue =
    barcode(scanned);

  if (
    text(item.barcode) &&
    scannedValue ===
      text(item.barcode)
  ) {
    return Object.freeze({
      status:
        "matched",
      item,
      scanned:
        scannedValue,
      remainingQuantity:
        packingRemainingQuantity(
          item
        )
    });
  }

  if (!barcodeRow) {
    return Object.freeze({
      status:
        "barcode_not_found",
      message:
        "Okutulan barkod aktif ürün veya SKU barkodu olarak bulunamadı."
    });
  }

  if (
    text(
      barcodeRow.product_id
    ) !==
    text(
      item.product_id
    )
  ) {
    return Object.freeze({
      status:
        "wrong_product",
      message:
        "Okutulan barkod seçili ürüne ait değil."
    });
  }

  if (
    item.sku_id &&
    text(
      barcodeRow.sku_id
    ) !==
      text(
        item.sku_id
      )
  ) {
    return Object.freeze({
      status:
        "wrong_sku",
      message:
        "Okutulan barkod seçili SKU ile eşleşmiyor."
    });
  }

  return Object.freeze({
    status:
      "matched",
    item,
    barcode:
      barcodeRow,
    scanned:
      scannedValue,
    remainingQuantity:
      packingRemainingQuantity(
        item
      )
  });
}

export async function resolvePackingBarcode({
  client,
  accountId,
  packingId,
  packingItemId,
  barcodeValue
}) {
  requireClient(client);

  const normalizedAccountId =
    uuid(
      accountId,
      "Firma kimliği"
    );

  const normalizedPackingId =
    uuid(
      packingId,
      "Paketleme kimliği"
    );

  const normalizedItemId =
    uuid(
      packingItemId,
      "Paketleme satır kimliği"
    );

  const scanned =
    barcode(
      barcodeValue
    );

  const {
    data: item,
    error: itemError
  } =
    await client
      .from(
        ITEM_TABLE
      )
      .select(
        "id,packing_id,product_id,sku_id,remaining_quantity,tracking,barcode"
      )
      .eq(
        "account_id",
        normalizedAccountId
      )
      .eq(
        "packing_id",
        normalizedPackingId
      )
      .eq(
        "id",
        normalizedItemId
      )
      .maybeSingle();

  if (itemError) {
    throw new Error(
      "Paketleme satırı doğrulanamadı."
    );
  }

  if (
    item &&
    text(item.barcode) ===
      scanned
  ) {
    return validatePackingBarcode({
      item,
      barcode:
        null,
      scanned
    });
  }

  const {
    data: barcodeRow,
    error: barcodeError
  } =
    await client
      .from(
        BARCODE_TABLE
      )
      .select(
        "id,product_id,sku_id,value,type,active"
      )
      .eq(
        "account_id",
        normalizedAccountId
      )
      .eq(
        "value",
        scanned
      )
      .eq(
        "active",
        true
      )
      .maybeSingle();

  if (barcodeError) {
    throw new Error(
      "Ürün barkodu doğrulanamadı."
    );
  }

  return validatePackingBarcode({
    item,
    barcode:
      barcodeRow || null,
    scanned
  });
}
