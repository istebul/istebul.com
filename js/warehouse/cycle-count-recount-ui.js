const state = {
  tasks: [],
  selectedTaskId: null,
  active: false,
  stage: "location",
  locationVerified: false,
  productVerified: false,
  locationScan: "",
  productScan: "",
  busy: false,
  pendingEvaluation: null,
  evaluationFailed: false
};

function byId(id) {
  return document.getElementById(
    id
  );
}

function text(value) {
  return String(
    value ?? ""
  ).trim();
}

function normalizedCode(
  value
) {
  return text(value)
    .toLocaleUpperCase(
      "tr-TR"
    );
}

function codeMatches(
  scanned,
  expected
) {
  if (
    !text(scanned) ||
    !text(expected)
  ) {
    return false;
  }

  return (
    normalizedCode(
      scanned
    ) ===
    normalizedCode(
      expected
    )
  );
}

function barcodeMatches(
  scanned,
  expected
) {
  const scan =
    text(scanned);

  const barcode =
    text(expected);

  return Boolean(
    scan &&
    barcode &&
    scan === barcode
  );
}

export function isEligibleRecountTask(
  task
) {
  return Boolean(
    task &&
    task.type ===
      "recount" &&
    (
      task.status ===
        "assigned" ||
      task.status ===
        "in_progress"
    ) &&
    task.item?.status ===
      "recount_required" &&
    task.item
      ?.recount_required ===
      true &&
    task.item?.counted_at &&
    !task.item?.recounted_at
  );
}

export function recountLocationMatchesTask(
  task,
  scanned
) {
  const location =
    task?.location;

  if (!location) {
    return false;
  }

  return (
    barcodeMatches(
      scanned,
      location.barcode
    ) ||
    codeMatches(
      scanned,
      location.full_code
    ) ||
    codeMatches(
      scanned,
      location.code
    )
  );
}

export function recountProductMatchesTask(
  task,
  scanned
) {
  if (!task) {
    return false;
  }

  if (
    codeMatches(
      scanned,
      task.product?.code
    )
  ) {
    return true;
  }

  if (
    codeMatches(
      scanned,
      task.sku?.sku_code
    )
  ) {
    return true;
  }

  const barcodes =
    Array.isArray(
      task.barcodes
    )
      ? task.barcodes
      : [];

  return barcodes.some(
    (barcode) =>
      barcodeMatches(
        scanned,
        barcode?.value
      )
  );
}

function currentTask() {
  return (
    state.tasks.find(
      (task) =>
        task.id ===
        state.selectedTaskId
    ) ||
    null
  );
}

function setMessage(
  message,
  status = "waiting"
) {
  const element =
    byId(
      "sayim-yeniden-mesaji"
    );

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.dataset.state =
    status;
}

function setQuantityStatus(
  message,
  status = "waiting"
) {
  const element =
    byId(
      "sayim-yeniden-miktar-durumu"
    );

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.dataset.state =
    status;
}

function clearMatch(id) {
  const element =
    byId(id);

  if (!element) {
    return;
  }

  element.replaceChildren();
  element.hidden = true;
}

function renderMatch(
  id,
  title,
  message
) {
  const element =
    byId(id);

  if (!element) {
    return;
  }

  element.replaceChildren();

  const strong =
    document.createElement(
      "strong"
    );

  const span =
    document.createElement(
      "span"
    );

  strong.textContent =
    title;

  span.textContent =
    message;

  element.append(
    strong,
    span
  );

  element.hidden =
    false;
}

function taskLabel(task) {
  return [
    task.cycleCount
      ?.cycle_count_number ||
      "Sayım",

    task.location
      ?.full_code ||
      task.location?.code ||
      "Lokasyon",

    task.product?.code ||
      task.sku?.sku_code ||
      "Ürün"
  ].join(" · ");
}

