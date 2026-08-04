import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  WarehouseAddress,
  WarehouseCapacity,
} from "../types/Warehouse";
import { WarehouseValidationError } from "../types/WarehouseErrors";

const WAREHOUSE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

function requireNonEmpty(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new WarehouseValidationError(`${fieldName} boş bırakılamaz.`);
  }

  return normalized;
}

function validateAddress(address: WarehouseAddress): WarehouseAddress {
  const countryCode = requireNonEmpty(
    address.countryCode,
    "Ülke kodu",
  ).toUpperCase();

  if (!COUNTRY_CODE_PATTERN.test(countryCode)) {
    throw new WarehouseValidationError(
      "Ülke kodu iki harfli ISO formatında olmalıdır.",
    );
  }

  return {
    addressLine: requireNonEmpty(address.addressLine, "Adres"),
    city: requireNonEmpty(address.city, "Şehir"),
    countryCode,
    ...(address.district?.trim()
      ? { district: address.district.trim() }
      : {}),
    ...(address.postalCode?.trim()
      ? { postalCode: address.postalCode.trim() }
      : {}),
  };
}

function validateCapacity(
  capacity: WarehouseCapacity,
): WarehouseCapacity {
  const values = [
    capacity.totalAreaSquareMeters,
    capacity.usableAreaSquareMeters,
    capacity.maximumPalletCapacity,
    capacity.maximumBinCapacity,
  ];

  if (
    values.some(
      (value) =>
        value !== undefined &&
        (!Number.isFinite(value) || value < 0),
    )
  ) {
    throw new WarehouseValidationError(
      "Depo kapasite değerleri sıfırdan küçük olamaz.",
    );
  }

  if (
    capacity.totalAreaSquareMeters !== undefined &&
    capacity.usableAreaSquareMeters !== undefined &&
    capacity.usableAreaSquareMeters > capacity.totalAreaSquareMeters
  ) {
    throw new WarehouseValidationError(
      "Kullanılabilir alan toplam alandan büyük olamaz.",
    );
  }

  return { ...capacity };
}

export function normalizeWarehouseCode(code: string): string {
  const normalized = requireNonEmpty(code, "Depo kodu").toUpperCase();

  if (!WAREHOUSE_CODE_PATTERN.test(normalized)) {
    throw new WarehouseValidationError(
      "Depo kodu 2-32 karakter olmalı ve yalnızca harf, rakam, alt çizgi veya tire içermelidir.",
    );
  }

  return normalized;
}

export function validateCreateWarehouseInput(
  input: CreateWarehouseInput,
): CreateWarehouseInput {
  return {
    tenantId: requireNonEmpty(input.tenantId, "Firma kimliği"),
    code: normalizeWarehouseCode(input.code),
    name: requireNonEmpty(input.name, "Depo adı"),
    createdBy: requireNonEmpty(input.createdBy, "Oluşturan kullanıcı"),
    timezone: input.timezone?.trim() || "Europe/Istanbul",
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    ...(input.address
      ? { address: validateAddress(input.address) }
      : {}),
    ...(input.capacity
      ? { capacity: validateCapacity(input.capacity) }
      : {}),
  };
}

export function validateUpdateWarehouseInput(
  input: UpdateWarehouseInput,
): UpdateWarehouseInput {
  return {
    updatedBy: requireNonEmpty(input.updatedBy, "Güncelleyen kullanıcı"),
    ...(input.name !== undefined
      ? { name: requireNonEmpty(input.name, "Depo adı") }
      : {}),
    ...(input.description !== undefined
      ? { description: input.description.trim() }
      : {}),
    ...(input.timezone !== undefined
      ? {
          timezone: requireNonEmpty(
            input.timezone,
            "Saat dilimi",
          ),
        }
      : {}),
    ...(input.address
      ? { address: validateAddress(input.address) }
      : {}),
    ...(input.capacity
      ? { capacity: validateCapacity(input.capacity) }
      : {}),
  };
}
