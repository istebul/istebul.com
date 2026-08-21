import {
  getWarehouseOperationsContext,
  getWarehouseSupabaseClient
} from "./operations-center.js";

import {
  canCancelPacking,
  canCompletePacking,
  canMarkPackingShippingReady,
  expectedPackingLot,
  expectedPackingSerial,
  isPackingConfirmable,
  isPackingPackageLabelable,
  isPackingPackageOpen,
  isPackingPackageSealable,
  loadPackingContext,
  loadPackingCreationOptions,
  loadPackingOperations,
  packingRemainingQuantity,
  resolvePackingBarcode
} from "./packing-lookup.js";

const state = {
  context:
    null,
  barcode:
    null
};

function byId(id) {
  return document.getElementById(id);
}

function text(value) {
  return String(
    value ?? ""
  ).trim();
}

function number(value) {
  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : 0;
}

function message(
  value,
  kind = "info"
) {
  const target =
    byId(
      "paketleme-mesaji"
    );

  if (!target) return;

  target.dataset.state =
    kind;

  target.textContent =
    value;
}

function creationMessage(
  value,
  kind = "info"
) {
  const target =
    byId(
      "paketleme-olusturma-mesaji"
    );

  if (!target) return;

  target.dataset.state =
    kind;

  target.textContent =
    value;
}

function selected(
  id,
  rows
) {
  const value =
    text(
      byId(id)?.value
    );

  return (
    rows?.find(
      (row) =>
        row.id === value
    ) ||
    null
  );
}

function optionList(
  target,
  rows,
  empty,
  label
) {
  if (!target) return;

  const previous =
    target.value;

  target.replaceChildren();

  const first =
    document.createElement(
      "option"
    );

  first.value = "";
  first.textContent =
    empty;

  target.append(first);

  for (const row of rows) {
    const option =
      document.createElement(
        "option"
      );

    option.value =
      row.id;

    option.textContent =
      label(row);

    target.append(option);
  }

  if (
    previous &&
    rows.some(
      (row) =>
        row.id === previous
    )
  ) {
    target.value =
      previous;
  }

  target.disabled =
    rows.length === 0;
}

function resetBarcode() {
  state.barcode = null;

  const input =
    byId(
      "paketleme-barkod"
    );

  if (input) {
    input.value = "";
  }

  const result =
    byId(
      "paketleme-barkod-eslesmesi"
    );

  if (result) {
    result.hidden = true;
    result.textContent = "";
  }
}

function selectedItem() {
  return selected(
    "paketleme-satiri-secimi",
    state.context?.items
  );
}

function selectedPackage() {
  return selected(
    "paketleme-paket-secimi",
    state.context?.packages
  );
}


function lifecycleMessage(
  value,
  kind = "info"
) {
  const target =
    byId(
      "paketleme-yasam-mesaji"
    );

  if (!target) return;

  target.dataset.state =
    kind;

  target.textContent =
    value;
}

function selectedLifecyclePackage() {
  return selected(
    "paketleme-yasam-paket-secimi",
    state.context?.packages
  );
}

function selectedException() {
  return selected(
    "paketleme-istisna-secimi",
    state.context
      ?.unresolvedExceptions
  );
}

function refreshLifecycleControls() {
  const context =
    state.context;

  const packingPackage =
    selectedLifecyclePackage();

  const exception =
    selectedException();

  const sealable =
    isPackingPackageSealable(
      packingPackage
    );

  const labelable =
    isPackingPackageLabelable(
      packingPackage
    );

  for (const id of [
    "paketleme-muhur-no",
    "paketleme-gercek-agirlik",
    "paketleme-gercek-hacim"
  ]) {
    const element =
      byId(id);

    if (element) {
      element.disabled =
        !sealable;
    }
  }

  for (const id of [
    "paketleme-etiket-formati",
    "paketleme-yazici-kimligi"
  ]) {
    const element =
      byId(id);

    if (element) {
      element.disabled =
        !labelable;
    }
  }

  const seal =
    byId(
      "paketleme-muhurle"
    );

  if (seal) {
    seal.disabled =
      !sealable;
  }

  const label =
    byId(
      "paketleme-etiket-uret"
    );

  if (label) {
    label.disabled =
      !labelable;
  }

  const resolution =
    byId(
      "paketleme-istisna-cozum-notu"
    );

  if (resolution) {
    resolution.disabled =
      !exception;
  }

  const resolve =
    byId(
      "paketleme-istisna-coz"
    );

  if (resolve) {
    resolve.disabled =
      !exception;
  }

  const complete =
    byId(
      "paketleme-tamamla"
    );

  if (complete) {
    complete.disabled =
      !canCompletePacking(
        context
      );
  }

  const shippingReady =
    byId(
      "paketleme-sevkiyata-hazir"
    );

  if (shippingReady) {
    shippingReady.disabled =
      !canMarkPackingShippingReady(
        context
      );
  }

  const cancel =
    byId(
      "paketleme-iptal"
    );

  const cancellationReason =
    byId(
      "paketleme-iptal-nedeni"
    );

  const cancellable =
    canCancelPacking(
      context
    );

  if (cancel) {
    cancel.disabled =
      !cancellable;
  }

  if (cancellationReason) {
    cancellationReason.disabled =
      !cancellable;
  }
}