function setStage(stage) {
  state.stage =
    stage === "product"
      ? "product"
      : stage === "quantity"
        ? "quantity"
        : "location";

  const field =
    byId(
      "sayim-yeniden-asama"
    );

  if (!field) {
    return;
  }

  field.value =
    state.stage === "product"
      ? "Ürün / SKU barkodu bekleniyor"
      : state.stage === "quantity"
        ? "İkinci fiziksel miktar bekleniyor"
        : "Lokasyon barkodu bekleniyor";
}

function updateControls() {
  const select =
    byId(
      "sayim-yeniden-gorevi-secimi"
    );

  const location =
    byId(
      "sayim-yeniden-lokasyon-barkod"
    );

  const product =
    byId(
      "sayim-yeniden-urun-barkod"
    );

  const quantity =
    byId(
      "sayim-yeniden-sayilan-miktar"
    );

  const notes =
    byId(
      "sayim-yeniden-notu"
    );

  const save =
    byId(
      "sayim-yeniden-miktari-kaydet"
    );

  if (select) {
    select.disabled =
      !state.active ||
      state.busy ||
      state.evaluationFailed ||
      !state.tasks.length;
  }

  if (location) {
    location.disabled =
      !state.active ||
      state.busy;
  }

  if (product) {
    product.disabled =
      !state.active ||
      state.busy ||
      state.stage !==
        "product";
  }

  const ready =
    state.active &&
    !state.busy &&
    state.locationVerified &&
    state.productVerified;

  if (quantity) {
    quantity.disabled =
      !ready;
  }

  if (notes) {
    notes.disabled =
      !ready;
  }

  if (save) {
    const retryReady =
      state.active &&
      !state.busy &&
      state.evaluationFailed &&
      Boolean(
        state.pendingEvaluation
      ) &&
      currentTask()?.id ===
        state.pendingEvaluation
          ?.taskId;

    save.disabled =
      !ready &&
      !retryReady;

    save.textContent =
      retryReady
        ? "Değerlendirmeyi Tekrar Dene"
        : "İkinci Sayım Miktarını Kaydet";
  }
}

function resetVerification() {
  state.stage =
    "location";

  state.locationVerified =
    false;

  state.productVerified =
    false;

  state.locationScan =
    "";

  state.productScan =
    "";

  const location =
    byId(
      "sayim-yeniden-lokasyon-barkod"
    );

  const product =
    byId(
      "sayim-yeniden-urun-barkod"
    );

  const quantity =
    byId(
      "sayim-yeniden-sayilan-miktar"
    );

  const notes =
    byId(
      "sayim-yeniden-notu"
    );

  if (location) {
    location.value = "";
  }

  if (product) {
    product.value = "";
  }

  if (quantity) {
    quantity.value = "";
  }

  if (notes) {
    notes.value = "";
  }

  clearMatch(
    "sayim-yeniden-lokasyon-eslesmesi"
  );

  clearMatch(
    "sayim-yeniden-urun-eslesmesi"
  );

  clearMatch(
    "sayim-yeniden-dogrulama-ozeti"
  );

  setStage(
    "location"
  );

  setQuantityStatus(
    "Önce lokasyon ve ürün doğrulamasını tamamlayın.",
    "waiting"
  );

  updateControls();
}

