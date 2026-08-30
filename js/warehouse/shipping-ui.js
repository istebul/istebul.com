import {
  getWarehouseOperationsContext,
  getWarehouseSupabaseClient
} from "./operations-center.js";

import {
  canAcknowledgeAsn,
  canCancelAsn,
  canDispatchShipping,
  canRecordProofOfDelivery,
  canRejectAsn,
  canResolveException,
  canSendAsn,
  loadShippingContext,
  loadShippingOperations
} from "./shipping-lookup.js";

const MOUNT_ID = "sevkiyat-panel";

const state = {
  operations: [],
  selectedShippingId: null,
  context: null,
  pending: new Set(),
  message: null
};

function el(id) {
  return document.getElementById(id);
}

function dispatch(name, detail) {
  document.dispatchEvent(
    new CustomEvent(name, { detail })
  );
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]
  );
}

function statusLabel(status) {
  const labels = {
    draft: "Taslak",
    planned: "Planlandı",
    loading: "Yükleniyor",
    loaded: "Yüklendi",
    dispatched: "Araç Çıkışı Yapıldı",
    in_transit: "Yolda",
    partially_delivered: "Kısmi Teslim",
    delivered: "Teslim Edildi"
  };

  return labels[status] || status;
}

function setMessage(text, kind = "info") {
  state.message = { text, kind };
  renderMessage();
}

function renderMessage() {
  const host = el("sevkiyat-mesaj");
  if (!host) return;

  if (!state.message) {
    host.textContent = "";
    host.className = "sevkiyat-mesaj";
    return;
  }

  host.textContent = state.message.text;
  host.className = `sevkiyat-mesaj sevkiyat-mesaj--${state.message.kind}`;
}

function mount() {
  let host = el(MOUNT_ID);

  if (!host) {
    host = document.createElement("section");
    host.id = MOUNT_ID;
    document.body.appendChild(host);
  }

  host.innerHTML = `
    <div class="sevkiyat-panel">
      <h2>Sevkiyat</h2>
      <div id="sevkiyat-mesaj" class="sevkiyat-mesaj"></div>
      <div id="sevkiyat-liste"></div>
      <div id="sevkiyat-detay"></div>
    </div>
  `;

  return host;
}

async function refreshOperations() {
  const context = getWarehouseOperationsContext();

  if (!context?.accountId || !context?.warehouseId) {
    setMessage("Firma/depo kapsamı bulunamadı.", "error");
    return;
  }

  try {
    const client = getWarehouseSupabaseClient();

    state.operations = await loadShippingOperations({
      client,
      accountId: context.accountId,
      warehouseId: context.warehouseId
    });

    renderOperationsList();

    if (state.selectedShippingId) {
      await refreshSelectedContext();
    }
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Sevkiyat listesi yüklenemedi.",
      "error"
    );
  }
}

async function refreshSelectedContext() {
  const context = getWarehouseOperationsContext();

  if (!state.selectedShippingId || !context?.accountId || !context?.warehouseId) {
    return;
  }

  try {
    const client = getWarehouseSupabaseClient();

    state.context = await loadShippingContext({
      client,
      accountId: context.accountId,
      warehouseId: context.warehouseId,
      shippingId: state.selectedShippingId
    });

    renderDetail();
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : "Sevkiyat detayı yüklenemedi.",
      "error"
    );
  }
}

function selectShipping(id) {
  state.selectedShippingId = id;
  void refreshSelectedContext();
}

function renderOperationsList() {
  const host = el("sevkiyat-liste");
  if (!host) return;

  if (state.operations.length === 0) {
    host.innerHTML = "<p>Açık sevkiyat operasyonu bulunmuyor.</p>";
    return;
  }

  host.innerHTML = `
    <table class="sevkiyat-tablo">
      <thead>
        <tr>
          <th>Sevkiyat No</th>
          <th>Durum</th>
          <th>Öncelik</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${state.operations
          .map(
            (row) => `
          <tr data-shipping-id="${escapeHtml(row.id)}">
            <td>${escapeHtml(row.shipping_number || row.id)}</td>
            <td>${escapeHtml(statusLabel(row.status))}</td>
            <td>${escapeHtml(row.priority ?? "-")}</td>
            <td><button type="button" data-select-shipping="${escapeHtml(row.id)}">Detay</button></td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  host.querySelectorAll("[data-select-shipping]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectShipping(btn.getAttribute("data-select-shipping"));
    });
  });
}

