import {
  getWarehouseOperationsContext,
  getWarehouseSession,
} from "./operations-center.js?v=20799872";

const WAREHOUSE_STATUSES = [
  ["draft", "Taslak"],
  ["active", "Aktif"],
  ["temporarily_closed", "Geçici Kapalı"],
  ["inactive", "Pasif"],
  ["archived", "Arşivlendi"],
];

let loading = false;
let selectedWarehouseId = null;

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

function statusLabel(status) {
  return (
    WAREHOUSE_STATUSES.find(([value]) => value === status)?.[1] ||
    status ||
    "—"
  );
}

function numberValue(id) {
  const value = byId(id)?.value.trim();
  return value === "" ? null : Number(value);
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
        "Depo işlemi gerçekleştirilemedi."
    );
  }

  return payload;
}

function setMessage(message = "", isError = false) {
  const element = byId("depo-mesaji");

  if (!element) return;

  element.textContent = message;
  element.hidden = !message;
  element.classList.toggle("error", isError);
}

function setLoading(value) {
  loading = value;

  const button = byId("depo-olustur");
  const clearButton = byId("depo-form-temizle");

  if (button) {
    button.disabled = value;
    button.textContent = value ? "Kaydediliyor..." : "Depo Oluştur";
  }

  if (clearButton) {
    clearButton.disabled = value || !selectedWarehouseId;
  }
}

function resetForm() {
  const form = byId("depo-form");

  if (!form) return;

  form.reset();

  const timezone = byId("depo-saat-dilimi");
  const countryCode = byId("depo-ulke-kodu");

  if (timezone) timezone.value = "Europe/Istanbul";
  if (countryCode) countryCode.value = "TR";

  selectedWarehouseId = null;

  const button = byId("depo-olustur");
  if (button) button.textContent = "Depo Oluştur";

  const clearButton = byId("depo-form-temizle");
  if (clearButton) clearButton.disabled = true;
}

function fillForm(warehouse) {
  byId("depo-kodu").value = warehouse.code || "";
  byId("depo-adi").value = warehouse.name || "";
  byId("depo-saat-dilimi").value =
    warehouse.timezone || "Europe/Istanbul";
  byId("depo-aciklama").value = warehouse.description || "";

  byId("depo-adres").value =
    warehouse.address_line ??
    warehouse.address?.addressLine ??
    "";
  byId("depo-ilce").value =
    warehouse.district ??
    warehouse.address?.district ??
    "";
  byId("depo-sehir").value =
    warehouse.city ??
    warehouse.address?.city ??
    "";
  byId("depo-posta-kodu").value =
    warehouse.postal_code ??
    warehouse.address?.postalCode ??
    "";
  byId("depo-ulke-kodu").value =
    warehouse.country_code ??
    warehouse.address?.countryCode ??
    "TR";

  byId("depo-toplam-alan").value =
    warehouse.total_area_square_meters ??
    warehouse.capacity?.totalAreaSquareMeters ??
    "";
  byId("depo-kullanilabilir-alan").value =
    warehouse.usable_area_square_meters ??
    warehouse.capacity?.usableAreaSquareMeters ??
    "";
  byId("depo-maksimum-palet").value =
    warehouse.maximum_pallet_capacity ??
    warehouse.capacity?.maximumPalletCapacity ??
    "";
  byId("depo-maksimum-bin").value =
    warehouse.maximum_bin_capacity ??
    warehouse.capacity?.maximumBinCapacity ??
    "";

  selectedWarehouseId = warehouse.id;

  const button = byId("depo-olustur");
  if (button) button.textContent = "Depoyu Güncelle";

  const clearButton = byId("depo-form-temizle");
  if (clearButton) clearButton.disabled = false;

  setMessage(`"${warehouse.name || warehouse.code}" düzenleme modunda.`);
}

