import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm";
import { fetchWarehouseCopilotNarration } from "./operations-copilot-narration.js";

const API_URL = "/api/warehouse/operations-center";
const AUTH_STORAGE_KEY = "istebul-auth-public-v1";

const PROCESS_LABELS = {
  receiving: "Mal Kabul",
  quality_control: "Kalite Kontrol",
  putaway: "Yerleştirme",
  replenishment: "İkmal",
  picking: "Toplama",
  wave_planning: "Dalga Planlama",
  packing: "Paketleme",
  shipping: "Sevkiyat",
  cycle_count: "Döngüsel Sayım",
  inventory: "Stok"
};

const HEALTH_LABELS = {
  healthy: "Sağlıklı",
  attention: "Dikkat",
  warning: "Dikkat",
  critical: "Kritik"
};

const SEVERITY_LABELS = {
  critical: "Kritik",
  warning: "Uyarı",
  info: "Bilgi"
};

const state = {
  accountId: null,
  warehouseId: null,
  warehouses: [],
  copilot: null
};

let supabase = null;
let copilotRenderVersion = 0;

function byId(id) {
  return document.getElementById(id);
}

function query(selector) {
  return document.querySelector(selector);
}

function queryAll(selector) {
  return [...document.querySelectorAll(selector)];
}

function envValue(...keys) {
  const env = window.__env || window.env || {};
  for (const key of keys) {
    const value = env[key];
    if (value) return String(value);
  }
  return "";
}

