import {
  getWarehouseOperationsContext,
  getWarehouseSession
} from "./operations-center.js";

import {
  loadCycleCountManagement,
  writeCycleCountCompletion
} from "./cycle-count-completion-client.js";

const STATUS_LABELS =
  Object.freeze({
    in_progress:
      "Devam ediyor",

    counted:
      "Sayıldı",

    recount_required:
      "Yeniden sayım gerekli",

    under_review:
      "İncelemede",

    approved:
      "Onaylandı",

    adjusted:
      "Düzeltildi",

    completed:
      "Tamamlandı",

    failed:
      "Başarısız",

    pending:
      "Bekliyor",

    approval_required:
      "Onay gerekli",

    processing:
      "İşleniyor",

    rejected:
      "Reddedildi",

    cancelled:
      "İptal edildi"
  });

const ACTION_LABELS =
  Object.freeze({
    approve_count:
      "Sayımı Onayla",

    prepare_adjustments:
      "Stok Düzeltmelerini Hazırla",

    approve_adjustments:
      "Düzeltmeleri Onayla",

    reject_adjustments:
      "Düzeltmeleri Reddet",

    process_adjustments:
      "Stok Düzeltmelerini Uygula",

    complete_count:
      "Sayımı Tamamla"
  });

const ACTION_CONFIRMATIONS =
  Object.freeze({
    approve_count:
      "Sayım sonucunu onaylamak istediğinize emin misiniz?",

    prepare_adjustments:
      "Farklı sayım satırları için stok düzeltme kayıtları hazırlanacak. Devam edilsin mi?",

    approve_adjustments:
      "Bekleyen stok düzeltmelerini onaylamak istediğinize emin misiniz?",

    reject_adjustments:
      "Bekleyen stok düzeltmelerini reddetmek istediğinize emin misiniz?",

    process_adjustments:
      "Bu işlem gerçek stok bakiyelerini ve envanter hareketlerini değiştirecek. Devam edilsin mi?",

    complete_count:
      "Sayım tamamlanacak ve değiştirilemez rapor snapshotı oluşturulacak. Devam edilsin mi?"
  });

const state = {
  list: null,
  detail: null,
  selectedValue: "",
  busy: false,
  loadVersion: 0,
  retryRequestIds:
    new Map()
};

function byId(id) {
  return document.getElementById(id);
}

function text(value) {
  return String(
    value ?? ""
  ).trim();
}

function statusLabel(value) {
  return (
    STATUS_LABELS[value] ||
    text(value) ||
    "—"
  );
}

function formatNumber(
  value,
  maximumFractionDigits = 2
) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "tr-TR",
    {
      maximumFractionDigits
    }
  ).format(number);
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

function setMessage(
  message,
  status = "info"
) {
  const element =
    byId(
      "sayim-yonetim-mesaji"
    );

  if (!element) {
    return;
  }

  element.dataset.state =
    status;

  element.textContent =
    message;
}

function setBusy(value) {
  state.busy =
    Boolean(value);

  const refresh =
    byId(
      "sayim-yonetim-yenile"
    );

  const select =
    byId(
      "sayim-yonetim-secimi"
    );

  const note =
    byId(
      "sayim-yonetim-notu"
    );

  if (refresh) {
    refresh.disabled =
      state.busy;
  }

  if (select) {
    select.disabled =
      state.busy;
  }

  if (note) {
    note.disabled =
      state.busy;
  }

  for (
    const button of
    document.querySelectorAll(
      "[data-cycle-count-action]"
    )
  ) {
    button.disabled =
      state.busy;
  }
}

function clearNode(id) {
  const element =
    byId(id);

  if (element) {
    element.replaceChildren();
  }
}

function appendMetric(
  host,
  label,
  value
) {
  const card =
    document.createElement(
      "div"
    );

  const small =
    document.createElement(
      "small"
    );

  const strong =
    document.createElement(
      "strong"
    );

  small.textContent =
    label;

  strong.textContent =
    text(value) || "—";

  card.append(
    small,
    strong
  );

  host.append(card);
}

