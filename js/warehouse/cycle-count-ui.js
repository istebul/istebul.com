import {
  getWarehouseOperationsContext,
  getWarehouseSupabaseClient
} from "./operations-center.js";

const API_URL =
  "/api/warehouse/cycle-count";

const STATUS_LABELS =
  Object.freeze({
    draft: "Taslak",
    planned: "Planlandı",
    released: "Yayınlandı",
    assigned: "Atandı",
    in_progress: "Devam ediyor",
    counted: "Sayıldı",
    recount_required:
      "Yeniden sayım gerekli",
    under_review:
      "İncelemede",
    approved: "Onaylandı",
    adjusted: "Düzeltildi",
    completed: "Tamamlandı",
    cancelled: "İptal edildi",
    pending: "Bekliyor"
  });

const STRATEGY_LABELS =
  Object.freeze({
    abc_classification:
      "ABC sınıflandırması",
    location_based:
      "Lokasyon bazlı",
    product_based:
      "Ürün bazlı",
    lot_based:
      "Lot bazlı",
    serial_based:
      "Seri bazlı",
    random_sample:
      "Rastgele örnekleme",
    risk_based:
      "Risk bazlı",
    value_based:
      "Değer bazlı",
    movement_based:
      "Hareket bazlı",
    exception_based:
      "İstisna bazlı",
    full_inventory:
      "Tam envanter",
    blind_count:
      "Kör sayım"
  });

const TASK_TYPE_LABELS =
  Object.freeze({
    count_location:
      "Lokasyon sayımı",
    count_product:
      "Ürün sayımı",
    count_lot:
      "Lot sayımı",
    count_serial:
      "Seri sayımı",
    blind_count:
      "Kör sayım",
    recount:
      "Yeniden sayım",
    variance_review:
      "Fark incelemesi",
    adjustment_review:
      "Düzeltme incelemesi"
  });

const uiState = {
  tasks: [],
  summary: null,
  selectedTaskId: null,
  stage: "location",
  locationVerified: false,
  productVerified: false,
  recordedTaskIds: new Set(),
  evaluationPendingTaskIds: new Set(),
  loadVersion: 0
};

function byId(id) {
  return document.getElementById(id);
}

function text(value) {
  return String(
    value ?? ""
  ).trim();
}

function normalizedCode(value) {
  return text(value)
    .toLocaleUpperCase("tr-TR");
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
    normalizedCode(scanned) ===
    normalizedCode(expected)
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

  if (!scan || !barcode) {
    return false;
  }

  /*
   * Barkodun gerçek değeri önce birebir
   * karşılaştırılır. Manuel SKU/kod fallback
   * doğrulaması ayrı codeMatches ile yapılır.
   */
  return scan === barcode;
}

function statusLabel(value) {
  return (
    STATUS_LABELS[value] ||
    value ||
    "—"
  );
}

function strategyLabel(value) {
  return (
    STRATEGY_LABELS[value] ||
    value ||
    "—"
  );
}

function taskTypeLabel(value) {
  return (
    TASK_TYPE_LABELS[value] ||
    value ||
    "Sayım görevi"
  );
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  ).format(date);
}

function shortIdentity(value) {
  const identity =
    text(value);

  if (!identity) {
    return "Atanmamış";
  }

  return `Kullanıcı …${
    identity.slice(-8)
  }`;
}

function trackingLabel(item) {
  const tracking =
    item?.tracking;

  if (!tracking) {
    return "Takip bilgisi yok";
  }

  if (
    typeof tracking ===
    "string"
  ) {
    return (
      text(tracking) ||
      "Takip bilgisi yok"
    );
  }

  if (
    typeof tracking !==
    "object"
  ) {
    return "Takip bilgisi yok";
  }

  const lot =
    text(
      tracking.lotNumber ??
      tracking.lot_number
    );

  const serial =
    text(
      tracking.serialNumber ??
      tracking.serial_number
    );

  const expiry =
    text(
      tracking.expiryDate ??
      tracking.expiry_date
    );

  const parts = [];

  if (lot) {
    parts.push(`Lot: ${lot}`);
  }

  if (serial) {
    parts.push(`Seri: ${serial}`);
  }

  if (expiry) {
    parts.push(`SKT: ${expiry}`);
  }

  return (
    parts.join(" · ") ||
    "Takip bilgisi yok"
  );
}