function getSupabase() {
  if (supabase) return supabase;

  const url = envValue(
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL"
  );
  const anonKey = envValue(
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );

  if (!url || !anonKey) {
    throw new Error(
      "Kimlik doğrulama yapılandırması eksik. WarehouseIQ canlı verisi yüklenemiyor."
    );
  }

  supabase = createClient(url, anonKey, {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return supabase;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0
  }).format(number);
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(number)}%`;
}

function formatScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(number);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

function setStatus(type, badge, message) {
  const badgeEl = byId("veri-durumu");
  const messageEl = byId("durum-mesaji");
  const systemEl = byId("sistem-durumu");

  badgeEl.dataset.state = type;
  badgeEl.textContent = badge;
  messageEl.replaceChildren();

  const strong = document.createElement("strong");
  strong.textContent =
    type === "live"
      ? "Canlı bağlantı. "
      : type === "empty"
        ? "Veri bekleniyor. "
        : type === "auth"
          ? "Oturum gerekli. "
          : type === "forbidden"
            ? "Erişim reddedildi. "
            : type === "error"
              ? "Bağlantı hatası. "
              : "Güvenli bağlantı. ";

  messageEl.append(strong, document.createTextNode(message));

  systemEl.textContent =
    type === "live"
      ? "Sistem bağlı"
      : type === "empty"
        ? "Sistem bağlı"
        : type === "loading"
          ? "Bağlanıyor"
          : "Erişim bekleniyor";
}

function setTimestamp(value) {
  byId("zaman").textContent = `Son güncelleme: ${formatDateTime(value)}`;
}

function setKpi(name, value, meta) {
  const valueEl = query(`[data-kpi="${name}"]`);
  const metaEl = query(`[data-meta="${name}"]`);

  if (valueEl) valueEl.textContent = value;
  if (metaEl) {
    metaEl.textContent = meta;
    metaEl.classList.remove("good", "watch");
  }
}

function setCopilotState(type, text) {
  const element = byId("copilot-durumu");
  if (!element) return;
  element.dataset.state = type;
  element.textContent = text;
}

function renderCopilotText(container, title, description) {
  container.replaceChildren();

  if (!title && !description) {
    renderEmpty(container, "Bu dönem için kayıt bulunmuyor.");
    return;
  }

  const heading = document.createElement("strong");
  const body = document.createElement("p");

  heading.textContent = title || "Operasyon değerlendirmesi";
  body.textContent = description || "";
  container.append(heading, body);
}

function renderCopilotActions(copilot, narration = null) {
  const container = byId("copilot-aksiyonlari");
  container.replaceChildren();

  const actions = copilot?.actions ?? [];
  if (!actions.length) {
    renderEmpty(container, "Bu dönem için öncelikli Copilot aksiyonu bulunmuyor.");
    return;
  }

  const narrativeById = new Map(
    (narration?.actionNarratives ?? []).map((item) => [
      item.actionId,
      item.text
    ])
  );

  actions.forEach((action) => {
    const row = document.createElement("div");
    const content = document.createElement("span");
    const title = document.createElement("strong");
    const description = document.createElement("small");
    const due = document.createElement("em");

    row.className = `copilot-action priority-${action.priority || "medium"}`;
    title.textContent = action.title || "Operasyon aksiyonu";
    description.textContent =
      narrativeById.get(action.id) ||
      action.description ||
      "Operasyon kaydı inceleme gerektiriyor.";
    due.textContent = action.dueLabel || "İnceleyin";

    content.append(title, description);
    row.append(content, due);
    container.append(row);
  });
}

function clearCopilot(message = "Copilot verisi bulunmuyor.") {
  copilotRenderVersion += 1;
  state.copilot = null;

  const button = byId("copilot-ai-btn");
  if (button) {
    button.disabled = true;
    button.textContent = "AI anlatımını oluştur";
  }

  setCopilotState("empty", "Veri bekleniyor");
  renderEmpty(byId("copilot-ozet"), message);
  renderEmpty(byId("copilot-risk"), "Bu dönem için risk verisi bulunmuyor.");
  renderEmpty(byId("copilot-firsat"), "Fırsat için yeterli dönem karşılaştırması bulunmuyor.");
  renderEmpty(byId("copilot-aksiyonlari"), "Bu dönem için öncelikli Copilot aksiyonu bulunmuyor.");

  byId("copilot-aciklama").textContent =
    "AI anlatımı yalnız kullanıcı isteğiyle çalıştırılır; deterministik operasyon özeti varsayılan görünüm olarak korunur.";
}

function renderCopilot(copilot) {
  copilotRenderVersion += 1;
  state.copilot = copilot || null;

  if (!copilot) {
    clearCopilot("Bu dönem için Copilot üretecek operasyon snapshot kaydı bulunmuyor.");
    return;
  }

  const button = byId("copilot-ai-btn");
  button.disabled = false;
  button.textContent = "AI anlatımını oluştur";
  setCopilotState("deterministic", "Doğrulanmış özet");

  renderCopilotText(
    byId("copilot-ozet"),
    "Operasyon değerlendirmesi",
    copilot.dailySummary
  );

  if (copilot.topRisk) {
    renderCopilotText(
      byId("copilot-risk"),
      copilot.topRisk.title,
      copilot.topRisk.description
    );
  } else {
    renderEmpty(byId("copilot-risk"), "Bu dönem için öncelikli açık risk bulunmuyor.");
  }

  if (copilot.topOpportunity) {
    renderCopilotText(
      byId("copilot-firsat"),
      copilot.topOpportunity.title,
      copilot.topOpportunity.description
    );
  } else {
    renderEmpty(byId("copilot-firsat"), "Fırsat için yeterli iyileşme karşılaştırması bulunmuyor.");
  }

  renderCopilotActions(copilot);
  byId("copilot-aciklama").textContent = copilot.disclosure;
}

async function enhanceCopilotWithAi() {
  const copilot = state.copilot;
  const button = byId("copilot-ai-btn");

  if (!copilot || !button || button.disabled) return;

  const version = copilotRenderVersion;
  button.disabled = true;
  button.textContent = "AI anlatımı hazırlanıyor…";
  setCopilotState("loading", "AI anlatımı hazırlanıyor");

  const narration = await fetchWarehouseCopilotNarration(copilot);

  if (version !== copilotRenderVersion || state.copilot !== copilot) return;

  renderCopilotText(
    byId("copilot-ozet"),
    "Operasyon değerlendirmesi",
    narration.executiveSummary || copilot.dailySummary
  );

  if (copilot.topRisk) {
    renderCopilotText(
      byId("copilot-risk"),
      copilot.topRisk.title,
      narration.riskNarrative || copilot.topRisk.description
    );
  }

  if (copilot.topOpportunity) {
    renderCopilotText(
      byId("copilot-firsat"),
      copilot.topOpportunity.title,
      narration.opportunityNarrative || copilot.topOpportunity.description
    );
  }

  renderCopilotActions(copilot, narration);

  const aiUsed = narration.source === "ai";
  setCopilotState(
    aiUsed ? "ai" : "deterministic",
    aiUsed ? "AI anlatımı" : "Doğrulanmış özet"
  );

  byId("copilot-aciklama").textContent = narration.disclosure;
  button.disabled = false;
  button.textContent = aiUsed
    ? "AI anlatımını yenile"
    : "AI anlatımını tekrar dene";
}

function clearMetrics(message = "Veri bulunmuyor") {
  for (const key of [
    "health",
    "dispatch",
    "inventory",
    "capacity",
    "tasks",
    "labor"
  ]) {
    setKpi(key, "—", message);
  }

  byId("kapasite-orani").textContent = "—";
  byId("kapasite-toplam").textContent = "—";
  byId("kapasite-kullanilan").textContent = "—";
  byId("kapasite-kullanilabilir").textContent = "—";
  byId("kapasite-halkasi").style.removeProperty("--warehouse-capacity");

  renderEmpty(byId("surec-listesi"), "Süreç hacmi verisi bulunmuyor.");
  renderEmpty(byId("uyari-listesi"), "Açık operasyon istisnası bulunmuyor.");
  byId("uyari-sayisi").textContent = "0 açık";
  renderEmpty(byId("chart"), "Trend verisi bulunmuyor.");
  byId("trend-ozeti").textContent = "Yeterli veri yok";
  renderEmpty(byId("aksiyon-listesi"), "Aktif yönetici inceleme kaydı bulunmuyor.");
  clearCopilot(message);
}

function renderEmpty(container, text) {
  container.replaceChildren();
  const message = document.createElement("p");
  message.className = "empty-state";
  message.textContent = text;
  container.append(message);
}

function renderWarehouses(warehouses, selectedWarehouseId) {
  const select = byId("depo");
  const list = byId("depo-listesi");

  select.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "Firma geneli";
  select.append(allOption);

  for (const warehouse of warehouses) {
    const option = document.createElement("option");
    option.value = warehouse.id;
    option.textContent = warehouse.name || warehouse.code || "Depo";
    select.append(option);
  }

  select.value = selectedWarehouseId || "";
  select.disabled = false;

  list.replaceChildren();

  if (!warehouses.length) {
    renderEmpty(list, "Aktif depo kaydı bulunmuyor.");
    return;
  }

  warehouses.forEach((warehouse, index) => {
    const row = document.createElement("div");
    const order = document.createElement("b");
    const details = document.createElement("span");
    const name = document.createElement("strong");
    const status = document.createElement("small");
    const marker = document.createElement("em");

    order.textContent = String(index + 1);
    name.textContent = warehouse.name || warehouse.code || "Depo";
    status.textContent =
      warehouse.id === selectedWarehouseId
        ? "Seçili depo"
        : "Yetkili erişim";
    marker.textContent =
      warehouse.id === selectedWarehouseId
        ? "●"
        : "—";

    details.append(name, status);
    row.append(order, details, marker);
    list.append(row);
  });
}

function renderProcessVolumes(rows) {
  const container = byId("surec-listesi");
  container.replaceChildren();

  const usable = (rows || []).filter((row) =>
    Number.isFinite(Number(row.operation_count))
  );

  if (!usable.length) {
    renderEmpty(container, "Bu dönem için süreç hacmi kaydı bulunmuyor.");
    return;
  }

  const max = Math.max(
    ...usable.map((row) => Number(row.operation_count)),
    1
  );

  usable.forEach((row) => {
    const wrapper = document.createElement("div");
    const label = document.createElement("b");
    const track = document.createElement("span");
    const bar = document.createElement("i");
    const value = document.createElement("strong");

    const count = Number(row.operation_count);
    label.textContent = PROCESS_LABELS[row.process] || row.process || "Süreç";
    bar.style.width = `${Math.max(3, (count / max) * 100)}%`;
    value.textContent = `${formatNumber(count)} işlem`;

    track.append(bar);
    wrapper.append(label, track, value);
    container.append(wrapper);
  });
}

function renderCapacity(snapshot) {
  const used = Number(snapshot.used_capacity);
  const total = Number(snapshot.total_capacity);
  const rate = Number(snapshot.capacity_utilization_rate);
  const available =
    Number.isFinite(total) && Number.isFinite(used)
      ? Math.max(0, total - used)
      : null;

  byId("kapasite-orani").textContent = formatPercent(rate);
  byId("kapasite-toplam").textContent =
    `${formatNumber(total)} kapasite birimi`;
  byId("kapasite-kullanilan").textContent =
    `${formatNumber(used)} kapasite birimi`;
  byId("kapasite-kullanilabilir").textContent =
    available === null
      ? "—"
      : `${formatNumber(available)} kapasite birimi`;

  if (Number.isFinite(rate)) {
    byId("kapasite-halkasi").style.setProperty(
      "--warehouse-capacity",
      `${Math.min(100, Math.max(0, rate))}%`
    );
  }
}

function renderExceptions(exceptions) {
  const container = byId("uyari-listesi");
  const open = (exceptions || []).filter((row) => !row.resolved_at);

  byId("uyari-sayisi").textContent = `${open.length} açık`;
  container.replaceChildren();

  if (!open.length) {
    renderEmpty(container, "Açık operasyon istisnası bulunmuyor.");
    return;
  }

  open.slice(0, 6).forEach((item) => {
    const row = document.createElement("div");
    const dot = document.createElement("i");
    const content = document.createElement("span");
    const title = document.createElement("b");
    const description = document.createElement("small");

    if (item.severity === "critical") row.className = "critical";
    if (item.severity === "warning") row.className = "warning";

    title.textContent =
      `${SEVERITY_LABELS[item.severity] || "Bilgi"} · ` +
      `${PROCESS_LABELS[item.process] || item.process || "Operasyon"}`;

    description.textContent =
      item.description ||
      item.root_cause ||
      item.code ||
      "Operasyon istisnası";

    content.append(title, description);
    row.append(dot, content);
    container.append(row);
  });
}

function renderActions(exceptions) {
  const container = byId("aksiyon-listesi");
  const open = (exceptions || []).filter((row) => !row.resolved_at);

  container.replaceChildren();

  if (!open.length) {
    renderEmpty(container, "Aktif yönetici inceleme kaydı bulunmuyor.");
    return;
  }

  open.slice(0, 3).forEach((item, index) => {
    const card = document.createElement("div");
    const priority = document.createElement("small");
    const title = document.createElement("b");
    const description = document.createElement("p");
    const impact = document.createElement("span");

    if (item.severity === "critical" && index === 0) {
      card.className = "now";
    }

    priority.textContent =
      item.severity === "critical"
        ? "HEMEN"
        : item.severity === "warning"
          ? "YÜKSEK"
          : "NORMAL";

    title.textContent =
      `${PROCESS_LABELS[item.process] || item.process || "Operasyon"} · ` +
      `${item.code || "İstisna"}`;

    description.textContent =
      item.description || "Operasyon kaydı yönetici incelemesi bekliyor.";

    const impacts = [];
    if (Number(item.impacted_orders) > 0) {
      impacts.push(`${formatNumber(item.impacted_orders)} sipariş`);
    }
    if (Number(item.impacted_tasks) > 0) {
      impacts.push(`${formatNumber(item.impacted_tasks)} görev`);
    }
    if (Number(item.impacted_items) > 0) {
      impacts.push(`${formatNumber(item.impacted_items)} ürün`);
    }
    if (Number(item.delay_minutes) > 0) {
      impacts.push(`${formatNumber(item.delay_minutes)} dk gecikme`);
    }

    impact.textContent = item.root_cause
      ? `Kök neden: ${item.root_cause}`
      : impacts.length
        ? `Etki: ${impacts.join(" · ")}`
        : "Etki kaydı bulunmuyor";

    card.append(priority, title, description, impact);
    container.append(card);
  });
}

function renderTrend(rows) {
  const container = byId("chart");
  const summary = byId("trend-ozeti");
  container.replaceChildren();

  const points = (rows || []).filter((row) =>
    Number.isFinite(Number(row.health_score))
  );

  if (!points.length) {
    renderEmpty(container, "Trend verisi bulunmuyor.");
    summary.textContent = "Yeterli veri yok";
    return;
  }

  const first = Number(points[0].health_score);
  const last = Number(points[points.length - 1].health_score);
  const diff = last - first;

  summary.textContent =
    points.length > 1
      ? `${diff >= 0 ? "+" : ""}${formatScore(diff)} puan`
      : "Tek snapshot";

  points.forEach((point) => {
    const wrap = document.createElement("div");
    const bar = document.createElement("i");
    const value = document.createElement("b");
    const label = document.createElement("small");
    const score = Number(point.health_score);

    wrap.className = "bar";
    bar.style.height = `${Math.max(4, Math.min(100, score))}%`;
    value.textContent = formatScore(score);
    label.textContent = formatShortDate(
      point.period_end || point.calculated_at
    );

    bar.append(value);
    wrap.append(bar, label);
    container.append(wrap);
  });
}

function renderSnapshot(snapshot) {
  if (!snapshot) {
    clearMetrics("Henüz veri yok");
    return false;
  }

  setKpi(
    "health",
    formatScore(snapshot.health_score),
    HEALTH_LABELS[snapshot.health_status] || "Durum hesaplandı"
  );
  setKpi(
    "dispatch",
    formatPercent(snapshot.on_time_dispatch_rate),
    `${formatNumber(snapshot.on_time_orders)}/${formatNumber(snapshot.completed_orders)} zamanında`
  );
  setKpi(
    "inventory",
    formatPercent(snapshot.inventory_accuracy_rate),
    `${formatNumber(snapshot.accurate_inventory_checks)}/${formatNumber(snapshot.total_inventory_checks)} doğru`
  );
  setKpi(
    "capacity",
    formatPercent(snapshot.capacity_utilization_rate),
    `${formatNumber(snapshot.used_capacity)}/${formatNumber(snapshot.total_capacity)} kullanım`
  );
  setKpi(
    "tasks",
    formatPercent(snapshot.task_completion_rate),
    `${formatNumber(snapshot.completed_tasks)}/${formatNumber(snapshot.total_tasks)} görev`
  );
  setKpi(
    "labor",
    formatPercent(snapshot.labor_utilization_rate),
    `${formatNumber(snapshot.productive_minutes)}/${formatNumber(snapshot.available_labor_minutes)} dk`
  );

  renderCapacity(snapshot);
  return true;
}

function apiErrorMessage(body, fallback) {
  return (
    body?.error?.message ||
    body?.message ||
    fallback
  );
}

async function getSession() {
  const client = getSupabase();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw new Error(
      "Oturum bilgisi doğrulanamadı. Lütfen yeniden giriş yapın."
    );
  }

  return data?.session || null;
}

async function fetchOperationsCenter() {
  const session = await getSession();

  if (!session?.access_token) {
    return { authRequired: true };
  }

  const params = new URLSearchParams();
  if (state.accountId) params.set("accountId", state.accountId);
  if (state.warehouseId) params.set("warehouseId", state.warehouseId);

  const suffix = params.size ? `?${params.toString()}` : "";
  const response = await fetch(`${API_URL}${suffix}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    cache: "no-store"
  });

  const body = await response.json().catch(() => null);

  if (response.status === 401) {
    return {
      authRequired: true,
      message: apiErrorMessage(
        body,
        "WarehouseIQ oturumunuz geçersiz veya süresi dolmuş."
      )
    };
  }

  if (response.status === 403) {
    return {
      forbidden: true,
      message: apiErrorMessage(
        body,
        "WarehouseIQ erişim yetkiniz bulunmuyor."
      )
    };
  }

  if (!response.ok || !body?.ok || !body?.data) {
    throw new Error(
      apiErrorMessage(
        body,
        "WarehouseIQ operasyon verileri şu anda yüklenemedi."
      )
    );
  }

  return { data: body.data };
}

