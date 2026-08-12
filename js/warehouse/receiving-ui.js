import {
  getWarehouseOperationsContext,
  getWarehouseSupabaseClient
} from "./operations-center.js";

import {
  resolveReceivingBarcode
} from "./receiving-lookup.js";

const ACTIVE_RECEIVING_STATUSES = Object.freeze([
  "in_progress",
  "partially_received"
]);

const UNIT_LABELS = Object.freeze({
  piece: "Adet",
  box: "Kutu",
  case: "Koli",
  package: "Paket",
  pallet: "Palet",
  kilogram: "Kilogram",
  gram: "Gram",
  liter: "Litre",
  milliliter: "Mililitre"
});

const uiState = {
  match: null,
  barcodeValue: null
};

function byId(id) {
  return document.getElementById(id);
}

function formatQuantity(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 6
  }).format(number);
}

function unitLabel(unit) {
  return UNIT_LABELS[unit] || unit || "Birim";
}

function setMessage(message, type = "info") {
  const element = byId("mal-kabul-mesaji");

  if (!element) {
    return;
  }

  element.dataset.state = type;
  element.textContent = message;
}

function clearMatch() {
  uiState.match = null;

  const result = byId("mal-kabul-eslesme");
  const quantity = byId("mal-kabul-miktar");
  const confirmButton = byId("mal-kabul-onayla");

  if (result) {
    result.hidden = true;
    result.replaceChildren();
  }

  if (quantity) {
    quantity.value = "1";
    quantity.disabled = true;
    quantity.removeAttribute("max");
  }

  if (confirmButton) {
    confirmButton.disabled = true;
  }
}

function renderReceivingOptions(rows) {
  const select = byId("mal-kabul-secimi");

  if (!select) {
    return;
  }

  const previous = select.value;

  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent =
    rows.length > 0
      ? "Mal kabul kaydı seçin"
      : "Aktif mal kabul kaydı bulunmuyor";

  select.append(placeholder);

  for (const row of rows) {
    const option = document.createElement("option");
    option.value = row.id;

    const reference =
      row.reference_number ||
      row.supplier_name ||
      "Referans yok";

    option.textContent =
      `${row.receiving_number} · ${reference}`;

    select.append(option);
  }

  if (
    previous &&
    rows.some((row) => row.id === previous)
  ) {
    select.value = previous;
  }

  select.disabled = rows.length === 0;

  const completeButton =
    byId("mal-kabul-tamamla");

  if (completeButton) {
    completeButton.disabled =
      !select.value;
  }
}

async function loadReceivingOptions() {
  const context = getWarehouseOperationsContext();
  const select = byId("mal-kabul-secimi");

  if (!select) {
    return;
  }

  clearMatch();

  if (!context.accountId || !context.warehouseId) {
    select.disabled = true;
    renderReceivingOptions([]);

    setMessage(
      "Mal kabul işlemi için önce yetkili depo seçilmelidir."
    );

    return;
  }

  select.disabled = true;

  setMessage(
    "Aktif mal kabul kayıtları güvenli bağlantı üzerinden yükleniyor."
  );

  try {
    const client = getWarehouseSupabaseClient();

    const {
      data,
      error
    } = await client
      .from("warehouse_receivings")
      .select(
        "id,receiving_number,status,supplier_name,reference_number,updated_at"
      )
      .eq("account_id", context.accountId)
      .eq("warehouse_id", context.warehouseId)
      .in("status", ACTIVE_RECEIVING_STATUSES)
      .order("updated_at", {
        ascending: false
      });

    if (error) {
      throw new Error(
        "Aktif mal kabul kayıtları yüklenemedi."
      );
    }

    const rows = Array.isArray(data) ? data : [];

    renderReceivingOptions(rows);

    setMessage(
      rows.length > 0
        ? "Mal kabul kaydını seçin ve ürün barkodunu okutun."
        : "Bu depoda işleme açık mal kabul kaydı bulunmuyor.",
      rows.length > 0 ? "ready" : "empty"
    );
  } catch (error) {
    renderReceivingOptions([]);

    setMessage(
      error instanceof Error
        ? error.message
        : "Aktif mal kabul kayıtları yüklenemedi.",
      "error"
    );
  }
}