function selectedLedgerLabel() {
  return selected(
    "paketleme-ledger-etiket-secimi",
    state.context?.labels
  );
}

function ledgerValue(id) {
  return text(
    byId(id)?.value
  );
}

function refreshLabelLedgerControls() {
  const context =
    state.context;

  const packing =
    context?.packing;

  const label =
    selectedLedgerLabel();

  const packingAvailable =
    Boolean(
      packing?.id
    );

  const selector =
    byId(
      "paketleme-ledger-etiket-secimi"
    );

  if (selector) {
    selector.disabled =
      !packingAvailable ||
      !(context?.labels || []).length;
  }

  for (const id of [
    "paketleme-ledger-tur",
    "paketleme-ledger-format",
    "paketleme-ledger-barkod",
    "paketleme-ledger-sscc",
    "paketleme-ledger-yazici",
    "paketleme-ledger-icerik",
    "paketleme-ledger-hata-nedeni"
  ]) {
    const element =
      byId(id);

    if (element) {
      element.disabled =
        !packingAvailable;
    }
  }

  const actions = [
    [
      "paketleme-ledger-olustur",
      packingAvailable
    ],
    [
      "paketleme-ledger-uret",
      Boolean(label?.id)
    ],
    [
      "paketleme-ledger-yazdirildi",
      Boolean(label?.id)
    ],
    [
      "paketleme-ledger-basarisiz",
      Boolean(label?.id)
    ],
    [
      "paketleme-ledger-iptal",
      Boolean(label?.id)
    ]
  ];

  for (const [
    id,
    enabled
  ] of actions) {
    const button =
      byId(id);

    if (button) {
      button.disabled =
        !enabled;
    }
  }
}

function renderLabelLedgerControls(
  context
) {
  optionList(
    byId(
      "paketleme-ledger-etiket-secimi"
    ),
    context?.labels || [],
    "Etiket bulunmuyor",
    (row) =>
      `${row.label_number || row.id} · ${row.type || "etiket"} · ${row.status}`
  );

  refreshLabelLedgerControls();
}


function renderLifecycleControls(
  context
) {
  renderLabelLedgerControls(
    context
  );

  optionList(
    byId(
      "paketleme-yasam-paket-secimi"
    ),
    context?.packages || [],
    "Paket bulunmuyor",
    (row) =>
      `${row.package_number || row.id} · ${row.status}`
  );

  optionList(
    byId(
      "paketleme-istisna-secimi"
    ),
    context
      ?.unresolvedExceptions ||
      [],
    "Çözülmemiş istisna yok",
    (row) =>
      `${row.type || "İstisna"} · ${row.message || row.id}`
  );

  refreshLifecycleControls();

  if (
    canMarkPackingShippingReady(
      context
    )
  ) {
    lifecycleMessage(
      "Paketleme tamamlandı. Sevkiyata hazır geçişi yapılabilir.",
      "ready"
    );
  } else if (
    canCompletePacking(
      context
    )
  ) {
    lifecycleMessage(
      "Tüm satırlar ve istisnalar hazır. Paketleme tamamlanabilir.",
      "ready"
    );
  } else if (
    context
      ?.unresolvedExceptions
      ?.length
  ) {
    lifecycleMessage(
      `${context.unresolvedExceptions.length} çözülmemiş istisna var.`,
      "warning"
    );
  } else {
    lifecycleMessage(
      "Paket durumlarını kontrol ederek yaşam döngüsü adımlarını ilerletin.",
      "info"
    );
  }
}

function refreshConfirmButton() {
  const button =
    byId(
      "paketleme-onayla"
    );

  if (!button) return;

  const item =
    selectedItem();

  const packingPackage =
    selectedPackage();

  const total =
    number(
      byId(
        "paketleme-miktar"
      )?.value
    ) +
    number(
      byId(
        "paketleme-hasarli-miktar"
      )?.value
    ) +
    number(
      byId(
        "paketleme-eksik-miktar"
      )?.value
    );

  button.disabled =
    !isPackingConfirmable(
      state.context?.packing
    ) ||
    !item ||
    !isPackingPackageOpen(
      packingPackage
    ) ||
    !state.barcode ||
    total <= 0 ||
    total >
      packingRemainingQuantity(
        item
      ) +
      0.0000001;
}