function actionButton({ label, action, disabled, confirmText }) {
  return `<button type="button"
    data-action="${escapeHtml(action)}"
    ${disabled ? "disabled" : ""}
    data-confirm="${escapeHtml(confirmText || "")}"
  >${escapeHtml(label)}</button>`;
}

function renderDetail() {
  const host = el("sevkiyat-detay");
  if (!host || !state.context) {
    if (host) host.innerHTML = "";
    return;
  }

  const { shipping, asns, exceptions, unresolvedExceptions } = state.context;

  host.innerHTML = `
    <div class="sevkiyat-detay-panel">
      <h3>${escapeHtml(shipping.shipping_number || shipping.id)} — ${escapeHtml(statusLabel(shipping.status))}</h3>

      <div class="sevkiyat-eylemler">
        ${actionButton({
          label: "Araç Çıkışı Yap",
          action: "dispatch",
          disabled: !canDispatchShipping(shipping),
          confirmText: "Bu sevkiyatın araç çıkışı yapılsın mı?"
        })}
        ${actionButton({
          label: "Teslimat Kanıtı Kaydet",
          action: "record_proof_of_delivery",
          disabled: !canRecordProofOfDelivery(shipping)
        })}
      </div>

      <h4>ASN Kayıtları</h4>
      ${
        asns.length === 0
          ? "<p>ASN kaydı yok.</p>"
          : `<ul class="sevkiyat-asn-liste">
              ${asns
                .map(
                  (asn) => `
                <li data-asn-id="${escapeHtml(asn.id)}">
                  <span>${escapeHtml(asn.asn_number || asn.id)} — ${escapeHtml(statusLabel(asn.status))}</span>
                  ${actionButton({ label: "Gönder", action: "send_asn", disabled: !canSendAsn(asn) })}
                  ${actionButton({ label: "Alındı Onayla", action: "acknowledge_asn", disabled: !canAcknowledgeAsn(asn) })}
                  ${actionButton({ label: "Reddet", action: "reject_asn", disabled: !canRejectAsn(asn) })}
                  ${actionButton({ label: "İptal Et", action: "cancel_asn", disabled: !canCancelAsn(asn) })}
                </li>
              `
                )
                .join("")}
            </ul>`
      }

      <h4>Çözülmemiş İstisnalar (${unresolvedExceptions.length})</h4>
      ${
        unresolvedExceptions.length === 0
          ? "<p>Açık istisna yok.</p>"
          : `<ul class="sevkiyat-istisna-liste">
              ${unresolvedExceptions
                .map(
                  (exception) => `
                <li data-exception-id="${escapeHtml(exception.id)}">
                  <span>${escapeHtml(exception.type)} — ${escapeHtml(exception.message)}</span>
                  ${actionButton({ label: "Çöz", action: "resolve_exception", disabled: !canResolveException(exception) })}
                </li>
              `
                )
                .join("")}
            </ul>`
      }

      <h4>Yeni İstisna Bildir</h4>
      <button type="button" data-action="create_exception">İstisna Ekle</button>
    </div>
  `;

  wireDetailActions();
}

function promptFor(label) {
  return globalThis.prompt?.(label) || null;
}