function renderAuthRequired(message) {
  clearMetrics("Oturum gerekli");
  byId("depo").disabled = true;
  renderEmpty(byId("depo-listesi"), "Depo erişimi için oturum açın.");
  setTimestamp(null);
  setStatus(
    "auth",
    "Oturum gerekli",
    message || "WarehouseIQ verilerini görüntülemek için platform hesabınızla giriş yapın."
  );

  const link = document.createElement("a");
  link.className = "warehouse-status-link";
  link.href = "/profil/";
  link.textContent = "Hesap ekranına git";
  byId("durum-mesaji").append(document.createTextNode(" "), link);
}

function renderForbidden(message) {
  clearMetrics("Yetki gerekli");
  byId("depo").disabled = true;
  renderEmpty(
    byId("depo-listesi"),
    "Bu hesap için aktif WarehouseIQ depo erişimi bulunmuyor."
  );
  setTimestamp(null);
  setStatus(
    "forbidden",
    "Erişim yok",
    message || "Bu kullanıcı için aktif WarehouseIQ üyeliği bulunmuyor."
  );
}

function renderError(error) {
  clearMetrics("Yüklenemedi");
  byId("depo").disabled = true;
  setTimestamp(null);
  setStatus(
    "error",
    "Bağlantı hatası",
    error instanceof Error
      ? error.message
      : "WarehouseIQ operasyon verileri şu anda yüklenemedi."
  );
}

