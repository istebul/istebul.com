export class WarehouseValidationError extends Error {
  readonly code = "WAREHOUSE_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "WarehouseValidationError";
  }
}

export class WarehouseNotFoundError extends Error {
  readonly code = "WAREHOUSE_NOT_FOUND";

  constructor(warehouseId: string) {
    super(`Depo bulunamadı: ${warehouseId}`);
    this.name = "WarehouseNotFoundError";
  }
}

export class WarehouseCodeConflictError extends Error {
  readonly code = "WAREHOUSE_CODE_CONFLICT";

  constructor(code: string) {
    super(`Bu depo kodu zaten kullanılıyor: ${code}`);
    this.name = "WarehouseCodeConflictError";
  }
}