function appendCell(
  row,
  value
) {
  const cell =
    document.createElement(
      "td"
    );

  cell.textContent =
    text(value) || "—";

  row.append(cell);
}

function renderSelectionOptions(
  preferredCycleCountId = null
) {
  const select =
    byId(
      "sayim-yonetim-secimi"
    );

  if (!select) {
    return;
  }

  select.replaceChildren();

  const activeCounts =
    Array.isArray(
      state.list?.activeCounts
    )
      ? state.list.activeCounts
      : [];

  const reports =
    Array.isArray(
      state.list?.reports
    )
      ? state.list.reports
      : [];

  const placeholder =
    document.createElement(
      "option"
    );

  placeholder.value = "";
  placeholder.textContent =
    "Sayım veya tamamlanmış rapor seçin";

  select.append(
    placeholder
  );

  if (activeCounts.length) {
    const group =
      document.createElement(
        "optgroup"
      );

    group.label =
      "Aktif / İncelemede";

    for (
      const count of activeCounts
    ) {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        `active:${count.id}`;

      option.textContent =
        `${
          count.cycleCountNumber ||
          "Sayım"
        } · ${
          statusLabel(
            count.status
          )
        } · ${
          count.openReviewItems ?? 0
        } inceleme`;

      group.append(option);
    }

    select.append(group);
  }

  if (reports.length) {
    const group =
      document.createElement(
        "optgroup"
      );

    group.label =
      "Tamamlanmış Raporlar";

    for (
      const report of reports
    ) {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        `report:${
          report.cycleCountId
        }`;

      option.textContent =
        `${
          report.cycleCountNumber ||
          "Sayım"
        } · Tamamlandı · ${
          formatDateTime(
            report.generatedAt
          )
        }`;

      group.append(option);
    }

    select.append(group);
  }

  const preferred =
    preferredCycleCountId
      ? [
          `active:${preferredCycleCountId}`,
          `report:${preferredCycleCountId}`
        ]
      : [];

  const values =
    [
      ...select.options
    ]
      .map(
        (option) =>
          option.value
      );

  const nextValue =
    preferred.find(
      (value) =>
        values.includes(value)
    ) ||
    (
      values.includes(
        state.selectedValue
      )
        ? state.selectedValue
        : values.find(Boolean) ||
          ""
    );

  state.selectedValue =
    nextValue;

  select.value =
    nextValue;
}

function renderEmptyDetail() {
  const active =
    byId(
      "sayim-yonetim-aktif-detay"
    );

  if (active) {
    active.hidden =
      true;
  }

  document.dispatchEvent(
    new CustomEvent(
      "warehouse:cycle-count-report-clear"
    )
  );
}

function actionSet(
  detail
) {
  if (
    detail?.mode !==
      "preview"
  ) {
    return [];
  }

  const status =
    detail.cycleCount
      ?.status;

  const adjustments =
    Array.isArray(
      detail.adjustments
    )
      ? detail.adjustments
      : [];

  const approvals =
    Array.isArray(
      detail.approvals
    )
      ? detail.approvals
      : [];

  if (
    status ===
    "counted"
  ) {
    return [
      "approve_count"
    ];
  }

  if (
    status ===
    "under_review"
  ) {
    const pendingApproval =
      approvals.some(
        (approval) =>
          approval.status ===
          "pending"
      );

    if (pendingApproval) {
      return [
        "approve_adjustments",
        "reject_adjustments"
      ];
    }

    return [
      "prepare_adjustments"
    ];
  }

  if (
    status ===
    "approved"
  ) {
    const approvedAdjustment =
      adjustments.some(
        (adjustment) =>
          adjustment.status ===
          "approved"
      );

    return approvedAdjustment
      ? [
          "process_adjustments"
        ]
      : [
          "complete_count"
        ];
  }

  if (
    status ===
    "adjusted"
  ) {
    return [
      "complete_count"
    ];
  }

  return [];
}

