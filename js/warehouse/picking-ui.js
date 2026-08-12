import {
  getWarehouseOperationsContext,
  getWarehouseSupabaseClient
} from "./operations-center.js";

import {
  resolvePickingProductBarcode,
  resolvePickingSourceLocationBarcode,
  resolvePickingTaskContext
} from "./picking-lookup.js";

const ACTIVE_TASK_STATUSES =
  Object.freeze([
    "pending",
    "assigned",
    "in_progress",
    "partially_completed"
  ]);

const UNIT_LABELS =
  Object.freeze({
    piece: "Adet",
    box: "Kutu",
    case: "Koli",
    package: "Paket",
    pallet: "Palet",
    kilogram: "Kilogram",
    gram: "Gram",
    liter: "Litre",
    milliliter: "Mililitre",
    meter: "Metre",
    square_meter: "Metrekare",
    cubic_meter: "Metreküp"
  });

const uiState = {
  stage: "location",
  taskContext: null,
  sourceLocationMatch: null,
  productMatch: null,
  sourceBarcodeValue: null,
  productBarcodeValue: null
};

function byId(id) {
  return document.getElementById(
    id
  );
}

function formatQuantity(value) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "tr-TR",
    {
      maximumFractionDigits: 6
    }
  ).format(number);
}

function unitLabel(unit) {
  return UNIT_LABELS[unit] ||
    unit ||
    "Birim";
}

function setMessage(
  message,
  type = "info"
) {
  const element =
    byId(
      "toplama-mesaji"
    );

  if (!element) {
    return;
  }

  element.dataset.state =
    type;

  element.textContent =
    message;
}

function setStage(stage) {
  uiState.stage =
    stage === "product"
      ? "product"
      : "location";

  const stageInput =
    byId(
      "toplama-asama"
    );

  if (stageInput) {
    stageInput.value =
      uiState.stage ===
      "product"
        ? "Ürün / SKU barkodu bekleniyor"
        : "Kaynak lokasyon barkodu bekleniyor";
  }
}

function resetPickingWriteControls() {
  const quantity =
    byId(
      "toplama-miktar"
    );

  const shortQuantity =
    byId(
      "toplama-eksik-miktar"
    );

  const lot =
    byId(
      "toplama-lot-no"
    );

  const serial =
    byId(
      "toplama-seri-no"
    );

  const confirmButton =
    byId(
      "toplama-onayla"
    );

  if (quantity) {
    quantity.value = "0";
    quantity.disabled = true;
    quantity.removeAttribute("max");
  }

  if (shortQuantity) {
    shortQuantity.value = "0";
    shortQuantity.disabled = true;
    shortQuantity.removeAttribute("max");
  }

  if (lot) {
    lot.value = "";
    lot.disabled = true;
    lot.placeholder =
      "Lot takibi yok";
  }

  if (serial) {
    serial.value = "";
    serial.disabled = true;
    serial.placeholder =
      "Seri takibi yok";
  }

  if (confirmButton) {
    confirmButton.disabled = true;
  }
}

function currentPickingItem() {
  return (
    uiState.productMatch
      ?.item ||
    uiState.taskContext
      ?.item ||
    null
  );
}

function currentPickingRemainingQuantity() {
  const fromMatch =
    Number(
      uiState.productMatch
        ?.remainingQuantity
    );

  if (
    Number.isFinite(fromMatch)
  ) {
    return fromMatch;
  }

  const fromItem =
    Number(
      currentPickingItem()
        ?.remaining_quantity
    );

  return Number.isFinite(fromItem)
    ? fromItem
    : 0;
}

function expectedPickingLot() {
  return String(
    currentPickingItem()
      ?.lot_number || ""
  ).trim();
}

function expectedPickingSerial() {
  return String(
    currentPickingItem()
      ?.serial_number || ""
  ).trim();
}

function pickingQuantityInputValue(
  id
) {
  return Number(
    byId(id)?.value ?? 0
  );
}