function renderData(data) {
  state.accountId = data.account?.id || data.selection?.accountId || null;
  state.warehouses = Array.isArray(data.warehouses) ? data.warehouses : [];
  state.warehouseId = data.selection?.warehouseId || null;

  renderWarehouses(state.warehouses, state.warehouseId);

  const hasSnapshot = renderSnapshot(data.snapshot);
  renderProcessVolumes(data.processVolumes);
  renderExceptions(data.exceptions);
  renderActions(data.exceptions);
  renderTrend(data.trend);
  renderCopilot(data.copilot);
  setTimestamp(data.generatedAt || data.snapshot?.calculated_at);

  const accountName = data.account?.name || "WarehouseIQ firması";
  const selectedWarehouse = state.warehouses.find(
    (warehouse) => warehouse.id === state.warehouseId
  );
  const scopeName =
    selectedWarehouse?.name ||
    (state.warehouseId ? "Seçili depo" : "Firma geneli");

  if (hasSnapshot) {
    setStatus(
      "live",
      "Canlı veri",
      `${accountName} · ${scopeName} verileri yetkili oturum ve RLS üzerinden okunuyor.`
    );
  } else {
    setStatus(
      "empty",
      "Veri bekleniyor",
      `${accountName} · ${scopeName} için henüz operasyon snapshot kaydı bulunmuyor.`
    );
  }
}

async function load() {
  setStatus(
    "loading",
    "Canlı veri yükleniyor",
    "WarehouseIQ operasyon verileri güvenli bağlantı üzerinden yükleniyor."
  );
  byId("depo").disabled = true;

  try {
    const result = await fetchOperationsCenter();

    if (result.authRequired) {
      renderAuthRequired(result.message);
      return;
    }

    if (result.forbidden) {
      renderForbidden(result.message);
      return;
    }

    renderData(result.data);
  } catch (error) {
    renderError(error);
  }
}

function bindEvents() {
  byId("depo").addEventListener("change", async (event) => {
    state.warehouseId = event.target.value || null;
    await load();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await load();
});

byId("copilot-ai-btn")?.addEventListener("click", () => {
  void enhanceCopilotWithAi();
});
