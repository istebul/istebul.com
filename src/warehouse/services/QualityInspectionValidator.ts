import type {
  CreateQualityInspectionInput,
} from "../types/QualityInspection";
import type {
  CreateQualityInspectionItemInput,
  RecordQualityInspectionResultInput,
} from "../types/QualityInspectionItem";
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
  return normalized ? normalized : undefined;
}

function validatePositiveQuantity(
  value: number,
  fieldName: string,
): number {
  if (!Number.isFinite(value) || value <= 0) {
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
  if (!Number.isFinite(value) || value < 0) {
    throw new InventoryValidationError(
      `${fieldName} negatif olamaz.`,
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

export function validateCreateQualityInspection(
  input: CreateQualityInspectionInput,
): CreateQualityInspectionInput {
  const receivingId = normalizeOptionalText(
    input.receivingId,
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
  const notes = normalizeOptionalText(input.notes);
  const plannedAt = input.plannedAt
    ? normalizeIsoDate(
        input.plannedAt,
        "Planlanan kontrol tarihi",
      )
    : undefined;

  return {
    tenantId: requireText(input.tenantId, "Firma kimliği"),
    warehouseId: requireText(input.warehouseId, "Depo kimliği"),
    locationId: requireText(
      input.locationId,
      "Kalite kontrol lokasyonu",
    ),
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(receivingId !== undefined ? { receivingId } : {}),
    ...(referenceType !== undefined ? { referenceType } : {}),
    ...(referenceId !== undefined ? { referenceId } : {}),
    ...(referenceNumber !== undefined
      ? { referenceNumber }
      : {}),
    ...(plannedAt !== undefined ? { plannedAt } : {}),
    ...(notes !== undefined ? { notes } : {}),
  };
}

export function validateCreateQualityInspectionItem(
  input: CreateQualityInspectionItemInput,
): CreateQualityInspectionItemInput {
  const skuId = normalizeOptionalText(input.skuId);
  const receivingId = normalizeOptionalText(
    input.receivingId,
  );
  const receivingItemId = normalizeOptionalText(
    input.receivingItemId,
  );
  const notes = normalizeOptionalText(input.notes);

  return {
    tenantId: requireText(input.tenantId, "Firma kimliği"),
    inspectionId: requireText(
      input.inspectionId,
      "Kalite kontrol kimliği",
    ),
    productId: requireText(input.productId, "Ürün kimliği"),
    warehouseId: requireText(
      input.warehouseId,
      "Depo kimliği",
    ),
    locationId: requireText(
      input.locationId,
      "Kontrol lokasyonu",
    ),
    controlType: input.controlType,
    inspectedQuantity: validatePositiveQuantity(
      input.inspectedQuantity,
      "Kontrol miktarı",
    ),
    unit: requireText(input.unit, "Ölçü birimi"),
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(skuId !== undefined ? { skuId } : {}),
    ...(receivingId !== undefined ? { receivingId } : {}),
    ...(receivingItemId !== undefined
      ? { receivingItemId }
      : {}),
    ...(input.tracking !== undefined
      ? { tracking: input.tracking }
      : {}),
    ...(input.expectedValue !== undefined
      ? { expectedValue: input.expectedValue }
      : {}),
    ...(notes !== undefined ? { notes } : {}),
  };
}

export function validateRecordQualityInspectionResult(
  input: RecordQualityInspectionResultInput,
): RecordQualityInspectionResultInput {
  const acceptedQuantity = validateNonNegativeQuantity(
    input.acceptedQuantity,
    "Kabul miktarı",
  );
  const rejectedQuantity = validateNonNegativeQuantity(
    input.rejectedQuantity,
    "Red miktarı",
  );
  const conditionalQuantity = validateNonNegativeQuantity(
    input.conditionalQuantity ?? 0,
    "Şartlı kabul miktarı",
  );
  const holdQuantity = validateNonNegativeQuantity(
    input.holdQuantity ?? 0,
    "Bekletilen miktar",
  );
  const notes = normalizeOptionalText(input.notes);

  if (
    input.decision === "pending"
  ) {
    throw new InventoryValidationError(
      "Sonuç kaydında bekleyen karar kullanılamaz.",
    );
  }

  return {
    tenantId: requireText(input.tenantId, "Firma kimliği"),
    inspectionId: requireText(
      input.inspectionId,
      "Kalite kontrol kimliği",
    ),
    inspectionItemId: requireText(
      input.inspectionItemId,
      "Kalite kontrol satırı",
    ),
    acceptedQuantity,
    rejectedQuantity,
    conditionalQuantity,
    holdQuantity,
    decision: input.decision,
    inspectedBy: requireText(
      input.inspectedBy,
      "Kontrolü yapan kullanıcı",
    ),
    ...(input.measuredValue !== undefined
      ? { measuredValue: input.measuredValue }
      : {}),
    ...(notes !== undefined ? { notes } : {}),
  };
}

export function validateQualityResultTotals(
  inspectedQuantity: number,
  input: RecordQualityInspectionResultInput,
): void {
  const total =
    input.acceptedQuantity +
    input.rejectedQuantity +
    (input.conditionalQuantity ?? 0) +
    (input.holdQuantity ?? 0);

  if (total !== inspectedQuantity) {
    throw new InventoryValidationError(
      "Kabul + Red + Şartlı Kabul + Bekletilen miktar, kontrol miktarına eşit olmalıdır.",
    );
  }
}
