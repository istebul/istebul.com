const BARCODE_TABLE = "warehouse_product_barcodes";
const PUTAWAY_ITEM_TABLE = "warehouse_putaway_items";
const LOCATION_TABLE = "warehouse_locations";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BLOCKED_LOCATION_STATUSES = Object.freeze([
  "blocked",
  "maintenance",
  "inactive"
]);

function requireUuid(value, fieldLabel) {
  const normalized = String(value || "").trim().toLowerCase();

  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${fieldLabel} geçerli bir UUID olmalıdır.`);
  }

  return normalized;
}

function requireBarcodeValue(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error("Barkod değeri zorunludur.");
  }

  if (normalized.length > 128) {
    throw new Error("Barkod en fazla 128 karakter olabilir.");
  }

  return normalized;
}

function numericValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function matchPutawayProductLine(barcode, items) {
  if (!barcode) {
    return Object.freeze({
      status: "barcode_not_found",
      message: "Okutulan barkod ürün kayıtlarında bulunamadı."
    });
  }

  const productItems = (Array.isArray(items) ? items : []).filter(
    (item) => item.product_id === barcode.product_id
  );

  if (barcode.sku_id) {
    const item = productItems.find(
      (candidate) => candidate.sku_id === barcode.sku_id
    );

    if (!item) {
      return Object.freeze({
        status: "not_in_putaway",
        barcode,
        message:
          "Okutulan ürün veya SKU bu yerleştirme kaydında bulunmuyor."
      });
    }

    const remaining = Math.max(
      0,
      numericValue(item.remaining_quantity)
    );

    if (remaining <= 0) {
      return Object.freeze({
        status: "line_complete",
        barcode,
        item,
        remainingQuantity: 0,
        message: "Bu yerleştirme satırı zaten tamamlandı."
      });
    }

    return Object.freeze({
      status: "matched",
      barcode,
      item,
      remainingQuantity: remaining
    });
  }

  if (productItems.length === 0) {
    return Object.freeze({
      status: "not_in_putaway",
      barcode,
      message: "Okutulan ürün bu yerleştirme kaydında bulunmuyor."
    });
  }

  const openItems = productItems.filter(
    (item) => numericValue(item.remaining_quantity) > 0
  );

  if (openItems.length === 0) {
    return Object.freeze({
      status: "line_complete",
      barcode,
      item: productItems[0],
      remainingQuantity: 0,
      message: "Bu ürüne ait yerleştirme satırları zaten tamamlandı."
    });
  }

  if (openItems.length > 1) {
    return Object.freeze({
      status: "sku_required",
      barcode,
      candidateCount: openItems.length,
      message:
        "Bu ürün yerleştirmede birden fazla açık SKU satırında bulunuyor. SKU barkodu okutulmalıdır."
    });
  }

  const item = openItems[0];

  return Object.freeze({
    status: "matched",
    barcode,
    item,
    remainingQuantity: Math.max(
      0,
      numericValue(item.remaining_quantity)
    )
  });
}

export async function resolvePutawayProductBarcode({
  client,
  accountId,
  putawayId,
  barcodeValue
}) {
  if (!client || typeof client.from !== "function") {
    throw new Error("WarehouseIQ veri bağlantısı kullanılamıyor.");
  }

  const normalizedAccountId = requireUuid(
    accountId,
    "Firma kimliği"
  );

  const normalizedPutawayId = requireUuid(
    putawayId,
    "Yerleştirme kimliği"
  );

  const normalizedBarcode = requireBarcodeValue(
    barcodeValue
  );

  const {
    data: barcode,
    error: barcodeError
  } = await client
    .from(BARCODE_TABLE)
    .select(
      "id,product_id,sku_id,value,type,is_primary,active"
    )
    .eq("account_id", normalizedAccountId)
    .eq("value", normalizedBarcode)
    .eq("active", true)
    .maybeSingle();

  if (barcodeError) {
    throw new Error(
      "Barkod ürün kayıtlarında doğrulanamadı."
    );
  }

  if (!barcode) {
    return matchPutawayProductLine(null, []);
  }

  const {
    data: items,
    error: itemsError
  } = await client
    .from(PUTAWAY_ITEM_TABLE)
    .select(
      "id,putaway_id,line_number,warehouse_id,source_location_id,target_location_id,product_id,sku_id,requested_quantity,placed_quantity,remaining_quantity,unit,stock_status,lot_number,serial_number,inventory_movement_ids"
    )
    .eq("account_id", normalizedAccountId)
    .eq("putaway_id", normalizedPutawayId)
    .eq("product_id", barcode.product_id);

  if (itemsError) {
    throw new Error(
      "Yerleştirme satırları barkodla eşleştirilemedi."
    );
  }

  return matchPutawayProductLine(
    barcode,
    Array.isArray(items) ? items : []
  );
}

export function validatePutawayTargetLocation(
  location,
  sourceLocationId
) {
  if (!location) {
    return Object.freeze({
      status: "location_not_found",
      message:
        "Okutulan barkod bu depoda aktif bir lokasyonla eşleşmedi."
    });
  }

  const normalizedSourceLocationId = requireUuid(
    sourceLocationId,
    "Kaynak lokasyon kimliği"
  );

  if (
    String(location.id || "").trim().toLowerCase() ===
    normalizedSourceLocationId
  ) {
    return Object.freeze({
      status: "source_location",
      location,
      message:
        "Hedef lokasyon kaynak lokasyonla aynı olamaz."
    });
  }

  if (
    location.active !== true ||
    BLOCKED_LOCATION_STATUSES.includes(
      String(location.status || "").trim().toLowerCase()
    )
  ) {
    return Object.freeze({
      status: "location_unavailable",
      location,
      message:
        "Okutulan hedef lokasyon yerleştirme için kullanılamıyor."
    });
  }

  return Object.freeze({
    status: "matched",
    location
  });
}

export async function resolvePutawayLocationBarcode({
  client,
  accountId,
  warehouseId,
  sourceLocationId,
  barcodeValue
}) {
  if (!client || typeof client.from !== "function") {
    throw new Error("WarehouseIQ veri bağlantısı kullanılamıyor.");
  }

  const normalizedAccountId = requireUuid(
    accountId,
    "Firma kimliği"
  );

  const normalizedWarehouseId = requireUuid(
    warehouseId,
    "Depo kimliği"
  );

  const normalizedSourceLocationId = requireUuid(
    sourceLocationId,
    "Kaynak lokasyon kimliği"
  );

  const normalizedBarcode = requireBarcodeValue(
    barcodeValue
  );

  const {
    data: location,
    error
  } = await client
    .from(LOCATION_TABLE)
    .select(
      "id,account_id,warehouse_id,code,full_code,barcode,name,location_type,status,active"
    )
    .eq("account_id", normalizedAccountId)
    .eq("warehouse_id", normalizedWarehouseId)
    .eq("barcode", normalizedBarcode)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      "Hedef lokasyon barkodu doğrulanamadı."
    );
  }

  return validatePutawayTargetLocation(
    location,
    normalizedSourceLocationId
  );
}

export function evaluatePutawayCompletionReadiness(items) {
  const rows =
    Array.isArray(items)
      ? items
      : [];

  if (rows.length === 0) {
    return Object.freeze({
      ready: false,
      status: "no_items",
      itemCount: 0,
      incompleteCount: 0,
      missingMovementCount: 0,
      message:
        "Ürün satırı bulunmayan yerleştirme tamamlanamaz."
    });
  }

  const incompleteCount =
    rows.filter(
      (item) =>
        numericValue(
          item?.remaining_quantity
        ) > 0
    ).length;

  if (incompleteCount > 0) {
    return Object.freeze({
      ready: false,
      status: "items_remaining",
      itemCount: rows.length,
      incompleteCount,
      missingMovementCount: 0,
      message:
        "Tüm ürünler yerleştirilmeden işlem tamamlanamaz."
    });
  }

  const missingMovementCount =
    rows.filter(
      (item) =>
        !Array.isArray(
          item?.inventory_movement_ids
        ) ||
        item.inventory_movement_ids
          .length === 0
    ).length;

  if (missingMovementCount > 0) {
    return Object.freeze({
      ready: false,
      status: "movement_missing",
      itemCount: rows.length,
      incompleteCount: 0,
      missingMovementCount,
      message:
        "Stok hareketi bulunmayan yerleştirme satırı tamamlanamaz."
    });
  }

  return Object.freeze({
    ready: true,
    status: "ready",
    itemCount: rows.length,
    incompleteCount: 0,
    missingMovementCount: 0,
    message:
      "Tüm yerleştirme satırları tamamlandı. Ayrı tamamlama onayı verilebilir."
  });
}

export async function resolvePutawayCompletionReadiness({
  client,
  accountId,
  putawayId
}) {
  if (
    !client ||
    typeof client.from !== "function"
  ) {
    throw new Error(
      "WarehouseIQ veri bağlantısı kullanılamıyor."
    );
  }

  const normalizedAccountId =
    requireUuid(
      accountId,
      "Firma kimliği"
    );

  const normalizedPutawayId =
    requireUuid(
      putawayId,
      "Yerleştirme kimliği"
    );

  const {
    data,
    error
  } = await client
    .from(PUTAWAY_ITEM_TABLE)
    .select(
      "id,line_number,remaining_quantity,inventory_movement_ids"
    )
    .eq(
      "account_id",
      normalizedAccountId
    )
    .eq(
      "putaway_id",
      normalizedPutawayId
    )
    .order(
      "line_number",
      {
        ascending: true
      }
    );

  if (error) {
    throw new Error(
      "Yerleştirme tamamlama durumu doğrulanamadı."
    );
  }

  return evaluatePutawayCompletionReadiness(
    Array.isArray(data)
      ? data
      : []
  );
}
