import {
  getWarehouseOperationsContext,
  getWarehouseSession
} from "./operations-center.js?v=20799872";

const panel = document.getElementById("entegrasyonlar");

if (panel) {
  const alertNode = document.getElementById("ih-alert");
  const listNode = document.getElementById("ih-list");
  const refreshButton = document.getElementById("ih-refresh");
  const createForm = document.getElementById("ih-create-form");
  const createSubmit = document.getElementById("ih-create-submit");
  const connectorSelect = document.getElementById("ih-connector");

  const state = {
    accountId: null,
    connectors: [],
    integrations: [],
    testResults: new Map(),
    loading: false
  };

  const statusLabels = {
    draft: "Taslak",
    testing: "Bağlantı sınanıyor",
    active: "Aktif",
    inactive: "Pasif",
    error: "Hata"
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function setAlert(message, type = "info") {
    alertNode.textContent = message;
    alertNode.className = `ih-alert ih-alert-${type}`;
  }

  function statusLabel(status) {
    return statusLabels[status] || "Bilinmiyor";
  }

  function formatDate(value) {
    if (!value) return "Henüz yok";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Henüz yok";
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  async function sessionOrThrow() {
    const session = await getWarehouseSession();
    if (!session?.access_token) {
      throw new Error("WarehouseIQ oturumu bulunamadı. Giriş yapıp yeniden deneyin.");
    }
    return session;
  }

  async function request(path, options = {}) {
    const session = await sessionOrThrow();
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {})
    };

    const response = await fetch(path, {
      method: options.method || "GET",
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      cache: "no-store"
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const candidate =
        payload?.error?.message ??
        payload?.message ??
        payload?.error ??
        payload?.detail;
      const message = typeof candidate === "string"
        ? candidate
        : `İstek tamamlanamadı (HTTP ${response.status}).`;
      throw new Error(message);
    }

    return payload?.data ?? payload?.result ?? payload;
  }

  async function resolveAccountId() {
    await sessionOrThrow();

    let context = getWarehouseOperationsContext();
    if (context?.accountId) return context.accountId;

    // Operasyon merkezi ilk canlı veriyi yüklerken bağlamı oluşturabilir.
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      context = getWarehouseOperationsContext();
      if (context?.accountId) return context.accountId;
    }

    throw new Error(
      "WarehouseIQ firma bilgisi henüz alınamadı. Sayfayı yenileyip tekrar deneyin."
    );
  }

  function renderConnectorOptions() {
    const available = state.connectors.filter((item) =>
      item.connector_key === "custom_rest" &&
      item.implementation_status === "available"
    );

    connectorSelect.innerHTML = available.length
      ? available.map((item) =>
          `<option value="${escapeHtml(item.connector_key)}">${escapeHtml(item.display_name)}</option>`
        ).join("")
      : '<option value="">Şu anda kullanılabilir bağlantı türü yok</option>';

    createSubmit.disabled = !state.accountId || available.length === 0;
  }

  function renderIntegrations() {
    if (!state.integrations.length) {
      listNode.innerHTML =
        '<div class="ih-empty-state"><strong>Henüz bağlantı yok</strong><span>İlk Özel REST taslağını yukarıdaki formdan oluşturabilirsiniz.</span></div>';
      return;
    }

    const connectorNames = new Map(
      state.connectors.map((item) => [item.connector_key, item.display_name])
    );

    listNode.innerHTML = state.integrations.map((integration) => {
      const id = escapeHtml(integration.id);
      const busy = ["active", "testing"].includes(integration.status);
      const hasCredential = integration.has_credential === true;
      const capability = (integration.capabilities || []).find(
        (item) => item.capability_key === "shipment.write"
      );
      const shipmentEnabled = capability?.enabled === true;
      const canChangeCapability =
        !busy &&
        integration.connector_key === "custom_rest" &&
        hasCredential &&
        Boolean(integration.base_url);

      const credentialForm = `
        <details class="ih-details">
          <summary>${hasCredential ? "Kimlik bilgisini değiştir" : "Kimlik bilgisi bağla"}</summary>
          <form class="ih-credential-form" data-integration-id="${id}">
            <label>
              Gizli anahtar / token
              <input name="secret" type="password" required maxlength="50000"
                autocomplete="new-password" ${busy ? "disabled" : ""}
                placeholder="Değer burada güvenli biçimde gönderilir">
            </label>
            <div class="ih-form-grid">
              <label>
                Anahtar adı (isteğe bağlı)
                <input name="name" maxlength="160" autocomplete="off"
                  ${busy ? "disabled" : ""} placeholder="Örn. Üretim anahtarı">
              </label>
              <label>
                Açıklama (isteğe bağlı)
                <input name="description" maxlength="500" autocomplete="off"
                  ${busy ? "disabled" : ""} placeholder="Kullanım amacı">
              </label>
            </div>
            <button type="submit" class="ih-button" ${busy ? "disabled" : ""}>
              Güvenli kasaya kaydet
            </button>
          </form>
        </details>`;

      const testResult = state.testResults.get(integration.id);
      const testResultMarkup = testResult
        ? `<div class="ih-test-result ${testResult.ok ? "is-success" : "is-error"}" role="status">
             <strong>${testResult.ok ? "Bağlantı başarılı" : "Bağlantı başarısız"}</strong>
             <span>${escapeHtml(testResult.message || "Test tamamlandı.")}</span>
             <small>HTTP ${escapeHtml(testResult.httpStatus ?? "yanıt yok")} · ${escapeHtml(testResult.elapsedMs ?? 0)} ms · ${escapeHtml(formatDate(testResult.testedAt))}</small>
           </div>`
        : "";

      const canTest =
        !busy &&
        integration.connector_key === "custom_rest" &&
        Boolean(integration.base_url);
      const needsTestSecret = integration.auth_type !== "none";

      const testForm = integration.connector_key === "custom_rest"
        ? `
          <details class="ih-details">
            <summary>Bağlantıyı test et (HEAD)</summary>
            <form class="ih-test-form" data-integration-id="${id}">
              ${needsTestSecret ? `
                <label>
                  Test için gizli anahtar / token
                  <input name="secret" type="password" required maxlength="50000"
                    autocomplete="new-password"
                    ${canTest ? "" : "disabled"}
                    placeholder="Test sırasında gönderilir; kaydedilmez">
                </label>
              ` : `
                <p class="ih-help">Bu bağlantı türü test sırasında gizli anahtar gerektirmiyor.</p>
              `}
              <p class="ih-help">
                Yalnızca HEAD isteği gönderilir. Sevkiyat veya sipariş verisi gönderilmez.
              </p>
              <button type="submit" class="ih-button" ${canTest ? "" : "disabled"}>
                HEAD ile test et
              </button>
            </form>
          </details>`
        : "";

      const capabilityButton = canChangeCapability
        ? `<button type="button" class="ih-button ${shipmentEnabled ? "ih-button-secondary" : ""}"
             data-action="toggle-shipment" data-integration-id="${id}"
             data-enabled="${shipmentEnabled ? "true" : "false"}">
             ${shipmentEnabled ? "Sevkiyat iznini kapat" : "Sevkiyat gönderim iznini aç"}
           </button>`
        : `<button type="button" class="ih-button ih-button-secondary" disabled>
             ${busy ? "Önce bağlantıyı pasifleştirin" : "Sevkiyat izni için URL ve kimlik bilgisi gerekli"}
           </button>`;

      return `
        <article class="ih-integration-card">
          <div class="ih-card-top">
            <div class="ih-card-title">
              <h4>${escapeHtml(integration.name)}</h4>
              <span class="ih-muted">${escapeHtml(connectorNames.get(integration.connector_key) || integration.connector_key)}</span>
            </div>
            <span class="ih-status ih-status-${escapeHtml(integration.status)}">${escapeHtml(statusLabel(integration.status))}</span>
          </div>
          <div class="ih-meta-grid">
            <div><span>Sağlayıcı</span><strong>${escapeHtml(integration.provider_name || "Belirtilmedi")}</strong></div>
            <div><span>Kimlik doğrulama</span><strong>${escapeHtml(integration.auth_type || "—")}</strong></div>
            <div class="ih-meta-wide"><span>HTTPS adresi</span><strong class="ih-url">${escapeHtml(integration.base_url || "Belirtilmedi")}</strong></div>
            <div><span>Son bağlantı kontrolü</span><strong>${escapeHtml(formatDate(integration.last_test_at))}</strong></div>
            <div><span>Kimlik bilgisi</span><strong>${hasCredential ? "Güvenli kasada kayıtlı · değer gizli" : "Bağlı değil"}</strong></div>
          </div>
          ${integration.last_error ? `<p class="ih-card-error">${escapeHtml(integration.last_error)}</p>` : ""}
          ${testResultMarkup}
          <div class="ih-capability">
            <div>
              <strong>Sevkiyat gönderimi</strong>
              <span>${shipmentEnabled ? "İzin açık" : "İzin kapalı"}</span>
            </div>
            ${capabilityButton}
          </div>
          <div class="ih-card-actions">
            ${testForm}
            ${credentialForm}
            ${hasCredential
              ? `<button type="button" class="ih-button ih-button-danger"
                   data-action="detach-credential" data-integration-id="${id}"
                   ${busy ? "disabled" : ""}>Kimlik bilgisini kaldır</button>`
              : ""}
          </div>
          <p class="ih-card-footnote">
            Oluşturulma: ${escapeHtml(formatDate(integration.created_at))}
            ${busy ? " · Aktif/sınanıyor durumlarında hassas değişiklikler kilitlidir." : ""}
          </p>
        </article>`;
    }).join("");
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    refreshButton.disabled = true;
    setAlert("Entegrasyonlar yükleniyor…");

    try {
      state.accountId = await resolveAccountId();
      const data = await request(
        `/api/warehouse/integration-hub?accountId=${encodeURIComponent(state.accountId)}`
      );

      state.accountId = data.accountId || state.accountId;
      state.connectors = Array.isArray(data.connectors) ? data.connectors : [];
      state.integrations = Array.isArray(data.integrations) ? data.integrations : [];

      renderConnectorOptions();
      renderIntegrations();
      setAlert(
        `${state.integrations.length} bağlantı kaydı yüklendi.`,
        "success"
      );
    } catch (error) {
      createSubmit.disabled = true;
      setAlert(
        error instanceof Error ? error.message : "Entegrasyonlar yüklenemedi.",
        "error"
      );
      listNode.innerHTML =
        '<div class="ih-empty-state"><strong>Veriler alınamadı</strong><span>Oturumu ve erişim yetkinizi kontrol edip Yenile düğmesine basın.</span></div>';
    } finally {
      state.loading = false;
      refreshButton.disabled = false;
    }
  }

  async function postAction(action, value) {
    return request(
      `/api/warehouse/integration-hub?action=${encodeURIComponent(action)}`,
      {
        method: "POST",
        body: { value }
      }
    );
  }

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (createSubmit.disabled) return;

    const values = new FormData(createForm);
    const submitLabel = createSubmit.textContent;
    createSubmit.disabled = true;
    createSubmit.textContent = "Oluşturuluyor…";

    try {
      await postAction("create", {
        accountId: state.accountId,
        name: String(values.get("name") || "").trim(),
        providerName: String(values.get("providerName") || "").trim() || null,
        connectorKey: String(values.get("connectorKey") || ""),
        authType: String(values.get("authType") || "api_key"),
        baseUrl: String(values.get("baseUrl") || "").trim(),
        config: {}
      });

      createForm.reset();
      await load();
      setAlert("Entegrasyon taslağı oluşturuldu. Kimlik bilgisini kartından bağlayabilirsiniz.", "success");
    } catch (error) {
      setAlert(error instanceof Error ? error.message : "Taslak oluşturulamadı.", "error");
    } finally {
      createSubmit.textContent = submitLabel;
      renderConnectorOptions();
    }
  });

  listNode.addEventListener("submit", async (event) => {
    const form = event.target.closest(".ih-test-form");
    if (!form) return;
    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    if (!button || button.disabled) return;

    const integrationId = form.dataset.integrationId;
    const values = new FormData(form);
    const secret = String(values.get("secret") || "");

    if (!integrationId) return;

    button.disabled = true;
    button.textContent = "HEAD testi sürüyor…";

    try {
      const data = await postAction("test-connection", {
        integrationId,
        secret
      });

      form.reset();

      const result = data.connectionTest;
      if (!result) {
        throw new Error("API bağlantı testi sonucu döndürmedi.");
      }

      state.testResults.set(integrationId, result);
      await load();

      const details =
        `HTTP ${result.httpStatus ?? "yanıt yok"} · ${result.elapsedMs ?? 0} ms`;
      setAlert(
        `${result.ok ? "Bağlantı testi başarılı" : "Bağlantı testi başarısız"}: ${result.message} (${details}).`,
        result.ok ? "success" : "error"
      );
    } catch (error) {
      form.reset();
      setAlert(
        error instanceof Error
          ? error.message
          : "Bağlantı testi tamamlanamadı.",
        "error"
      );
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = "HEAD ile test et";
      }
    }
  });

  listNode.addEventListener("submit", async (event) => {
    const form = event.target.closest(".ih-credential-form");
    if (!form) return;
    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    const values = new FormData(form);
    const integrationId = form.dataset.integrationId;
    const secret = String(values.get("secret") || "");

    if (!secret || !integrationId) return;

    button.disabled = true;
    button.textContent = "Güvenli kasaya kaydediliyor…";

    try {
      await postAction("set-credential", {
        integrationId,
        secret,
        name: String(values.get("name") || "").trim() || null,
        description: String(values.get("description") || "").trim() || null
      });

      form.reset();
      await load();
      setAlert("Kimlik bilgisi güvenli kasaya kaydedildi; gizli değer tekrar gösterilmez.", "success");
    } catch (error) {
      form.reset();
      setAlert(error instanceof Error ? error.message : "Kimlik bilgisi kaydedilemedi.", "error");
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = "Güvenli kasaya kaydet";
      }
    }
  });

  listNode.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;

    const integrationId = button.dataset.integrationId;
    if (!integrationId) return;

    if (button.dataset.action === "detach-credential") {
      const approved = window.confirm(
        "Bu bağlantının güvenli kasadaki kimlik bilgisini kaldırmak istiyor musunuz?"
      );
      if (!approved) return;

      button.disabled = true;
      try {
        await postAction("detach-credential", { integrationId });
        await load();
        setAlert("Kimlik bilgisi kaldırıldı.", "success");
      } catch (error) {
        setAlert(error instanceof Error ? error.message : "Kimlik bilgisi kaldırılamadı.", "error");
      } finally {
        if (button.isConnected) button.disabled = false;
      }
      return;
    }

    if (button.dataset.action === "toggle-shipment") {
      const currentlyEnabled = button.dataset.enabled === "true";
      if (!currentlyEnabled) {
        const approved = window.confirm(
          "Bu izni açmak, bağlantı etkin olduğunda sevkiyat verilerinin harici sisteme gönderilmesine olanak verir. Devam etmek istiyor musunuz?"
        );
        if (!approved) return;
      }

      button.disabled = true;
      try {
        await postAction("set-capability", {
          integrationId,
          capabilityKey: "shipment.write",
          enabled: !currentlyEnabled
        });
        await load();
        setAlert(
          !currentlyEnabled ? "Sevkiyat gönderim izni açıldı." : "Sevkiyat gönderim izni kapatıldı.",
          "success"
        );
      } catch (error) {
        setAlert(error instanceof Error ? error.message : "Sevkiyat izni değiştirilemedi.", "error");
      } finally {
        if (button.isConnected) button.disabled = false;
      }
    }
  });

  refreshButton.addEventListener("click", () => void load());

  void load();
}