function prepareItem() {
  resetBarcode();

  const item =
    selectedItem();

  const remaining =
    packingRemainingQuantity(
      item
    );

  for (const id of [
    "paketleme-miktar",
    "paketleme-hasarli-miktar",
    "paketleme-eksik-miktar",
    "paketleme-lot-no",
    "paketleme-seri-no",
    "paketleme-notu"
  ]) {
    const input =
      byId(id);

    if (input) {
      input.disabled =
        !item ||
        remaining <= 0;
    }
  }

  for (const id of [
    "paketleme-miktar",
    "paketleme-hasarli-miktar",
    "paketleme-eksik-miktar"
  ]) {
    const input =
      byId(id);

    if (input) {
      input.value = "0";

      if (item) {
        input.max =
          String(remaining);
      }
    }
  }

  refreshConfirmButton();

  if (item) {
    message(
      `Satır seçildi. Kalan miktar: ${remaining}. Ürün / SKU barkodunu okutun.`,
      "ready"
    );
  }
}

export async function loadPackingOptions() {
  const context =
    getWarehouseOperationsContext();

  const target =
    byId(
      "paketleme-secimi"
    );

  if (
    !context?.accountId ||
    !context?.warehouseId ||
    !target
  ) {
    return;
  }

  try {
    const rows =
      await loadPackingOperations({
        client:
          getWarehouseSupabaseClient(),

        accountId:
          context.accountId,

        warehouseId:
          context.warehouseId
      });

    optionList(
      target,
      rows,
      "Paketleme operasyonu seçin",
      (row) =>
        `${row.packing_number || row.id} · ${row.status}`
    );

    message(
      rows.length
        ? "Paketleme operasyonu seçin."
        : "Aktif paketleme operasyonu bulunmuyor.",
      rows.length
        ? "ready"
        : "info"
    );
  } catch (error) {
    message(
      error instanceof Error
        ? error.message
        : "Paketleme operasyonları yüklenemedi.",
      "error"
    );
  }
}

async function loadCreationOptions() {
  const context =
    getWarehouseOperationsContext();

  if (
    !context?.accountId ||
    !context?.warehouseId
  ) {
    return;
  }

  try {
    const result =
      await loadPackingCreationOptions({
        client:
          getWarehouseSupabaseClient(),

        accountId:
          context.accountId,

        warehouseId:
          context.warehouseId
      });

    optionList(
      byId(
        "paketleme-toplama-secimi"
      ),
      result.pickings,
      "Tamamlanmış toplama seçin",
      (row) =>
        row.picking_number ||
        row.id
    );

    for (const id of [
      "paketleme-lokasyon-secimi",
      "paketleme-sevkiyat-lokasyon-secimi"
    ]) {
      optionList(
        byId(id),
        result.locations,
        id ===
          "paketleme-lokasyon-secimi"
          ? "Paketleme lokasyonu seçin"
          : "Sevkiyat lokasyonu seçilmedi",
        (row) =>
          row.code ||
          row.id
      );
    }

    const button =
      byId(
        "paketleme-olustur"
      );

    if (button) {
      button.disabled =
        result.pickings.length ===
          0 ||
        result.locations.length ===
          0;
    }

    creationMessage(
      result.pickings.length
        ? "Paketlemeye aktarılabilecek tamamlanmış toplama kayıtları hazır."
        : "Paketlemeye aktarılabilecek tamamlanmış toplama bulunmuyor.",
      result.pickings.length
        ? "ready"
        : "info"
    );
  } catch (error) {
    creationMessage(
      error instanceof Error
        ? error.message
        : "Paketleme oluşturma seçenekleri yüklenemedi.",
      "error"
    );
  }
}

async function loadSelectedPacking() {
  const operations =
    getWarehouseOperationsContext();

  const packingId =
    text(
      byId(
        "paketleme-secimi"
      )?.value
    );

  state.context = null;
  resetBarcode();

  if (
    !operations?.accountId ||
    !operations?.warehouseId ||
    !packingId
  ) {
    return;
  }

  try {
    const result =
      await loadPackingContext({
        client:
          getWarehouseSupabaseClient(),

        accountId:
          operations.accountId,

        warehouseId:
          operations.warehouseId,

        packingId
      });

    if (!result) {
      throw new Error(
        "Paketleme operasyonu bulunamadı."
      );
    }

    state.context =
      result;

    renderLifecycleControls(
      result
    );

    optionList(
      byId(
        "paketleme-satiri-secimi"
      ),
      result.remainingItems,
      "Paketlenecek satırı seçin",
      (row) =>
        `Satır ${row.line_number} · Kalan ${row.remaining_quantity} ${row.unit || ""}`
    );

    optionList(
      byId(
        "paketleme-ambalaj-secimi"
      ),
      result.containers,
      "Ambalaj seçin",
      (row) =>
        `${row.code} · ${row.name}`
    );

    optionList(
      byId(
        "paketleme-paket-secimi"
      ),
      result.openPackages,
      "Açık paket seçin",
      (row) =>
        `${row.package_number} · ${row.status}`
    );

    const createPackage =
      byId(
        "paketleme-paket-olustur"
      );

    if (createPackage) {
      createPackage.disabled =
        result.containers.length ===
          0;
    }

    if (
      !isPackingConfirmable(
        result.packing
      )
    ) {
      message(
        "Ürün onayı yalnız in_progress veya partially_packed paketlemelerde kullanılabilir. Yaşam döngüsü geçişi bu dilimin dışındadır.",
        "warning"
      );
    } else if (
      result.openPackages.length ===
      0
    ) {
      message(
        "Ürün onayından önce ambalaj seçip açık paket oluşturun.",
        "warning"
      );
    } else {
      message(
        "Satır, açık paket ve ürün barkodunu doğrulayın.",
        "ready"
      );
    }
  } catch (error) {
    message(
      error instanceof Error
        ? error.message
        : "Paketleme ayrıntıları yüklenemedi.",
      "error"
    );
  }
}

