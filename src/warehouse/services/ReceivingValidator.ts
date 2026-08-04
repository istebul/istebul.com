import type {
  CreateReceivingInput,
} from "../types/Receiving";
import type {
  CreateReceivingItemInput,
  ReceiveItemQuantityInput,
} from "../types/ReceivingItem";
import { InventoryValidationError } from "../types/InventoryErrors";

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

function nonNegative(
  value: number,
  field: string,
): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new InventoryValidationError(
      `${field} negatif olamaz.`,
    );
  }

  return value;
}

function normalizeOptional(
  value?: string,
): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
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

export function validateCreateReceiving(
  input: CreateReceivingInput,
): CreateReceivingInput {
  const supplierId = normalizeOptional(input.supplierId);
  const supplierName = normalizeOptional(input.supplierName);
  const referenceType = normalizeOptional(input.referenceType);
  const referenceId = normalizeOptional(input.referenceId);
  const referenceNumber = normalizeOptional(
    input.referenceNumber,
  );
  const vehiclePlate = normalizeOptional(input.vehiclePlate);
  const deliveryNoteNumber = normalizeOptional(
    input.deliveryNoteNumber,
  );
  const notes = normalizeOptional(input.notes);
  const plannedAt = input.plannedAt
    ? normalizeIsoDate(input.plannedAt, "Planlanan tarih")
    : undefined;

  return {
    tenantId: requireText(input.tenantId, "Firma"),
    warehouseId: requireText(input.warehouseId, "Depo"),
    receivingLocationId: requireText(
      input.receivingLocationId,
      "Mal kabul lokasyonu",
    ),
    source: input.source,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(supplierId !== undefined ? { supplierId } : {}),
    ...(supplierName !== undefined ? { supplierName } : {}),
    ...(referenceType !== undefined ? { referenceType } : {}),
    ...(referenceId !== undefined ? { referenceId } : {}),
    ...(referenceNumber !== undefined
      ? { referenceNumber }
      : {}),
    ...(vehiclePlate !== undefined ? { vehiclePlate } : {}),
    ...(deliveryNoteNumber !== undefined
      ? { deliveryNoteNumber }
      : {}),
    ...(plannedAt !== undefined ? { plannedAt } : {}),
    ...(notes !== undefined ? { notes } : {}),
  };
}

export function validateCreateReceivingItem(
  input: CreateReceivingItemInput,
): CreateReceivingItemInput {
  const skuId = normalizeOptional(input.skuId);
  const notes = normalizeOptional(input.notes);

  return {
    tenantId: requireText(input.tenantId, "Firma"),
    receivingId: requireText(input.receivingId, "Mal kabul"),
    warehouseId: requireText(input.warehouseId, "Depo"),
    receivingLocationId: requireText(
      input.receivingLocationId,
      "Lokasyon",
    ),
    productId: requireText(input.productId, "Ürün"),
    expectedQuantity: positive(
      input.expectedQuantity,
      "Beklenen miktar",
    ),
    unit: requireText(input.unit, "Ölçü birimi"),
    stockStatus: input.stockStatus ?? "available",
    qualityControlRequired:
      input.qualityControlRequired ?? false,
    unexpectedProduct: input.unexpectedProduct ?? false,
    overDeliveryAllowed: input.overDeliveryAllowed ?? false,
    createdBy: requireText(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(skuId !== undefined ? { skuId } : {}),
    ...(input.tracking !== undefined
      ? { tracking: input.tracking }
      : {}),
    ...(notes !== undefined ? { notes } : {}),
  };
}

export function validateReceiveQuantity(
  input: ReceiveItemQuantityInput,
): ReceiveItemQuantityInput {
  const received = positive(
    input.receivedQuantity,
    "Gelen miktar",
  );

  const accepted = nonNegative(
    input.acceptedQuantity,
    "Kabul miktarı",
  );

  const rejected = nonNegative(
    input.rejectedQuantity ?? 0,
    "Red miktarı",
  );

  const damaged = nonNegative(
    input.damagedQuantity ?? 0,
    "Hasarlı miktar",
  );

  if (accepted + rejected + damaged !== received) {
    throw new InventoryValidationError(
      "Kabul + Red + Hasarlı miktar, gelen miktara eşit olmalıdır.",
    );
  }

  const rejectionReason = normalizeOptional(
    input.rejectionReason,
  );

  return {
    tenantId: requireText(input.tenantId, "Firma"),
    receivingId: requireText(input.receivingId, "Mal kabul"),
    receivingItemId: requireText(
      input.receivingItemId,
      "Mal kabul satırı",
    ),
    receivedQuantity: received,
    acceptedQuantity: accepted,
    rejectedQuantity: rejected,
    damagedQuantity: damaged,
    updatedBy: requireText(
      input.updatedBy,
      "Güncelleyen kullanıcı",
    ),
    ...(rejectionReason !== undefined
      ? { rejectionReason }
      : {}),
    ...(input.tracking !== undefined
      ? { tracking: input.tracking }
      : {}),
  };
}