function dispatchCycleCountEvent(
  name,
  detail = {}
) {
  document.dispatchEvent(
    new CustomEvent(
      name,
      {
        detail:
          Object.freeze(
            detail
          )
      }
    )
  );
}

function setMessage(
  message,
  state = "info"
) {
  const element =
    byId("sayim-mesaji");

  if (!element) {
    return;
  }

  element.dataset.state =
    state;

  element.textContent =
    message;
}

function setStage(stage) {
  uiState.stage =
    stage === "product"
      ? "product"
      : "location";

  const field =
    byId("sayim-asama");

  if (field) {
    field.value =
      uiState.stage ===
        "product"
        ? "Ürün / SKU barkodu bekleniyor"
        : "Lokasyon barkodu bekleniyor";
  }

  const productInput =
    byId(
      "sayim-urun-barkod"
    );

  if (productInput) {
    productInput.disabled =
      uiState.stage !==
        "product";
  }
}

function clearNode(id) {
  const element =
    byId(id);

  if (!element) {
    return;
  }

  element.replaceChildren();
  element.hidden = true;
}

function resetScanState() {
  uiState.locationVerified =
    false;

  uiState.productVerified =
    false;

  setStage("location");

  const locationInput =
    byId(
      "sayim-lokasyon-barkod"
    );

  const productInput =
    byId(
      "sayim-urun-barkod"
    );

  if (locationInput) {
    locationInput.value = "";
  }

  if (productInput) {
    productInput.value = "";
    productInput.disabled = true;
  }

  clearNode(
    "sayim-lokasyon-eslesmesi"
  );

  clearNode(
    "sayim-urun-eslesmesi"
  );

  clearNode(
    "sayim-dogrulama-ozeti"
  );

  dispatchCycleCountEvent(
    "warehouse:cycle-count-verification-reset"
  );
}

function currentTask() {
  return (
    uiState.tasks.find(
      (task) =>
        task.id ===
        uiState.selectedTaskId
    ) ||
    null
  );
}

function tasksForCount(task) {
  const cycleCountId =
    task?.cycle_count_id;

  if (!cycleCountId) {
    return [];
  }

  return uiState.tasks.filter(
    (candidate) =>
      candidate.cycle_count_id ===
      cycleCountId
  );
}

function countActiveLines(task) {
  return tasksForCount(task)
    .filter(
      (candidate) =>
        candidate.item
    )
    .length;
}

function countRecountLines(task) {
  return tasksForCount(task)
    .filter(
      (candidate) =>
        candidate.item
          ?.recount_required ===
        true
    )
    .length;
}

function isFirstEvaluationPendingTask(
  task
) {
  if (
    !task ||
    task.type ===
      "recount"
  ) {
    return false;
  }

  if (
    uiState
      .evaluationPendingTaskIds
      .has(task.id)
  ) {
    return true;
  }

  return Boolean(
    task.status ===
      "in_progress" &&
    task.item?.status ===
      "in_progress" &&
    task.item?.counted_at
  );
}

function activateEvaluationRecovery(
  task
) {
  if (
    !isFirstEvaluationPendingTask(
      task
    )
  ) {
    return false;
  }

  const select =
    byId(
      "sayim-gorevi-secimi"
    );

  const stage =
    byId(
      "sayim-asama"
    );

  const locationInput =
    byId(
      "sayim-lokasyon-barkod"
    );

  const productInput =
    byId(
      "sayim-urun-barkod"
    );

  if (select) {
    select.disabled =
      true;
  }

  if (stage) {
    stage.value =
      "İlk sayım değerlendirmesi bekleniyor";
  }

  if (locationInput) {
    locationInput.disabled =
      true;
  }

  if (productInput) {
    productInput.disabled =
      true;
  }

  dispatchCycleCountEvent(
    "warehouse:cycle-count-evaluation-recovery",
    {
      cycleCountId:
        task.cycle_count_id,

      cycleCountItemId:
        task.cycle_count_item_id ||
        task.item?.id,

      taskId:
        task.id
    }
  );

  return true;
}

