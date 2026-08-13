let verificationContext =
  null;

let writePending =
  false;

function byId(
  id
) {
  return document.getElementById(
    id
  );
}

function text(
  value
) {
  return String(
    value ?? ""
  ).trim();
}

function formatQuantity(
  value
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      maximumFractionDigits:
        6
    }
  ).format(value);
}

function parseQuantity(
  value
) {
  const raw =
    text(value);

  if (!raw) {
    throw new Error(
      "Sayılan miktarı girin."
    );
  }

  const normalized =
    raw.replace(
      ",",
      "."
    );

  if (
    !/^\d+(?:\.\d+)?$/.test(
      normalized
    )
  ) {
    throw new Error(
      "Sayılan miktar geçerli bir sayı olmalıdır."
    );
  }

  const quantity =
    Number(normalized);

  if (
    !Number.isFinite(
      quantity
    ) ||
    quantity < 0
  ) {
    throw new Error(
      "Sayılan miktar sıfır veya daha büyük olmalıdır."
    );
  }

  return quantity;
}

function setStatus(
  message,
  state = "info"
) {
  const element =
    byId(
      "sayim-miktar-durumu"
    );

  if (!element) {
    return;
  }

  element.dataset.state =
    state;

  element.textContent =
    message;
}

function controls() {
  return {
    panel:
      byId(
        "sayim-miktar-kaydi"
      ),

    quantity:
      byId(
        "sayim-sayilan-miktar"
      ),

    notes:
      byId(
        "sayim-notu"
      ),

    button:
      byId(
        "sayim-miktari-kaydet"
      )
  };
}

function refreshButton() {
  const {
    quantity,
    button
  } =
    controls();

  if (!button) {
    return;
  }

  let valid =
    false;

  try {
    if (
      verificationContext &&
      quantity
    ) {
      parseQuantity(
        quantity.value
      );

      valid = true;
    }
  } catch {
    valid = false;
  }

  button.disabled =
    writePending ||
    !valid ||
    !verificationContext;
}

function resetQuantityPanel() {
  verificationContext =
    null;

  writePending =
    false;

  const {
    panel,
    quantity,
    notes,
    button
  } =
    controls();

  if (quantity) {
    quantity.value = "";
    quantity.disabled = true;
  }

  if (notes) {
    notes.value = "";
    notes.disabled = true;
  }

  if (button) {
    button.disabled = true;
  }

  if (panel) {
    panel.hidden = true;
  }

  setStatus(
    "Önce lokasyon ve ürün doğrulamasını tamamlayın.",
    "waiting"
  );
}

function prepareQuantityPanel(
  detail
) {
  verificationContext =
    Object.freeze({
      taskId:
        text(
          detail?.taskId
        ),

      cycleCountId:
        text(
          detail?.cycleCountId
        ),

      cycleCountItemId:
        text(
          detail
            ?.cycleCountItemId
        ),

      locationScan:
        text(
          detail?.locationScan
        ),

      productScan:
        text(
          detail?.productScan
        ),

      unit:
        text(
          detail?.unit
        ) || "birim",

      label:
        text(
          detail?.label
        )
    });

  writePending =
    false;

  const {
    panel,
    quantity,
    notes
  } =
    controls();

  if (panel) {
    panel.hidden = false;
  }

  if (quantity) {
    quantity.value = "";
    quantity.disabled = false;
  }

  if (notes) {
    notes.value = "";
    notes.disabled = false;
  }

  refreshButton();

  setStatus(
    "Fiziksel doğrulama tamamlandı. Sayılan miktarı girip açık onay verin.",
    "ready"
  );

  quantity?.focus();
}

export function buildQuantityConfirmation() {
  if (!verificationContext) {
    throw new Error(
      "Önce lokasyon ve ürün doğrulamasını tamamlayın."
    );
  }

  const {
    quantity,
    notes
  } =
    controls();

  const countedQuantity =
    parseQuantity(
      quantity?.value
    );

  return Object.freeze({
    cycleCountId:
      verificationContext
        .cycleCountId,

    cycleCountItemId:
      verificationContext
        .cycleCountItemId,

    taskId:
      verificationContext
        .taskId,

    countedQuantity,

    locationScan:
      verificationContext
        .locationScan,

    productScan:
      verificationContext
        .productScan,

    notes:
      text(
        notes?.value
      )
  });
}

function confirmQuantity() {
  if (writePending) {
    return;
  }

  const confirmation =
    buildQuantityConfirmation();

  const approved =
    window.confirm(
      `${formatQuantity(
        confirmation.countedQuantity
      )} ${
        verificationContext
          ?.unit || "birim"
      } fiziksel sayım miktarını kaydetmek istiyor musunuz?\n\nBu işlem yalnız ilk fiziksel sayım miktarını kaydeder. Stok bakiyesi, sayım farkı veya yeniden sayım kararı oluşturmaz.`
    );

  if (!approved) {
    return;
  }

  document.dispatchEvent(
    new CustomEvent(
      "warehouse:cycle-count-quantity-confirm",
      {
        detail:
          confirmation
      }
    )
  );
}

function bindQuantityUi() {
  const {
    quantity,
    notes,
    button
  } =
    controls();

  quantity?.addEventListener(
    "input",
    () => {
      refreshButton();
    }
  );

  notes?.addEventListener(
    "input",
    () => {
      refreshButton();
    }
  );

  button?.addEventListener(
    "click",
    () => {
      try {
        confirmQuantity();
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : "Sayım miktarı onayı hazırlanamadı.",
          "error"
        );
      }
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-verification-ready",
    (event) => {
      prepareQuantityPanel(
        event?.detail || {}
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-verification-reset",
    () => {
      resetQuantityPanel();
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-quantity-start",
    () => {
      writePending = true;

      const {
        quantity:
          quantityInput,
        notes:
          notesInput,
        button:
          confirmButton
      } =
        controls();

      if (quantityInput) {
        quantityInput.disabled =
          true;
      }

      if (notesInput) {
        notesInput.disabled =
          true;
      }

      if (confirmButton) {
        confirmButton.disabled =
          true;
      }

      setStatus(
        "Sayım miktarı güvenli bağlantı üzerinden kaydediliyor.",
        "loading"
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-quantity-success",
    (event) => {
      const confirmation =
        event?.detail
          ?.confirmation || {};

      writePending = false;

      resetQuantityPanel();

      document.dispatchEvent(
        new CustomEvent(
          "warehouse:cycle-count-quantity-recorded",
          {
            detail:
              Object.freeze({
                taskId:
                  confirmation
                    .taskId,

                data:
                  event?.detail
                    ?.data || null
              })
          }
        )
      );
    }
  );

  document.addEventListener(
    "warehouse:cycle-count-quantity-error",
    (event) => {
      writePending = false;

      const {
        quantity:
          quantityInput,
        notes:
          notesInput
      } =
        controls();

      if (
        verificationContext
      ) {
        if (quantityInput) {
          quantityInput.disabled =
            false;
        }

        if (notesInput) {
          notesInput.disabled =
            false;
        }
      }

      refreshButton();

      setStatus(
        event?.detail
          ?.message ||
          "Sayım miktarı kaydedilemedi.",
        "error"
      );
    }
  );

  resetQuantityPanel();
}

if (
  typeof document !==
  "undefined"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      bindQuantityUi();
    }
  );
}
