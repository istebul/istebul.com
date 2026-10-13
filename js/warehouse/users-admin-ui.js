import {
  getWarehouseOperationsContext,
  getWarehouseSession,
} from "./operations-center.js?v=20799872";

const PERMISSIONS = [
  ["receiving", "Mal kabul"],
  ["putaway", "Yerleştirme"],
  ["picking", "Toplama"],
  ["packing", "Paketleme"],
  ["shipping", "Sevkiyat"],
  ["cycle_count", "Sayım"],
  ["quality_control", "Kalite kontrol"],
];
const ROLES = [
  ["admin", "Admin · Tam yetki"],
  ["warehouse_manager", "Depo yöneticisi"],
  ["supervisor", "Süpervizör"],
  ["inventory_controller", "Stok kontrol"],
  ["receiver", "Mal kabul"],
  ["quality_controller", "Kalite kontrol"],
  ["forklift_operator", "Forklift operatörü"],
  ["picker", "Toplayıcı"],
  ["packer", "Paketleyici"],
  ["dispatcher", "Sevkiyat sorumlusu"],
  ["driver", "Sürücü"],
  ["operator", "Operatör"],
  ["viewer", "Salt okunur"],
];
const STATUSES = [
  ["invited", "Davet edildi"],
  ["active", "Aktif"],
  ["suspended", "Askıda"],
  ["inactive", "Pasif"],
];

let accountId = null;
let users = [];
let warehouses = [];
let busy = false;
let contextWaits = 0;

const byId = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function textOfRole(value) {
  return ROLES.find(([key]) => key === value)?.[1] || value || "—";
}
function textOfStatus(value) {
  return STATUSES.find(([key]) => key === value)?.[1] || value || "—";
}
function setMessage(message, isError = false) {
  const node = byId("warehouse-users-message");
  if (!node) return;
  node.textContent = message || "";
  node.hidden = !message;
  node.classList.toggle("error", Boolean(isError));
}
function setBusy(value) {
  busy = Boolean(value);
  for (const node of document.querySelectorAll("#warehouse-users-admin button, #warehouse-users-admin input, #warehouse-users-admin select")) {
    if (node.dataset.keepEnabled === "true") continue;
    node.disabled = busy;
  }
  const email = byId("warehouse-user-email");
  if (email && !busy) email.disabled = Boolean(byId("warehouse-user-id")?.value);
  const submit = byId("warehouse-users-submit");
  if (submit) submit.textContent = busy ? "Kaydediliyor…" : (byId("warehouse-user-id").value ? "Değişiklikleri Kaydet" : "Davet Gönder");
}

async function authenticatedRequest(path, options = {}) {
  const session = await getWarehouseSession();
  if (!session?.access_token) throw new Error("WarehouseIQ oturumu bulunamadı. Önce oturum açın.");
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let payload = null;
  try { payload = await response.json(); } catch { /* Response may be empty. */ }
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || "Kullanıcı yönetimi işlemi tamamlanamadı.");
  }
  return payload || {};
}