function renderActions(detail) {
  const host =
    byId(
      "sayim-yonetim-aksiyonlar"
    );

  if (!host) {
    return;
  }

  host.replaceChildren();

  for (
    const action of
    actionSet(detail)
  ) {
    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      action ===
        "reject_adjustments"
        ? "warehouse-cycle-count-management-action danger"
        : "warehouse-cycle-count-management-action";

    button.dataset
      .cycleCountAction =
      action;

    button.textContent =
      ACTION_LABELS[action];

    button.disabled =
      state.busy;

    button.addEventListener(
      "click",
      () => {
        void executeAction(
          action
        );
      }
    );

    host.append(button);
  }

  if (!host.children.length) {
    const note =
      document.createElement(
        "span"
      );

    note.className =
      "warehouse-cycle-count-management-no-action";

    note.textContent =
      "Bu durum için bekleyen yönetim aksiyonu yok.";

    host.append(note);
  }
}

function renderActiveDetail(
  detail
) {
  document.dispatchEvent(
    new CustomEvent(
      "warehouse:cycle-count-report-clear"
    )
  );

  const section =
    byId(
      "sayim-yonetim-aktif-detay"
    );

  const metrics =
    byId(
      "sayim-yonetim-metrikleri"
    );

  const itemsBody =
    byId(
      "sayim-yonetim-satirlari"
    );

  const lifecycle =
    byId(
      "sayim-yonetim-yasam-dongusu"
    );

  if (
    !section ||
    !metrics ||
    !itemsBody ||
    !lifecycle
  ) {
    return;
  }

  section.hidden =
    false;

  clearNode(
    "sayim-yonetim-metrikleri"
  );

  clearNode(
    "sayim-yonetim-satirlari"
  );

  clearNode(
    "sayim-yonetim-yasam-dongusu"
  );

  const summary =
    detail.summary || {};

  appendMetric(
    metrics,
    "Durum",
    statusLabel(
      detail.cycleCount
        ?.status
    )
  );

  appendMetric(
    metrics,
    "Toplam satır",
    formatNumber(
      summary.totalItems,
      0
    )
  );

  appendMetric(
    metrics,
    "Eşleşen",
    formatNumber(
      summary.matchedItems,
      0
    )
  );

  appendMetric(
    metrics,
    "Farklı",
    formatNumber(
      summary.varianceItems,
      0
    )
  );

  appendMetric(
    metrics,
    "Yeniden sayım",
    formatNumber(
      summary.recountItems,
      0
    )
  );

  appendMetric(
    metrics,
    "Hasarlı",
    formatNumber(
      summary.damagedItems,
      0
    )
  );

  appendMetric(
    metrics,
    "Doğruluk",
    `${
      formatNumber(
        summary.accuracyPercentage
      )
    }%`
  );

  const items =
    Array.isArray(
      detail.items
    )
      ? detail.items
      : [];

  for (const item of items) {
    const row =
      document.createElement(
        "tr"
      );

    appendCell(
      row,
      item.lineNumber
    );

    appendCell(
      row,
      item.locationCode
    );

    appendCell(
      row,
      [
        item.productCode,
        item.productName
      ]
        .filter(Boolean)
        .join(" · ")
    );

    appendCell(
      row,
      item.skuCode
    );

    appendCell(
      row,
      statusLabel(
        item.status
      )
    );

    appendCell(
      row,
      formatNumber(
        item.expectedQuantity
      )
    );

    appendCell(
      row,
      formatNumber(
        item.firstCountQuantity
      )
    );

    appendCell(
      row,
      formatNumber(
        item.secondCountQuantity
      )
    );

    appendCell(
      row,
      formatNumber(
        item.finalCountQuantity
      )
    );

    appendCell(
      row,
      formatNumber(
        item.damagedQuantity
      )
    );

    appendCell(
      row,
      formatNumber(
        item.varianceQuantity
      )
    );

    appendCell(
      row,
      formatNumber(
        item.varianceValue
      )
    );

    itemsBody.append(row);
  }

  const adjustments =
    Array.isArray(
      detail.adjustments
    )
      ? detail.adjustments
      : [];

  const approvals =
    Array.isArray(
      detail.approvals
    )
      ? detail.approvals
      : [];

  const exceptions =
    Array.isArray(
      detail.exceptions
    )
      ? detail.exceptions
      : [];

  appendMetric(
    lifecycle,
    "Düzeltme kayıtları",
    adjustments.length
  );

  appendMetric(
    lifecycle,
    "Bekleyen onay",
    approvals.filter(
      (approval) =>
        approval.status ===
        "pending"
    ).length
  );

  appendMetric(
    lifecycle,
    "Açık istisna",
    exceptions.filter(
      (exception) =>
        exception.resolved !==
        true
    ).length
  );

  appendMetric(
    lifecycle,
    "Son durum",
    statusLabel(
      detail.cycleCount
        ?.status
    )
  );

  renderActions(detail);
}

