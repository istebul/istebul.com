import {
  getWarehouseOperationsContext,
  getWarehouseSession,
} from "./operations-center.js?v=20799872";

const LOCATION_TYPES = [
  ["receiving", "Mal Kabul"],
  ["quality_control", "Kalite Kontrol"],
  ["reserve", "Rezerv"],
  ["picking", "Toplama"],
  ["bulk", "Bulk / Toplu Stok"],
  ["cold_storage", "Soğuk Depo"],
  ["hazardous", "Tehlikeli Madde"],
  ["returns", "İade"],
  ["damaged", "Hasarlı"],
  ["packing", "Paketleme"],
  ["shipping", "Sevkiyat"],
  ["cross_dock", "Cross Dock"],
];

let loading = false;

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function typeLabel(type) {
  return (
    LOCATION_TYPES.find(([value]) => value === type)?.[1] ||
    type ||
    "—"
  );
}

async function authenticatedRequest(path, options = {}) {
  const session = await getWarehouseSession();

  if (!session?.access_token) {
    throw new Error("WarehouseIQ oturumu bulunamadı.");
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        payload?.message ||
        "Lokasyon işlemi gerçekleştirilemedi."
    );
  }

  return payload;
}

function renderTypeOptions() {
  const select = byId("lokasyon-tipi");

  if (!select) return;

  select.innerHTML = LOCATION_TYPES.map(
    ([value, label]) =>
      `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`
  ).join("");
}

function renderLocations(locations) {
  const container = byId("lokasyon-listesi");

  if (!container) return;

  if (!locations.length) {
    container.innerHTML =
      '<p class="empty-state">Henüz aktif lokasyon bulunmuyor.</p>';
    return;
  }

  container.innerHTML = `
    <div class="location-table-wrap">
      <table class="location-table">
        <thead>
          <tr>
            <th>Kod</th>
            <th>Lokasyon</th>
            <th>Tip</th>
            <th>Tam Kod</th>
            <th>Barkod</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          ${locations
            .map(
              (location) => `
                <tr>
                  <td><strong>${escapeHtml(location.code)}</strong></td>
                  <td>${escapeHtml(location.name)}</td>
                  <td>${escapeHtml(typeLabel(location.type))}</td>
                  <td><code>${escapeHtml(location.fullCode)}</code></td>
                  <td><code>${escapeHtml(location.barcode)}</code></td>
                  <td>
                    <span class="location-status">
                      ${escapeHtml(location.status || "empty")}
                    </span>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function setMessage(message = "", isError = false) {
  const element = byId("lokasyon-mesaji");

  if (!element) return;

  element.textContent = message;
  element.hidden = !message;
  element.classList.toggle("error", isError);
}

function setLoading(value) {
  loading = value;

  const button = byId("lokasyon-olustur");

  if (button) {
    button.disabled = value;
    button.textContent = value
      ? "Oluşturuluyor..."
      : "Lokasyon Oluştur";
  }
}

async function loadLocations() {
  const context = getWarehouseOperationsContext();

  if (!context.accountId) {
    renderLocations([]);
    setMessage(
      "WarehouseIQ hesabı hazır değil. Sayfa verilerinin yüklenmesini bekleyin.",
      true
    );
    return;
  }

  const params = new URLSearchParams({
    accountId: context.accountId,
  });

  if (context.warehouseId) {
    params.set("warehouseId", context.warehouseId);
  }

  try {
    const payload = await authenticatedRequest(
      `/api/warehouse/locations?${params.toString()}`
    );

    renderLocations(payload?.data?.locations || []);
  } catch (error) {
    renderLocations([]);
    setMessage(error.message, true);
  }
}

async function createLocation(event) {
  event.preventDefault();

  if (loading) return;

  const context = getWarehouseOperationsContext();

  if (!context.accountId) {
    setMessage("Önce aktif WarehouseIQ hesabının yüklenmesi gerekiyor.", true);
    return;
  }

  if (!context.warehouseId) {
    setMessage(
      "Lokasyon oluşturmak için önce belirli bir depo seçin.",
      true
    );
    return;
  }

  const code = byId("lokasyon-kodu")?.value.trim();
  const name = byId("lokasyon-adi")?.value.trim();
  const locationType = byId("lokasyon-tipi")?.value;
  const zoneCode = byId("lokasyon-zone")?.value.trim();
  const aisleCode = byId("lokasyon-aisle")?.value.trim();
  const rackCode = byId("lokasyon-rack")?.value.trim();
  const levelCode = byId("lokasyon-level")?.value.trim();
  const binCode = byId("lokasyon-bin")?.value.trim();

  if (!code || !name || !locationType || !zoneCode) {
    setMessage(
      "Kod, lokasyon adı, lokasyon tipi ve zone alanları zorunludur.",
      true
    );
    return;
  }

  setLoading(true);
  setMessage("");

  try {
    await authenticatedRequest("/api/warehouse/locations", {
      method: "POST",
      body: JSON.stringify({
        requestId: globalThis.crypto.randomUUID(),
        accountId: context.accountId,
        warehouseId: context.warehouseId,
        code,
        name,
        locationType,
        zoneCode,
        aisleCode: aisleCode || null,
        rackCode: rackCode || null,
        levelCode: levelCode || null,
        binCode: binCode || null,
      }),
    });

    event.target.reset();
    renderTypeOptions();

    setMessage("Lokasyon başarıyla oluşturuldu.");
    await loadLocations();
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    setLoading(false);
  }
}

function bind() {
  renderTypeOptions();

  const form = byId("lokasyon-form");

  if (form) {
    form.addEventListener("submit", createLocation);
  }

  const warehouseSelect = byId("depo");

  if (warehouseSelect) {
    warehouseSelect.addEventListener("change", () => {
      setMessage("");
      loadLocations();
    });
  }

  if (getWarehouseOperationsContext().accountId) {
    void loadLocations();
  }
}

document.addEventListener("warehouse:operations-context", () => {
  void loadLocations();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bind, { once: true });
} else {
  bind();
}