function renderTaskOptions() {
  const select =
    byId(
      "sayim-yeniden-gorevi-secimi"
    );

  const modeButton =
    byId(
      "sayim-yeniden-modu"
    );

  if (!select) {
    return;
  }

  select.replaceChildren();

  if (!state.tasks.length) {
    const option =
      document.createElement(
        "option"
      );

    option.value = "";

    option.textContent =
      "Aktif yeniden sayım görevi bulunmuyor";

    select.append(option);

    state.selectedTaskId =
      null;

    if (modeButton) {
      modeButton.disabled =
        true;
    }

    resetVerification();

    setMessage(
      "Seçili depoda kontrollü yeniden sayım görevi bulunmuyor.",
      "empty"
    );

    return;
  }

  if (modeButton) {
    modeButton.disabled =
      false;
  }

  for (
    const task of
    state.tasks
  ) {
    const option =
      document.createElement(
        "option"
      );

    option.value =
      task.id;

    option.textContent =
      taskLabel(task);

    select.append(option);
  }

  const exists =
    state.tasks.some(
      (task) =>
        task.id ===
        state.selectedTaskId
    );

  state.selectedTaskId =
    exists
      ? state.selectedTaskId
      : state.tasks[0].id;

  select.value =
    state.selectedTaskId;

  resetVerification();

  setMessage(
    state.active
      ? "Yeniden sayım modu açık. Görev lokasyonunu okutun."
      : "Kontrollü yeniden sayım görevi hazır. Başlatmak için yeniden sayım modunu açın.",
    state.active
      ? "ready"
      : "waiting"
  );
}

function dispatchMode() {
  document.dispatchEvent(
    new CustomEvent(
      "warehouse:cycle-count-recount-mode",
      {
        detail: {
          active:
            state.active
        }
      }
    )
  );
}

function setMode(active) {
  state.active =
    Boolean(active);

  const button =
    byId(
      "sayim-yeniden-modu"
    );

  if (button) {
    button.textContent =
      state.active
        ? "Yeniden Sayım Modunu Kapat"
        : "Yeniden Sayım Modunu Başlat";

    button.setAttribute(
      "aria-pressed",
      state.active
        ? "true"
        : "false"
    );
  }

  resetVerification();
  dispatchMode();

  setMessage(
    state.active
      ? "Yeniden sayım modu açık. Önce seçili görevin lokasyon barkodunu okutun."
      : "Yeniden sayım modu kapalı.",
    state.active
      ? "ready"
      : "waiting"
  );

  updateControls();
}

function resolveLocation(
  scanned
) {
  const task =
    currentTask();

  if (!task) {
    setMessage(
      "Önce yeniden sayım görevini seçin.",
      "warning"
    );

    return;
  }

  const input =
    byId(
      "sayim-yeniden-lokasyon-barkod"
    );

  if (input) {
    input.value =
      scanned;
  }

  state.locationScan =
    scanned;

  if (
    !recountLocationMatchesTask(
      task,
      scanned
    )
  ) {
    state.locationVerified =
      false;

    state.productVerified =
      false;

    state.productScan =
      "";

    clearMatch(
      "sayim-yeniden-lokasyon-eslesmesi"
    );

    clearMatch(
      "sayim-yeniden-urun-eslesmesi"
    );

    clearMatch(
      "sayim-yeniden-dogrulama-ozeti"
    );

    setStage(
      "location"
    );

    setMessage(
      "Okutulan barkod yeniden sayım görevinin lokasyonuyla eşleşmedi.",
      "error"
    );

    updateControls();

    return;
  }

  state.locationVerified =
    true;

  state.productVerified =
    false;

  state.productScan =
    "";

  renderMatch(
    "sayim-yeniden-lokasyon-eslesmesi",
    "Lokasyon doğrulandı",
    task.location?.full_code ||
      task.location?.code ||
      scanned
  );

  clearMatch(
    "sayim-yeniden-urun-eslesmesi"
  );

  clearMatch(
    "sayim-yeniden-dogrulama-ozeti"
  );

  setStage(
    "product"
  );

  setMessage(
    "Lokasyon doğrulandı. Şimdi ürün veya SKU barkodunu okutun.",
    "matched"
  );

  updateControls();
}