async function verifyBarcode(value) {
  const operations =
    getWarehouseOperationsContext();

  const item =
    selectedItem();

  const packingId =
    state.context?.packing?.id;

  if (
    !operations?.accountId ||
    !packingId ||
    !item
  ) {
    return;
  }

  const input =
    byId(
      "paketleme-barkod"
    );

  if (input) {
    input.value =
      value;
  }

  try {
    const result =
      await resolvePackingBarcode({
        client:
          getWarehouseSupabaseClient(),

        accountId:
          operations.accountId,

        packingId,

        packingItemId:
          item.id,

        barcodeValue:
          value
      });

    if (
      result.status !==
      "matched"
    ) {
      state.barcode = null;

      message(
        result.message ||
          "Barkod eşleşmedi.",
        "error"
      );

      refreshConfirmButton();
      return;
    }

    state.barcode =
      result;

    const display =
      byId(
        "paketleme-barkod-eslesmesi"
      );

    if (display) {
      display.hidden = false;
      display.textContent =
        `Barkod doğrulandı · Kalan ${result.remainingQuantity}`;
    }

    const quantityInput =
      byId(
        "paketleme-miktar"
      );

    if (
      quantityInput &&
      number(
        quantityInput.value
      ) === 0
    ) {
      quantityInput.value =
        String(
          Math.min(
            1,
            result.remainingQuantity
          )
        );
    }

    message(
      "Barkod doğrulandı. Miktarları kontrol edip açık kullanıcı onayı verin.",
      "success"
    );

    refreshConfirmButton();
  } catch (error) {
    state.barcode = null;

    message(
      error instanceof Error
        ? error.message
        : "Barkod doğrulanamadı.",
      "error"
    );

    refreshConfirmButton();
  }
}

function buildConfirmation() {
  const packing =
    state.context?.packing;

  const item =
    selectedItem();

  const packingPackage =
    selectedPackage();

  if (
    !isPackingConfirmable(
      packing
    ) ||
    !item ||
    !isPackingPackageOpen(
      packingPackage
    ) ||
    !state.barcode
  ) {
    throw new Error(
      "Paketleme, satır, açık paket ve barkod doğrulaması tamamlanmalıdır."
    );
  }

  const quantity =
    number(
      byId(
        "paketleme-miktar"
      )?.value
    );

  const damagedQuantity =
    number(
      byId(
        "paketleme-hasarli-miktar"
      )?.value
    );

  const missingQuantity =
    number(
      byId(
        "paketleme-eksik-miktar"
      )?.value
    );

  const total =
    quantity +
    damagedQuantity +
    missingQuantity;

  const remaining =
    packingRemainingQuantity(
      item
    );

  if (
    total <= 0 ||
    quantity < 0 ||
    damagedQuantity < 0 ||
    missingQuantity < 0 ||
    total >
      remaining + 0.0000001
  ) {
    throw new Error(
      "Paketleme miktarları kalan miktarla uyumlu değil."
    );
  }

  const lotNumber =
    text(
      byId(
        "paketleme-lot-no"
      )?.value
    );

  const serialNumber =
    text(
      byId(
        "paketleme-seri-no"
      )?.value
    );

  const expectedLot =
    expectedPackingLot(
      item
    );

  const expectedSerial =
    expectedPackingSerial(
      item
    );

  if (
    expectedLot &&
    lotNumber !== expectedLot
  ) {
    throw new Error(
      `Lot numarası eşleşmiyor. Beklenen: ${expectedLot}`
    );
  }

  if (
    expectedSerial &&
    serialNumber !==
      expectedSerial
  ) {
    throw new Error(
      `Seri numarası eşleşmiyor. Beklenen: ${expectedSerial}`
    );
  }

  const notes =
    text(
      byId(
        "paketleme-notu"
      )?.value
    );

  return {
    packingId:
      packing.id,

    packingItemId:
      item.id,

    packageId:
      packingPackage.id,

    quantity,
    damagedQuantity,
    missingQuantity,

    barcode:
      state.barcode.scanned,

    ...(lotNumber
      ? { lotNumber }
      : {}),

    ...(serialNumber
      ? { serialNumber }
      : {}),

    ...(notes
      ? { notes }
      : {})
  };
}