function pickingWriteControlsAreValid() {
  if (
    !uiState.taskContext ||
    !uiState.sourceLocationMatch ||
    !uiState.productMatch
  ) {
    return false;
  }

  const quantity =
    pickingQuantityInputValue(
      "toplama-miktar"
    );

  const shortQuantity =
    pickingQuantityInputValue(
      "toplama-eksik-miktar"
    );

  const remaining =
    currentPickingRemainingQuantity();

  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(shortQuantity) ||
    quantity < 0 ||
    shortQuantity < 0 ||
    quantity + shortQuantity <= 0 ||
    !Number.isFinite(remaining) ||
    quantity + shortQuantity >
      remaining + 0.0000001
  ) {
    return false;
  }

  const expectedLot =
    expectedPickingLot();

  if (
    expectedLot &&
    String(
      byId(
        "toplama-lot-no"
      )?.value || ""
    ).trim() !== expectedLot
  ) {
    return false;
  }

  const expectedSerial =
    expectedPickingSerial();

  if (
    expectedSerial &&
    String(
      byId(
        "toplama-seri-no"
      )?.value || ""
    ).trim() !== expectedSerial
  ) {
    return false;
  }

  return true;
}

function refreshPickingConfirmationAvailability() {
  const confirmButton =
    byId(
      "toplama-onayla"
    );

  if (!confirmButton) {
    return;
  }

  confirmButton.disabled =
    !pickingWriteControlsAreValid();
}

function preparePickingWriteControls() {
  if (!uiState.productMatch) {
    resetPickingWriteControls();
    return;
  }

  const remaining =
    currentPickingRemainingQuantity();

  if (
    !Number.isFinite(remaining) ||
    remaining <= 0
  ) {
    resetPickingWriteControls();
    return;
  }

  const quantity =
    byId(
      "toplama-miktar"
    );

  const shortQuantity =
    byId(
      "toplama-eksik-miktar"
    );

  const lot =
    byId(
      "toplama-lot-no"
    );

  const serial =
    byId(
      "toplama-seri-no"
    );

  if (quantity) {
    quantity.value = "0";
    quantity.disabled = false;
    quantity.max =
      String(remaining);
  }

  if (shortQuantity) {
    shortQuantity.value = "0";
    shortQuantity.disabled = false;
    shortQuantity.max =
      String(remaining);
  }

  const expectedLot =
    expectedPickingLot();

  if (lot) {
    lot.value = "";
    lot.disabled =
      !expectedLot;

    lot.placeholder =
      expectedLot
        ? `Beklenen lot: ${expectedLot}`
        : "Lot takibi yok";
  }

  const expectedSerial =
    expectedPickingSerial();

  if (serial) {
    serial.value = "";
    serial.disabled =
      !expectedSerial;

    serial.placeholder =
      expectedSerial
        ? `Beklenen seri: ${expectedSerial}`
        : "Seri takibi yok";
  }

  refreshPickingConfirmationAvailability();
}

