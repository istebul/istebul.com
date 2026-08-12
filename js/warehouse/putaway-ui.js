import {
  getWarehouseOperationsContext,
  getWarehouseSupabaseClient
} from "./operations-center.js";

import {
  resolvePutawayCompletionReadiness,
  resolvePutawayLocationBarcode,
  resolvePutawayProductBarcode
} from "./putaway-lookup.js";

const ACTIVE_PUTAWAY_STATUSES = Object.freeze([
  "in_progress",
  "partially_completed"
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
  stage: "product",
  productMatch: null,
  locationMatch: null,
  productBarcodeValue: null,
  locationBarcodeValue: null,
  completionReady: false
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
  const element = byId("yerlestirme-mesaji");

  if (!element) {
    return;
  }

  element.dataset.state = type;
  element.textContent = message;
}

function setStage(stage) {
  uiState.stage = stage === "location"
    ? "location"
    : "product";

  const stageInput = byId("yerlestirme-asama");

  if (stageInput) {
    stageInput.value =
      uiState.stage === "location"
        ? "Hedef lokasyon barkodu bekleniyor"
        : "Ürün / SKU barkodu bekleniyor";
  }
}

function clearLocationMatch() {
  uiState.locationMatch = null;
  uiState.locationBarcodeValue = null;

  const input =
    byId("yerlestirme-lokasyon-barkod");

  const result =
    byId("yerlestirme-lokasyon-eslesme");

  const quantity =
    byId("yerlestirme-miktar");

  const confirmButton =
    byId("yerlestirme-onayla");

  if (input) {
    input.value = "";
    input.placeholder =
      uiState.productMatch
        ? "Hedef lokasyon barkodu bekleniyor"
        : "Önce ürün doğrulanmalıdır";
  }

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

function clearProductMatch() {
  uiState.productMatch = null;
  uiState.productBarcodeValue = null;

  const input =
    byId("yerlestirme-urun-barkod");

  const result =
    byId("yerlestirme-urun-eslesme");

  if (input) {
    input.value = "";
  }

  if (result) {
    result.hidden = true;
    result.replaceChildren();
  }

  clearLocationMatch();
  setStage("product");
}

function resetPutawayUi() {
  clearProductMatch();

  uiState.completionReady = false;

  const completeButton =
    byId("yerlestirme-tamamla");

  if (completeButton) {
    completeButton.disabled = true;
  }
}

function renderPutawayOptions(rows) {
  const select =
    byId("yerlestirme-secimi");

  if (!select) {
    return;
  }

  const previous =
    select.value;

  select.replaceChildren();

  const placeholder =
    document.createElement("option");

  placeholder.value = "";
  placeholder.textContent =
    rows.length > 0
      ? "Yerleştirme kaydı seçin"
      : "Aktif yerleştirme kaydı bulunmuyor";

  select.append(placeholder);

  for (const row of rows) {
    const option =
      document.createElement("option");

    option.value = row.id;
    option.textContent =
      row.putaway_number ||
      "Yerleştirme kaydı";

    select.append(option);
  }

  if (
    previous &&
    rows.some(
      (row) => row.id === previous
    )
  ) {
    select.value = previous;
  }

  select.disabled =
    rows.length === 0;
}

async function refreshPutawayCompletionReadiness() {
  const select =
    byId("yerlestirme-secimi");

  const completeButton =
    byId("yerlestirme-tamamla");

  uiState.completionReady = false;

  if (completeButton) {
    completeButton.disabled = true;
  }

  const selectedPutawayId =
    String(
      select?.value || ""
    ).trim();

  if (!selectedPutawayId) {
    return Object.freeze({
      ready: false,
      status: "putaway_required",
      message:
        "Yerleştirme kaydı seçilmelidir."
    });
  }

  const context =
    getWarehouseOperationsContext();

  if (!context.accountId) {
    return Object.freeze({
      ready: false,
      status: "context_missing",
      message:
        "Yerleştirme tamamlama kontrolü için firma kapsamı gereklidir."
    });
  }

  try {
    const result =
      await resolvePutawayCompletionReadiness({
        client:
          getWarehouseSupabaseClient(),
        accountId:
          context.accountId,
        putawayId:
          selectedPutawayId
      });

    if (
      String(
        select?.value || ""
      ).trim() !==
      selectedPutawayId
    ) {
      return Object.freeze({
        ready: false,
        status: "selection_changed",
        message:
          "Yerleştirme seçimi değişti."
      });
    }

    uiState.completionReady =
      result.ready === true;

    if (completeButton) {
      completeButton.disabled =
        !uiState.completionReady;
    }

    return result;
  } catch (error) {
    return Object.freeze({
      ready: false,
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Yerleştirme tamamlama durumu doğrulanamadı."
    });
  }
}

export async function loadPutawayOptions() {
  const context =
    getWarehouseOperationsContext();

  const select =
    byId("yerlestirme-secimi");

  if (!select) {
    return;
  }

  resetPutawayUi();

  if (
    !context.accountId ||
    !context.warehouseId
  ) {
    select.disabled = true;
    renderPutawayOptions([]);

    setMessage(
      "Yerleştirme işlemi için önce yetkili depo seçilmelidir."
    );

    return;
  }

  select.disabled = true;

  setMessage(
    "Aktif yerleştirme kayıtları güvenli bağlantı üzerinden yükleniyor."
  );

  try {
    const client =
      getWarehouseSupabaseClient();

    const {
      data,
      error
    } = await client
      .from("warehouse_putaways")
      .select(
        "id,putaway_number,status,source_location_id,updated_at"
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
        ACTIVE_PUTAWAY_STATUSES
      )
      .order(
        "updated_at",
        {
          ascending: false
        }
      );

    if (error) {
      throw new Error(
        "Aktif yerleştirme kayıtları yüklenemedi."
      );
    }

    const rows =
      Array.isArray(data)
        ? data
        : [];

    renderPutawayOptions(rows);

    const completionReadiness =
      select.value
        ? await refreshPutawayCompletionReadiness()
        : null;

    setMessage(
      completionReadiness?.ready
        ? "Tüm yerleştirme satırları tamamlandı. Yerleştirmeyi Tamamla için ayrıca açık kullanıcı onayı verin."
        : rows.length > 0
          ? "Yerleştirme kaydını seçin ve ürün veya SKU barkodunu okutun."
          : "Bu depoda işleme açık yerleştirme kaydı bulunmuyor.",
      completionReadiness?.ready
        ? "ready"
        : rows.length > 0
          ? "ready"
          : "empty"
    );
  } catch (error) {
    renderPutawayOptions([]);

    setMessage(
      error instanceof Error
        ? error.message
        : "Aktif yerleştirme kayıtları yüklenemedi.",
      "error"
    );
  }
}

function renderProductMatch(result) {
  const container =
    byId("yerlestirme-urun-eslesme");

  if (!container) {
    return;
  }

  container.replaceChildren();

  const title =
    document.createElement("strong");

  title.textContent =
    result.item.line_number !== undefined
      ? `Yerleştirme satırı ${result.item.line_number}`
      : "Yerleştirme satırı eşleşti";

  const details =
    document.createElement("span");

  details.textContent =
    `Kalan: ${formatQuantity(
      result.remainingQuantity
    )} ${unitLabel(result.item.unit)}`;

  const barcode =
    document.createElement("small");

  barcode.textContent =
    `Ürün barkodu: ${result.barcode.value}`;

  container.append(
    title,
    details,
    barcode
  );

  container.hidden = false;
}

function renderLocationMatch(result) {
  const container =
    byId("yerlestirme-lokasyon-eslesme");

  if (!container) {
    return;
  }

  container.replaceChildren();

  const title =
    document.createElement("strong");

  title.textContent =
    result.location.full_code ||
    result.location.code ||
    result.location.name ||
    "Hedef lokasyon doğrulandı";

  const details =
    document.createElement("span");

  details.textContent =
    result.location.name &&
    result.location.name !== title.textContent
      ? result.location.name
      : "Lokasyon kullanıma uygun";

  const barcode =
    document.createElement("small");

  barcode.textContent =
    `Lokasyon barkodu: ${result.location.barcode}`;

  container.append(
    title,
    details,
    barcode
  );

  container.hidden = false;
}

async function resolveProductBarcode(
  barcodeValue
) {
  const select =
    byId("yerlestirme-secimi");

  if (!select?.value) {
    resetPutawayUi();

    setMessage(
      "Barkod okundu ancak henüz yerleştirme kaydı seçilmedi. Önce yerleştirme kaydını seçin.",
      "warning"
    );

    return;
  }

  const context =
    getWarehouseOperationsContext();

  if (!context.accountId) {
    resetPutawayUi();

    setMessage(
      "Ürün barkodunu doğrulamak için WarehouseIQ oturumu ve firma kapsamı gereklidir.",
      "error"
    );

    return;
  }

  clearProductMatch();

  uiState.productBarcodeValue =
    barcodeValue;

  const input =
    byId("yerlestirme-urun-barkod");

  if (input) {
    input.value = barcodeValue;
  }

  setMessage(
    "Ürün veya SKU barkodu yerleştirme satırlarıyla doğrulanıyor."
  );

  try {
    const result =
      await resolvePutawayProductBarcode({
        client:
          getWarehouseSupabaseClient(),
        accountId:
          context.accountId,
        putawayId:
          select.value,
        barcodeValue
      });

    if (result.status !== "matched") {
      setMessage(
        result.message ||
          "Ürün barkodu yerleştirme satırıyla eşleşmedi.",
        result.status === "line_complete"
          ? "warning"
          : "error"
      );

      return;
    }

    uiState.productMatch =
      result;

    renderProductMatch(result);
    clearLocationMatch();
    setStage("location");

    setMessage(
      "Ürün doğrulandı. Şimdi hedef lokasyon barkodunu okutun. Henüz stok hareketi oluşturulmadı.",
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

async function resolveLocationBarcode(
  barcodeValue
) {
  if (!uiState.productMatch) {
    setStage("product");

    setMessage(
      "Hedef lokasyon barkodundan önce ürün veya SKU barkodu doğrulanmalıdır.",
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
    clearLocationMatch();

    setMessage(
      "Lokasyonu doğrulamak için yetkili firma ve depo kapsamı gereklidir.",
      "error"
    );

    return;
  }

  clearLocationMatch();

  uiState.locationBarcodeValue =
    barcodeValue;

  const input =
    byId("yerlestirme-lokasyon-barkod");

  if (input) {
    input.value = barcodeValue;
  }

  setMessage(
    "Hedef lokasyon barkodu depo kapsamında doğrulanıyor."
  );

  try {
    const result =
      await resolvePutawayLocationBarcode({
        client:
          getWarehouseSupabaseClient(),
        accountId:
          context.accountId,
        warehouseId:
          context.warehouseId,
        sourceLocationId:
          uiState.productMatch.item
            .source_location_id,
        barcodeValue
      });

    if (result.status !== "matched") {
      setMessage(
        result.message ||
          "Hedef lokasyon barkodu doğrulanamadı.",
        "error"
      );

      return;
    }

    uiState.locationMatch =
      result;

    renderLocationMatch(result);

    const quantity =
      byId("yerlestirme-miktar");

    const confirmButton =
      byId("yerlestirme-onayla");

    const remaining =
      Number(
        uiState.productMatch
          .remainingQuantity
      );

    if (quantity) {
      quantity.disabled = false;
      quantity.value =
        remaining < 1
          ? String(remaining)
          : "1";

      if (
        Number.isFinite(remaining) &&
        remaining > 0
      ) {
        quantity.max =
          String(remaining);
      }
    }

    if (confirmButton) {
      confirmButton.disabled = false;
    }

    setMessage(
      "Ürün ve hedef lokasyon doğrulandı. Miktarı kontrol edin. Yerleştirmeyi Onayla bu aşamada yalnız kullanıcı doğrulamasıdır; veri tabanına yazmaz.",
      "matched"
    );
  } catch (error) {
    clearLocationMatch();

    setMessage(
      error instanceof Error
        ? error.message
        : "Hedef lokasyon barkodu doğrulanamadı.",
      "error"
    );
  }
}

function normalizedQuantity() {
  const input =
    byId("yerlestirme-miktar");

  const quantity =
    Number(input?.value);

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "Yerleştirme miktarı sıfırdan büyük olmalıdır."
    );
  }

  const remaining =
    Number(
      uiState.productMatch
        ?.remainingQuantity
    );

  if (
    Number.isFinite(remaining) &&
    quantity > remaining
  ) {
    throw new Error(
      "Yerleştirme miktarı kalan miktarı aşamaz."
    );
  }

  return quantity;
}

function buildPutawayConfirmation() {
  if (
    !uiState.productMatch ||
    !uiState.locationMatch
  ) {
    throw new Error(
      "Onay için ürün ve hedef lokasyon doğrulanmalıdır."
    );
  }

  const select =
    byId("yerlestirme-secimi");

  if (!select?.value) {
    throw new Error(
      "Yerleştirme kaydı seçilmelidir."
    );
  }

  return Object.freeze({
    putawayId:
      select.value,
    putawayItemId:
      uiState.productMatch.item.id,
    targetLocationId:
      uiState.locationMatch.location.id,
    quantity:
      normalizedQuantity()
  });
}

function confirmPutawayCandidate() {
  const confirmation =
    buildPutawayConfirmation();

  const approved =
    window.confirm(
      `${formatQuantity(
        confirmation.quantity
      )} ${unitLabel(
        uiState.productMatch.item.unit
      )} ürünü doğrulanan hedef lokasyona yerleştirmek istediğinize emin misiniz?`
    );

  if (!approved) {
    return;
  }

  document.dispatchEvent(
    new CustomEvent(
      "warehouse:putaway-confirm",
      {
        detail:
          confirmation
      }
    )
  );
}

async function confirmPutawayCompletion() {
  const select =
    byId("yerlestirme-secimi");

  if (!select?.value) {
    throw new Error(
      "Tamamlama için yerleştirme kaydı seçilmelidir."
    );
  }

  const readiness =
    await refreshPutawayCompletionReadiness();

  if (!readiness.ready) {
    throw new Error(
      readiness.message ||
        "Yerleştirme henüz tamamlanmaya hazır değil."
    );
  }

  const approved =
    window.confirm(
      "Tüm yerleştirme satırlarının tamamlandığını onaylıyor musunuz? Bu işlem stok transferi oluşturmaz; yerleştirme yaşam döngüsünü tamamlar."
    );

  if (!approved) {
    return;
  }

  document.dispatchEvent(
    new CustomEvent(
      "warehouse:putaway-complete-confirm",
      {
        detail:
          Object.freeze({
            putawayId:
              select.value
          })
      }
    )
  );
}

function putawayPanelIsActive() {
  return window.location.hash ===
    "#yerlestirme";
}

function bindPutawayEvents() {
  const select =
    byId("yerlestirme-secimi");

  const confirmButton =
    byId("yerlestirme-onayla");

  const completeButton =
    byId("yerlestirme-tamamla");

  document.addEventListener(
    "warehouse:operations-context",
    () => {
      void loadPutawayOptions();
    }
  );

  document.addEventListener(
    "warehouse:barcode-scan",
    (event) => {
      if (!putawayPanelIsActive()) {
        return;
      }

      const value =
        String(
          event?.detail?.value || ""
        ).trim();

      if (!value) {
        return;
      }

      if (uiState.stage === "location") {
        void resolveLocationBarcode(
          value
        );
        return;
      }

      void resolveProductBarcode(
        value
      );
    }
  );

  select?.addEventListener(
    "change",
    () => {
      resetPutawayUi();

      if (!select.value) {
        setMessage(
          "Yerleştirme kaydını seçin ve ürün veya SKU barkodunu okutun."
        );
        return;
      }

      setMessage(
        "Yerleştirme kaydı kontrol ediliyor. Tamamlanmamış satır varsa ürün veya SKU barkodunu okutabilirsiniz."
      );

      void refreshPutawayCompletionReadiness()
        .then(
          (readiness) => {
            setMessage(
              readiness.ready
                ? "Tüm yerleştirme satırları tamamlandı. Yerleştirmeyi Tamamla için ayrıca açık kullanıcı onayı verin."
                : "Ürün veya SKU barkodunu okutun.",
              readiness.ready
                ? "ready"
                : "info"
            );
          }
        );
    }
  );

  confirmButton?.addEventListener(
    "click",
    () => {
      try {
        confirmPutawayCandidate();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Yerleştirme doğrulaması tamamlanamadı.",
          "error"
        );
      }
    }
  );

  completeButton?.addEventListener(
    "click",
    () => {
      void confirmPutawayCompletion()
        .catch(
          (error) => {
            setMessage(
              error instanceof Error
                ? error.message
                : "Yerleştirme tamamlama doğrulaması başarısız oldu.",
              "error"
            );
          }
        );
    }
  );

  document.addEventListener(
    "warehouse:putaway-write-start",
    () => {
      const quantity =
        byId("yerlestirme-miktar");
      const confirmButton =
        byId("yerlestirme-onayla");

      if (quantity) {
        quantity.disabled = true;
      }

      if (confirmButton) {
        confirmButton.disabled = true;
      }

      setMessage(
        "Yerleştirme onaylandı. Atomik stok transferi güvenli bağlantı üzerinden uygulanıyor.",
        "working"
      );
    }
  );

  document.addEventListener(
    "warehouse:putaway-write-success",
    (event) => {
      const remaining =
        Number(
          event?.detail?.data
            ?.remainingQuantity
        );

      const movementCount =
        Array.isArray(
          event?.detail?.data
            ?.movementIds
        )
          ? event.detail.data
              .movementIds.length
          : 0;

      resetPutawayUi();

      void loadPutawayOptions()
        .then(() => {
          const remainingText =
            Number.isFinite(remaining)
              ? ` Kalan miktar: ${formatQuantity(
                  remaining
                )}.`
              : "";

          const movementText =
            movementCount > 0
              ? ` Oluşturulan stok hareketi: ${movementCount}.`
              : "";

          setMessage(
            `Yerleştirme miktarı başarıyla kaydedildi.${remainingText}${movementText} Yeni işlem için ürün barkodunu yeniden okutun.`,
            "success"
          );
        });
    }
  );

  document.addEventListener(
    "warehouse:putaway-write-error",
    (event) => {
      const quantity =
        byId("yerlestirme-miktar");
      const confirmButton =
        byId("yerlestirme-onayla");

      if (
        uiState.productMatch &&
        uiState.locationMatch
      ) {
        if (quantity) {
          quantity.disabled = false;
        }

        if (confirmButton) {
          confirmButton.disabled = false;
        }
      }

      setMessage(
        event?.detail?.message ||
          "Yerleştirme işlemi kaydedilemedi.",
        "error"
      );
    }
  );

  document.addEventListener(
    "warehouse:putaway-complete-start",
    () => {
      uiState.completionReady = false;

      const completeButton =
        byId("yerlestirme-tamamla");

      if (completeButton) {
        completeButton.disabled = true;
      }

      setMessage(
        "Yerleştirme tamamlama onayı güvenli bağlantı üzerinden uygulanıyor.",
        "working"
      );
    }
  );

  document.addEventListener(
    "warehouse:putaway-complete-success",
    (event) => {
      const completedAt =
        String(
          event?.detail?.data
            ?.completedAt || ""
        ).trim();

      resetPutawayUi();

      void loadPutawayOptions()
        .then(
          () => {
            setMessage(
              completedAt
                ? `Yerleştirme tamamlandı. Tamamlanma zamanı: ${completedAt}.`
                : "Yerleştirme başarıyla tamamlandı.",
              "success"
            );
          }
        );
    }
  );

  document.addEventListener(
    "warehouse:putaway-complete-error",
    (event) => {
      const message =
        event?.detail?.message ||
        "Yerleştirme tamamlanamadı.";

      void refreshPutawayCompletionReadiness()
        .finally(
          () => {
            setMessage(
              message,
              "error"
            );
          }
        );
    }
  );

  window.addEventListener(
    "hashchange",
    () => {
      if (
        putawayPanelIsActive() &&
        select?.value
      ) {
        setMessage(
          uiState.stage === "location"
            ? "Hedef lokasyon barkodunu okutun."
            : "Ürün veya SKU barkodunu okutun."
        );
      }
    }
  );
}

if (typeof document !== "undefined") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      bindPutawayEvents();

      const context =
        getWarehouseOperationsContext();

      if (
        context.accountId &&
        context.warehouseId
      ) {
        void loadPutawayOptions();
      }
    }
  );
}
