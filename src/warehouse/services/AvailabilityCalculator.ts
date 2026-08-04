import type {
  InventoryAvailability,
  InventoryAvailabilityFilter,
} from "../types/InventoryAvailability";
import type {
  CreateReservationAllocationInput,
  ReservationAllocationResult,
} from "../types/ReservationAllocation";
import { InventoryValidationError } from "../types/InventoryErrors";

function validatePositiveQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new InventoryValidationError(
      "Tahsis miktarı sıfırdan büyük olmalıdır.",
    );
  }
}

export function calculateInventoryAvailability(
  filter: InventoryAvailabilityFilter,
  reservedQuantity: number,
  balances: InventoryAvailability["balances"],
): InventoryAvailability {
  if (!filter.tenantId.trim()) {
    throw new InventoryValidationError(
      "Firma kimliği boş bırakılamaz.",
    );
  }

  if (!filter.productId.trim()) {
    throw new InventoryValidationError(
      "Ürün kimliği boş bırakılamaz.",
    );
  }

  if (!Number.isFinite(reservedQuantity) || reservedQuantity < 0) {
    throw new InventoryValidationError(
      "Rezerve miktar negatif olamaz.",
    );
  }

  const availableBalances = balances.filter(
    (balance) => balance.stockStatus === "available",
  );

  const units = new Set(
    availableBalances.map((balance) => balance.unit),
  );

  if (units.size > 1) {
    throw new InventoryValidationError(
      "Kullanılabilir stok farklı ölçü birimleriyle hesaplanamaz.",
    );
  }

  const physicalQuantity = availableBalances.reduce(
    (total, balance) => total + balance.quantity,
    0,
  );

  const unit = availableBalances[0]?.unit ?? "";

  return {
    tenantId: filter.tenantId.trim(),
    productId: filter.productId.trim(),
    physicalQuantity,
    reservedQuantity,
    availableQuantity: Math.max(
      0,
      physicalQuantity - reservedQuantity,
    ),
    unit,
    balances: availableBalances,
    ...(filter.warehouseId?.trim()
      ? { warehouseId: filter.warehouseId.trim() }
      : {}),
    ...(filter.locationId?.trim()
      ? { locationId: filter.locationId.trim() }
      : {}),
    ...(filter.skuId?.trim()
      ? { skuId: filter.skuId.trim() }
      : {}),
    ...(filter.lotNumber?.trim()
      ? { lotNumber: filter.lotNumber.trim() }
      : {}),
    ...(filter.serialNumber?.trim()
      ? { serialNumber: filter.serialNumber.trim() }
      : {}),
  };
}

export function allocateInventoryFifo(
  input: CreateReservationAllocationInput,
): ReservationAllocationResult {
  validatePositiveQuantity(input.quantity);

  if (!input.unit.trim()) {
    throw new InventoryValidationError(
      "Ölçü birimi boş bırakılamaz.",
    );
  }

  const eligibleBalances = input.balances
    .filter((balance) => balance.stockStatus === "available")
    .filter((balance) => balance.quantity > 0)
    .filter((balance) => balance.unit === input.unit.trim())
    .sort((left, right) =>
      (left.lastMovementAt ?? "").localeCompare(
        right.lastMovementAt ?? "",
      ),
    );

  let remainingQuantity = input.quantity;
  const allocations = [];

  for (const balance of eligibleBalances) {
    if (remainingQuantity <= 0) {
      break;
    }

    const allocatedQuantity = Math.min(
      balance.quantity,
      remainingQuantity,
    );

    allocations.push({
      balance,
      allocatedQuantity,
    });

    remainingQuantity -= allocatedQuantity;
  }

  const allocatedQuantity =
    input.quantity - remainingQuantity;

  return {
    requestedQuantity: input.quantity,
    allocatedQuantity,
    remainingQuantity,
    fullyAllocated: remainingQuantity === 0,
    unit: input.unit.trim(),
    allocations,
  };
}

export class AvailabilityCalculator {
  static calculate = calculateInventoryAvailability;
  static allocateFifo = allocateInventoryFifo;
}