function buildPickingConfirmation() {
  if (!uiState.taskContext) {
    throw new Error(
      "Toplama görevi doğrulanmalıdır."
    );
  }

  if (!uiState.sourceLocationMatch) {
    throw new Error(
      "Kaynak lokasyon barkodu doğrulanmalıdır."
    );
  }

  if (!uiState.productMatch) {
    throw new Error(
      "Ürün veya SKU barkodu doğrulanmalıdır."
    );
  }

  const quantity =
    pickingQuantityInputValue(
      "toplama-miktar"
    );

  const shortQuantity =
    pickingQuantityInputValue(
      "toplama-eksik-miktar"
    );

  const remaining =
    currentPickingRemainingQuantity();

  if (
    !Number.isFinite(quantity) ||
    quantity < 0
  ) {
    throw new Error(
      "Toplanan miktar geçerli ve sıfır veya sıfırdan büyük olmalıdır."
    );
  }

  if (
    !Number.isFinite(shortQuantity) ||
    shortQuantity < 0
  ) {
    throw new Error(
      "Eksik toplama miktarı geçerli ve sıfır veya sıfırdan büyük olmalıdır."
    );
  }

  if (
    quantity +
      shortQuantity <=
    0
  ) {
    throw new Error(
      "Toplanan miktar veya eksik toplama miktarından en az biri sıfırdan büyük olmalıdır."
    );
  }

  if (
    quantity +
      shortQuantity >
      remaining + 0.0000001
  ) {
    throw new Error(
      `Toplanan ve eksik bildirilen toplam miktar kalan miktarı aşamaz. Kalan: ${formatQuantity(
        remaining
      )}`
    );
  }

  const item =
    currentPickingItem();

  const pickingId =
    String(
      uiState.taskContext
        ?.picking?.id ||
      uiState.taskContext
        ?.task?.picking_id ||
      ""
    ).trim();

  const pickingItemId =
    String(
      item?.id ||
      uiState.taskContext
        ?.task?.picking_item_id ||
      ""
    ).trim();

  const sourceLocationId =
    String(
      uiState.sourceLocationMatch
        ?.location?.id ||
      uiState.taskContext
        ?.task?.source_location_id ||
      item?.source_location_id ||
      ""
    ).trim();

  const destinationLocationId =
    String(
      item?.destination_location_id ||
      uiState.taskContext
        ?.task?.destination_location_id ||
      uiState.taskContext
        ?.picking?.destination_location_id ||
      ""
    ).trim();

  if (!pickingId) {
    throw new Error(
      "Toplama kimliği bulunamadı."
    );
  }

  if (!pickingItemId) {
    throw new Error(
      "Toplama satır kimliği bulunamadı."
    );
  }

  if (!sourceLocationId) {
    throw new Error(
      "Kaynak lokasyon kimliği bulunamadı."
    );
  }

  if (!destinationLocationId) {
    throw new Error(
      "Hedef lokasyon kimliği bulunamadı."
    );
  }

  if (
    sourceLocationId ===
    destinationLocationId
  ) {
    throw new Error(
      "Kaynak ve hedef lokasyon aynı olamaz."
    );
  }

  const barcode =
    String(
      uiState.productMatch
        ?.barcode?.value ||
      uiState.productBarcodeValue ||
      ""
    ).trim();

  if (!barcode) {
    throw new Error(
      "Doğrulanmış ürün veya SKU barkodu bulunamadı."
    );
  }

  const expectedLot =
    expectedPickingLot();

  const enteredLot =
    String(
      byId(
        "toplama-lot-no"
      )?.value || ""
    ).trim();

  if (
    expectedLot &&
    enteredLot !== expectedLot
  ) {
    throw new Error(
      `Lot doğrulaması başarısız. Beklenen lot: ${expectedLot}`
    );
  }

  const expectedSerial =
    expectedPickingSerial();

  const enteredSerial =
    String(
      byId(
        "toplama-seri-no"
      )?.value || ""
    ).trim();

  if (
    expectedSerial &&
    enteredSerial !==
      expectedSerial
  ) {
    throw new Error(
      `Seri numarası doğrulaması başarısız. Beklenen seri: ${expectedSerial}`
    );
  }

  return Object.freeze({
    pickingId,
    pickingItemId,
    sourceLocationId,
    destinationLocationId,
    quantity,
    shortQuantity,
    barcode,

    ...(expectedLot
      ? {
          lotNumber:
            expectedLot
        }
      : {}),

    ...(expectedSerial
      ? {
          serialNumber:
            expectedSerial
        }
      : {})
  });
}

function confirmPickingCandidate() {
  const confirmation =
    buildPickingConfirmation();

  const item =
    currentPickingItem();

  const quantityText =
    `${formatQuantity(
      confirmation.quantity
    )} ${unitLabel(
      item?.unit
    )}`;

  const shortText =
    confirmation.shortQuantity > 0
      ? ` · Eksik: ${formatQuantity(
          confirmation.shortQuantity
        )} ${unitLabel(
          item?.unit
        )}`
      : "";

  const approved =
    window.confirm(
      `${quantityText} toplama işlemini onaylıyor musunuz?${shortText}\n\nBu açık onay sonrasında atomik stok transferi uygulanacaktır.`
    );

  if (!approved) {
    return;
  }

  document.dispatchEvent(
    new CustomEvent(
      "warehouse:picking-confirm",
      {
        detail:
          confirmation
      }
    )
  );
}

function clearProductMatch() {
  resetPickingWriteControls();

uiState.productMatch =
    null;

  uiState.productBarcodeValue =
    null;

  const input =
    byId(
      "toplama-urun-barkod"
    );

  const result =
    byId(
      "toplama-urun-eslesme"
    );

  if (input) {
    input.value = "";
    input.placeholder =
      uiState.sourceLocationMatch
        ? "Ürün / SKU barkodu bekleniyor"
        : "Önce kaynak lokasyon doğrulanmalıdır";
  }

  if (result) {
    result.hidden =
      true;

    result.replaceChildren();
  }
}

