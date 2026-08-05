import type {
  CreatePackingInput,
} from "../types/Packing";
import type {
  CreatePackingContainerInput,
  PackingContainerDimensions,
} from "../types/PackingContainer";
import type {
  ConfirmPackingItemInput,
  CreatePackingItemInput,
} from "../types/PackingItem";
import type {
  AddPackingPackageItemInput,
  CreatePackingPackageInput,
} from "../types/PackingPackage";
import type {
  CreatePackingLabelInput,
} from "../types/PackingLabel";
import type {
  CreatePackingTaskInput,
} from "../types/PackingTask";
import { InventoryValidationError } from "../types/InventoryErrors";

function requireText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new InventoryValidationError(
      `${fieldName} boş bırakılamaz.`,
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value?: string,
): string | undefined {
  const normalized = value?.trim();

  return normalized
    ? normalized
    : undefined;
}

function validatePositiveNumber(
  value: number,
  fieldName: string,
): number {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new InventoryValidationError(
      `${fieldName} sıfırdan büyük olmalıdır.`,
    );
  }

  return value;
}

function validateNonNegativeNumber(
  value: number,
  fieldName: string,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new InventoryValidationError(
      `${fieldName} negatif olamaz.`,
    );
  }

  return value;
}

function validateIntegerRange(
  value: number,
  fieldName: string,
  minimum: number,
  maximum: number,
): number {
  if (
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new InventoryValidationError(
      `${fieldName} ${minimum} ile ${maximum} arasında tam sayı olmalıdır.`,
    );
  }

  return value;
}

function normalizeIsoDate(
  value: string,
  fieldName: string,
): string {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new InventoryValidationError(
      `${fieldName} geçerli bir tarih olmalıdır.`,
    );
  }

  return new Date(timestamp).toISOString();
}

function validateDimensions(
  dimensions: PackingContainerDimensions,
): PackingContainerDimensions {
  return {
    length: validatePositiveNumber(
      dimensions.length,
      "Ambalaj uzunluğu",
    ),
    width: validatePositiveNumber(
      dimensions.width,
      "Ambalaj genişliği",
    ),
    height: validatePositiveNumber(
      dimensions.height,
      "Ambalaj yüksekliği",
    ),
    unit: dimensions.unit,
  };
}

