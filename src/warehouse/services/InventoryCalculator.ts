import type {
  InventoryBalance,
  InventoryBalanceKey,
} from "../types/InventoryBalance";
import {
  InventoryInsufficientStockError,
  InventoryValidationError,
} from "../types/InventoryErrors";
import type { InventoryMovement } from "../types/InventoryMovement";
import type { InventoryMovementType } from "../types/InventoryMovementType";

const POSITIVE_MOVEMENTS = new Set<InventoryMovementType>([
  "goods_receipt",
  "purchase_receipt",
  "production_receipt",
  "customer_return",
  "warehouse_transfer_in",
  "count_surplus",
  "manual_adjustment_in",
]);

const NEGATIVE_MOVEMENTS = new Set<InventoryMovementType>([
  "warehouse_transfer_out",
  "order_issue",
  "count_shortage",
  "damage",
  "scrap",
  "disposal",
  "manual_adjustment_out",
]);

export function buildInventoryBalanceKey(
  movement: InventoryMovement,
): InventoryBalanceKey {
  return {
    tenantId: movement.tenantId,
    warehouseId: movement.warehouseId,
    locationId: movement.locationId,
    productId: movement.productId,
    stockStatus: movement.stockStatus,
    ...(movement.skuId !== undefined
      ? { skuId: movement.skuId }
      : {}),
    ...(movement.tracking?.lotNumber !== undefined
      ? { lotNumber: movement.tracking.lotNumber }
      : {}),
    ...(movement.tracking?.serialNumber !== undefined
      ? { serialNumber: movement.tracking.serialNumber }
      : {}),
  };
}

export function serializeInventoryBalanceKey(
  key: InventoryBalanceKey,
): string {
  return [
    key.tenantId,
    key.warehouseId,
    key.locationId,
    key.productId,
    key.skuId ?? "",
    key.lotNumber ?? "",
    key.serialNumber ?? "",
    key.stockStatus,
  ].join("::");
}

export function resolveInventoryQuantityDelta(
  movement: InventoryMovement,
): number {
  if (POSITIVE_MOVEMENTS.has(movement.movementType)) {
    return movement.quantity;
  }

  if (NEGATIVE_MOVEMENTS.has(movement.movementType)) {
    return -movement.quantity;
  }

  if (
    movement.movementType === "reservation" ||
    movement.movementType === "unreservation" ||
    movement.movementType === "putaway" ||
    movement.movementType === "location_transfer" ||
    movement.movementType === "reversal"
  ) {
    return 0;
  }

  throw new InventoryValidationError(
    `Stok hareket etkisi tanımlanamadı: ${movement.movementType}`,
  );
}

export function applyInventoryMovementToBalance(
  currentBalance: InventoryBalance | null,
  movement: InventoryMovement,
): InventoryBalance {
  const key = buildInventoryBalanceKey(movement);
  const currentQuantity = currentBalance?.quantity ?? 0;
  const delta = resolveInventoryQuantityDelta(movement);
  const nextQuantity = currentQuantity + delta;

  if (nextQuantity < 0) {
    throw new InventoryInsufficientStockError(
      currentQuantity,
      Math.abs(delta),
    );
  }

  if (
    currentBalance !== null &&
    currentBalance.unit !== movement.unit
  ) {
    throw new InventoryValidationError(
      "Aynı stok bakiyesi farklı ölçü birimleriyle güncellenemez.",
    );
  }

  return {
    ...key,
    quantity: nextQuantity,
    unit: movement.unit,
    lastMovementId: movement.id,
    lastMovementAt: movement.occurredAt,
  };
}

export class InventoryCalculator {
  static calculateBalance(
    current: number,
    delta: number,
  ): number {
    const next = current + delta;

    if (!Number.isFinite(next)) {
      throw new InventoryValidationError(
        "Stok bakiyesi geçerli bir sayı olmalıdır.",
      );
    }

    if (next < 0) {
      throw new InventoryInsufficientStockError(
        current,
        Math.abs(delta),
      );
    }

    return next;
  }
}
