const BARCODE_TABLE =
  "warehouse_product_barcodes";

const PICKING_TABLE =
  "warehouse_pickings";

const PICKING_ITEM_TABLE =
  "warehouse_picking_items";

const PICKING_TASK_TABLE =
  "warehouse_picking_tasks";

const LOCATION_TABLE =
  "warehouse_locations";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACTIVE_PICKING_STATUSES =
  Object.freeze([
    "in_progress",
    "partially_completed"
  ]);

const ACTIVE_TASK_STATUSES =
  Object.freeze([
    "pending",
    "assigned",
    "in_progress",
    "partially_completed"
  ]);

const BLOCKED_LOCATION_STATUSES =
  Object.freeze([
    "blocked",
    "maintenance",
    "inactive"
  ]);

function requireUuid(
  value,
  fieldLabel
) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(
      `${fieldLabel} geçerli bir UUID olmalıdır.`
    );
  }

  return normalized;
}

function requireBarcodeValue(
  value
) {
  const normalized =
    String(value || "")
      .trim();

  if (!normalized) {
    throw new Error(
      "Barkod değeri zorunludur."
    );
  }

  if (normalized.length > 128) {
    throw new Error(
      "Barkod en fazla 128 karakter olabilir."
    );
  }

  return normalized;
}

function numericValue(
  value
) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function normalizedOptionalUuid(
  value
) {
  const normalized =
    String(value || "")
      .trim()
      .toLowerCase();

  return normalized
    ? requireUuid(
        normalized,
        "Kimlik"
      )
    : null;
}

export function validatePickingTaskContext({
  task,
  picking,
  item = null
}) {
  if (!task) {
    return Object.freeze({
      status:
        "task_not_found",
      message:
        "Seçilen toplama görevi bulunamadı."
    });
  }

  if (
    !ACTIVE_TASK_STATUSES.includes(
      String(
        task.status || ""
      )
        .trim()
        .toLowerCase()
    )
  ) {
    return Object.freeze({
      status:
        "task_closed",
      task,
      message:
        "Seçilen toplama görevi işleme açık değil."
    });
  }

  if (!picking) {
    return Object.freeze({
      status:
        "picking_not_found",
      task,
      message:
        "Göreve bağlı toplama kaydı bulunamadı."
    });
  }

  if (
    !ACTIVE_PICKING_STATUSES.includes(
      String(
        picking.status || ""
      )
        .trim()
        .toLowerCase()
    )
  ) {
    return Object.freeze({
      status:
        "picking_closed",
      task,
      picking,
      message:
        "Göreve bağlı toplama operasyonu işleme açık değil."
    });
  }

  if (
    task.picking_item_id &&
    !item
  ) {
    return Object.freeze({
      status:
        "item_not_found",
      task,
      picking,
      message:
        "Göreve bağlı toplama satırı bulunamadı."
    });
  }

  if (
    item &&
    item.picking_id !==
      task.picking_id
  ) {
    return Object.freeze({
      status:
        "item_scope_mismatch",
      task,
      picking,
      item,
      message:
        "Toplama görevi ile ürün satırı aynı toplama kaydına ait değil."
    });
  }

  if (
    item &&
    item.warehouse_id !==
      task.warehouse_id
  ) {
    return Object.freeze({
      status:
        "warehouse_mismatch",
      task,
      picking,
      item,
      message:
        "Toplama görevi ile ürün satırı aynı depoya ait değil."
    });
  }

  if (
    item?.source_location_id &&
    item.source_location_id !==
      task.source_location_id
  ) {
    return Object.freeze({
      status:
        "source_location_mismatch",
      task,
      picking,
      item,
      message:
        "Toplama görevinin kaynak lokasyonu ürün satırıyla uyuşmuyor."
    });
  }

  if (
    item &&
    numericValue(
      item.remaining_quantity
    ) <= 0
  ) {
    return Object.freeze({
      status:
        "line_complete",
      task,
      picking,
      item,
      remainingQuantity:
        0,
      message:
        "Bu toplama satırı zaten işlendi."
    });
  }

  return Object.freeze({
    status:
      "matched",
    task,
    picking,
    item,
    sourceLocationId:
      task.source_location_id,
    destinationLocationId:
      task.destination_location_id ||
      picking.destination_location_id
  });
}