function renderDetail(detail) {
  state.detail =
    detail;

  if (
    detail?.mode ===
    "report"
  ) {
    const active =
      byId(
        "sayim-yonetim-aktif-detay"
      );

    if (active) {
      active.hidden =
        true;
    }

    document.dispatchEvent(
      new CustomEvent(
        "warehouse:cycle-count-report-data",
        {
          detail:
            Object.freeze({
              report:
                detail.report ||
                null
            })
        }
      )
    );

    return;
  }

  if (
    detail?.mode ===
    "preview"
  ) {
    renderActiveDetail(
      detail
    );

    return;
  }

  renderEmptyDetail();
}

async function getAuthorizedContext() {
  const context =
    getWarehouseOperationsContext();

  if (
    !context.accountId ||
    !context.warehouseId
  ) {
    return {
      ok: false,
      reason:
        "warehouse_required"
    };
  }

  const session =
    await getWarehouseSession();

  if (!session?.access_token) {
    return {
      ok: false,
      reason:
        "auth_required"
    };
  }

  return {
    ok: true,

    accountId:
      context.accountId,

    warehouseId:
      context.warehouseId,

    accessToken:
      session.access_token
  };
}

async function loadSelectedDetail() {
  const value =
    state.selectedValue;

  if (!value) {
    renderEmptyDetail();

    setMessage(
      "Seçili depoda yönetilecek sayım veya tamamlanmış rapor bulunmuyor.",
      "empty"
    );

    return;
  }

  const cycleCountId =
    value.split(":")[1] ||
    "";

  if (!cycleCountId) {
    return;
  }

  const version =
    ++state.loadVersion;

  setMessage(
    "Sayım yönetim detayı yükleniyor…",
    "loading"
  );

  const context =
    await getAuthorizedContext();

  if (
    !context.ok ||
    version !==
      state.loadVersion
  ) {
    if (
      context.reason ===
      "warehouse_required"
    ) {
      setMessage(
        "Sayım yönetimi için önce bir depo seçin.",
        "warning"
      );
    } else if (
      context.reason ===
      "auth_required"
    ) {
      setMessage(
        "WarehouseIQ oturumunuz bulunamadı.",
        "auth"
      );
    }

    return;
  }

  try {
    const detail =
      await loadCycleCountManagement({
        accessToken:
          context.accessToken,

        accountId:
          context.accountId,

        warehouseId:
          context.warehouseId,

        cycleCountId
      });

    if (
      version !==
      state.loadVersion
    ) {
      return;
    }

    renderDetail(detail);

    setMessage(
      detail.mode ===
        "report"
        ? "Tamamlanmış sayım raporu yüklendi."
        : "Sayım yönetim detayı güncel.",
      "success"
    );
  } catch (error) {
    if (
      version !==
      state.loadVersion
    ) {
      return;
    }

    renderEmptyDetail();

    setMessage(
      error instanceof Error
        ? error.message
        : "Sayım yönetim detayı yüklenemedi.",
      error?.status === 403
        ? "forbidden"
        : "error"
    );
  }
}