function appendDefinition(
  list,
  label,
  value
) {
  const wrapper =
    document.createElement(
      "div"
    );

  const term =
    document.createElement(
      "dt"
    );

  const description =
    document.createElement(
      "dd"
    );

  term.textContent =
    label;

  description.textContent =
    value || "—";

  wrapper.append(
    term,
    description
  );

  list.append(wrapper);
}

function appendSummaryMetric(
  container,
  label,
  value
) {
  const wrapper =
    document.createElement(
      "div"
    );

  const caption =
    document.createElement(
      "small"
    );

  const strong =
    document.createElement(
      "strong"
    );

  caption.textContent =
    label;

  strong.textContent =
    String(value ?? "—");

  wrapper.append(
    caption,
    strong
  );

  container.append(wrapper);
}

function renderTaskDetail(task) {
  const container =
    byId(
      "sayim-gorev-detayi"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (!task) {
    container.hidden = true;
    return;
  }

  const count =
    task.cycleCount || {};

  const item =
    task.item || {};

  const location =
    task.location || {};

  const product =
    task.product || {};

  const sku =
    task.sku || {};

  const list =
    document.createElement(
      "dl"
    );

  appendDefinition(
    list,
    "Sayım numarası",
    count.cycle_count_number ||
      "—"
  );

  appendDefinition(
    list,
    "Görev",
    taskTypeLabel(
      task.type
    )
  );

  appendDefinition(
    list,
    "Strateji",
    strategyLabel(
      count.strategy
    )
  );

  appendDefinition(
    list,
    "Sayım durumu",
    statusLabel(
      count.status
    )
  );

  appendDefinition(
    list,
    "Görev durumu",
    statusLabel(
      task.status
    )
  );

  appendDefinition(
    list,
    "Planlanan",
    formatDateTime(
      task.planned_at ||
      count.planned_at
    )
  );

  appendDefinition(
    list,
    "Öncelik",
    String(
      task.priority ??
      count.priority ??
      "—"
    )
  );

  appendDefinition(
    list,
    "Atama",
    shortIdentity(
      task.assigned_user_id
    )
  );

  appendDefinition(
    list,
    "Lokasyon",
    location.full_code ||
      location.code ||
      location.name ||
      "—"
  );

  appendDefinition(
    list,
    "Ürün",
    product.code
      ? `${product.code} · ${
          product.name || ""
        }`.trim()
      : product.name ||
        "—"
  );

  appendDefinition(
    list,
    "SKU",
    sku.sku_code
      ? `${sku.sku_code} · ${
          sku.name || ""
        }`.trim()
      : sku.name ||
        "SKU yok"
  );

  appendDefinition(
    list,
    "Lot / seri / SKT",
    trackingLabel(item)
  );

  const summary =
    document.createElement(
      "div"
    );

  summary.className =
    "warehouse-cycle-count-summary";

  appendSummaryMetric(
    summary,
    "Bu sayımdaki aktif görev",
    tasksForCount(task).length
  );

  appendSummaryMetric(
    summary,
    "Aktif görev satırı",
    countActiveLines(task)
  );

  appendSummaryMetric(
    summary,
    "Yeniden sayım işaretli",
    countRecountLines(task)
  );

  container.append(
    list,
    summary
  );

  container.hidden = false;
}

function taskOptionLabel(task) {
  const countNumber =
    task.cycleCount
      ?.cycle_count_number ||
    "Sayım";

  const location =
    task.location?.full_code ||
    task.location?.code ||
    "Lokasyon";

  const product =
    task.product?.code ||
    task.sku?.sku_code ||
    "Ürün";

  return [
    countNumber,
    location,
    product
  ].join(" · ");
}

function renderTaskOptions(tasks) {
  const select =
    byId(
      "sayim-gorevi-secimi"
    );

  if (!select) {
    return;
  }

  select.replaceChildren();

  if (!tasks.length) {
    const option =
      document.createElement(
        "option"
      );

    option.value = "";
    option.textContent =
      "Aktif sayım görevi bulunmuyor";

    select.append(option);
    select.disabled = true;

    uiState.selectedTaskId =
      null;

    renderTaskDetail(null);
    resetScanState();

    return;
  }

  for (const task of tasks) {
    const option =
      document.createElement(
        "option"
      );

    option.value =
      task.id;

    option.textContent =
      taskOptionLabel(task);

    select.append(option);
  }

  select.disabled = false;

  const selectedStillExists =
    tasks.some(
      (task) =>
        task.id ===
        uiState.selectedTaskId
    );

  uiState.selectedTaskId =
    selectedStillExists
      ? uiState.selectedTaskId
      : tasks[0].id;

  select.value =
    uiState.selectedTaskId;

  resetScanState();

  renderTaskDetail(
    currentTask()
  );
}

async function readResponseBody(
  response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function responseMessage(
  body,
  fallback
) {
  return (
    body?.error?.message ||
    body?.message ||
    fallback
  );
}

async function getAccessToken() {
  const client =
    getWarehouseSupabaseClient();

  const {
    data,
    error
  } =
    await client.auth
      .getSession();

  if (error) {
    throw new Error(
      "WarehouseIQ oturumu okunamadı."
    );
  }

  return (
    data?.session
      ?.access_token ||
    null
  );
}

async function fetchCycleCountTasks(
  context
) {
  const token =
    await getAccessToken();

  if (!token) {
    return {
      ok: false,
      kind: "auth",
      message:
        "Sayım görevlerini görmek için WarehouseIQ oturumu gereklidir."
    };
  }

  const params =
    new URLSearchParams({
      accountId:
        context.accountId,
      warehouseId:
        context.warehouseId
    });

  let response;

  try {
    response =
      await fetch(
        `${API_URL}?${params}`,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
            Authorization:
              `Bearer ${token}`
          }
        }
      );
  } catch {
    return {
      ok: false,
      kind: "error",
      message:
        "Sayım görevlerine şu anda ulaşılamıyor."
    };
  }

  const body =
    await readResponseBody(
      response
    );

  if (!response.ok) {
    if (
      response.status === 401
    ) {
      return {
        ok: false,
        kind: "auth",
        message:
          responseMessage(
            body,
            "WarehouseIQ oturumu geçersiz veya süresi dolmuş."
          )
      };
    }

    if (
      response.status === 403
    ) {
      return {
        ok: false,
        kind: "forbidden",
        message:
          responseMessage(
            body,
            "Bu depodaki sayım görevlerini görme yetkiniz bulunmuyor."
          )
      };
    }

    return {
      ok: false,
      kind: "error",
      message:
        responseMessage(
          body,
          "Sayım görevleri yüklenemedi."
        )
    };
  }

  return {
    ok: true,
    data:
      body?.data || {}
  };
}

