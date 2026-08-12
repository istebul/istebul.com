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

function clearProductMatch() {
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

    setMessage(
      "Kaynak lokasyon ve ürün doğrulandı. Bu A6.2 aşaması salt-okunurdur; barkod taraması execute_item çağırmaz ve stok yazmaz.",
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