async function loadList({
  preferredCycleCountId = null
} = {}) {
  const version =
    ++state.loadVersion;

  setMessage(
    "Sayım yönetim verileri yükleniyor…",
    "loading"
  );

  const context =
    await getAuthorizedContext();

  if (
    !context.ok ||
    version !==
      state.loadVersion
  ) {
    state.list =
      null;

    renderSelectionOptions();

    renderEmptyDetail();

    if (
      context.reason ===
      "warehouse_required"
    ) {
      setMessage(
        "Sayım yönetimi için önce bir depo seçin.",
        "warning"
      );
    } else if (
      context.reason ===
      "auth_required"
    ) {
      setMessage(
        "WarehouseIQ oturumunuz bulunamadı.",
        "auth"
      );
    }

    return;
  }

  try {
    const data =
      await loadCycleCountManagement({
        accessToken:
          context.accessToken,

        accountId:
          context.accountId,

        warehouseId:
          context.warehouseId
      });

    if (
      version !==
      state.loadVersion
    ) {
      return;
    }

    state.list =
      data;

    renderSelectionOptions(
      preferredCycleCountId
    );

    await loadSelectedDetail();
  } catch (error) {
    if (
      version !==
      state.loadVersion
    ) {
      return;
    }

    state.list =
      null;

    renderSelectionOptions();

    renderEmptyDetail();

    setMessage(
      error instanceof Error
        ? error.message
        : "Sayım yönetim verileri yüklenemedi.",
      error?.status === 403
        ? "forbidden"
        : "error"
    );
  }
}

async function executeAction(
  action
) {
  const detail =
    state.detail;

  const cycleCountId =
    detail?.cycleCountId ||
    detail?.cycleCount?.id;

  if (
    !cycleCountId ||
    state.busy
  ) {
    return;
  }

  const confirmation =
    ACTION_CONFIRMATIONS[action];

  if (
    confirmation &&
    !window.confirm(
      confirmation
    )
  ) {
    return;
  }

  const context =
    await getAuthorizedContext();

  if (!context.ok) {
    setMessage(
      "İşlem için geçerli WarehouseIQ oturumu ve depo seçimi zorunludur.",
      "warning"
    );

    return;
  }

  const note =
    byId(
      "sayim-yonetim-notu"
    );

  const key =
    `${cycleCountId}:${action}`;

  let operationRequestId =
    state.retryRequestIds
      .get(key);

  if (!operationRequestId) {
    operationRequestId =
      globalThis.crypto
        ?.randomUUID?.();

    if (!operationRequestId) {
      setMessage(
        "Güvenli işlem kimliği üretilemedi.",
        "error"
      );

      return;
    }

    state.retryRequestIds
      .set(
        key,
        operationRequestId
      );
  }

  setBusy(true);

  setMessage(
    `${
      ACTION_LABELS[action] ||
      "İşlem"
    } uygulanıyor…`,
    "loading"
  );

  try {
    await writeCycleCountCompletion({
      accessToken:
        context.accessToken,

      accountId:
        context.accountId,

      warehouseId:
        context.warehouseId,

      cycleCountId,

      action,

      notes:
        note?.value ||
        null,

      requestId:
        operationRequestId
    });

    state.retryRequestIds
      .delete(key);

    if (note) {
      note.value = "";
    }

    setMessage(
      `${
        ACTION_LABELS[action] ||
        "İşlem"
      } başarıyla tamamlandı.`,
      "success"
    );

    await loadList({
      preferredCycleCountId:
        cycleCountId
    });

    document.dispatchEvent(
      new CustomEvent(
        "warehouse:cycle-count-management-refresh",
        {
          detail:
            Object.freeze({
              source:
                "completion-ui",

              cycleCountId,

              action
            })
        }
      )
    );
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Cycle Count yönetim işlemi tamamlanamadı.",
      "error"
    );
  } finally {
    setBusy(false);
  }
}

function bindEvents() {
  byId(
    "sayim-yonetim-yenile"
  )?.addEventListener(
    "click",
    () => {
      void loadList();
    }
  );

  byId(
    "sayim-yonetim-secimi"
  )?.addEventListener(
    "change",
    (event) => {
      state.selectedValue =
        event.target.value ||
        "";

      void loadSelectedDetail();
    }
  );

  document.addEventListener(
    "warehouse:operations-context",
    () => {
      state.selectedValue =
        "";

      void loadList();
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-management-refresh",
    (event) => {
      if (
        event.detail?.source ===
        "completion-ui"
      ) {
        return;
      }

      void loadList({
        preferredCycleCountId:
          event.detail
            ?.cycleCountId ||
          null
      });
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    bindEvents();
    void loadList();
  }
);
