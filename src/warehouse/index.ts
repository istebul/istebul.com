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

export type {
  CreateProductBarcodeInput,
  CreateProductInput,
  CreateProductSkuInput,
  Product,
  ProductBarcode,
  ProductDimensions,
  ProductListFilter,
  ProductSku,
  ProductStockRules,
  ProductTrackingRules,
  UpdateProductInput,
} from "./types/Product";

export {
  ProductBarcodeConflictError,
  ProductCodeConflictError,
  ProductNotFoundError,
  ProductSkuConflictError,
  ProductValidationError,
} from "./types/ProductErrors";

export {
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  isProductStatus,
} from "./types/ProductStatus";

export type { ProductStatus } from "./types/ProductStatus";

export {
  UNITS_OF_MEASURE,
  UNIT_OF_MEASURE_LABELS,
  isUnitOfMeasure,
} from "./types/UnitOfMeasure";

export type { UnitOfMeasure } from "./types/UnitOfMeasure";

export {
  BARCODE_TYPES,
  BARCODE_TYPE_LABELS,
  isBarcodeType,
} from "./types/BarcodeType";

export type { BarcodeType } from "./types/BarcodeType";

export type { ProductRepository } from "./services/ProductRepository";

export { InMemoryProductRepository } from "./services/InMemoryProductRepository";
export { ProductService } from "./services/ProductService";

export {
  normalizeProductCode,
  normalizeSkuCode,
} from "./utils/productValidation";
