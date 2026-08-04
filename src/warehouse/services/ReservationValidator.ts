import type { InventoryReservation } from "../types/InventoryReservation";
import { InventoryValidationError } from "../types/InventoryErrors";

export interface CreateReservationInput {
  tenantId: string;
  warehouseId: string;
  locationId: string;
  productId: string;
  skuId?: string;
  lotNumber?: string;
  serialNumber?: string;
  quantity: number;
  unit: string;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  expiresAt?: string;
  createdBy: string;
}

export interface ConsumeReservationInput {
  tenantId: string;
  reservationId: string;
  quantity: number;
}

function requireNonEmpty(
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
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function validatePositiveQuantity(
  quantity: number,
  fieldName: string,
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new InventoryValidationError(
      `${fieldName} sıfırdan büyük olmalıdır.`,
    );
  }

  return quantity;
}

function validateIsoDate(
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

export function validateCreateReservationInput(
  input: CreateReservationInput,
): CreateReservationInput {
  const skuId = normalizeOptionalText(input.skuId);
  const lotNumber = normalizeOptionalText(input.lotNumber);
  const serialNumber = normalizeOptionalText(input.serialNumber);
  const referenceType = normalizeOptionalText(
    input.referenceType,
  );
  const referenceId = normalizeOptionalText(input.referenceId);
  const referenceNumber = normalizeOptionalText(
    input.referenceNumber,
  );
  const expiresAt = input.expiresAt
    ? validateIsoDate(input.expiresAt, "Rezervasyon bitiş tarihi")
    : undefined;

  return {
    tenantId: requireNonEmpty(input.tenantId, "Firma kimliği"),
    warehouseId: requireNonEmpty(
      input.warehouseId,
      "Depo kimliği",
    ),
    locationId: requireNonEmpty(
      input.locationId,
      "Lokasyon kimliği",
    ),
    productId: requireNonEmpty(
      input.productId,
      "Ürün kimliği",
    ),
    quantity: validatePositiveQuantity(
      input.quantity,
      "Rezervasyon miktarı",
    ),
    unit: requireNonEmpty(input.unit, "Ölçü birimi"),
    createdBy: requireNonEmpty(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(skuId !== undefined ? { skuId } : {}),
    ...(lotNumber !== undefined ? { lotNumber } : {}),
    ...(serialNumber !== undefined
      ? { serialNumber }
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
    ...(expiresAt !== undefined ? { expiresAt } : {}),
  };
}

export function validateConsumeReservationInput(
  input: ConsumeReservationInput,
): ConsumeReservationInput {
  return {
    tenantId: requireNonEmpty(input.tenantId, "Firma kimliği"),
    reservationId: requireNonEmpty(
      input.reservationId,
      "Rezervasyon kimliği",
    ),
    quantity: validatePositiveQuantity(
      input.quantity,
      "Tüketim miktarı",
    ),
  };
}

export function validateReservationConsumption(
  reservation: InventoryReservation,
  quantity: number,
): void {
  const remainingQuantity =
    reservation.quantity - reservation.consumedQuantity;

  if (quantity > remainingQuantity) {
    throw new InventoryValidationError(
      `Tüketim miktarı kalan rezervasyonu aşamaz. Kalan miktar: ${remainingQuantity}`,
    );
  }
}