function renderMatch(result) {
  const container = byId("mal-kabul-eslesme");
  const quantity = byId("mal-kabul-miktar");
  const confirmButton = byId("mal-kabul-onayla");

  if (
    !container ||
    !quantity ||
    !confirmButton
  ) {
    return;
  }

  container.replaceChildren();

  const title = document.createElement("strong");

  title.textContent =
    result.item.line_number !== undefined
      ? `Mal kabul satırı ${result.item.line_number}`
      : "Mal kabul satırı eşleşti";

  const details = document.createElement("span");
  details.textContent =
    `Kalan: ${formatQuantity(result.remainingQuantity)} ${unitLabel(result.item.unit)}`;

  const barcode = document.createElement("small");
  barcode.textContent =
    `Barkod: ${result.barcode.value}`;

  container.append(
    title,
    details,
    barcode
  );

  container.hidden = false;

  quantity.disabled = false;
  quantity.value =
    result.remainingQuantity < 1
      ? String(result.remainingQuantity)
      : "1";

  if (!result.item.over_delivery_allowed) {
    quantity.max = String(
      result.remainingQuantity
    );
  } else {
    quantity.removeAttribute("max");
  }

  confirmButton.disabled = false;

  setMessage(
    "Barkod mal kabul satırıyla eşleşti. Miktarı kontrol edip açıkça onaylayın.",
    "matched"
  );
}

async function resolveCurrentBarcode(
  barcodeValue
) {
  const select = byId("mal-kabul-secimi");

  if (!select?.value) {
    clearMatch();

    setMessage(
      "Barkod okundu ancak henüz mal kabul kaydı seçilmedi. Önce mal kabul kaydını seçin.",
      "warning"
    );

    return;
  }

  const context =
    getWarehouseOperationsContext();

  if (!context.accountId) {
    clearMatch();

    setMessage(
      "Barkodu doğrulamak için WarehouseIQ oturumu ve firma kapsamı gereklidir.",
      "error"
    );

    return;
  }

  clearMatch();

  setMessage(
    "Barkod mal kabul satırlarıyla doğrulanıyor."
  );

  try {
    const result =
      await resolveReceivingBarcode({
        client:
          getWarehouseSupabaseClient(),
        accountId:
          context.accountId,
        receivingId:
          select.value,
        barcodeValue
      });

    if (result.status !== "matched") {
      setMessage(
        result.message ||
          "Barkod mal kabul satırıyla eşleşmedi.",
        result.status === "line_complete"
          ? "warning"
          : "error"
      );

      return;
    }

    uiState.match = result;
    renderMatch(result);
  } catch (error) {
    clearMatch();

    setMessage(
      error instanceof Error
        ? error.message
        : "Barkod doğrulanamadı.",
      "error"
    );
  }
}

function normalizedQuantity() {
  const input = byId("mal-kabul-miktar");

  const quantity = Number(
    input?.value
  );

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Kabul miktarı sıfırdan büyük olmalıdır."
    );
  }

  return quantity;
}

function createConfirmation() {
  if (
    !uiState.match ||
    !uiState.barcodeValue
  ) {
    throw new Error(
      "Onaylanacak mal kabul satırı bulunmuyor."
    );
  }

  const quantity =
    normalizedQuantity();

  const item =
    uiState.match.item;

  if (
    !item.over_delivery_allowed &&
    quantity >
      uiState.match.remainingQuantity
  ) {
    throw new Error(
      "Kabul miktarı kalan beklenen miktarı aşamaz."
    );
  }

  const select =
    byId("mal-kabul-secimi");

  return Object.freeze({
    receivingId: select.value,
    itemId: item.id,
    receivedQuantity: quantity,
    barcodeValue:
      uiState.barcodeValue,
    productId:
      item.product_id,
    skuId:
      item.sku_id || null
  });
}