export function validateCreatePacking(
  input: CreatePackingInput,
): CreatePackingInput {
  const shippingLocationId =
    normalizeOptionalText(
      input.shippingLocationId,
    );

  const pickingId = normalizeOptionalText(
    input.pickingId,
  );

  const orderId = normalizeOptionalText(
    input.orderId,
  );

  const orderNumber = normalizeOptionalText(
    input.orderNumber,
  );

  const referenceType =
    normalizeOptionalText(
      input.referenceType,
    );

  const referenceId =
    normalizeOptionalText(
      input.referenceId,
    );

  const referenceNumber =
    normalizeOptionalText(
      input.referenceNumber,
    );

  const notes = normalizeOptionalText(
    input.notes,
  );

  const priority = validateIntegerRange(
    input.priority ?? 50,
    "Paketleme önceliği",
    1,
    100,
  );

  const plannedAt = input.plannedAt
    ? normalizeIsoDate(
        input.plannedAt,
        "Planlanan paketleme tarihi",
      )
    : undefined;

  if (
    (referenceType === undefined) !==
    (referenceId === undefined)
  ) {
    throw new InventoryValidationError(
      "Referans türü ve referans kimliği birlikte verilmelidir.",
    );
  }

  const packingLocationId = requireText(
    input.packingLocationId,
    "Paketleme lokasyonu",
  );

  if (
    shippingLocationId !== undefined &&
    shippingLocationId === packingLocationId
  ) {
    throw new InventoryValidationError(
      "Paketleme ve sevkiyat lokasyonu aynı olamaz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    packingLocationId,
    strategy: input.strategy,
    priority,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(shippingLocationId !== undefined
      ? { shippingLocationId }
      : {}),
    ...(pickingId !== undefined
      ? { pickingId }
      : {}),
    ...(orderId !== undefined
      ? { orderId }
      : {}),
    ...(orderNumber !== undefined
      ? { orderNumber }
      : {}),
    ...(referenceType !== undefined
      ? { referenceType }
      : {}),
    ...(referenceId !== undefined
      ? { referenceId }
      : {}),
    ...(referenceNumber !== undefined
      ? { referenceNumber }
      : {}),
    ...(plannedAt !== undefined
      ? { plannedAt }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validateCreatePackingItem(
  input: CreatePackingItemInput,
): CreatePackingItemInput {
  const pickingId = normalizeOptionalText(
    input.pickingId,
  );

  const pickingItemId =
    normalizeOptionalText(
      input.pickingItemId,
    );

  const skuId = normalizeOptionalText(
    input.skuId,
  );

  const barcode = normalizeOptionalText(
    input.barcode,
  );

  const notes = normalizeOptionalText(
    input.notes,
  );

  const unitWeight =
    input.unitWeight !== undefined
      ? validateNonNegativeNumber(
          input.unitWeight,
          "Birim ağırlık",
        )
      : undefined;

  const unitVolume =
    input.unitVolume !== undefined
      ? validateNonNegativeNumber(
          input.unitVolume,
          "Birim hacim",
        )
      : undefined;

  if (
    pickingItemId !== undefined &&
    pickingId === undefined
  ) {
    throw new InventoryValidationError(
      "Toplama satırı verildiğinde toplama kimliği de verilmelidir.",
    );
  }

  if (
    unitWeight !== undefined &&
    input.weightUnit === undefined
  ) {
    throw new InventoryValidationError(
      "Birim ağırlık verildiğinde ağırlık birimi zorunludur.",
    );
  }

  if (
    unitVolume !== undefined &&
    input.volumeUnit === undefined
  ) {
    throw new InventoryValidationError(
      "Birim hacim verildiğinde hacim birimi zorunludur.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    packingId: requireText(
      input.packingId,
      "Paketleme kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    packingLocationId: requireText(
      input.packingLocationId,
      "Paketleme lokasyonu",
    ),
    productId: requireText(
      input.productId,
      "Ürün kimliği",
    ),
    requestedQuantity:
      validatePositiveNumber(
        input.requestedQuantity,
        "Paketlenecek miktar",
      ),
    unit: requireText(
      input.unit,
      "Ölçü birimi",
    ),
    temperatureControlled:
      input.temperatureControlled ?? false,
    hazardousMaterial:
      input.hazardousMaterial ?? false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(pickingId !== undefined
      ? { pickingId }
      : {}),
    ...(pickingItemId !== undefined
      ? { pickingItemId }
      : {}),
    ...(skuId !== undefined
      ? { skuId }
      : {}),
    ...(input.tracking !== undefined
      ? { tracking: input.tracking }
      : {}),
    ...(barcode !== undefined
      ? { barcode }
      : {}),
    ...(unitWeight !== undefined
      ? { unitWeight }
      : {}),
    ...(unitVolume !== undefined
      ? { unitVolume }
      : {}),
    ...(input.weightUnit !== undefined
      ? { weightUnit: input.weightUnit }
      : {}),
    ...(input.volumeUnit !== undefined
      ? { volumeUnit: input.volumeUnit }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validateConfirmPackingItem(
  input: ConfirmPackingItemInput,
): ConfirmPackingItemInput {
  const quantity =
    validateNonNegativeNumber(
      input.quantity,
      "Paketlenen miktar",
    );

  const damagedQuantity =
    validateNonNegativeNumber(
      input.damagedQuantity ?? 0,
      "Hasarlı miktar",
    );

  const missingQuantity =
    validateNonNegativeNumber(
      input.missingQuantity ?? 0,
      "Eksik miktar",
    );

  if (
    quantity === 0 &&
    damagedQuantity === 0 &&
    missingQuantity === 0
  ) {
    throw new InventoryValidationError(
      "Paketlenen, hasarlı veya eksik miktardan en az biri sıfırdan büyük olmalıdır.",
    );
  }

  const barcode = normalizeOptionalText(
    input.barcode,
  );

  const lotNumber = normalizeOptionalText(
    input.lotNumber,
  );

  const serialNumber =
    normalizeOptionalText(
      input.serialNumber,
    );

  const notes = normalizeOptionalText(
    input.notes,
  );

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    packingId: requireText(
      input.packingId,
      "Paketleme kimliği",
    ),
    packingItemId: requireText(
      input.packingItemId,
      "Paketleme satırı",
    ),
    packageId: requireText(
      input.packageId,
      "Paket kimliği",
    ),
    quantity,
    damagedQuantity,
    missingQuantity,
    packedBy: requireText(
      input.packedBy,
      "Paketlemeyi yapan kullanıcı",
    ),
    ...(barcode !== undefined
      ? { barcode }
      : {}),
    ...(lotNumber !== undefined
      ? { lotNumber }
      : {}),
    ...(serialNumber !== undefined
      ? { serialNumber }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validatePackingConfirmationTotals(
  remainingQuantity: number,
  input: ConfirmPackingItemInput,
): void {
  const processedQuantity =
    input.quantity +
    (input.damagedQuantity ?? 0) +
    (input.missingQuantity ?? 0);

  if (
    processedQuantity >
    remainingQuantity
  ) {
    throw new InventoryValidationError(
      `Paketlenen, hasarlı ve eksik toplam miktar kalan miktarı aşamaz. Kalan miktar: ${remainingQuantity}`,
    );
  }
}

export function validateCreatePackingContainer(
  input: CreatePackingContainerInput,
): CreatePackingContainerInput {
  const description =
    normalizeOptionalText(
      input.description,
    );

  const emptyWeight =
    input.emptyWeight !== undefined
      ? validateNonNegativeNumber(
          input.emptyWeight,
          "Boş ambalaj ağırlığı",
        )
      : undefined;

  const maximumWeight =
    input.maximumWeight !== undefined
      ? validatePositiveNumber(
          input.maximumWeight,
          "Azami ambalaj ağırlığı",
        )
      : undefined;

  const maximumVolume =
    input.maximumVolume !== undefined
      ? validatePositiveNumber(
          input.maximumVolume,
          "Azami ambalaj hacmi",
        )
      : undefined;

  if (
    (emptyWeight !== undefined ||
      maximumWeight !== undefined) &&
    input.weightUnit === undefined
  ) {
    throw new InventoryValidationError(
      "Ağırlık değeri verildiğinde ağırlık birimi zorunludur.",
    );
  }

  if (
    maximumVolume !== undefined &&
    input.volumeUnit === undefined
  ) {
    throw new InventoryValidationError(
      "Hacim değeri verildiğinde hacim birimi zorunludur.",
    );
  }

  if (
    emptyWeight !== undefined &&
    maximumWeight !== undefined &&
    emptyWeight >= maximumWeight
  ) {
    throw new InventoryValidationError(
      "Boş ambalaj ağırlığı azami ağırlıktan küçük olmalıdır.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    code: requireText(
      input.code,
      "Ambalaj kodu",
    ).toLocaleUpperCase("tr-TR"),
    name: requireText(
      input.name,
      "Ambalaj adı",
    ),
    type: input.type,
    temperatureControlled:
      input.temperatureControlled ?? false,
    hazardousMaterialAllowed:
      input.hazardousMaterialAllowed ?? false,
    reusable: input.reusable ?? false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(description !== undefined
      ? { description }
      : {}),
    ...(input.dimensions !== undefined
      ? {
          dimensions:
            validateDimensions(
              input.dimensions,
            ),
        }
      : {}),
    ...(emptyWeight !== undefined
      ? { emptyWeight }
      : {}),
    ...(maximumWeight !== undefined
      ? { maximumWeight }
      : {}),
    ...(maximumVolume !== undefined
      ? { maximumVolume }
      : {}),
    ...(input.weightUnit !== undefined
      ? { weightUnit: input.weightUnit }
      : {}),
    ...(input.volumeUnit !== undefined
      ? { volumeUnit: input.volumeUnit }
      : {}),
  };
}

export function validateCreatePackingPackage(
  input: CreatePackingPackageInput,
): CreatePackingPackageInput {
  const parentPackageId =
    normalizeOptionalText(
      input.parentPackageId,
    );

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    packingId: requireText(
      input.packingId,
      "Paketleme kimliği",
    ),
    containerId: requireText(
      input.containerId,
      "Ambalaj kimliği",
    ),
    weightUnit:
      input.weightUnit ?? "kg",
    volumeUnit:
      input.volumeUnit ?? "cm3",
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(parentPackageId !== undefined
      ? { parentPackageId }
      : {}),
  };
}

export function validateAddPackingPackageItem(
  input: AddPackingPackageItemInput,
): AddPackingPackageItemInput {
  const skuId = normalizeOptionalText(
    input.skuId,
  );

  const weight =
    input.weight !== undefined
      ? validateNonNegativeNumber(
          input.weight,
          "Paket satırı ağırlığı",
        )
      : undefined;

  const volume =
    input.volume !== undefined
      ? validateNonNegativeNumber(
          input.volume,
          "Paket satırı hacmi",
        )
      : undefined;

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    packingId: requireText(
      input.packingId,
      "Paketleme kimliği",
    ),
    packageId: requireText(
      input.packageId,
      "Paket kimliği",
    ),
    packingItemId: requireText(
      input.packingItemId,
      "Paketleme satırı",
    ),
    productId: requireText(
      input.productId,
      "Ürün kimliği",
    ),
    quantity: validatePositiveNumber(
      input.quantity,
      "Paket miktarı",
    ),
    unit: requireText(
      input.unit,
      "Ölçü birimi",
    ),
    ...(skuId !== undefined
      ? { skuId }
      : {}),
    ...(input.tracking !== undefined
      ? { tracking: input.tracking }
      : {}),
    ...(weight !== undefined
      ? { weight }
      : {}),
    ...(volume !== undefined
      ? { volume }
      : {}),
  };
}

export function validateCreatePackingLabel(
  input: CreatePackingLabelInput,
): CreatePackingLabelInput {
  const packageId = normalizeOptionalText(
    input.packageId,
  );

  const barcodeValue =
    normalizeOptionalText(
      input.barcodeValue,
    );

  const sscc = normalizeOptionalText(
    input.sscc,
  );

  const printerId = normalizeOptionalText(
    input.printerId,
  );

  if (
    input.type === "sscc" &&
    sscc === undefined
  ) {
    throw new InventoryValidationError(
      "SSCC etiketi için SSCC değeri zorunludur.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    packingId: requireText(
      input.packingId,
      "Paketleme kimliği",
    ),
    type: input.type,
    format: input.format,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(packageId !== undefined
      ? { packageId }
      : {}),
    ...(barcodeValue !== undefined
      ? { barcodeValue }
      : {}),
    ...(sscc !== undefined
      ? { sscc }
      : {}),
    ...(printerId !== undefined
      ? { printerId }
      : {}),
  };
}

export function validateCreatePackingTask(
  input: CreatePackingTaskInput,
): CreatePackingTaskInput {
  const packingItemId =
    normalizeOptionalText(
      input.packingItemId,
    );

  const packageId = normalizeOptionalText(
    input.packageId,
  );

  const assignedUserId =
    normalizeOptionalText(
      input.assignedUserId,
    );

  const assignedEquipmentId =
    normalizeOptionalText(
      input.assignedEquipmentId,
    );

  const stationId = normalizeOptionalText(
    input.stationId,
  );

  const notes = normalizeOptionalText(
    input.notes,
  );

  const priority = validateIntegerRange(
    input.priority ?? 50,
    "Görev önceliği",
    1,
    100,
  );

  const sequence = validateIntegerRange(
    input.sequence ?? 1,
    "Görev sırası",
    1,
    1_000_000,
  );

  const plannedAt = input.plannedAt
    ? normalizeIsoDate(
        input.plannedAt,
        "Görev planlama tarihi",
      )
    : undefined;

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    packingId: requireText(
      input.packingId,
      "Paketleme kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    packingLocationId: requireText(
      input.packingLocationId,
      "Paketleme lokasyonu",
    ),
    priority,
    sequence,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(packingItemId !== undefined
      ? { packingItemId }
      : {}),
    ...(packageId !== undefined
      ? { packageId }
      : {}),
    ...(assignedUserId !== undefined
      ? { assignedUserId }
      : {}),
    ...(assignedEquipmentId !== undefined
      ? { assignedEquipmentId }
      : {}),
    ...(stationId !== undefined
      ? { stationId }
      : {}),
    ...(plannedAt !== undefined
      ? { plannedAt }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}