async function loadCycleCountTasks() {
  const context =
    getWarehouseOperationsContext();

  const version =
    ++uiState.loadVersion;

  if (
    !context.accountId ||
    !context.warehouseId
  ) {
    uiState.tasks = [];
    uiState.summary = null;

    renderTaskOptions([]);

    setMessage(
      "Firma ve depo seçimi bekleniyor.",
      "waiting"
    );

    return;
  }

  setMessage(
    "Aktif sayım görevleri güvenli bağlantı üzerinden yükleniyor.",
    "loading"
  );

  const result =
    await fetchCycleCountTasks(
      context
    );

  if (
    version !==
    uiState.loadVersion
  ) {
    return;
  }

  if (!result.ok) {
    uiState.tasks = [];
    uiState.summary = null;

    renderTaskOptions([]);

    setMessage(
      result.message,
      result.kind
    );

    return;
  }

  const rawTasks =
    Array.isArray(
      result.data.tasks
    )
      ? result.data.tasks
      : [];

  const recountTaskCount =
    rawTasks.filter(
      (task) =>
        task?.type ===
        "recount"
    ).length;

  const firstCountTasks =
    rawTasks.filter(
      (task) =>
        task?.type !==
        "recount"
    );

  const recoveryTasks =
    firstCountTasks.filter(
      (task) =>
        isFirstEvaluationPendingTask(
          task
        )
    );

  const candidateTasks =
    recoveryTasks.length
      ? [
          recoveryTasks[0]
        ]
      : firstCountTasks;

  const tasks =
    candidateTasks.filter(
      (task) =>
        !uiState.recordedTaskIds
          .has(task.id)
    );

  uiState.tasks =
    tasks;

  uiState.summary =
    result.data.summary ||
    null;

  renderTaskOptions(tasks);

  if (
    tasks.length &&
    activateEvaluationRecovery(
      currentTask()
    )
  ) {
    setMessage(
      "Fiziksel miktar daha önce kaydedilmiş. Yeni miktar girmeden ilk sayım değerlendirmesini tamamlayın.",
      "warning"
    );

    return;
  }

  if (!tasks.length) {
    setMessage(
      recountTaskCount
        ? "Kontrollü yeniden sayım görevi hazır. İlk sayım ekranı bu görevi değiştirmez."
        : "Seçili depoda aktif ilk sayım görevi bulunmuyor.",
      recountTaskCount
        ? "warning"
        : "empty"
    );

    return;
  }

  setMessage(
    "Sayım görevi hazır. İlk olarak görev lokasyonunun barkodunu okutun.",
    "ready"
  );
}