function clearSourceLocationMatch() {
  uiState.sourceLocationMatch =
    null;

  uiState.sourceBarcodeValue =
    null;

  const input =
    byId(
      "toplama-kaynak-barkod"
    );

  const result =
    byId(
      "toplama-kaynak-eslesme"
    );

  if (input) {
    input.value = "";
    input.placeholder =
      "Kaynak lokasyon barkodu bekleniyor";
  }

  if (result) {
    result.hidden =
      true;

    result.replaceChildren();
  }

  clearProductMatch();
  setStage(
    "location"
  );
}

function resetPickingUi({
  keepTask = false
} = {}) {
  clearSourceLocationMatch();

  if (!keepTask) {
    uiState.taskContext =
      null;

    const detail =
      byId(
        "toplama-gorev-detayi"
      );

    if (detail) {
      detail.hidden =
        true;

      detail.replaceChildren();
    }
  }
}

function renderTaskOptions(rows) {
  const select =
    byId(
      "toplama-gorevi-secimi"
    );

  if (!select) {
    return;
  }

  const previous =
    select.value;

  select.replaceChildren();

  const placeholder =
    document.createElement(
      "option"
    );

  placeholder.value = "";

  placeholder.textContent =
    rows.length > 0
      ? "Toplama görevi seçin"
      : "Aktif toplama görevi bulunmuyor";

  select.append(
    placeholder
  );

  for (const row of rows) {
    const option =
      document.createElement(
        "option"
      );

    option.value =
      row.id;

    const sequence =
      Number(
        row.sequence
      );

    const priority =
      Number(
        row.priority
      );

    option.textContent =
      `Görev ${
        Number.isFinite(sequence)
          ? sequence
          : "—"
      } · Öncelik ${
        Number.isFinite(priority)
          ? priority
          : "—"
      }`;

    select.append(
      option
    );
  }

  if (
    previous &&
    rows.some(
      (row) =>
        row.id ===
        previous
    )
  ) {
    select.value =
      previous;
  }

  select.disabled =
    rows.length === 0;
}