export async function resolvePickingTaskContext({
  client,
  accountId,
  warehouseId,
  taskId
}) {
  if (
    !client ||
    typeof client.from !==
      "function"
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

  const normalizedWarehouseId =
    requireUuid(
      warehouseId,
      "Depo kimliği"
    );

  const normalizedTaskId =
    requireUuid(
      taskId,
      "Toplama görevi kimliği"
    );

  const {
    data: task,
    error: taskError
  } =
    await client
      .from(
        PICKING_TASK_TABLE
      )
      .select(
        "id,picking_id,picking_item_id,warehouse_id,source_location_id,destination_location_id,assigned_user_id,assigned_equipment_id,status,priority,sequence,planned_at,started_at,completed_at,notes"
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
        normalizedTaskId
      )
      .maybeSingle();

  if (taskError) {
    throw new Error(
      "Toplama görevi doğrulanamadı."
    );
  }

  if (!task) {
    return validatePickingTaskContext({
      task: null,
      picking: null
    });
  }

  const {
    data: picking,
    error: pickingError
  } =
    await client
      .from(
        PICKING_TABLE
      )
      .select(
        "id,picking_number,warehouse_id,destination_location_id,status,order_id,order_number,priority,started_at,updated_at"
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
        task.picking_id
      )
      .maybeSingle();

  if (pickingError) {
    throw new Error(
      "Toplama kaydı doğrulanamadı."
    );
  }

  let item = null;

  if (task.picking_item_id) {
    const {
      data,
      error
    } =
      await client
        .from(
          PICKING_ITEM_TABLE
        )
        .select(
          "id,picking_id,line_number,warehouse_id,product_id,sku_id,requested_quantity,picked_quantity,short_quantity,remaining_quantity,unit,stock_status,lot_number,serial_number,production_date,expiry_date,source_location_id,destination_location_id,reservation_id,inventory_movement_ids,transaction_group_ids"
        )
        .eq(
          "account_id",
          normalizedAccountId
        )
        .eq(
          "picking_id",
          task.picking_id
        )
        .eq(
          "id",
          task.picking_item_id
        )
        .maybeSingle();

    if (error) {
      throw new Error(
        "Toplama görevine bağlı ürün satırı doğrulanamadı."
      );
    }

    item =
      data || null;
  }

  return validatePickingTaskContext({
    task,
    picking,
    item
  });
}

export function validatePickingSourceLocation(
  location,
  expectedSourceLocationId
) {
  const normalizedExpectedId =
    requireUuid(
      expectedSourceLocationId,
      "Beklenen kaynak lokasyon kimliği"
    );

  if (!location) {
    return Object.freeze({
      status:
        "location_not_found",
      message:
        "Okutulan barkod bu depoda bir kaynak lokasyonla eşleşmedi."
    });
  }

  const locationId =
    String(
      location.id || ""
    )
      .trim()
      .toLowerCase();

  if (
    locationId !==
    normalizedExpectedId
  ) {
    return Object.freeze({
      status:
        "wrong_source_location",
      location,
      message:
        "Okutulan lokasyon seçilen toplama görevinin kaynak lokasyonu değil."
    });
  }

  if (
    location.active !== true ||
    BLOCKED_LOCATION_STATUSES.includes(
      String(
        location.status || ""
      )
        .trim()
        .toLowerCase()
    )
  ) {
    return Object.freeze({
      status:
        "location_unavailable",
      location,
      message:
        "Toplama kaynak lokasyonu aktif ve kullanılabilir değil."
    });
  }

  return Object.freeze({
    status:
      "matched",
    location
  });
}

export async function resolvePickingSourceLocationBarcode({
  client,
  accountId,
  warehouseId,
  expectedSourceLocationId,
  barcodeValue
}) {
  if (
    !client ||
    typeof client.from !==
      "function"
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

  const normalizedWarehouseId =
    requireUuid(
      warehouseId,
      "Depo kimliği"
    );

  const normalizedSourceId =
    requireUuid(
      expectedSourceLocationId,
      "Kaynak lokasyon kimliği"
    );

  const normalizedBarcode =
    requireBarcodeValue(
      barcodeValue
    );

  const {
    data: location,
    error
  } =
    await client
      .from(
        LOCATION_TABLE
      )
      .select(
        "id,account_id,warehouse_id,code,full_code,barcode,name,location_type,status,active"
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
        "barcode",
        normalizedBarcode
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      "Kaynak lokasyon barkodu doğrulanamadı."
    );
  }

  return validatePickingSourceLocation(
    location,
    normalizedSourceId
  );
}

export function matchPickingProductLine({
  barcode,
  items,
  task
}) {
  if (!barcode) {
    return Object.freeze({
      status:
        "barcode_not_found",
      message:
        "Okutulan barkod ürün kayıtlarında bulunamadı."
    });
  }

  if (!task) {
    return Object.freeze({
      status:
        "task_required",
      barcode,
      message:
        "Ürün barkodundan önce toplama görevi seçilmelidir."
    });
  }

  const rows =
    Array.isArray(items)
      ? items
      : [];

  const productRows =
    rows.filter(
      (item) =>
        item.product_id ===
          barcode.product_id &&
        (
          !item.source_location_id ||
          item.source_location_id ===
            task.source_location_id
        )
    );

  let scopedRows =
    productRows;

  if (task.picking_item_id) {
    scopedRows =
      productRows.filter(
        (item) =>
          item.id ===
          task.picking_item_id
      );
  }

  if (
    barcode.sku_id
  ) {
    scopedRows =
      scopedRows.filter(
        (item) =>
          item.sku_id ===
          barcode.sku_id
      );
  }

  if (
    scopedRows.length === 0
  ) {
    return Object.freeze({
      status:
        "not_in_task",
      barcode,
      message:
        "Okutulan ürün veya SKU seçilen toplama görevinde bulunmuyor."
    });
  }

  const openRows =
    scopedRows.filter(
      (item) =>
        numericValue(
          item.remaining_quantity
        ) > 0
    );

  if (
    openRows.length === 0
  ) {
    return Object.freeze({
      status:
        "line_complete",
      barcode,
      item:
        scopedRows[0],
      remainingQuantity:
        0,
      message:
        "Bu toplama satırı zaten işlendi."
    });
  }

  if (
    openRows.length > 1
  ) {
    return Object.freeze({
      status:
        "sku_required",
      barcode,
      candidateCount:
        openRows.length,
      message:
        "Bu ürün seçilen görevde birden fazla açık toplama satırıyla eşleşiyor. SKU barkodu veya daha dar görev seçimi gereklidir."
    });
  }

  const item =
    openRows[0];

  if (
    barcode.sku_id &&
    item.sku_id !==
      barcode.sku_id
  ) {
    return Object.freeze({
      status:
        "sku_mismatch",
      barcode,
      item,
      message:
        "Okutulan SKU toplama satırıyla uyuşmuyor."
    });
  }

  return Object.freeze({
    status:
      "matched",
    barcode,
    item,
    remainingQuantity:
      Math.max(
        0,
        numericValue(
          item.remaining_quantity
        )
      )
  });
}

export async function resolvePickingProductBarcode({
  client,
  accountId,
  pickingId,
  task,
  barcodeValue
}) {
  if (
    !client ||
    typeof client.from !==
      "function"
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

  const normalizedPickingId =
    requireUuid(
      pickingId,
      "Toplama kimliği"
    );

  const normalizedBarcode =
    requireBarcodeValue(
      barcodeValue
    );

  if (!task) {
    return matchPickingProductLine({
      barcode: null,
      items: [],
      task: null
    });
  }

  if (
    task.picking_id !==
    normalizedPickingId
  ) {
    return Object.freeze({
      status:
        "task_scope_mismatch",
      message:
        "Seçilen toplama görevi farklı bir toplama kaydına ait."
    });
  }

  const {
    data: barcode,
    error: barcodeError
  } =
    await client
      .from(
        BARCODE_TABLE
      )
      .select(
        "id,product_id,sku_id,value,type,is_primary,active"
      )
      .eq(
        "account_id",
        normalizedAccountId
      )
      .eq(
        "value",
        normalizedBarcode
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

  if (!barcode) {
    return matchPickingProductLine({
      barcode: null,
      items: [],
      task
    });
  }

  let query =
    client
      .from(
        PICKING_ITEM_TABLE
      )
      .select(
        "id,picking_id,line_number,warehouse_id,product_id,sku_id,requested_quantity,picked_quantity,short_quantity,remaining_quantity,unit,stock_status,lot_number,serial_number,production_date,expiry_date,source_location_id,destination_location_id,reservation_id,inventory_movement_ids,transaction_group_ids"
      )
      .eq(
        "account_id",
        normalizedAccountId
      )
      .eq(
        "picking_id",
        normalizedPickingId
      )
      .eq(
        "product_id",
        barcode.product_id
      );

  if (
    task.picking_item_id
  ) {
    query =
      query.eq(
        "id",
        normalizedOptionalUuid(
          task.picking_item_id
        )
      );
  }

  const {
    data: items,
    error: itemsError
  } =
    await query;

  if (itemsError) {
    throw new Error(
      "Toplama satırları barkodla eşleştirilemedi."
    );
  }

  return matchPickingProductLine({
    barcode,
    items:
      Array.isArray(items)
        ? items
        : [],
    task
  });
}
