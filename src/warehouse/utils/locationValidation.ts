import type {
  CreateLocationInput,
  LocationCapacity,
  LocationDimensions,
  LocationHierarchy,
  UpdateLocationInput,
} from "../types/Location";
import { LocationValidationError } from "../types/LocationErrors";

const LOCATION_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,31}$/;

function requireNonEmpty(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new LocationValidationError(
      `${fieldName} boş bırakılamaz.`,
    );
  }

  return normalized;
}

export function normalizeLocationCode(
  value: string,
  fieldName = "Lokasyon kodu",
): string {
  const normalized = requireNonEmpty(value, fieldName).toUpperCase();

  if (!LOCATION_CODE_PATTERN.test(normalized)) {
    throw new LocationValidationError(
      `${fieldName} en fazla 32 karakter olmalı ve yalnızca harf, rakam, alt çizgi veya tire içermelidir.`,
    );
  }

  return normalized;
}

export function normalizeLocationHierarchy(
  hierarchy: LocationHierarchy,
): LocationHierarchy {
  return {
    zoneCode: normalizeLocationCode(
      hierarchy.zoneCode,
      "Bölge kodu",
    ),
    ...(hierarchy.aisleCode
      ? {
          aisleCode: normalizeLocationCode(
            hierarchy.aisleCode,
            "Koridor kodu",
          ),
        }
      : {}),
    ...(hierarchy.rackCode
      ? {
          rackCode: normalizeLocationCode(
            hierarchy.rackCode,
            "Raf kodu",
          ),
        }
      : {}),
    ...(hierarchy.levelCode
      ? {
          levelCode: normalizeLocationCode(
            hierarchy.levelCode,
            "Kat kodu",
          ),
        }
      : {}),
    ...(hierarchy.binCode
      ? {
          binCode: normalizeLocationCode(
            hierarchy.binCode,
            "Göz kodu",
          ),
        }
      : {}),
  };
}

export function buildLocationFullCode(
  hierarchy: LocationHierarchy,
): string {
  const normalized = normalizeLocationHierarchy(hierarchy);

  return [
    normalized.zoneCode,
    normalized.aisleCode,
    normalized.rackCode,
    normalized.levelCode,
    normalized.binCode,
  ]
    .filter((value): value is string => Boolean(value))
    .join("-");
}

function validateNonNegativeValues(
  values: Array<number | undefined>,
  message: string,
): void {
  if (
    values.some(
      (value) =>
        value !== undefined &&
        (!Number.isFinite(value) || value < 0),
    )
  ) {
    throw new LocationValidationError(message);
  }
}

function validateCapacity(
  capacity: LocationCapacity,
): LocationCapacity {
  validateNonNegativeValues(
    [
      capacity.maximumWeightKilograms,
      capacity.maximumVolumeCubicMeters,
      capacity.maximumPalletCount,
      capacity.maximumUnitCount,
    ],
    "Lokasyon kapasite değerleri sıfırdan küçük olamaz.",
  );

  return { ...capacity };
}

function validateDimensions(
  dimensions: LocationDimensions,
): LocationDimensions {
  validateNonNegativeValues(
    [
      dimensions.widthCentimeters,
      dimensions.depthCentimeters,
      dimensions.heightCentimeters,
    ],
    "Lokasyon ölçüleri sıfırdan küçük olamaz.",
  );

  return { ...dimensions };
}

function validateTemperatureRange(
  minimum: number | undefined,
  maximum: number | undefined,
): void {
  if (
    minimum !== undefined &&
    (!Number.isFinite(minimum) || minimum < -100 || minimum > 100)
  ) {
    throw new LocationValidationError(
      "Minimum sıcaklık -100 ile 100 derece arasında olmalıdır.",
    );
  }

  if (
    maximum !== undefined &&
    (!Number.isFinite(maximum) || maximum < -100 || maximum > 100)
  ) {
    throw new LocationValidationError(
      "Maksimum sıcaklık -100 ile 100 derece arasında olmalıdır.",
    );
  }

  if (
    minimum !== undefined &&
    maximum !== undefined &&
    minimum > maximum
  ) {
    throw new LocationValidationError(
      "Minimum sıcaklık maksimum sıcaklıktan büyük olamaz.",
    );
  }
}

export function validateCreateLocationInput(
  input: CreateLocationInput,
): CreateLocationInput {
  const hierarchy = normalizeLocationHierarchy(input.hierarchy);

  validateTemperatureRange(
    input.temperatureMinimumCelsius,
    input.temperatureMaximumCelsius,
  );

  return {
    tenantId: requireNonEmpty(input.tenantId, "Firma kimliği"),
    warehouseId: requireNonEmpty(
      input.warehouseId,
      "Depo kimliği",
    ),
    code: normalizeLocationCode(input.code),
    name: requireNonEmpty(input.name, "Lokasyon adı"),
    type: input.type,
    hierarchy,
    createdBy: requireNonEmpty(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(input.parentLocationId?.trim()
      ? { parentLocationId: input.parentLocationId.trim() }
      : {}),
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    ...(input.capacity
      ? { capacity: validateCapacity(input.capacity) }
      : {}),
    ...(input.dimensions
      ? { dimensions: validateDimensions(input.dimensions) }
      : {}),
    ...(input.coordinates
      ? { coordinates: { ...input.coordinates } }
      : {}),
    ...(input.temperatureMinimumCelsius !== undefined
      ? {
          temperatureMinimumCelsius:
            input.temperatureMinimumCelsius,
        }
      : {}),
    ...(input.temperatureMaximumCelsius !== undefined
      ? {
          temperatureMaximumCelsius:
            input.temperatureMaximumCelsius,
        }
      : {}),
    hazardousMaterialAllowed:
      input.hazardousMaterialAllowed ?? false,
    mixedSkuAllowed: input.mixedSkuAllowed ?? false,
  };
}

export function validateUpdateLocationInput(
  input: UpdateLocationInput,
): UpdateLocationInput {
  validateTemperatureRange(
    input.temperatureMinimumCelsius,
    input.temperatureMaximumCelsius,
  );

  return {
    updatedBy: requireNonEmpty(
      input.updatedBy,
      "Güncelleyen kullanıcı",
    ),
    ...(input.name !== undefined
      ? { name: requireNonEmpty(input.name, "Lokasyon adı") }
      : {}),
    ...(input.description !== undefined
      ? { description: input.description.trim() }
      : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.capacity
      ? { capacity: validateCapacity(input.capacity) }
      : {}),
    ...(input.dimensions
      ? { dimensions: validateDimensions(input.dimensions) }
      : {}),
    ...(input.coordinates
      ? { coordinates: { ...input.coordinates } }
      : {}),
    ...(input.temperatureMinimumCelsius !== undefined
      ? {
          temperatureMinimumCelsius:
            input.temperatureMinimumCelsius,
        }
      : {}),
    ...(input.temperatureMaximumCelsius !== undefined
      ? {
          temperatureMaximumCelsius:
            input.temperatureMaximumCelsius,
        }
      : {}),
    ...(input.hazardousMaterialAllowed !== undefined
      ? {
          hazardousMaterialAllowed:
            input.hazardousMaterialAllowed,
        }
      : {}),
    ...(input.mixedSkuAllowed !== undefined
      ? { mixedSkuAllowed: input.mixedSkuAllowed }
      : {}),
  };
}