function dispatch(
  name,
  detail
) {
  document.dispatchEvent(
    new CustomEvent(
      name,
      {
        detail
      }
    )
  );
}

function setup() {
  document.addEventListener(
    "warehouse:operations-context",
    () => {
      state.context = null;
      state.barcode = null;

      void loadPackingOptions();
      void loadCreationOptions();
    }
  );

  document.addEventListener(
    "warehouse:barcode-scan",
    (event) => {
      const value =
        text(
          event?.detail?.value
        );

      if (!value) {
        return;
      }

      void verifyBarcode(
        value
      );
    }
  );

  byId(
    "paketleme-secimi"
  )?.addEventListener(
    "change",
    () => {
      void loadSelectedPacking();
    }
  );

  byId(
    "paketleme-satiri-secimi"
  )?.addEventListener(
    "change",
    prepareItem
  );

  byId(
    "paketleme-paket-secimi"
  )?.addEventListener(
    "change",
    refreshConfirmButton
  );

  for (const id of [
    "paketleme-miktar",
    "paketleme-hasarli-miktar",
    "paketleme-eksik-miktar",
    "paketleme-lot-no",
    "paketleme-seri-no"
  ]) {
    byId(id)?.addEventListener(
      "input",
      refreshConfirmButton
    );
  }

  byId(
    "paketleme-olustur"
  )?.addEventListener(
    "click",
    () => {
      const pickingId =
        text(
          byId(
            "paketleme-toplama-secimi"
          )?.value
        );

      const packingLocationId =
        text(
          byId(
            "paketleme-lokasyon-secimi"
          )?.value
        );

      const shippingLocationId =
        text(
          byId(
            "paketleme-sevkiyat-lokasyon-secimi"
          )?.value
        );

      if (
        !pickingId ||
        !packingLocationId
      ) {
        creationMessage(
          "Toplama ve paketleme lokasyonu seçilmelidir.",
          "error"
        );
        return;
      }

      if (
        globalThis.confirm?.(
          "Seçilen tamamlanmış toplama kaydından paketleme oluşturulsun mu?"
        ) !== true
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-create-from-picking-confirm",
        {
          pickingId,
          packingLocationId,

          ...(shippingLocationId
            ? {
                shippingLocationId
              }
            : {}),

          strategy:
            "cartonization"
        }
      );
    }
  );

  byId(
    "paketleme-paket-olustur"
  )?.addEventListener(
    "click",
    () => {
      const packingId =
        state.context
          ?.packing?.id;

      const containerId =
        text(
          byId(
            "paketleme-ambalaj-secimi"
          )?.value
        );

      if (
        !packingId ||
        !containerId
      ) {
        message(
          "Paketleme ve ambalaj seçilmelidir.",
          "error"
        );
        return;
      }

      if (
        globalThis.confirm?.(
          "Seçilen ambalaj ile açık paket oluşturulsun mu?"
        ) !== true
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-create-package-confirm",
        {
          packingId,
          containerId
        }
      );
    }
  );


  byId(
    "paketleme-yasam-paket-secimi"
  )?.addEventListener(
    "change",
    refreshLifecycleControls
  );

  byId(
    "paketleme-istisna-secimi"
  )?.addEventListener(
    "change",
    refreshLifecycleControls
  );

  byId(
    "paketleme-muhurle"
  )?.addEventListener(
    "click",
    () => {
      const packing =
        state.context?.packing;

      const packingPackage =
        selectedLifecyclePackage();

      if (
        !packing ||
        !isPackingPackageSealable(
          packingPackage
        )
      ) {
        lifecycleMessage(
          "Mühürlenebilir açık paket seçilmelidir.",
          "error"
        );
        return;
      }

      const sealNumber =
        text(
          byId(
            "paketleme-muhur-no"
          )?.value
        );

      const weightText =
        text(
          byId(
            "paketleme-gercek-agirlik"
          )?.value
        );

      const volumeText =
        text(
          byId(
            "paketleme-gercek-hacim"
          )?.value
        );

      if (
        globalThis.confirm?.(
          "Seçili paket mühürlensin mi? Bu işlem açık kullanıcı onayıyla kaydedilecektir."
        ) !== true
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-seal-package-confirm",
        {
          packingId:
            packing.id,

          packageId:
            packingPackage.id,

          ...(sealNumber
            ? { sealNumber }
            : {}),

          ...(weightText
            ? {
                actualWeight:
                  Number(
                    weightText
                  )
              }
            : {}),

          ...(volumeText
            ? {
                actualVolume:
                  Number(
                    volumeText
                  )
              }
            : {})
        }
      );
    }
  );

  byId(
    "paketleme-etiket-uret"
  )?.addEventListener(
    "click",
    () => {
      const packing =
        state.context?.packing;

      const packingPackage =
        selectedLifecyclePackage();

      if (
        !packing ||
        !isPackingPackageLabelable(
          packingPackage
        )
      ) {
        lifecycleMessage(
          "Etiket üretmek için mühürlenmiş paket seçilmelidir.",
          "error"
        );
        return;
      }

      const format =
        text(
          byId(
            "paketleme-etiket-formati"
          )?.value
        ) ||
        "zpl";

      const printerId =
        text(
          byId(
            "paketleme-yazici-kimligi"
          )?.value
        );

      if (
        globalThis.confirm?.(
          "Seçili mühürlenmiş paket için paket etiketi üretilecek. Devam edilsin mi?"
        ) !== true
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-generate-package-label-confirm",
        {
          packingId:
            packing.id,

          packageId:
            packingPackage.id,

          format,

          ...(printerId
            ? { printerId }
            : {})
        }
      );
    }
  );

  byId(
    "paketleme-istisna-coz"
  )?.addEventListener(
    "click",
    () => {
      const packing =
        state.context?.packing;

      const exception =
        selectedException();

      if (
        !packing ||
        !exception
      ) {
        lifecycleMessage(
          "Çözülmemiş istisna seçilmelidir.",
          "error"
        );
        return;
      }

      const resolutionNotes =
        text(
          byId(
            "paketleme-istisna-cozum-notu"
          )?.value
        );

      if (
        globalThis.confirm?.(
          "Seçili paketleme istisnası çözüldü olarak işaretlensin mi?"
        ) !== true
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-resolve-exception-confirm",
        {
          packingId:
            packing.id,

          exceptionId:
            exception.id,

          ...(resolutionNotes
            ? { resolutionNotes }
            : {})
        }
      );
    }
  );

  byId(
    "paketleme-tamamla"
  )?.addEventListener(
    "click",
    () => {
      const context =
        state.context;

      if (
        !canCompletePacking(
          context
        )
      ) {
        lifecycleMessage(
          "Paketleme tamamlanmaya hazır değil.",
          "error"
        );
        return;
      }

      if (
        globalThis.confirm?.(
          "Tüm satırlar işlendi ve paketler kapatıldı. Paketleme tamamlanıp packed durumuna geçirilsin mi?"
        ) !== true
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-complete-confirm",
        {
          packingId:
            context.packing.id
        }
      );
    }
  );

  byId(
    "paketleme-sevkiyata-hazir"
  )?.addEventListener(
    "click",
    () => {
      const context =
        state.context;

      if (
        !canMarkPackingShippingReady(
          context
        )
      ) {
        lifecycleMessage(
          "Paketleme sevkiyata hazır geçişine uygun değil.",
          "error"
        );
        return;
      }

      if (
        globalThis.confirm?.(
          "Paketleme sevkiyata hazır durumuna geçirilsin mi? Bu işlem Shipping kaydı oluşturmaz."
        ) !== true
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-shipping-ready-confirm",
        {
          packingId:
            context.packing.id
        }
      );
    }
  );

  byId(
    "paketleme-iptal"
  )?.addEventListener(
    "click",
    () => {
      const context =
        state.context;

      if (
        !canCancelPacking(
          context
        )
      ) {
        lifecycleMessage(
          "Bu paketleme doğrudan iptal edilemez.",
          "error"
        );
        return;
      }

      const reason =
        text(
          byId(
            "paketleme-iptal-nedeni"
          )?.value
        );

      if (!reason) {
        lifecycleMessage(
          "İptal nedeni zorunludur.",
          "error"
        );
        return;
      }

      if (
        globalThis.confirm?.(
          "Paketleme operasyonu iptal edilsin mi? Bu işlem açık kullanıcı onayı gerektirir."
        ) !== true
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-cancel-confirm",
        {
          packingId:
            context.packing.id,
          reason
        }
      );
    }
  );

  byId(
    "paketleme-onayla"
  )?.addEventListener(
    "click",
    () => {
      try {
        const confirmation =
          buildConfirmation();

        if (
          globalThis.confirm?.(
            "Bu ürün ve miktarlar seçili pakete kaydedilsin mi?"
          ) !== true
        ) {
          return;
        }

        dispatch(
          "warehouse:packing-confirm",
          confirmation
        );
      } catch (error) {
        message(
          error instanceof Error
            ? error.message
            : "Paketleme onayı hazırlanamadı.",
          "error"
        );
      }
    }
  );

  document.addEventListener(
    "warehouse:packing-create-from-picking-success",
    () => {
      creationMessage(
        "Paketleme operasyonu oluşturuldu.",
        "success"
      );

      void loadPackingOptions();
      void loadCreationOptions();
    }
  );

  document.addEventListener(
    "warehouse:packing-create-from-picking-error",
    (event) => {
      creationMessage(
        event?.detail?.message ||
          "Paketleme oluşturulamadı.",
        "error"
      );
    }
  );

  document.addEventListener(
    "warehouse:packing-create-package-success",
    () => {
      message(
        "Açık paket oluşturuldu.",
        "success"
      );

      void loadSelectedPacking();
    }
  );

  document.addEventListener(
    "warehouse:packing-create-package-error",
    (event) => {
      message(
        event?.detail?.message ||
          "Paket oluşturulamadı.",
        "error"
      );
    }
  );


  for (const [
    eventName,
    successMessage
  ] of [
    [
      "warehouse:packing-seal-package-success",
      "Paket mühürlendi."
    ],
    [
      "warehouse:packing-generate-package-label-success",
      "Paket etiketi üretildi."
    ],
    [
      "warehouse:packing-resolve-exception-success",
      "Paketleme istisnası çözüldü."
    ],
    [
      "warehouse:packing-complete-success",
      "Paketleme tamamlandı."
    ],
    [
      "warehouse:packing-shipping-ready-success",
      "Paketleme sevkiyata hazır durumuna geçirildi."
    ],
    [
      "warehouse:packing-cancel-success",
      "Paketleme iptal edildi."
    ]
  ]) {
    document.addEventListener(
      eventName,
      () => {
        lifecycleMessage(
          successMessage,
          "success"
        );

        void loadPackingOptions();
        void loadSelectedPacking();
      }
    );
  }

  for (const eventName of [
    "warehouse:packing-seal-package-error",
    "warehouse:packing-generate-package-label-error",
    "warehouse:packing-resolve-exception-error",
    "warehouse:packing-complete-error",
    "warehouse:packing-shipping-ready-error",
    "warehouse:packing-cancel-error"
  ]) {
    document.addEventListener(
      eventName,
      (event) => {
        lifecycleMessage(
          event?.detail?.message ||
            "Paketleme yaşam döngüsü işlemi tamamlanamadı.",
          "error"
        );

        refreshLifecycleControls();
      }
    );
  }

  document.addEventListener(
    "warehouse:packing-write-success",
    () => {
      message(
        "Paketleme miktarı kaydedildi.",
        "success"
      );

      void loadSelectedPacking();
    }
  );

  document.addEventListener(
    "warehouse:packing-write-error",
    (event) => {
      message(
        event?.detail?.message ||
          "Paketleme onayı kaydedilemedi.",
        "error"
      );

      refreshConfirmButton();
    }
  );
}