function renderLocationMatch(
  task,
  scanned
) {
  const container =
    byId(
      "sayim-lokasyon-eslesmesi"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  const strong =
    document.createElement(
      "strong"
    );

  const name =
    document.createElement(
      "span"
    );

  const barcode =
    document.createElement(
      "small"
    );

  strong.textContent =
    task.location?.full_code ||
    task.location?.code ||
    "Lokasyon";

  name.textContent =
    task.location?.name ||
    "Lokasyon doğrulandı";

  barcode.textContent =
    `Okutulan: ${scanned}`;

  container.append(
    strong,
    name,
    barcode
  );

  container.hidden = false;
}

function renderProductMatch(
  task,
  scanned
) {
  const container =
    byId(
      "sayim-urun-eslesmesi"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  const strong =
    document.createElement(
      "strong"
    );

  const sku =
    document.createElement(
      "span"
    );

  const barcode =
    document.createElement(
      "small"
    );

  strong.textContent =
    task.product?.code
      ? `${task.product.code} · ${
          task.product.name || ""
        }`.trim()
      : task.product?.name ||
        "Ürün doğrulandı";

  sku.textContent =
    task.sku?.sku_code
      ? `SKU: ${
          task.sku.sku_code
        }${
          task.sku.name
            ? ` · ${task.sku.name}`
            : ""
        }`
      : "Ürün seviyesinde doğrulama";

  barcode.textContent =
    `Okutulan: ${scanned}`;

  container.append(
    strong,
    sku,
    barcode
  );

  container.hidden = false;
}

function renderVerificationSummary(
  task
) {
  const container =
    byId(
      "sayim-dogrulama-ozeti"
    );

  if (!container) {
    return;
  }

  container.replaceChildren();

  const strong =
    document.createElement(
      "strong"
    );

  const message =
    document.createElement(
      "span"
    );

  strong.textContent =
    "Görev fiziksel olarak doğrulandı";

  message.textContent =
    `${
      task.location?.full_code ||
      task.location?.code ||
      "Lokasyon"
    } · ${
      task.sku?.sku_code ||
      task.product?.code ||
      "Ürün"
    }. Barkod doğrulaması tamamlandı. Şimdi yalnız fiziksel sayım miktarını güvenli kayıt alanından girin.`;

  container.append(
    strong,
    message
  );

  container.hidden = false;
}

function locationMatchesTask(
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

function productMatchesTask(
  task,
  scanned
) {
  if (!task) {
    return false;
  }

  const skuId =
    text(
      task.sku?.id ||
      task.item?.sku_id
    );

  const barcodes =
    Array.isArray(
      task.barcodes
    )
      ? task.barcodes
      : [];

  if (skuId) {
    if (
      codeMatches(
        scanned,
        task.sku?.sku_code
      )
    ) {
      return true;
    }

    return barcodes.some(
      (barcode) =>
        text(
          barcode?.sku_id
        ) ===
          skuId &&
        barcodeMatches(
          scanned,
          barcode?.value
        )
    );
  }

  if (
    codeMatches(
      scanned,
      task.product?.code
    )
  ) {
    return true;
  }

  return barcodes.some(
    (barcode) =>
      !text(
        barcode?.sku_id
      ) &&
      barcodeMatches(
        scanned,
        barcode?.value
      )
  );
}

function resolveLocationBarcode(
  scanned
) {
  const task =
    currentTask();

  if (!task) {
    setMessage(
      "Önce aktif bir sayım görevi seçin.",
      "warning"
    );

    return;
  }

  const input =
    byId(
      "sayim-lokasyon-barkod"
    );

  if (input) {
    input.value =
      scanned;
  }

  if (
    !locationMatchesTask(
      task,
      scanned
    )
  ) {
    uiState.locationVerified =
      false;

    uiState.productVerified =
      false;

    clearNode(
      "sayim-lokasyon-eslesmesi"
    );

    clearNode(
      "sayim-urun-eslesmesi"
    );

    clearNode(
      "sayim-dogrulama-ozeti"
    );

    setStage("location");

    setMessage(
      "Okutulan barkod seçili sayım görevinin lokasyonuyla eşleşmedi.",
      "error"
    );

    return;
  }

  uiState.locationVerified =
    true;

  uiState.productVerified =
    false;

  renderLocationMatch(
    task,
    scanned
  );

  clearNode(
    "sayim-urun-eslesmesi"
  );

  clearNode(
    "sayim-dogrulama-ozeti"
  );

  setStage("product");

  setMessage(
    "Lokasyon doğrulandı. Şimdi ürün veya SKU barkodunu okutun.",
    "matched"
  );
}

function resolveProductBarcode(
  scanned
) {
  const task =
    currentTask();

  if (!task) {
    setMessage(
      "Önce aktif bir sayım görevi seçin.",
      "warning"
    );

    return;
  }

  if (
    !uiState.locationVerified
  ) {
    setMessage(
      "Ürün veya SKU barkodundan önce sayım lokasyonu doğrulanmalıdır.",
      "warning"
    );

    setStage("location");

    return;
  }

  const input =
    byId(
      "sayim-urun-barkod"
    );

  if (input) {
    input.value =
      scanned;
  }

  if (
    !productMatchesTask(
      task,
      scanned
    )
  ) {
    uiState.productVerified =
      false;

    clearNode(
      "sayim-urun-eslesmesi"
    );

    clearNode(
      "sayim-dogrulama-ozeti"
    );

    setMessage(
      "Okutulan ürün veya SKU barkodu seçili sayım göreviyle eşleşmedi.",
      "error"
    );

    return;
  }

  uiState.productVerified =
    true;

  renderProductMatch(
    task,
    scanned
  );

  renderVerificationSummary(
    task
  );

  const locationInput =
    byId(
      "sayim-lokasyon-barkod"
    );

  dispatchCycleCountEvent(
    "warehouse:cycle-count-verification-ready",
    {
      taskId:
        task.id,

      cycleCountId:
        task.cycle_count_id,

      cycleCountItemId:
        task.cycle_count_item_id ||
        task.item?.id,

      locationScan:
        text(
          locationInput?.value
        ),

      productScan:
        scanned,

      unit:
        task.item?.unit ||
        "",

      label:
        taskOptionLabel(
          task
        )
    }
  );

  setMessage(
    "Lokasyon ve ürün doğrulandı. Fiziksel sayım miktarını girip açık kullanıcı onayı verin.",
    "success"
  );
}

function cycleCountPanelIsActive() {
  return (
    window.location.hash ===
    "#sayim"
  );
}

function bindCycleCountEvents() {
  const select =
    byId(
      "sayim-gorevi-secimi"
    );

  document.addEventListener(
    "warehouse:operations-context",
    () => {
      void loadCycleCountTasks();
    }
  );

  document.addEventListener(
    "warehouse:barcode-scan",
    (event) => {
      if (
        !cycleCountPanelIsActive()
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
        isFirstEvaluationPendingTask(
          currentTask()
        )
      ) {
        setMessage(
          "Fiziksel miktar zaten kaydedildi. Yeni barkod veya miktar girmeden değerlendirmeyi tamamlayın.",
          "warning"
        );

        return;
      }

      if (
        uiState.locationVerified &&
        uiState.productVerified
      ) {
        setMessage(
          "Fiziksel doğrulama tamamlandı. Yeni barkod okutmak yerine sayılan miktarı girin.",
          "ready"
        );

        return;
      }

      if (
        uiState.stage ===
        "product"
      ) {
        resolveProductBarcode(
          value
        );

        return;
      }

      resolveLocationBarcode(
        value
      );
    }
  );

  select?.addEventListener(
    "change",
    () => {
      uiState.selectedTaskId =
        select.value || null;

      resetScanState();

      const task =
        currentTask();

      renderTaskDetail(task);

      setMessage(
        task
          ? "Sayım görevi seçildi. İlk olarak lokasyon barkodunu okutun."
          : "Aktif bir sayım görevi seçin.",
        task
          ? "ready"
          : "waiting"
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-quantity-success",
    (event) => {
      const taskId =
        text(
          event?.detail
            ?.confirmation
            ?.taskId
        );

      if (!taskId) {
        return;
      }

      uiState
        .evaluationPendingTaskIds
        .add(taskId);

      const task =
        currentTask();

      if (
        task?.id ===
        taskId
      ) {
        activateEvaluationRecovery(
          task
        );
      }

      setMessage(
        "Fiziksel miktar güvenli olarak kaydedildi. İlk sayım değerlendirmesi tamamlanıyor.",
        "loading"
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-quantity-recorded",
    (event) => {
      const taskId =
        text(
          event?.detail?.taskId
        );

      if (!taskId) {
        return;
      }

      const data =
        event?.detail
          ?.data || {};

      uiState.evaluationPendingTaskIds =
        new Set(
          [
            ...uiState
              .evaluationPendingTaskIds
          ].filter(
            (candidateTaskId) =>
              candidateTaskId !==
              taskId
          )
        );

      uiState.recordedTaskIds
        .add(taskId);

      uiState.tasks =
        uiState.tasks.filter(
          (task) =>
            task.id !==
            taskId
        );

      renderTaskOptions(
        uiState.tasks
      );

      setMessage(
        data.recountRequired
          ? "İlk sayım değerlendirildi. Kontrollü yeniden sayım gerekiyor."
          : data.reviewRequired
            ? "İlk sayım değerlendirildi. Sonuç kontrollü incelemeye gönderildi."
            : "İlk sayım değerlendirildi ve sayım satırı sonuçlandı.",
        data.recountRequired ||
        data.reviewRequired
          ? "warning"
          : "success"
      );

      void loadCycleCountTasks();
    }
  );

  window.addEventListener(
    "hashchange",
    () => {
      if (
        !cycleCountPanelIsActive()
      ) {
        return;
      }

      const context =
        getWarehouseOperationsContext();

      if (
        context.accountId &&
        context.warehouseId &&
        !uiState.tasks.length
      ) {
        void loadCycleCountTasks();
        return;
      }

      const task =
        currentTask();

      setMessage(
        task
          ? uiState.stage ===
              "product"
            ? "Ürün veya SKU barkodunu okutun."
            : "Sayım lokasyonunun barkodunu okutun."
          : "Aktif bir sayım görevi seçin.",
        task
          ? "ready"
          : "waiting"
      );
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
      bindCycleCountEvents();

      const context =
        getWarehouseOperationsContext();

      if (
        context.accountId &&
        context.warehouseId
      ) {
        void loadCycleCountTasks();
      }
    }
  );
}
