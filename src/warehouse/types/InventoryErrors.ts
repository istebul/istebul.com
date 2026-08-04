export class InventoryValidationError extends Error {
  readonly code = "INVENTORY_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "InventoryValidationError";
  }
}

export class InventoryMovementNotFoundError extends Error {
  readonly code = "INVENTORY_MOVEMENT_NOT_FOUND";

  constructor(movementId: string) {
    super(`Stok hareketi bulunamadı: ${movementId}`);
    this.name = "InventoryMovementNotFoundError";
  }
}

export class InventoryInsufficientStockError extends Error {
  readonly code = "INVENTORY_INSUFFICIENT_STOCK";

  constructor(
    availableQuantity: number,
    requestedQuantity: number,
  ) {
    super(
      `Yetersiz stok. Kullanılabilir miktar: ${availableQuantity}, talep edilen miktar: ${requestedQuantity}`,
    );
    this.name = "InventoryInsufficientStockError";
  }
}

export class InventoryMovementConflictError extends Error {
  readonly code = "INVENTORY_MOVEMENT_CONFLICT";

  constructor(movementNumber: string) {
    super(
      `Bu stok hareket numarası zaten kullanılıyor: ${movementNumber}`,
    );
    this.name = "InventoryMovementConflictError";
  }
}

export class InventoryReservationNotFoundError extends Error {
  readonly code = "INVENTORY_RESERVATION_NOT_FOUND";

  constructor(reservationId: string) {
    super(`Stok rezervasyonu bulunamadı: ${reservationId}`);
    this.name = "InventoryReservationNotFoundError";
  }
}