if (
  typeof document !==
  "undefined"
) {
  setup();

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const context =
        getWarehouseOperationsContext();

      if (
        context?.accountId &&
        context?.warehouseId
      ) {
        void loadPackingOptions();
        void loadCreationOptions();
      }
    }
  );
}

if (
  typeof document !==
  "undefined"
) {
  byId(
    "paketleme-ledger-etiket-secimi"
  )?.addEventListener(
    "change",
    refreshLabelLedgerControls
  );

  byId(
    "paketleme-ledger-olustur"
  )?.addEventListener(
    "click",
    () => {
      const packing =
        state.context?.packing;

      if (!packing?.id) {
        lifecycleMessage(
          "Önce paketleme operasyonu seçin.",
          "error"
        );
        return;
      }

      const type =
        ledgerValue(
          "paketleme-ledger-tur"
        );

      const format =
        ledgerValue(
          "paketleme-ledger-format"
        );

      if (!type || !format) {
        lifecycleMessage(
          "Ledger etiketi için tür ve format zorunludur.",
          "error"
        );
        return;
      }

      const packageRow =
        selectedLifecyclePackage();

      const payload = {
        packingId:
          packing.id,

        ...(packageRow?.id
          ? {
              packageId:
                packageRow.id
            }
          : {}),

        type,
        format
      };

      for (const [
        id,
        key
      ] of [
        [
          "paketleme-ledger-barkod",
          "barcodeValue"
        ],
        [
          "paketleme-ledger-sscc",
          "sscc"
        ],
        [
          "paketleme-ledger-yazici",
          "printerId"
        ]
      ]) {
        const value =
          ledgerValue(id);

        if (value) {
          payload[key] =
            value;
        }
      }

      if (
        !globalThis.confirm?.(
          "Yeni Packing etiket ledger kaydı oluşturulacak. Devam edilsin mi?"
        )
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-create-label-confirm",
        payload
      );
    }
  );

  byId(
    "paketleme-ledger-uret"
  )?.addEventListener(
    "click",
    () => {
      const packing =
        state.context?.packing;

      const label =
        selectedLedgerLabel();

      if (
        !packing?.id ||
        !label?.id
      ) {
        lifecycleMessage(
          "Üretilecek ledger etiketini seçin.",
          "error"
        );
        return;
      }

      const payload = {
        packingId:
          packing.id,
        labelId:
          label.id
      };

      for (const [
        id,
        key
      ] of [
        [
          "paketleme-ledger-sscc",
          "sscc"
        ],
        [
          "paketleme-ledger-barkod",
          "barcodeValue"
        ],
        [
          "paketleme-ledger-icerik",
          "content"
        ]
      ]) {
        const value =
          ledgerValue(id);

        if (value) {
          payload[key] =
            value;
        }
      }

      if (
        !globalThis.confirm?.(
          "Seçili ledger etiketi üretilecek. Devam edilsin mi?"
        )
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-generate-label-confirm",
        payload
      );
    }
  );

  byId(
    "paketleme-ledger-yazdirildi"
  )?.addEventListener(
    "click",
    () => {
      const packing =
        state.context?.packing;

      const label =
        selectedLedgerLabel();

      if (
        !packing?.id ||
        !label?.id
      ) {
        lifecycleMessage(
          "Yazdırıldı işaretlenecek etiketi seçin.",
          "error"
        );
        return;
      }

      const payload = {
        packingId:
          packing.id,
        labelId:
          label.id
      };

      const printerId =
        ledgerValue(
          "paketleme-ledger-yazici"
        );

      if (printerId) {
        payload.printerId =
          printerId;
      }

      if (
        !globalThis.confirm?.(
          "Seçili ledger etiketi yazdırıldı olarak işaretlenecek. Devam edilsin mi?"
        )
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-mark-label-printed-confirm",
        payload
      );
    }
  );

  byId(
    "paketleme-ledger-basarisiz"
  )?.addEventListener(
    "click",
    () => {
      const packing =
        state.context?.packing;

      const label =
        selectedLedgerLabel();

      const failureReason =
        ledgerValue(
          "paketleme-ledger-hata-nedeni"
        );

      if (
        !packing?.id ||
        !label?.id
      ) {
        lifecycleMessage(
          "Başarısız işaretlenecek etiketi seçin.",
          "error"
        );
        return;
      }

      if (!failureReason) {
        lifecycleMessage(
          "Etiket hata nedeni zorunludur.",
          "error"
        );
        return;
      }

      if (
        !globalThis.confirm?.(
          "Seçili ledger etiketi başarısız olarak işaretlenecek. Devam edilsin mi?"
        )
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-mark-label-failed-confirm",
        {
          packingId:
            packing.id,
          labelId:
            label.id,
          failureReason
        }
      );
    }
  );

  byId(
    "paketleme-ledger-iptal"
  )?.addEventListener(
    "click",
    () => {
      const packing =
        state.context?.packing;

      const label =
        selectedLedgerLabel();

      if (
        !packing?.id ||
        !label?.id
      ) {
        lifecycleMessage(
          "İptal edilecek ledger etiketini seçin.",
          "error"
        );
        return;
      }

      if (
        !globalThis.confirm?.(
          "Seçili ledger etiketi iptal edilecek. Devam edilsin mi?"
        )
      ) {
        return;
      }

      dispatch(
        "warehouse:packing-cancel-label-confirm",
        {
          packingId:
            packing.id,
          labelId:
            label.id
        }
      );
    }
  );

  for (const [
    eventName,
    successMessage
  ] of [
    [
      "warehouse:packing-create-label-success",
      "Etiket ledger kaydı oluşturuldu."
    ],
    [
      "warehouse:packing-generate-label-success",
      "Ledger etiketi üretildi."
    ],
    [
      "warehouse:packing-mark-label-printed-success",
      "Ledger etiketi yazdırıldı olarak işaretlendi."
    ],
    [
      "warehouse:packing-mark-label-failed-success",
      "Ledger etiketi başarısız olarak işaretlendi."
    ],
    [
      "warehouse:packing-cancel-label-success",
      "Ledger etiketi iptal edildi."
    ]
  ]) {
    document.addEventListener(
      eventName,
      () => {
        lifecycleMessage(
          successMessage,
          "success"
        );

        void loadSelectedPacking();
      }
    );
  }

  for (const eventName of [
    "warehouse:packing-create-label-error",
    "warehouse:packing-generate-label-error",
    "warehouse:packing-mark-label-printed-error",
    "warehouse:packing-mark-label-failed-error",
    "warehouse:packing-cancel-label-error"
  ]) {
    document.addEventListener(
      eventName,
      (event) => {
        lifecycleMessage(
          event?.detail?.message ||
            "Etiket ledger işlemi tamamlanamadı.",
          "error"
        );
      }
    );
  }
}