function wireDetailActions() {
  const host = el("sevkiyat-detay");
  if (!host) return;

  host.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const asnId = btn.closest("[data-asn-id]")?.getAttribute("data-asn-id");
      const exceptionId = btn
        .closest("[data-exception-id]")
        ?.getAttribute("data-exception-id");
      const shippingId = state.context.shipping.id;

      const confirmText = btn.getAttribute("data-confirm");
      if (confirmText && globalThis.confirm?.(confirmText) !== true) {
        return;
      }

      switch (action) {
        case "dispatch": {
          const dispatchedBy = promptFor("Araç çıkışını yapan kullanıcı adı:");
          if (!dispatchedBy) return;
          dispatch("warehouse:shipping-dispatch-confirm", {
            shippingId,
            dispatchedBy
          });
          break;
        }

        case "send_asn":
          dispatch("warehouse:shipping-send-asn-confirm", { shippingId, asnId });
          break;

        case "acknowledge_asn":
          dispatch("warehouse:shipping-acknowledge-asn-confirm", {
            shippingId,
            asnId
          });
          break;

        case "reject_asn": {
          const rejectionReason = promptFor("ASN ret nedeni:");
          if (!rejectionReason) return;
          dispatch("warehouse:shipping-reject-asn-confirm", {
            shippingId,
            asnId,
            rejectionReason
          });
          break;
        }

        case "cancel_asn": {
          const cancellationReason = promptFor("İptal nedeni (opsiyonel):");
          dispatch("warehouse:shipping-cancel-asn-confirm", {
            shippingId,
            asnId,
            ...(cancellationReason ? { cancellationReason } : {})
          });
          break;
        }

        case "record_proof_of_delivery": {
          const recipientName = promptFor("Teslim alan kişi:");
          if (!recipientName) return;
          const capturedBy = promptFor("Kaydeden kullanıcı:");
          if (!capturedBy) return;
          dispatch("warehouse:shipping-record-proof-of-delivery-confirm", {
            shippingId,
            recipientName,
            capturedBy
          });
          break;
        }

        case "resolve_exception": {
          const resolvedBy = promptFor("Çözen kullanıcı:");
          if (!resolvedBy) return;
          const resolutionNotes = promptFor("Çözüm açıklaması:");
          if (!resolutionNotes) return;
          dispatch("warehouse:shipping-resolve-exception-confirm", {
            shippingId,
            exceptionId,
            resolvedBy,
            resolutionNotes
          });
          break;
        }

        case "create_exception": {
          const type = promptFor(
            "İstisna türü (örn. package_missing, dispatch_blocked):"
          );
          if (!type) return;
          const message = promptFor("İstisna açıklaması:");
          if (!message) return;
          dispatch("warehouse:shipping-create-exception-confirm", {
            shippingId,
            type,
            message
          });
          break;
        }

        default:
          break;
      }
    });
  });
}

function setPending(action, isPending) {
  if (isPending) {
    state.pending.add(action);
  } else {
    state.pending.delete(action);
  }

  const host = el("sevkiyat-detay");
  if (!host) return;

  host.querySelectorAll(`[data-action="${action}"]`).forEach((btn) => {
    btn.toggleAttribute("data-pending", isPending);
    btn.disabled = isPending || btn.disabled;
  });
}

const ACTIONS = [
  "send-asn",
  "acknowledge-asn",
  "reject-asn",
  "cancel-asn",
  "dispatch",
  "record-proof-of-delivery",
  "create-exception",
  "resolve-exception"
];

function wireControllerEvents() {
  ACTIONS.forEach((kebabAction) => {
    const action = kebabAction.replace(/-/g, "_");

    document.addEventListener(`warehouse:shipping-${kebabAction}-start`, () => {
      setPending(action, true);
      setMessage("İşleniyor...", "info");
    });

    document.addEventListener(`warehouse:shipping-${kebabAction}-success`, () => {
      setPending(action, false);
      setMessage("İşlem tamamlandı.", "success");
      void refreshOperations();
    });

    document.addEventListener(`warehouse:shipping-${kebabAction}-error`, (event) => {
      setPending(action, false);
      setMessage(
        event.detail?.message || "İşlem başarısız oldu.",
        "error"
      );
    });
  });
}

async function init() {
  mount();
  wireControllerEvents();
  await refreshOperations();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void init());
  } else {
    void init();
  }
}