function bindReceivingEvents() {
  const select =
    byId("mal-kabul-secimi");

  const confirmButton =
    byId("mal-kabul-onayla");

  document.addEventListener(
    "warehouse:operations-context",
    () => {
      void loadReceivingOptions();
    }
  );

  document.addEventListener(
    "warehouse:barcode-scan",
    (event) => {
      if (
        window.location.hash === "#yerlestirme" ||
        window.location.hash === "#toplama"
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

      uiState.barcodeValue = value;

      const barcodeInput =
        byId("mal-kabul-barkod");

      if (barcodeInput) {
        barcodeInput.value = value;
      }

      void resolveCurrentBarcode(
        value
      );
    }
  );

  select?.addEventListener(
    "change",
    () => {
      clearMatch();

      const completeButton =
        byId("mal-kabul-tamamla");

      if (completeButton) {
        completeButton.disabled =
          !select.value;
      }

      if (uiState.barcodeValue) {
        void resolveCurrentBarcode(
          uiState.barcodeValue
        );
      } else {
        setMessage(
          select.value
            ? "Ürün barkodunu okutun."
            : "Mal kabul kaydını seçin ve ürün barkodunu okutun."
        );
      }
    }
  );

  const completeButton =
    byId("mal-kabul-tamamla");

  completeButton?.addEventListener(
    "click",
    () => {
      const receivingId =
        select?.value || "";

      if (!receivingId) {
        setMessage(
          "Tamamlanacak mal kabul kaydı seçilmelidir.",
          "error"
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Mal kabulü tamamlamak istediğinize emin misiniz? Bu işlem kabul edilen miktarlar için atomik stok hareketlerini oluşturur."
        );

      if (!confirmed) {
        setMessage(
          "Mal kabulü tamamlama işlemi kullanıcı tarafından iptal edildi.",
          "warning"
        );
        return;
      }

      document.dispatchEvent(
        new CustomEvent(
          "warehouse:receiving-complete-confirm",
          {
            detail: Object.freeze({
              receivingId
            })
          }
        )
      );

      setMessage(
        "Mal kabulü tamamlama onayı alındı.",
        "confirmed"
      );
    }
  );

  confirmButton?.addEventListener(
    "click",
    () => {
      try {
        const confirmation =
          createConfirmation();

        document.dispatchEvent(
          new CustomEvent(
            "warehouse:receiving-confirm",
            {
              detail: confirmation
            }
          )
        );

        setMessage(
          "Miktar kullanıcı tarafından onaylandı. Henüz veri tabanına yazılmadı.",
          "confirmed"
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Mal kabul miktarı onaylanamadı.",
          "error"
        );
      }
    }
  );
  document.addEventListener(
    "warehouse:receiving-write-start",
    () => {
      const quantity =
        byId("mal-kabul-miktar");

      const confirmButton =
        byId("mal-kabul-onayla");

      if (quantity) {
        quantity.disabled = true;
      }

      if (confirmButton) {
        confirmButton.disabled = true;
      }

      setMessage(
        "Onaylanan miktar güvenli bağlantı üzerinden kaydediliyor.",
        "saving"
      );
    }
  );

  document.addEventListener(
    "warehouse:receiving-write-success",
    (event) => {
      const data =
        event?.detail?.data || {};

      clearMatch();

      uiState.barcodeValue = null;

      const barcodeInput =
        byId("mal-kabul-barkod");

      if (barcodeInput) {
        barcodeInput.value = "";
      }

      const received =
        data.receivedQuantity !== undefined
          ? formatQuantity(
              data.receivedQuantity
            )
          : "—";

      setMessage(
        `Mal kabul miktarı kaydedildi. Satırdaki toplam gelen miktar: ${received}. Yeni ürün için barkod okutabilirsiniz.`,
        "success"
      );
    }
  );

  document.addEventListener(
    "warehouse:receiving-complete-start",
    () => {
      const completeButton =
        byId("mal-kabul-tamamla");

      if (completeButton) {
        completeButton.disabled = true;
      }

      setMessage(
        "Mal kabul atomik olarak tamamlanıyor ve stok hareketleri oluşturuluyor.",
        "saving"
      );
    }
  );

  document.addEventListener(
    "warehouse:receiving-complete-success",
    (event) => {
      const select =
        byId("mal-kabul-secimi");

      const completeButton =
        byId("mal-kabul-tamamla");

      clearMatch();

      uiState.barcodeValue = null;

      const barcodeInput =
        byId("mal-kabul-barkod");

      if (barcodeInput) {
        barcodeInput.value = "";
      }

      if (select) {
        select.value = "";
      }

      if (completeButton) {
        completeButton.disabled = true;
      }

      const movementCount =
        event?.detail?.data?.postedMovementCount;

      const movementText =
        Number.isFinite(
          Number(movementCount)
        )
          ? ` Oluşturulan stok hareketi: ${movementCount}.`
          : "";

      setMessage(
        `Mal kabul başarıyla tamamlandı.${movementText}`,
        "success"
      );

      void loadReceivingOptions();
    }
  );

  document.addEventListener(
    "warehouse:receiving-complete-error",
    (event) => {
      const select =
        byId("mal-kabul-secimi");

      const completeButton =
        byId("mal-kabul-tamamla");

      if (
        completeButton &&
        select?.value
      ) {
        completeButton.disabled = false;
      }

      setMessage(
        event?.detail?.message ||
          "Mal kabul tamamlanamadı.",
        "error"
      );
    }
  );

  document.addEventListener(
    "warehouse:receiving-write-error",
    (event) => {
      const quantity =
        byId("mal-kabul-miktar");

      const confirmButton =
        byId("mal-kabul-onayla");

      if (uiState.match) {
        if (quantity) {
          quantity.disabled = false;
        }

        if (confirmButton) {
          confirmButton.disabled = false;
        }
      }

      setMessage(
        event?.detail?.message ||
          "Mal kabul miktarı kaydedilemedi.",
        "error"
      );
    }
  );

}

if (typeof document !== "undefined") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      bindReceivingEvents();

      const context =
        getWarehouseOperationsContext();

      if (
        context.accountId &&
        context.warehouseId
      ) {
        void loadReceivingOptions();
      }
    }
  );
}