function resolveProduct(
  scanned
) {
  const task =
    currentTask();

  if (!task) {
    setMessage(
      "Önce yeniden sayım görevini seçin.",
      "warning"
    );

    return;
  }

  if (
    !state.locationVerified
  ) {
    setStage(
      "location"
    );

    setMessage(
      "Ürün / SKU taramasından önce lokasyon doğrulanmalıdır.",
      "warning"
    );

    return;
  }

  const input =
    byId(
      "sayim-yeniden-urun-barkod"
    );

  if (input) {
    input.value =
      scanned;
  }

  state.productScan =
    scanned;

  if (
    !recountProductMatchesTask(
      task,
      scanned
    )
  ) {
    state.productVerified =
      false;

    clearMatch(
      "sayim-yeniden-urun-eslesmesi"
    );

    clearMatch(
      "sayim-yeniden-dogrulama-ozeti"
    );

    setMessage(
      "Okutulan ürün veya SKU barkodu yeniden sayım göreviyle eşleşmedi.",
      "error"
    );

    updateControls();

    return;
  }

  state.productVerified =
    true;

  renderMatch(
    "sayim-yeniden-urun-eslesmesi",
    "Ürün / SKU doğrulandı",
    task.product?.code ||
      task.sku?.sku_code ||
      scanned
  );

  renderMatch(
    "sayim-yeniden-dogrulama-ozeti",
    "Yeniden sayım görevi fiziksel olarak doğrulandı",
    `${taskLabel(task)}. Henüz miktar veya stok değişikliği yapılmadı.`
  );

  setStage(
    "quantity"
  );

  setMessage(
    "Lokasyon ve ürün doğrulandı. İkinci fiziksel sayım miktarını girip açık kullanıcı onayı verin.",
    "success"
  );

  setQuantityStatus(
    "İkinci fiziksel sayım miktarını girin.",
    "ready"
  );

  updateControls();
}

function parseQuantity(
  value
) {
  const raw =
    text(value);

  if (!raw) {
    throw new Error(
      "İkinci fiziksel sayım miktarını girin."
    );
  }

  const quantity =
    Number(
      raw.replace(
        ",",
        "."
      )
    );

  if (
    !Number.isFinite(
      quantity
    )
  ) {
    throw new Error(
      "İkinci fiziksel sayım miktarı geçerli bir sayı olmalıdır."
    );
  }

  if (quantity < 0) {
    throw new Error(
      "İkinci fiziksel sayım miktarı sıfır veya daha büyük olmalıdır."
    );
  }

  return quantity;
}

function requestSave() {
  const task =
    currentTask();

  if (
    state.evaluationFailed &&
    state.pendingEvaluation &&
    task?.id ===
      state.pendingEvaluation.taskId
  ) {
    state.busy =
      true;

    state.evaluationFailed =
      false;

    updateControls();

    setQuantityStatus(
      "İkinci fiziksel sayım kaydı korunuyor. Güvenli değerlendirme yeniden deneniyor.",
      "loading"
    );

    document.dispatchEvent(
      new CustomEvent(
        "warehouse:cycle-count-recount-evaluation-retry",
        {
          detail:
            Object.freeze({
              ...state.pendingEvaluation
            })
        }
      )
    );

    return;
  }

  if (
    !state.active ||
    !task ||
    !state.locationVerified ||
    !state.productVerified
  ) {
    setQuantityStatus(
      "Yeniden sayım görevinin lokasyon ve ürün doğrulamasını tamamlayın.",
      "warning"
    );

    return;
  }

  const quantityInput =
    byId(
      "sayim-yeniden-sayilan-miktar"
    );

  const notesInput =
    byId(
      "sayim-yeniden-notu"
    );

  let countedQuantity;

  try {
    countedQuantity =
      parseQuantity(
        quantityInput?.value
      );
  } catch (error) {
    setQuantityStatus(
      error instanceof Error
        ? error.message
        : "İkinci fiziksel sayım miktarı geçersiz.",
      "error"
    );

    return;
  }

  const notes =
    text(
      notesInput?.value
    );

  if (
    notes.length >
    1000
  ) {
    setQuantityStatus(
      "Yeniden sayım notu 1000 karakteri aşamaz.",
      "error"
    );

    return;
  }

  const confirmed =
    window.confirm(
      `${taskLabel(task)} için ikinci fiziksel sayım miktarı ${countedQuantity} olarak kaydedilsin mi?\n\nBu işlem yalnız ikinci fiziksel sayım miktarını kaydeder. Final sayım sonucu, fark değerlendirmesi, stok düzeltmesi, envanter hareketi veya sayım tamamlama işlemi oluşturmaz.`
    );

  if (!confirmed) {
    setQuantityStatus(
      "Yeniden sayım kaydı kullanıcı tarafından iptal edildi.",
      "waiting"
    );

    return;
  }

  document.dispatchEvent(
    new CustomEvent(
      "warehouse:cycle-count-recount-confirm",
      {
        detail: {
          cycleCountId:
            task.cycle_count_id,

          cycleCountItemId:
            task.cycle_count_item_id ||
            task.item?.id,

          taskId:
            task.id,

          countedQuantity,

          locationScan:
            state.locationScan,

          productScan:
            state.productScan,

          notes
        }
      }
    )
  );
}

