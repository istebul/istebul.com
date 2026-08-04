import type {
  CreateInventoryMovementInput,
  InventoryReference,
  InventoryTracking,
} from "../types/InventoryMovement";
import { InventoryValidationError } from "../types/InventoryErrors";
import type { InventoryDirection } from "../types/InventoryDirection";
import type { InventoryMovementType } from "../types/InventoryMovementType";

const MOVEMENT_DIRECTION_MAP: Record<
  InventoryMovementType,
  InventoryDirection
> = {
  goods_receipt: "inbound",
  purchase_receipt: "inbound",
  production_receipt: "inbound",
  customer_return: "inbound",
  putaway: "transfer",
  location_transfer: "transfer",
  warehouse_transfer_out: "transfer",
  warehouse_transfer_in: "transfer",
  reservation: "reservation",
  unreservation: "reservation",
  order_issue: "outbound",
  count_surplus: "adjustment",
  count_shortage: "adjustment",
  damage: "adjustment",
  scrap: "adjustment",
  disposal: "adjustment",
  manual_adjustment_in: "adjustment",
  manual_adjustment_out: "adjustment",
  reversal: "adjustment",
};

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

function validateTracking(
  tracking: InventoryTracking,
): InventoryTracking {
  const productionDate = tracking.productionDate
    ? validateIsoDate(tracking.productionDate, "Üretim tarihi")
    : undefined;

  const expiryDate = tracking.expiryDate
    ? validateIsoDate(
        tracking.expiryDate,
        "Son kullanma tarihi",
      )
    : undefined;

  if (
    productionDate !== undefined &&
    expiryDate !== undefined &&
    productionDate > expiryDate
  ) {
    throw new InventoryValidationError(
      "Üretim tarihi son kullanma tarihinden sonra olamaz.",
    );
  }

  const lotNumber = normalizeOptionalText(
    tracking.lotNumber,
  );

  const serialNumber = normalizeOptionalText(
    tracking.serialNumber,
  );

  return {
    ...(lotNumber !== undefined ? { lotNumber } : {}),
    ...(serialNumber !== undefined ? { serialNumber } : {}),
    ...(productionDate !== undefined ? { productionDate } : {}),
    ...(expiryDate !== undefined ? { expiryDate } : {}),
  };
}

function validateReference(
  reference: InventoryReference,
): InventoryReference {
  const referenceType = normalizeOptionalText(
    reference.referenceType,
  );

  const referenceId = normalizeOptionalText(
    reference.referenceId,
  );

  const referenceNumber = normalizeOptionalText(
    reference.referenceNumber,
  );

  return {
    ...(referenceType !== undefined
      ? { referenceType }
      : {}),
    ...(referenceId !== undefined ? { referenceId } : {}),
    ...(referenceNumber !== undefined
      ? { referenceNumber }
      : {}),
  };
}

export function resolveInventoryDirection(
  movementType: InventoryMovementType,
): InventoryDirection {
  return MOVEMENT_DIRECTION_MAP[movementType];
}

export function validateCreateInventoryMovementInput(
  input: CreateInventoryMovementInput,
): CreateInventoryMovementInput {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new InventoryValidationError(
      "Stok hareket miktarı sıfırdan büyük olmalıdır.",
    );
  }

  const occurredAt = input.occurredAt
    ? validateIsoDate(input.occurredAt, "Hareket tarihi")
    : undefined;

  const reason = normalizeOptionalText(input.reason);
  const notes = normalizeOptionalText(input.notes);

  const requiresDestination =
    input.movementType === "putaway" ||
    input.movementType === "location_transfer" ||
    input.movementType === "warehouse_transfer_out" ||
    input.movementType === "warehouse_transfer_in";

  if (
    requiresDestination &&
    !input.destinationLocationId?.trim()
  ) {
    throw new InventoryValidationError(
      "Transfer hareketlerinde hedef lokasyon zorunludur.",
    );
  }

  if (
    input.movementType === "reversal" &&
    !input.reversalOfMovementId?.trim()
  ) {
    throw new InventoryValidationError(
      "Ters kayıt hareketinde kaynak hareket kimliği zorunludur.",
    );
  }

  return {
    tenantId: requireNonEmpty(input.tenantId, "Firma kimliği"),
    movementType: input.movementType,
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
    quantity: input.quantity,
    unit: requireNonEmpty(input.unit, "Ölçü birimi"),
    createdBy: requireNonEmpty(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(input.skuId?.trim()
      ? { skuId: input.skuId.trim() }
      : {}),
    ...(input.sourceWarehouseId?.trim()
      ? {
          sourceWarehouseId:
            input.sourceWarehouseId.trim(),
        }
      : {}),
    ...(input.sourceLocationId?.trim()
      ? {
          sourceLocationId:
            input.sourceLocationId.trim(),
        }
      : {}),
    ...(input.destinationWarehouseId?.trim()
      ? {
          destinationWarehouseId:
            input.destinationWarehouseId.trim(),
        }
      : {}),
    ...(input.destinationLocationId?.trim()
      ? {
          destinationLocationId:
            input.destinationLocationId.trim(),
        }
      : {}),
    ...(input.stockStatus
      ? { stockStatus: input.stockStatus }
      : {}),
    ...(input.tracking
      ? { tracking: validateTracking(input.tracking) }
      : {}),
    ...(input.reference
      ? { reference: validateReference(input.reference) }
      : {}),
    ...(reason !== undefined ? { reason } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(input.reversalOfMovementId?.trim()
      ? {
          reversalOfMovementId:
            input.reversalOfMovementId.trim(),
        }
      : {}),
    ...(input.transactionGroupId?.trim()
      ? {
          transactionGroupId:
            input.transactionGroupId.trim(),
        }
      : {}),
    ...(occurredAt ? { occurredAt } : {}),
  };
}
