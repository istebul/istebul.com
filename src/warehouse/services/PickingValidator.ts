import type {
  CreatePickingInput,
} from "../types/Picking";
import type {
  ConfirmPickingItemInput,
  CreatePickingItemInput,
} from "../types/PickingItem";
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

function validatePositiveQuantity(
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

function validateNonNegativeQuantity(
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

export function validateCreatePicking(
  input: CreatePickingInput,
): CreatePickingInput {
  const orderId = normalizeOptionalText(
    input.orderId,
  );
  const orderNumber = normalizeOptionalText(
    input.orderNumber,
  );
  const waveId = normalizeOptionalText(
    input.waveId,
  );
  const batchId = normalizeOptionalText(
    input.batchId,
  );
  const referenceType = normalizeOptionalText(
    input.referenceType,
  );
  const referenceId = normalizeOptionalText(
    input.referenceId,
  );
  const referenceNumber = normalizeOptionalText(
    input.referenceNumber,
  );
  const notes = normalizeOptionalText(
    input.notes,
  );

  const priority = validateIntegerRange(
    input.priority ?? 50,
    "Toplama önceliği",
    1,
    100,
  );

  const plannedAt = input.plannedAt
    ? normalizeIsoDate(
        input.plannedAt,
        "Planlanan toplama tarihi",
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

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    destinationLocationId: requireText(
      input.destinationLocationId,
      "Toplama hedef lokasyonu",
    ),
    strategy: input.strategy,
    priority,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(orderId !== undefined
      ? { orderId }
      : {}),
    ...(orderNumber !== undefined
      ? { orderNumber }
      : {}),
    ...(waveId !== undefined
      ? { waveId }
      : {}),
    ...(batchId !== undefined
      ? { batchId }
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

export function validateCreatePickingItem(
  input: CreatePickingItemInput,
): CreatePickingItemInput {
  const skuId = normalizeOptionalText(
    input.skuId,
  );
  const sourceLocationId =
    normalizeOptionalText(
      input.sourceLocationId,
    );
  const destinationLocationId =
    normalizeOptionalText(
      input.destinationLocationId,
    );
  const suggestionId =
    normalizeOptionalText(
      input.suggestionId,
    );
  const reservationId =
    normalizeOptionalText(
      input.reservationId,
    );
  const notes = normalizeOptionalText(
    input.notes,
  );

  if (
    sourceLocationId !== undefined &&
    destinationLocationId !== undefined &&
    sourceLocationId === destinationLocationId
  ) {
    throw new InventoryValidationError(
      "Kaynak ve hedef lokasyon aynı olamaz.",
    );
  }

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma kimliği",
    ),
    pickingId: requireText(
      input.pickingId,
      "Toplama kimliği",
    ),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    productId: requireText(
      input.productId,
      "Ürün kimliği",
    ),
    requestedQuantity:
      validatePositiveQuantity(
        input.requestedQuantity,
        "İstenen toplama miktarı",
      ),
    unit: requireText(
      input.unit,
      "Ölçü birimi",
    ),
    stockStatus:
      input.stockStatus ?? "available",
    strategy: input.strategy,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(skuId !== undefined
      ? { skuId }
      : {}),
    ...(sourceLocationId !== undefined
      ? { sourceLocationId }
      : {}),
    ...(destinationLocationId !== undefined
      ? { destinationLocationId }
      : {}),
    ...(suggestionId !== undefined
      ? { suggestionId }
      : {}),
    ...(reservationId !== undefined
      ? { reservationId }
      : {}),
    ...(input.tracking !== undefined
      ? { tracking: input.tracking }
      : {}),
    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validateConfirmPickingItem(
  input: ConfirmPickingItemInput,
): ConfirmPickingItemInput {
  const quantity =
    validateNonNegativeQuantity(
      input.quantity,
      "Toplanan miktar",
    );

  const shortQuantity =
    validateNonNegativeQuantity(
      input.shortQuantity ?? 0,
      "Eksik toplama miktarı",
    );

  if (
    quantity === 0 &&
    shortQuantity === 0
  ) {
    throw new InventoryValidationError(
      "Toplanan miktar veya eksik toplama miktarından en az biri sıfırdan büyük olmalıdır.",
    );
  }

  const sourceLocationId = requireText(
    input.sourceLocationId,
    "Kaynak lokasyon",
  );

  const destinationLocationId = requireText(
    input.destinationLocationId,
    "Hedef lokasyon",
  );

  if (
    sourceLocationId ===
    destinationLocationId
  ) {
    throw new InventoryValidationError(
      "Kaynak ve hedef lokasyon aynı olamaz.",
    );
  }

  const barcode = normalizeOptionalText(
    input.barcode,
  );
  const lotNumber = normalizeOptionalText(
    input.lotNumber,
  );
  const serialNumber = normalizeOptionalText(
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
    pickingId: requireText(
      input.pickingId,
      "Toplama kimliği",
    ),
    pickingItemId: requireText(
      input.pickingItemId,
      "Toplama satırı",
    ),
    sourceLocationId,
    destinationLocationId,
    quantity,
    shortQuantity,
    pickedBy: requireText(
      input.pickedBy,
      "Toplamayı yapan kullanıcı",
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

export function validatePickingConfirmationTotals(
  remainingQuantity: number,
  input: ConfirmPickingItemInput,
): void {
  const totalProcessedQuantity =
    input.quantity +
    (input.shortQuantity ?? 0);

  if (
    totalProcessedQuantity >
    remainingQuantity
  ) {
    throw new InventoryValidationError(
      `Toplanan ve eksik bildirilen toplam miktar kalan miktarı aşamaz. Kalan miktar: ${remainingQuantity}`,
    );
  }
}