function renderTaskContext(
  result
) {
  const container =
    byId(
      "toplama-gorev-detayi"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  const picking =
    document.createElement(
      "strong"
    );

  picking.textContent =
    result.picking
      ?.picking_number ||
    "Toplama görevi doğrulandı";

  const task =
    document.createElement(
      "span"
    );

  task.textContent =
    `Görev sırası: ${
      result.task
        ?.sequence ?? "—"
    } · Öncelik: ${
      result.task
        ?.priority ?? "—"
    }`;

  const source =
    document.createElement(
      "small"
    );

  source.textContent =
    "İlk barkod, görevin kaynak lokasyonunu doğrulamalıdır.";

  container.append(
    picking,
    task,
    source
  );

  container.hidden =
    false;
}

function renderSourceLocationMatch(
  result
) {
  const container =
    byId(
      "toplama-kaynak-eslesme"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  const title =
    document.createElement(
      "strong"
    );

  title.textContent =
    result.location.full_code ||
    result.location.code ||
    result.location.name ||
    "Kaynak lokasyon doğrulandı";

  const details =
    document.createElement(
      "span"
    );

  details.textContent =
    result.location.name &&
    result.location.name !==
      title.textContent
      ? result.location.name
      : "Görevin kaynak lokasyonu doğrulandı";

  const barcode =
    document.createElement(
      "small"
    );

  barcode.textContent =
    `Lokasyon barkodu: ${
      result.location.barcode
    }`;

  container.append(
    title,
    details,
    barcode
  );

  container.hidden =
    false;
}

function renderProductMatch(
  result
) {
  const container =
    byId(
      "toplama-urun-eslesme"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  const title =
    document.createElement(
      "strong"
    );

  title.textContent =
    result.item
      .line_number !== undefined
      ? `Toplama satırı ${
          result.item.line_number
        }`
      : "Toplama satırı eşleşti";

  const remaining =
    document.createElement(
      "span"
    );

  remaining.textContent =
    `Kalan: ${
      formatQuantity(
        result.remainingQuantity
      )
    } ${
      unitLabel(
        result.item.unit
      )
    }`;

  const barcode =
    document.createElement(
      "small"
    );

  barcode.textContent =
    `Ürün barkodu: ${
      result.barcode.value
    }`;

  container.append(
    title,
    remaining,
    barcode
  );

  if (
    result.item.lot_number
  ) {
    const lot =
      document.createElement(
        "small"
      );

    lot.textContent =
      `Beklenen lot: ${
        result.item.lot_number
      }`;

    container.append(
      lot
    );
  }

  if (
    result.item.serial_number
  ) {
    const serial =
      document.createElement(
        "small"
      );

    serial.textContent =
      `Beklenen seri no: ${
        result.item.serial_number
      }`;

    container.append(
      serial
    );
  }

  container.hidden =
    false;
}

async function loadSelectedTaskContext() {
  const select =
    byId(
      "toplama-gorevi-secimi"
    );

  const selectedTaskId =
    String(
      select?.value || ""
    ).trim();

  resetPickingUi();

  if (!selectedTaskId) {
    setMessage(
      "Toplama görevini seçin. İlk tarama kaynak lokasyon doğrulamasıdır."
    );

    return;
  }

  const context =
    getWarehouseOperationsContext();

  if (
    !context.accountId ||
    !context.warehouseId
  ) {
    setMessage(
      "Toplama görevi için yetkili firma ve depo kapsamı gereklidir.",
      "error"
    );

    return;
  }

  setMessage(
    "Toplama görevi ve bağlı ürün satırı doğrulanıyor."
  );

  try {
    const result =
      await resolvePickingTaskContext({
        client:
          getWarehouseSupabaseClient(),
        accountId:
          context.accountId,
        warehouseId:
          context.warehouseId,
        taskId:
          selectedTaskId
      });

    if (
      String(
        select?.value || ""
      ).trim() !==
      selectedTaskId
    ) {
      return;
    }

    if (
      result.status !==
      "matched"
    ) {
      setMessage(
        result.message ||
        "Toplama görevi işleme uygun değil.",
        "error"
      );

      return;
    }

    uiState.taskContext =
      result;

    renderTaskContext(
      result
    );

    setStage(
      "location"
    );

    setMessage(
      "Görev doğrulandı. Şimdi kaynak lokasyon barkodunu okutun. Barkod okutma stok hareketi oluşturmaz.",
      "ready"
    );
  } catch (error) {
    resetPickingUi();

    setMessage(
      error instanceof Error
        ? error.message
        : "Toplama görevi doğrulanamadı.",
      "error"
    );
  }
}

export async function loadPickingTaskOptions() {
  const context =
    getWarehouseOperationsContext();

  const select =
    byId(
      "toplama-gorevi-secimi"
    );

  if (!select) {
    return;
  }

  resetPickingUi();

  if (
    !context.accountId ||
    !context.warehouseId
  ) {
    select.disabled =
      true;

    renderTaskOptions([]);

    setMessage(
      "Toplama işlemi için önce yetkili depo seçilmelidir."
    );

    return;
  }

  select.disabled =
    true;

  setMessage(
    "Aktif toplama görevleri güvenli salt-okunur bağlantı üzerinden yükleniyor."
  );

  try {
    const {
      data,
      error
    } =
      await getWarehouseSupabaseClient()
        .from(
          "warehouse_picking_tasks"
        )
        .select(
          "id,picking_id,picking_item_id,warehouse_id,source_location_id,destination_location_id,status,priority,sequence,updated_at"
        )
        .eq(
          "account_id",
          context.accountId
        )
        .eq(
          "warehouse_id",
          context.warehouseId
        )
        .in(
          "status",
          ACTIVE_TASK_STATUSES
        )
        .order(
          "priority",
          {
            ascending:
              false
          }
        )
        .order(
          "sequence",
          {
            ascending:
              true
          }
        );

    if (error) {
      throw new Error(
        "Aktif toplama görevleri yüklenemedi."
      );
    }

    const rows =
      Array.isArray(data)
        ? data
        : [];

    renderTaskOptions(
      rows
    );

    setMessage(
      rows.length > 0
        ? "Toplama görevini seçin. İlk tarama kaynak lokasyon doğrulamasıdır."
        : "Bu depoda işleme açık toplama görevi bulunmuyor.",
      rows.length > 0
        ? "ready"
        : "empty"
    );
  } catch (error) {
    renderTaskOptions([]);

    setMessage(
      error instanceof Error
        ? error.message
        : "Aktif toplama görevleri yüklenemedi.",
      "error"
    );
  }
}

async function resolveSourceBarcode(
  barcodeValue
) {
  if (
    !uiState.taskContext
  ) {
    setMessage(
      "Kaynak lokasyon barkodundan önce toplama görevi seçilmelidir.",
      "warning"
    );

    return;
  }

  const context =
    getWarehouseOperationsContext();

  if (
    !context.accountId ||
    !context.warehouseId
  ) {
    clearSourceLocationMatch();

    setMessage(
      "Kaynak lokasyonu doğrulamak için yetkili firma ve depo kapsamı gereklidir.",
      "error"
    );

    return;
  }

  clearSourceLocationMatch();

  uiState.sourceBarcodeValue =
    barcodeValue;

  const input =
    byId(
      "toplama-kaynak-barkod"
    );

  if (input) {
    input.value =
      barcodeValue;
  }

  setMessage(
    "Kaynak lokasyon barkodu seçilen görevle doğrulanıyor."
  );

  try {
    const result =
      await resolvePickingSourceLocationBarcode({
        client:
          getWarehouseSupabaseClient(),
        accountId:
          context.accountId,
        warehouseId:
          context.warehouseId,
        expectedSourceLocationId:
          uiState.taskContext
            .sourceLocationId,
        barcodeValue
      });

    if (
      result.status !==
      "matched"
    ) {
      setMessage(
        result.message ||
        "Kaynak lokasyon barkodu görevle eşleşmedi.",
        "error"
      );

      return;
    }

    uiState.sourceLocationMatch =
      result;

    renderSourceLocationMatch(
      result
    );

    setStage(
      "product"
    );

    const productInput =
      byId(
        "toplama-urun-barkod"
      );

    if (productInput) {
      productInput.placeholder =
        "Ürün / SKU barkodu bekleniyor";
    }

    setMessage(
      "Kaynak lokasyon doğrulandı. Şimdi ürün veya SKU barkodunu okutun. Henüz stok hareketi oluşturulmadı.",
      "matched"
    );
  } catch (error) {
    clearSourceLocationMatch();

    setMessage(
      error instanceof Error
        ? error.message
        : "Kaynak lokasyon barkodu doğrulanamadı.",
      "error"
    );
  }
}

async function resolveProductBarcode(
  barcodeValue
) {
  if (
    !uiState.taskContext
  ) {
    setStage(
      "location"
    );

    setMessage(
      "Ürün barkodundan önce toplama görevi seçilmelidir.",
      "warning"
    );

    return;
  }

  if (
    !uiState.sourceLocationMatch
  ) {
    setStage(
      "location"
    );

    setMessage(
      "Ürün veya SKU barkodundan önce kaynak lokasyon doğrulanmalıdır.",
      "warning"
    );

    return;
  }

  const context =
    getWarehouseOperationsContext();

  if (!context.accountId) {
    clearProductMatch();

    setMessage(
      "Ürün barkodunu doğrulamak için firma kapsamı gereklidir.",
      "error"
    );

    return;
  }

  clearProductMatch();

  uiState.productBarcodeValue =
    barcodeValue;

  const input =
    byId(
      "toplama-urun-barkod"
    );

  if (input) {
    input.value =
      barcodeValue;
  }

  setMessage(
    "Ürün veya SKU barkodu seçilen toplama göreviyle doğrulanıyor."
  );

  try {
    const result =
      await resolvePickingProductBarcode({
        client:
          getWarehouseSupabaseClient(),
        accountId:
          context.accountId,
        pickingId:
          uiState.taskContext
            .picking.id,
        task:
          uiState.taskContext
            .task,
        barcodeValue
      });

    if (
      result.status !==
      "matched"
    ) {
      setMessage(
        result.message ||
        "Ürün barkodu toplama satırıyla eşleşmedi.",
        result.status ===
          "line_complete"
          ? "warning"
          : "error"
      );

      return;
    }

    uiState.productMatch =
      result;

    renderProductMatch(
      result
    );


      preparePickingWriteControls();

    setMessage(
      "Kaynak lokasyon ve ürün doğrulandı. Toplanan miktarı ve gerekiyorsa eksik toplama miktarını girin. Lot veya seri takibi varsa beklenen değeri teyit edin. Stok hareketi yalnız açık kullanıcı onayından sonra uygulanır.",
      "matched"
    );
  } catch (error) {
    clearProductMatch();

    setMessage(
      error instanceof Error
        ? error.message
        : "Ürün barkodu doğrulanamadı.",
      "error"
    );
  }
}

function pickingPanelIsActive() {
  return window.location.hash ===
    "#toplama";
}

function bindPickingEvents() {
  const select =
    byId(
      "toplama-gorevi-secimi"
    );

  document.addEventListener(
    "warehouse:operations-context",
    () => {
      void loadPickingTaskOptions();
    }
  );

  document.addEventListener(
    "warehouse:barcode-scan",
    (event) => {
      if (
        !pickingPanelIsActive()
      ) {
        return;
      }

      const value =
        String(
          event?.detail?.value || ""
        ).trim();

      if (!value) {
        return;
      }

      if (
        uiState.stage ===
        "product"
      ) {
        void resolveProductBarcode(
          value
        );

        return;
      }

      void resolveSourceBarcode(
        value
      );
    }
  );

  select?.addEventListener(
    "change",
    () => {
      void loadSelectedTaskContext();
    }
  );

  const quantityInput =
    byId(
      "toplama-miktar"
    );

  const shortQuantityInput =
    byId(
      "toplama-eksik-miktar"
    );

  const lotInput =
    byId(
      "toplama-lot-no"
    );

  const serialInput =
    byId(
      "toplama-seri-no"
    );

  const confirmButton =
    byId(
      "toplama-onayla"
    );

  for (
    const input of [
      quantityInput,
      shortQuantityInput,
      lotInput,
      serialInput
    ]
  ) {
    input?.addEventListener(
      "input",
      () => {
        refreshPickingConfirmationAvailability();
      }
    );
  }

  confirmButton?.addEventListener(
    "click",
    () => {
      try {
        confirmPickingCandidate();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Toplama onayı hazırlanamadı.",
          "error"
        );
      }
    }
  );

  document.addEventListener(
    "warehouse:picking-write-start",
    () => {
      for (
        const input of [
          quantityInput,
          shortQuantityInput,
          lotInput,
          serialInput
        ]
      ) {
        if (input) {
          input.disabled =
            true;
        }
      }

      if (confirmButton) {
        confirmButton.disabled =
          true;
      }

      setMessage(
        "Toplama onayı alındı. Atomik stok transferi güvenli bağlantı üzerinden uygulanıyor.",
        "info"
      );
    }
  );

  document.addEventListener(
    "warehouse:picking-write-success",
    () => {
      resetPickingUi();

      setMessage(
        "Toplama satırı atomik olarak işlendi. Aktif görev listesi yenileniyor.",
        "success"
      );

      void loadPickingTaskOptions();
    }
  );

  document.addEventListener(
    "warehouse:picking-write-error",
    (event) => {
      preparePickingWriteControls();

      setMessage(
        event?.detail?.message ||
          "Toplama işlemi kaydedilemedi.",
        "error"
      );
    }
  );



  window.addEventListener(
    "hashchange",
    () => {
      if (
        pickingPanelIsActive()
      ) {
        setMessage(
          uiState.taskContext
            ? uiState.stage ===
                "product"
              ? "Ürün veya SKU barkodunu okutun."
              : "Kaynak lokasyon barkodunu okutun."
            : "Toplama görevini seçin. İlk tarama kaynak lokasyon doğrulamasıdır."
        );
      }
    }
  );
}

if (
  typeof document !==
  "undefined"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      bindPickingEvents();

      const context =
        getWarehouseOperationsContext();

      if (
        context.accountId &&
        context.warehouseId
      ) {
        void loadPickingTaskOptions();
      }
    }
  );
}
