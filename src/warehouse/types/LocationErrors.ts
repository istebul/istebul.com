export class LocationValidationError extends Error {
  readonly code = "LOCATION_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "LocationValidationError";
  }
}

export class LocationNotFoundError extends Error {
  readonly code = "LOCATION_NOT_FOUND";

  constructor(locationId: string) {
    super(`Lokasyon bulunamadı: ${locationId}`);
    this.name = "LocationNotFoundError";
  }
}

export class LocationCodeConflictError extends Error {
  readonly code = "LOCATION_CODE_CONFLICT";

  constructor(fullCode: string) {
    super(`Bu lokasyon adresi zaten kullanılıyor: ${fullCode}`);
    this.name = "LocationCodeConflictError";
  }
}