function renderWarehouses(warehouses) {
  const container = byId("depo-yonetim-listesi");

  if (!container) return;

  if (!warehouses.length) {
    container.innerHTML =
      '<p class="empty-state">Henüz depo kaydı bulunmuyor.</p>';
    return;
  }

  container.innerHTML = `
    <div class="location-table-wrap">
      <table class="location-table warehouse-management-table">
        <thead>
          <tr>
            <th>Kod</th>
            <th>Depo</th>
            <th>Şehir</th>
            <th>Durum</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          ${warehouses
            .map(
              (warehouse) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(warehouse.code)}</strong>
                  </td>
                  <td>
                    ${escapeHtml(warehouse.name)}
                  </td>
                  <td>
                    ${escapeHtml(
                      warehouse.city ?? warehouse.address?.city ?? "—"
                    )}
                  </td>
                  <td>
                    <span class="location-status">
                      ${escapeHtml(statusLabel(warehouse.status))}
                    </span>
                  </td>
                  <td>
                    <div class="warehouse-row-actions">
                      <button
                        type="button"
                        class="warehouse-edit"
                        data-warehouse-id="${escapeHtml(warehouse.id)}"
                      >
                        Düzenle
                      </button>
                      ${
                        warehouse.status !== "archived"
                          ? `
                            <select
                              class="warehouse-status"
                              data-warehouse-id="${escapeHtml(
                                warehouse.id
                              )}"
                              aria-label="${escapeHtml(
                                warehouse.name || warehouse.code
                              )} durumunu değiştir"
                            >
                              <option value="">
                                Durum değiştir
                              </option>
                              ${WAREHOUSE_STATUSES.filter(
                                ([value]) =>
                                  value !== warehouse.status
                              )
                                .map(
                                  ([value, label]) =>
                                    `<option value="${escapeHtml(
                                      value
                                    )}">${escapeHtml(
                                      label
                                    )}</option>`
                                )
                                .join("")}
                            </select>
                          `
                          : ""
                      }
                    </div>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll(".warehouse-edit").forEach((button) => {
    button.addEventListener("click", () => {
      const warehouse = warehouses.find(
        (item) => item.id === button.dataset.warehouseId
      );

      if (warehouse) {
        fillForm(warehouse);
      }
    });
  });

  container.querySelectorAll(".warehouse-status").forEach((select) => {
    select.addEventListener("change", async () => {
      const status = select.value;
      const warehouseId = select.dataset.warehouseId;

      if (!status || !warehouseId || loading) {
        select.value = "";
        return;
      }

      await changeWarehouseStatus(
        warehouseId,
        status,
        select
      );
    });
  });
}

async function loadWarehouses() {
  const context = getWarehouseOperationsContext();

  if (!context.accountId) {
    renderWarehouses([]);
    setMessage(
      "WarehouseIQ hesabı hazır değil. Sayfa verilerinin yüklenmesini bekleyin.",
      true
    );
    return;
  }

  const params = new URLSearchParams({
    accountId: context.accountId,
  });

  try {
    const payload = await authenticatedRequest(
      `/api/warehouse/warehouses?${params.toString()}`
    );

    renderWarehouses(payload?.data?.warehouses || []);
  } catch (error) {
    renderWarehouses([]);
    setMessage(error.message, true);
  }
}

async function createWarehouse(event) {
  event.preventDefault();

  if (loading) {
    return;
  }

  if (selectedWarehouseId) {
    return updateWarehouse();
  }

  const context = getWarehouseOperationsContext();

  if (!context.accountId) {
    setMessage(
      "Önce aktif WarehouseIQ hesabının yüklenmesi gerekiyor.",
      true
    );
    return;
  }

  const code = byId("depo-kodu")?.value.trim();
  const name = byId("depo-adi")?.value.trim();

  if (!code || !name) {
    setMessage(
      "Depo kodu ve depo adı zorunludur.",
      true
    );
    return;
  }

  setLoading(true);
  setMessage("");

  try {
    await authenticatedRequest("/api/warehouse/warehouses", {
      method: "POST",
      body: JSON.stringify({
        requestId: globalThis.crypto.randomUUID(),
        accountId: context.accountId,
        code,
        name,
        description:
          byId("depo-aciklama")?.value.trim() || null,
        timezone:
          byId("depo-saat-dilimi")?.value.trim() ||
          "Europe/Istanbul",
        addressLine:
          byId("depo-adres")?.value.trim() || null,
        district:
          byId("depo-ilce")?.value.trim() || null,
        city:
          byId("depo-sehir")?.value.trim() || null,
        postalCode:
          byId("depo-posta-kodu")?.value.trim() || null,
        countryCode:
          byId("depo-ulke-kodu")?.value.trim() || "TR",
        totalAreaSquareMeters: numberValue(
          "depo-toplam-alan"
        ),
        usableAreaSquareMeters: numberValue(
          "depo-kullanilabilir-alan"
        ),
        maximumPalletCapacity: numberValue(
          "depo-maksimum-palet"
        ),
        maximumBinCapacity: numberValue(
          "depo-maksimum-bin"
        ),
      }),
    });

    resetForm();
    setMessage("Depo başarıyla oluşturuldu.");
    await loadWarehouses();
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    setLoading(false);
  }
}

async function updateWarehouse() {
  const context = getWarehouseOperationsContext();

  if (!context.accountId || !selectedWarehouseId) {
    return;
  }

  const name = byId("depo-adi")?.value.trim();

  if (!name) {
    setMessage("Depo adı zorunludur.", true);
    return;
  }

  setLoading(true);
  setMessage("");

  try {
    await authenticatedRequest("/api/warehouse/warehouses", {
      method: "PATCH",
      body: JSON.stringify({
        requestId: globalThis.crypto.randomUUID(),
        accountId: context.accountId,
        warehouseId: selectedWarehouseId,
        name,
        description:
          byId("depo-aciklama")?.value.trim() || null,
        timezone:
          byId("depo-saat-dilimi")?.value.trim() ||
          "Europe/Istanbul",
        addressLine:
          byId("depo-adres")?.value.trim() || null,
        district:
          byId("depo-ilce")?.value.trim() || null,
        city:
          byId("depo-sehir")?.value.trim() || null,
        postalCode:
          byId("depo-posta-kodu")?.value.trim() || null,
        countryCode:
          byId("depo-ulke-kodu")?.value.trim() || "TR",
        totalAreaSquareMeters: numberValue(
          "depo-toplam-alan"
        ),
        usableAreaSquareMeters: numberValue(
          "depo-kullanilabilir-alan"
        ),
        maximumPalletCapacity: numberValue(
          "depo-maksimum-palet"
        ),
        maximumBinCapacity: numberValue(
          "depo-maksimum-bin"
        ),
      }),
    });

    resetForm();
    setMessage("Depo başarıyla güncellendi.");
    await loadWarehouses();
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    setLoading(false);
  }
}

async function changeWarehouseStatus(
  warehouseId,
  status,
  select
) {
  const context = getWarehouseOperationsContext();

  if (!context.accountId) {
    select.value = "";
    setMessage(
      "WarehouseIQ hesabı hazır değil.",
      true
    );
    return;
  }

  setLoading(true);
  setMessage("");

  try {
    await authenticatedRequest("/api/warehouse/warehouses", {
      method: "PATCH",
      body: JSON.stringify({
        requestId: globalThis.crypto.randomUUID(),
        accountId: context.accountId,
        warehouseId,
        status,
      }),
    });

    setMessage(
      `Depo durumu "${statusLabel(status)}" olarak güncellendi.`
    );

    await loadWarehouses();
  } catch (error) {
    setMessage(error.message, true);
    select.value = "";
  } finally {
    setLoading(false);
  }
}

function bind() {
  const form = byId("depo-form");

  if (form) {
    form.addEventListener("submit", createWarehouse);
  }

  const clearButton = byId("depo-form-temizle");

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      resetForm();
      setMessage("");
    });
  }

  if (getWarehouseOperationsContext().accountId) {
    void loadWarehouses();
  }
}

document.addEventListener("warehouse:operations-context", () => {
  resetForm();
  void loadWarehouses();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bind, {
    once: true,
  });
} else {
  bind();
}
