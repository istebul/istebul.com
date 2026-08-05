import type {
  CreatePutawayInput,
} from "../types/Putaway";

import type {
  CreatePutawayItemInput,
  ExecutePutawayItemInput,
} from "../types/PutawayItem";

import { InventoryValidationError }
  from "../types/InventoryErrors";

function requireText(
  value: string,
  field: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new InventoryValidationError(
      `${field} boş bırakılamaz.`,
    );
  }

  return normalized;
}

function normalizeOptional(
  value?: string,
): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function positive(
  value: number,
  field: string,
): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InventoryValidationError(
      `${field} sıfırdan büyük olmalıdır.`,
    );
  }

  return value;
}

function normalizeIsoDate(
  value: string,
  field: string,
): string {
  const time = Date.parse(value);

  if (Number.isNaN(time)) {
    throw new InventoryValidationError(
      `${field} geçerli değildir.`,
    );
  }

  return new Date(time).toISOString();
}

export function validateCreatePutaway(
  input: CreatePutawayInput,
): CreatePutawayInput {

  const plannedAt =
    input.plannedAt
      ? normalizeIsoDate(
          input.plannedAt,
          "Planlanan tarih",
        )
      : undefined;

  const notes =
    normalizeOptional(input.notes);

  const receivingId =
    normalizeOptional(input.receivingId);

  const qualityInspectionId =
    normalizeOptional(
      input.qualityInspectionId,
    );

  const referenceType =
    normalizeOptional(
      input.referenceType,
    );

  const referenceId =
    normalizeOptional(
      input.referenceId,
    );

  const referenceNumber =
    normalizeOptional(
      input.referenceNumber,
    );

  return {
    tenantId: requireText(
      input.tenantId,
      "Firma",
    ),

    warehouseId: requireText(
      input.warehouseId,
      "Depo",
    ),

    sourceLocationId: requireText(
      input.sourceLocationId,
      "Kaynak lokasyon",
    ),

    strategy: input.strategy,

    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),

    ...(plannedAt !== undefined
      ? { plannedAt }
      : {}),

    ...(notes !== undefined
      ? { notes }
      : {}),

    ...(receivingId !== undefined
      ? { receivingId }
      : {}),

    ...(qualityInspectionId !== undefined
      ? { qualityInspectionId }
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
  };
}

export function validateCreatePutawayItem(
  input: CreatePutawayItemInput,
): CreatePutawayItemInput {

  const skuId =
    normalizeOptional(input.skuId);

  const targetLocationId =
    normalizeOptional(
      input.targetLocationId,
    );

  const suggestionId =
    normalizeOptional(
      input.suggestionId,
    );

  const notes =
    normalizeOptional(
      input.notes,
    );

  return {

    tenantId: requireText(
      input.tenantId,
      "Firma",
    ),

    putawayId: requireText(
      input.putawayId,
      "Yerleştirme",
    ),

    warehouseId: requireText(
      input.warehouseId,
      "Depo",
    ),

    sourceLocationId: requireText(
      input.sourceLocationId,
      "Kaynak lokasyon",
    ),

    productId: requireText(
      input.productId,
      "Ürün",
    ),

    requestedQuantity: positive(
      input.requestedQuantity,
      "İstenen miktar",
    ),

    unit: requireText(
      input.unit,
      "Ölçü birimi",
    ),

    strategy: input.strategy,

    stockStatus:
      input.stockStatus ?? "available",

    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),

    ...(skuId !== undefined
      ? { skuId }
      : {}),

    ...(targetLocationId !== undefined
      ? { targetLocationId }
      : {}),

    ...(suggestionId !== undefined
      ? { suggestionId }
      : {}),

    ...(input.tracking !== undefined
      ? { tracking: input.tracking }
      : {}),

    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}

export function validateExecutePutaway(
  input: ExecutePutawayItemInput,
): ExecutePutawayItemInput {

  const notes =
    normalizeOptional(
      input.notes,
    );

  return {

    tenantId: requireText(
      input.tenantId,
      "Firma",
    ),

    putawayId: requireText(
      input.putawayId,
      "Yerleştirme",
    ),

    putawayItemId: requireText(
      input.putawayItemId,
      "Yerleştirme satırı",
    ),

    targetLocationId: requireText(
      input.targetLocationId,
      "Hedef lokasyon",
    ),

    quantity: positive(
      input.quantity,
      "Yerleştirilen miktar",
    ),

    executedBy: requireText(
      input.executedBy,
      "İşlemi yapan kullanıcı",
    ),

    ...(notes !== undefined
      ? { notes }
      : {}),
  };
}
