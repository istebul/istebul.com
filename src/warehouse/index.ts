export type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  Warehouse,
  WarehouseAddress,
  WarehouseCapacity,
  WarehouseListFilter,
} from "./types/Warehouse";

export {
  WarehouseCodeConflictError,
  WarehouseNotFoundError,
  WarehouseValidationError,
} from "./types/WarehouseErrors";

export {
  WAREHOUSE_STATUSES,
  isWarehouseStatus,
} from "./types/WarehouseStatus";

export type { WarehouseStatus } from "./types/WarehouseStatus";
export type { WarehouseRepository } from "./services/WarehouseRepository";

export { InMemoryWarehouseRepository } from "./services/InMemoryWarehouseRepository";
export { WarehouseService } from "./services/WarehouseService";

export type {
  CreateLocationInput,
  Location,
  LocationCapacity,
  LocationCoordinates,
  LocationDimensions,
  LocationHierarchy,
  LocationListFilter,
  UpdateLocationInput,
} from "./types/Location";

export {
  LocationCodeConflictError,
  LocationNotFoundError,
  LocationValidationError,
} from "./types/LocationErrors";

export {
  LOCATION_STATUSES,
  isLocationStatus,
} from "./types/LocationStatus";

export type { LocationStatus } from "./types/LocationStatus";

export {
  LOCATION_TYPES,
  isLocationType,
} from "./types/LocationType";

export type { LocationType } from "./types/LocationType";

export type { LocationRepository } from "./services/LocationRepository";

export { InMemoryLocationRepository } from "./services/InMemoryLocationRepository";
export { LocationService } from "./services/LocationService";

export {
  buildLocationFullCode,
  normalizeLocationCode,
  normalizeLocationHierarchy,
} from "./utils/locationValidation";