function renderPermissionOptions(selected = []) {
  const checked = new Set(selected);
  const target = byId("warehouse-user-permissions");
  if (!target) return;
  target.innerHTML = PERMISSIONS.map(([key, label]) => `
    <label class="wu-check"><input type="checkbox" name="permissions" value="${key}" ${checked.has(key) ? "checked" : ""}><span>${label}</span></label>
  `).join("");
}
function renderWarehouseOptions(selected = []) {
  const checked = new Set(selected.map(String));
  const target = byId("warehouse-user-warehouses");
  if (!target) return;
  if (!warehouses.length) {
    target.innerHTML = '<p class="wu-muted">Bu hesapta atanabilir depo bulunamadı.</p>';
    return;
  }
  target.innerHTML = warehouses.map((warehouse) => {
    const id = String(warehouse.id);
    return `<label class="wu-check"><input type="checkbox" name="warehouseIds" value="${escapeHtml(id)}" ${checked.has(id) ? "checked" : ""}><span><strong>${escapeHtml(warehouse.name || warehouse.code || "Depo")}</strong><small>${escapeHtml(warehouse.code || "")}</small></span></label>`;
  }).join("");
}
function renderUsers() {
  const target = byId("warehouse-users-list");
  if (!target) return;
  if (!users.length) {
    target.innerHTML = '<p class="wu-muted">Bu hesapta henüz kullanıcı bulunmuyor.</p>';
    return;
  }
  target.innerHTML = users.map((user) => {
    const label = user.display_name || user.auth_email || user.username || user.user_id;
    const permissionLabels = (Array.isArray(user.permissions) ? user.permissions : [])
      .map((item) => PERMISSIONS.find(([key]) => key === item)?.[1] || item);
    const warehouseNames = (Array.isArray(user.warehouse_ids) ? user.warehouse_ids : [])
      .map((id) => warehouses.find((warehouse) => String(warehouse.id) === String(id))?.name || "Depo erişimi");
    return `
      <article class="wu-user-row">
        <div class="wu-user-primary"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(user.auth_email || "E-posta yok")}</span></div>
        <div class="wu-user-meta"><span>${escapeHtml(textOfRole(user.role))}</span><span class="wu-status wu-status-${escapeHtml(user.status)}">${escapeHtml(textOfStatus(user.status))}</span></div>
        <p><b>Modüller:</b> ${user.role === "admin" ? "Tüm modüller (admin)" : escapeHtml(permissionLabels.join(", ") || "Modül izni verilmemiş")}</p>
        <p><b>Depolar:</b> ${escapeHtml(warehouseNames.join(", ") || "Atanmış depo yok")}</p>
        <div class="wu-user-actions"><button type="button" class="secondary" data-user-edit="${escapeHtml(user.user_id)}">Düzenle</button></div>
      </article>`;
  }).join("");
}
function setEditMode(user = null) {
  const idField = byId("warehouse-user-id");
  const email = byId("warehouse-user-email");
  const statusRow = byId("warehouse-user-status-row");
  const submit = byId("warehouse-users-submit");
  const cancel = byId("warehouse-users-cancel");
  idField.value = user?.user_id || "";
  email.value = user?.auth_email || "";
  email.disabled = Boolean(user);
  byId("warehouse-user-display-name").value = user?.display_name || "";
  // Never offer `owner` as a new role; a legacy owner editing their own row is normalized to admin.
  byId("warehouse-user-role").value = user?.role === "owner" ? "admin" : (user?.role || "operator");
  byId("warehouse-user-status").value = user?.status || "invited";
  statusRow.hidden = !user;
  if (submit) submit.textContent = user ? "Değişiklikleri Kaydet" : "Davet Gönder";
  if (cancel) cancel.hidden = !user;
  renderPermissionOptions(user?.permissions || []);
  renderWarehouseOptions(user?.warehouse_ids || []);
  byId("warehouse-users-form-title").textContent = user ? "Kullanıcıyı düzenle" : "Yeni kullanıcı davet et";
}
function selectedValues(name) {
  return [...document.querySelectorAll(`#warehouse-users-admin input[name="${name}"]:checked`)].map((input) => input.value);
}
function currentAccountId() {
  const value = getWarehouseOperationsContext()?.accountId;
  return typeof value === "string" && value ? value : null;
}