function panelIsActive() {
  return (
    window.location.hash ===
    "#sayim"
  );
}

function bind() {
  const modeButton =
    byId(
      "sayim-yeniden-modu"
    );

  const select =
    byId(
      "sayim-yeniden-gorevi-secimi"
    );

  const save =
    byId(
      "sayim-yeniden-miktari-kaydet"
    );

  modeButton?.addEventListener(
    "click",
    () => {
      if (
        !state.active &&
        !state.tasks.length
      ) {
        setMessage(
          "Başlatılabilir yeniden sayım görevi bulunmuyor.",
          "warning"
        );

        return;
      }

      setMode(
        !state.active
      );
    }
  );

  select?.addEventListener(
    "change",
    () => {
      state.selectedTaskId =
        select.value ||
        null;

      resetVerification();

      setMessage(
        state.selectedTaskId
          ? "Yeniden sayım görevi seçildi. Önce lokasyon barkodunu okutun."
          : "Aktif yeniden sayım görevini seçin.",
        state.selectedTaskId
          ? "ready"
          : "waiting"
      );
    }
  );

  save?.addEventListener(
    "click",
    requestSave
  );

  document.addEventListener(
    "warehouse:cycle-count-recount-tasks",
    (event) => {
      const rawTasks =
        Array.isArray(
          event?.detail?.tasks
        )
          ? event.detail.tasks
          : [];

      state.tasks =
        rawTasks.filter(
          isEligibleRecountTask
        );

      if (
        state.active &&
        !state.tasks.length
      ) {
        setMode(false);
      }

      renderTaskOptions();
      updateControls();
    }
  );

  document.addEventListener(
    "warehouse:barcode-scan",
    (event) => {
      if (
        !state.active ||
        state.busy ||
        !panelIsActive()
      ) {
        return;
      }

      const value =
        text(
          event?.detail?.value
        );

      if (!value) {
        return;
      }

      if (
        state.locationVerified &&
        state.productVerified
      ) {
        setMessage(
          "Fiziksel doğrulama tamamlandı. Yeni barkod yerine ikinci sayım miktarını girin.",
          "ready"
        );

        return;
      }

      if (
        state.stage ===
        "product"
      ) {
        resolveProduct(
          value
        );

        return;
      }

      resolveLocation(
        value
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-recount-start",
    () => {
      state.busy =
        true;

      updateControls();

      setQuantityStatus(
        "İkinci fiziksel sayım miktarı güvenli bağlantı üzerinden kaydediliyor.",
        "loading"
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-recount-success",
    (event) => {
      const confirmation =
        event?.detail
          ?.confirmation ||
        {};

      const evaluation =
        Object.freeze({
          cycleCountId:
            text(
              confirmation
                .cycleCountId
            ),

          cycleCountItemId:
            text(
              confirmation
                .cycleCountItemId
            ),

          taskId:
            text(
              confirmation
                .taskId
            )
        });

      if (
        !evaluation.cycleCountId ||
        !evaluation
          .cycleCountItemId ||
        !evaluation.taskId
      ) {
        state.busy =
          false;

        state.pendingEvaluation =
          null;

        state.evaluationFailed =
          false;

        updateControls();

        setQuantityStatus(
          "İkinci fiziksel miktar kaydedildi ancak değerlendirme kimlikleri doğrulanamadı.",
          "error"
        );

        return;
      }

      state.busy =
        true;

      state.pendingEvaluation =
        evaluation;

      state.evaluationFailed =
        false;

      updateControls();

      setQuantityStatus(
        "İkinci fiziksel sayım miktarı kaydedildi. Güvenli yeniden sayım değerlendirmesi yapılıyor.",
        "loading"
      );

      document.dispatchEvent(
        new CustomEvent(
          "warehouse:cycle-count-recount-evaluation-request",
          {
            detail:
              evaluation
          }
        )
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-recount-evaluation-start",
    () => {
      state.busy =
        true;

      updateControls();

      setQuantityStatus(
        "Yeniden sayım sonucu güvenli olarak değerlendiriliyor.",
        "loading"
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-recount-evaluation-success",
    (event) => {
      state.busy =
        false;

      const evaluation =
        event?.detail
          ?.evaluation ||
        state.pendingEvaluation ||
        {};

      const taskId =
        text(
          evaluation.taskId
        );

      const cycleCountId =
        text(
          evaluation
            .cycleCountId
        );

      if (taskId) {
        state.tasks =
          state.tasks.filter(
            (task) =>
              task.id !==
              taskId
          );
      }

      state.pendingEvaluation =
        null;

      state.evaluationFailed =
        false;

      document.dispatchEvent(
        new CustomEvent(
          "warehouse:cycle-count-management-refresh",
          {
            detail:
              Object.freeze({
                cycleCountId
              })
          }
        )
      );

      if (
        state.tasks.length
      ) {
        state.selectedTaskId =
          state.tasks[0].id;

        resetVerification();
        renderTaskOptions();

        setQuantityStatus(
          "Yeniden sayım sonucu güvenli olarak değerlendirildi.",
          "success"
        );

        setMessage(
          "Sıradaki kontrollü yeniden sayım görevi hazır. Lokasyon barkodunu okutun.",
          "ready"
        );

        updateControls();

        return;
      }

      state.selectedTaskId =
        null;

      setMode(false);
      renderTaskOptions();

      setQuantityStatus(
        "Yeniden sayım sonucu güvenli olarak değerlendirildi.",
        "success"
      );

      setMessage(
        "Aktif kontrollü yeniden sayım görevi kalmadı. Sonuçlar yönetim kontrol akışına aktarıldı.",
        "success"
      );

      updateControls();
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-recount-evaluation-error",
    (event) => {
      state.busy =
        false;

      state.evaluationFailed =
        Boolean(
          state.pendingEvaluation
        );

      updateControls();

      setQuantityStatus(
        text(
          event?.detail?.message
        ) ||
          "Yeniden sayım değerlendirmesi tamamlanamadı.",
        "error"
      );

      setMessage(
        state.evaluationFailed
          ? "İkinci fiziksel miktar kaydı korunuyor. Değerlendirmeyi tekrar deneyin."
          : "Yeniden sayım değerlendirmesi tamamlanamadı.",
        "error"
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-recount-error",
    (event) => {
      state.busy =
        false;

      updateControls();

      setQuantityStatus(
        text(
          event?.detail?.message
        ) ||
          "İkinci fiziksel sayım miktarı kaydedilemedi.",
        "error"
      );
    }
  );

  renderTaskOptions();
  updateControls();
}

if (
  typeof document !==
  "undefined"
) {
  document.addEventListener(
    "DOMContentLoaded",
    bind,
    {
      once: true
    }
  );
}
