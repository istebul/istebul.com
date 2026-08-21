import {
  getWarehouseOperationsContext,
  getWarehouseSupabaseClient
} from "./operations-center.js";

import {
  expectedPackingLot,
  expectedPackingSerial,
  isPackingConfirmable,
  isPackingPackageOpen,
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