async function load() {
  if (busy) return;
  setMessage("Kullanıcı ve depo bilgileri yükleniyor…");
  try {
    accountId = currentAccountId();
    if (!accountId) {
      if (contextWaits < 10) {
        contextWaits += 1;
        setMessage("Hesap bilgisi bekleniyor…");
        window.setTimeout(() => { if (!busy) void load(); }, 300);
      } else {
        setMessage("Hesap bilgisi henüz hazır değil. Birkaç saniye sonra Yenile'yi seçin.", true);
      }
      return;
    }
    contextWaits = 0;
    const [userPayload, warehousePayload] = await Promise.all([
      authenticatedRequest(`/api/warehouse/users?accountId=${encodeURIComponent(accountId)}`),
      authenticatedRequest(`/api/warehouse/warehouses?accountId=${encodeURIComponent(accountId)}`),
    ]);
    users = Array.isArray(userPayload.users) ? userPayload.users : [];
    warehouses = Array.isArray(warehousePayload.warehouses)
      ? warehousePayload.warehouses
      : Array.isArray(warehousePayload.data?.warehouses)
        ? warehousePayload.data.warehouses
        : Array.isArray(warehousePayload.items) ? warehousePayload.items : [];
    byId("warehouse-users-admin").hidden = false;
    byId("warehouse-users-nav-link").hidden = false;
    renderUsers();
    setEditMode(byId("warehouse-user-id").value ? users.find((user) => user.user_id === byId("warehouse-user-id").value) || null : null);
    setMessage(`${users.length} kullanıcı ve ${warehouses.length} depo yüklendi.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kullanıcı bilgileri yüklenemedi.";
    if (/admin|yetki|403/i.test(message) && accountId) {
      // Only this signed-in user can convert their own legacy owner membership; no role-assignment path grants owner.
      try {
        await authenticatedRequest("/api/warehouse/users", {
          method: "POST",
          body: JSON.stringify({ action: "convert_own_legacy_owner", accountId }),
        });
        setMessage("Eski hesap rolü admin olarak güncellendi; kullanıcı listesi yenileniyor.");
        await load();
        return;
      } catch {
        // Most non-admin users land here; keep the admin-only panel hidden.
      }
      byId("warehouse-users-admin").hidden = true;
      byId("warehouse-users-nav-link").hidden = true;
      setMessage("Kullanıcı Yönetimi yalnızca aktif admin hesabına açıktır.", true);
    } else {
      setMessage(message, true);
    }
  }
}

async function submitForm(event) {
  event.preventDefault();
  if (busy) return;
  accountId = currentAccountId();
  if (!accountId) {
    setMessage("Hesap bilgisi hazır değil. Yenile'yi seçip tekrar deneyin.", true);
    return;
  }
  const userId = byId("warehouse-user-id").value;
  const payload = {
    accountId,
    userId: userId || undefined,
    email: userId ? undefined : byId("warehouse-user-email").value.trim(),
    displayName: byId("warehouse-user-display-name").value.trim() || null,
    role: byId("warehouse-user-role").value,
    status: userId ? byId("warehouse-user-status").value : "invited",
    permissions: selectedValues("permissions"),
    warehouseIds: selectedValues("warehouseIds"),
  };
  setBusy(true);
  setMessage(userId ? "Kullanıcı yetkileri güncelleniyor…" : "Davet hazırlanıyor…");
  try {
    await authenticatedRequest("/api/warehouse/users", {
      method: userId ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setBusy(false);
    setEditMode(null);
    await load();
    setMessage(userId ? "Kullanıcı bilgileri ve yetkileri güncellendi." : "Davet gönderildi. Kullanıcı, davet bağlantısını tamamladıktan sonra giriş yapabilir.");
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "Kullanıcı kaydedilemedi.", true);
  } finally {
    setBusy(false);
  }
}

function wire() {
  byId("warehouse-users-refresh")?.addEventListener("click", () => void load());
  byId("warehouse-users-form")?.addEventListener("submit", (event) => void submitForm(event));
  byId("warehouse-users-cancel")?.addEventListener("click", () => {
    setEditMode(null);
    setMessage("Düzenleme iptal edildi.");
  });
  byId("warehouse-users-list")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-user-edit]");
    if (!button) return;
    const user = users.find((item) => item.user_id === button.dataset.userEdit);
    if (!user) return;
    setEditMode(user);
    byId("warehouse-users-form").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  byId("warehouse-user-role")?.addEventListener("change", () => {
    if (byId("warehouse-user-role").value === "admin") {
      const note = byId("warehouse-user-admin-role-note");
      if (note) note.hidden = false;
    } else {
      const note = byId("warehouse-user-admin-role-note");
      if (note) note.hidden = true;
    }
  });
  document.addEventListener("warehouseiq:account-changed", () => void load());
  void load();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wire, { once: true });
} else {
  wire();
}
