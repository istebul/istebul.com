const BARCODE_TABLE = "warehouse_product_barcodes";
const RECEIVING_ITEM_TABLE = "warehouse_receiving_items";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function remainingQuantity(item) {
  return Math.max(
    0,
    numericValue(item.expected_quantity) -
      numericValue(item.received_quantity)
  );
}

export function matchReceivingLine(barcode, items) {
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
        status: "not_in_receiving",
        barcode,
        message:
          "Okutulan ürün veya SKU bu mal kabul kaydında bulunmuyor."
      });
    }

    const remaining = remainingQuantity(item);

    if (remaining <= 0) {
      return Object.freeze({
        status: "line_complete",
        barcode,
        item,
        remainingQuantity: 0,
        message: "Bu mal kabul satırının beklenen miktarı zaten tamamlandı."
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
      status: "not_in_receiving",
      barcode,
      message: "Okutulan ürün bu mal kabul kaydında bulunmuyor."
    });
  }

  if (productItems.length > 1) {
    return Object.freeze({
      status: "sku_required",
      barcode,
      candidateCount: productItems.length,
      message:
        "Bu ürün mal kabulde birden fazla SKU satırında bulunuyor. SKU barkodu okutulmalıdır."
    });
  }

  const item = productItems[0];
  const remaining = remainingQuantity(item);

  if (remaining <= 0) {
    return Object.freeze({
      status: "line_complete",
      barcode,
      item,
      remainingQuantity: 0,
      message: "Bu mal kabul satırının beklenen miktarı zaten tamamlandı."
    });
  }

  return Object.freeze({
    status: "matched",
    barcode,
    item,
    remainingQuantity: remaining
  });
}

export async function resolveReceivingBarcode({
  client,
  accountId,
  receivingId,
  barcodeValue
}) {
  if (!client || typeof client.from !== "function") {
    throw new Error("WarehouseIQ veri bağlantısı kullanılamıyor.");
  }

  const normalizedAccountId = requireUuid(
    accountId,
    "Firma kimliği"
  );

  const normalizedReceivingId = requireUuid(
    receivingId,
    "Mal kabul kimliği"
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
    return matchReceivingLine(null, []);
  }

  const {
    data: items,
    error: itemsError
  } = await client
    .from(RECEIVING_ITEM_TABLE)
    .select(
      "id,receiving_id,line_number,product_id,sku_id,expected_quantity,received_quantity,accepted_quantity,rejected_quantity,damaged_quantity,unit,stock_status,quality_control_required,over_delivery_allowed"
    )
    .eq("account_id", normalizedAccountId)
    .eq("receiving_id", normalizedReceivingId)
    .eq("product_id", barcode.product_id);

  if (itemsError) {
    throw new Error(
      "Mal kabul satırları barkodla eşleştirilemedi."
    );
  }

  return matchReceivingLine(
    barcode,
    Array.isArray(items) ? items : []
  );
}
