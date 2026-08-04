import type {
  CreateLocationInput,
  Location,
  LocationListFilter,
  UpdateLocationInput,
} from "../types/Location";
import {
  LocationCodeConflictError,
  LocationNotFoundError,
  LocationValidationError,
} from "../types/LocationErrors";
import type { LocationStatus } from "../types/LocationStatus";
import {
  buildLocationFullCode,
  validateCreateLocationInput,
  validateUpdateLocationInput,
} from "../utils/locationValidation";
import type { LocationRepository } from "./LocationRepository";
import type { WarehouseRepository } from "./WarehouseRepository";

export interface LocationServiceDependencies {
  repository: LocationRepository;
  warehouseRepository: WarehouseRepository;
  createId?: () => string;
  now?: () => string;
}

const STATUS_TRANSITIONS: Record<
  LocationStatus,
  readonly LocationStatus[]
> = {
  empty: ["available", "blocked", "maintenance", "inactive"],
  available: [
    "reserved",
    "occupied",
    "blocked",
    "maintenance",
    "inactive",
  ],
  reserved: ["available", "occupied", "blocked", "inactive"],
  occupied: ["available", "blocked", "maintenance", "inactive"],
  blocked: ["empty", "available", "maintenance", "inactive"],
  maintenance: ["empty", "available", "blocked", "inactive"],
  inactive: ["empty", "available"],
};

export class LocationService {
  private readonly repository: LocationRepository;
  private readonly warehouseRepository: WarehouseRepository;
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(dependencies: LocationServiceDependencies) {
    this.repository = dependencies.repository;
    this.warehouseRepository = dependencies.warehouseRepository;
    this.createId =
      dependencies.createId ?? (() => crypto.randomUUID());
    this.now =
      dependencies.now ?? (() => new Date().toISOString());
  }

  async create(input: CreateLocationInput): Promise<Location> {
    const normalizedInput = validateCreateLocationInput(input);

    const warehouse = await this.warehouseRepository.findById(
      normalizedInput.tenantId,
      normalizedInput.warehouseId,
    );

    if (!warehouse) {
      throw new LocationValidationError(
        "Lokasyon oluşturulacak depo bulunamadı.",
      );
    }

    if (warehouse.status === "archived") {
      throw new LocationValidationError(
        "Arşivlenmiş depoya lokasyon eklenemez.",
      );
    }

    const fullCode = buildLocationFullCode(
      normalizedInput.hierarchy,
    );

    const existingLocation =
      await this.repository.findByFullCode(
        normalizedInput.tenantId,
        normalizedInput.warehouseId,
        fullCode,
      );

    if (existingLocation) {
      throw new LocationCodeConflictError(fullCode);
    }

    if (normalizedInput.parentLocationId) {
      const parentLocation = await this.repository.findById(
        normalizedInput.tenantId,
        normalizedInput.warehouseId,
        normalizedInput.parentLocationId,
      );

      if (!parentLocation) {
        throw new LocationValidationError(
          "Üst lokasyon bulunamadı.",
        );
      }
    }

    const timestamp = this.now();

    const location: Location = {
      id: this.createId(),
      tenantId: normalizedInput.tenantId,
      warehouseId: normalizedInput.warehouseId,
      code: normalizedInput.code,
      fullCode,
      barcode: `LOC:${normalizedInput.warehouseId}:${fullCode}`,
      name: normalizedInput.name,
      type: normalizedInput.type,
      status: "empty",
      hierarchy: normalizedInput.hierarchy,
      hazardousMaterialAllowed:
        normalizedInput.hazardousMaterialAllowed ?? false,
      mixedSkuAllowed: normalizedInput.mixedSkuAllowed ?? false,
      active: true,
      createdBy: normalizedInput.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalizedInput.parentLocationId
        ? {
            parentLocationId:
              normalizedInput.parentLocationId,
          }
        : {}),
      ...(normalizedInput.description !== undefined
        ? { description: normalizedInput.description }
        : {}),
      ...(normalizedInput.capacity !== undefined
        ? { capacity: normalizedInput.capacity }
        : {}),
      ...(normalizedInput.dimensions !== undefined
        ? { dimensions: normalizedInput.dimensions }
        : {}),
      ...(normalizedInput.coordinates !== undefined
        ? { coordinates: normalizedInput.coordinates }
        : {}),
      ...(normalizedInput.temperatureMinimumCelsius !== undefined
        ? {
            temperatureMinimumCelsius:
              normalizedInput.temperatureMinimumCelsius,
          }
        : {}),
      ...(normalizedInput.temperatureMaximumCelsius !== undefined
        ? {
            temperatureMaximumCelsius:
              normalizedInput.temperatureMaximumCelsius,
          }
        : {}),
    };

    return this.repository.save(location);
  }

  async get(
    tenantId: string,
    warehouseId: string,
    locationId: string,
  ): Promise<Location> {
    const location = await this.repository.findById(
      tenantId.trim(),
      warehouseId.trim(),
      locationId.trim(),
    );

    if (!location) {
      throw new LocationNotFoundError(locationId);
    }

    return location;
  }

  async list(filter: LocationListFilter): Promise<Location[]> {
    if (!filter.tenantId.trim()) {
      throw new LocationValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    if (!filter.warehouseId.trim()) {
      throw new LocationValidationError(
        "Depo kimliği boş bırakılamaz.",
      );
    }

    return this.repository.list({
      ...filter,
      tenantId: filter.tenantId.trim(),
      warehouseId: filter.warehouseId.trim(),
    });
  }

  async update(
    tenantId: string,
    warehouseId: string,
    locationId: string,
    input: UpdateLocationInput,
  ): Promise<Location> {
    const location = await this.get(
      tenantId,
      warehouseId,
      locationId,
    );

    const normalizedInput = validateUpdateLocationInput(input);

    const updatedLocation: Location = {
      ...location,
      ...normalizedInput,
      updatedAt: this.now(),
    };

    delete (
      updatedLocation as Location & {
        updatedBy?: string;
      }
    ).updatedBy;

    return this.repository.save(updatedLocation);
  }

  async changeStatus(
    tenantId: string,
    warehouseId: string,
    locationId: string,
    nextStatus: LocationStatus,
  ): Promise<Location> {
    const location = await this.get(
      tenantId,
      warehouseId,
      locationId,
    );

    if (location.status === nextStatus) {
      return location;
    }

    const allowedStatuses = STATUS_TRANSITIONS[location.status];

    if (!allowedStatuses.includes(nextStatus)) {
      throw new LocationValidationError(
        `${location.status} durumundan ${nextStatus} durumuna geçilemez.`,
      );
    }

    return this.repository.save({
      ...location,
      status: nextStatus,
      active: nextStatus !== "inactive",
      updatedAt: this.now(),
    });
  }
}
