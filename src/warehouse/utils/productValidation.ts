import type {
  CreateProductBarcodeInput,
  CreateProductInput,
  CreateProductSkuInput,
  ProductDimensions,
  ProductStockRules,
  ProductTrackingRules,
  UpdateProductInput,
} from "../types/Product";
import { ProductValidationError } from "../types/ProductErrors";

const PRODUCT_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,63}$/;
const SKU_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_.-]{1,63}$/;

function requireNonEmpty(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new ProductValidationError(
      `${fieldName} boş bırakılamaz.`,
    );
  }

  return normalized;
}

function validateNonNegative(
  value: number | undefined,
  fieldName: string,
): number | undefined {
  if (
    value !== undefined &&
    (!Number.isFinite(value) || value < 0)
  ) {
    throw new ProductValidationError(
      `${fieldName} sıfırdan küçük olamaz.`,
    );
  }

  return value;
}

function validateDimensions(
  dimensions: ProductDimensions,
): ProductDimensions {
  return {
    ...(validateNonNegative(
      dimensions.widthCentimeters,
      "Ürün genişliği",
    ) !== undefined
      ? { widthCentimeters: dimensions.widthCentimeters }
      : {}),
    ...(validateNonNegative(
      dimensions.depthCentimeters,
      "Ürün derinliği",
    ) !== undefined
      ? { depthCentimeters: dimensions.depthCentimeters }
      : {}),
    ...(validateNonNegative(
      dimensions.heightCentimeters,
      "Ürün yüksekliği",
    ) !== undefined
      ? { heightCentimeters: dimensions.heightCentimeters }
      : {}),
  };
}

function validateStockRules(
  rules: ProductStockRules,
): ProductStockRules {
  const fields = [
    ["Minimum stok", rules.minimumStockQuantity],
    ["Maksimum stok", rules.maximumStockQuantity],
    ["Yeniden sipariş noktası", rules.reorderPointQuantity],
    ["Yeniden sipariş miktarı", rules.reorderQuantity],
    ["Güvenlik stoğu", rules.safetyStockQuantity],
  ] as const;

  for (const [fieldName, value] of fields) {
    validateNonNegative(value, fieldName);
  }

  if (
    rules.minimumStockQuantity !== undefined &&
    rules.maximumStockQuantity !== undefined &&
    rules.minimumStockQuantity > rules.maximumStockQuantity
  ) {
    throw new ProductValidationError(
      "Minimum stok miktarı maksimum stok miktarından büyük olamaz.",
    );
  }

  return { ...rules };
}

function normalizeTrackingRules(
  tracking?: Partial<ProductTrackingRules>,
): ProductTrackingRules {
  const rules: ProductTrackingRules = {
    lotTrackingRequired: tracking?.lotTrackingRequired ?? false,
    serialTrackingRequired:
      tracking?.serialTrackingRequired ?? false,
    expiryDateTrackingRequired:
      tracking?.expiryDateTrackingRequired ?? false,
    productionDateTrackingRequired:
      tracking?.productionDateTrackingRequired ?? false,
    ...(tracking?.minimumShelfLifeDays !== undefined
      ? {
          minimumShelfLifeDays:
            tracking.minimumShelfLifeDays,
        }
      : {}),
  };

  validateNonNegative(
    rules.minimumShelfLifeDays,
    "Asgari raf ömrü",
  );

  if (
    rules.expiryDateTrackingRequired &&
    !rules.lotTrackingRequired &&
    !rules.serialTrackingRequired
  ) {
    throw new ProductValidationError(
      "Son kullanma tarihi takibi için lot veya seri numarası takibi etkin olmalıdır.",
    );
  }

  return rules;
}

export function normalizeProductCode(code: string): string {
  const normalized = requireNonEmpty(
    code,
    "Ürün kodu",
  ).toUpperCase();

  if (!PRODUCT_CODE_PATTERN.test(normalized)) {
    throw new ProductValidationError(
      "Ürün kodu 2-64 karakter olmalı ve yalnızca harf, rakam, alt çizgi veya tire içermelidir.",
    );
  }

  return normalized;
}

export function normalizeSkuCode(code: string): string {
  const normalized = requireNonEmpty(
    code,
    "SKU kodu",
  ).toUpperCase();

  if (!SKU_CODE_PATTERN.test(normalized)) {
    throw new ProductValidationError(
      "SKU kodu 2-64 karakter olmalı ve yalnızca harf, rakam, nokta, alt çizgi veya tire içermelidir.",
    );
  }

  return normalized;
}

export function validateCreateProductInput(
  input: CreateProductInput,
): Omit<CreateProductInput, "tracking"> & {
  tracking: ProductTrackingRules;
} {
  const weightKilograms = validateNonNegative(
    input.weightKilograms,
    "Ürün ağırlığı",
  );

  const volumeCubicMeters = validateNonNegative(
    input.volumeCubicMeters,
    "Ürün hacmi",
  );

  return {
    tenantId: requireNonEmpty(input.tenantId, "Firma kimliği"),
    code: normalizeProductCode(input.code),
    name: requireNonEmpty(input.name, "Ürün adı"),
    baseUnit: input.baseUnit,
    createdBy: requireNonEmpty(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    tracking: normalizeTrackingRules(input.tracking),
    hazardousMaterial: input.hazardousMaterial ?? false,
    temperatureControlled:
      input.temperatureControlled ?? false,
    ...(weightKilograms !== undefined
      ? { weightKilograms }
      : {}),
    ...(volumeCubicMeters !== undefined
      ? { volumeCubicMeters }
      : {}),
    ...(input.description?.trim()
      ? { description: input.description.trim() }
      : {}),
    ...(input.category?.trim()
      ? { category: input.category.trim() }
      : {}),
    ...(input.brand?.trim()
      ? { brand: input.brand.trim() }
      : {}),
    ...(input.dimensions
      ? { dimensions: validateDimensions(input.dimensions) }
      : {}),
    ...(input.stockRules
      ? { stockRules: validateStockRules(input.stockRules) }
      : {}),
  };
}

export function validateUpdateProductInput(
  input: UpdateProductInput,
): Omit<UpdateProductInput, "tracking"> & {
  tracking?: ProductTrackingRules;
} {
  return {
    updatedBy: requireNonEmpty(
      input.updatedBy,
      "Güncelleyen kullanıcı",
    ),
    ...(input.name !== undefined
      ? { name: requireNonEmpty(input.name, "Ürün adı") }
      : {}),
    ...(input.description !== undefined
      ? { description: input.description.trim() }
      : {}),
    ...(input.category !== undefined
      ? { category: input.category.trim() }
      : {}),
    ...(input.brand !== undefined
      ? { brand: input.brand.trim() }
      : {}),
    ...(input.baseUnit !== undefined
      ? { baseUnit: input.baseUnit }
      : {}),
    ...(input.weightKilograms !== undefined
      ? {
          weightKilograms: validateNonNegative(
            input.weightKilograms,
            "Ürün ağırlığı",
          ) as number,
        }
      : {}),
    ...(input.volumeCubicMeters !== undefined
      ? {
          volumeCubicMeters: validateNonNegative(
            input.volumeCubicMeters,
            "Ürün hacmi",
          ) as number,
        }
      : {}),
    ...(input.dimensions
      ? { dimensions: validateDimensions(input.dimensions) }
      : {}),
    ...(input.tracking
      ? { tracking: normalizeTrackingRules(input.tracking) }
      : {}),
    ...(input.stockRules
      ? { stockRules: validateStockRules(input.stockRules) }
      : {}),
    ...(input.hazardousMaterial !== undefined
      ? { hazardousMaterial: input.hazardousMaterial }
      : {}),
    ...(input.temperatureControlled !== undefined
      ? {
          temperatureControlled:
            input.temperatureControlled,
        }
      : {}),
  };
}

export function validateCreateProductSkuInput(
  input: CreateProductSkuInput,
): CreateProductSkuInput {
  if (
    input.conversionFactor !== undefined &&
    (!Number.isFinite(input.conversionFactor) ||
      input.conversionFactor <= 0)
  ) {
    throw new ProductValidationError(
      "SKU dönüşüm katsayısı sıfırdan büyük olmalıdır.",
    );
  }

  return {
    tenantId: requireNonEmpty(input.tenantId, "Firma kimliği"),
    productId: requireNonEmpty(input.productId, "Ürün kimliği"),
    skuCode: normalizeSkuCode(input.skuCode),
    name: requireNonEmpty(input.name, "SKU adı"),
    unit: input.unit,
    conversionFactor: input.conversionFactor ?? 1,
    createdBy: requireNonEmpty(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
  };
}

export function validateCreateProductBarcodeInput(
  input: CreateProductBarcodeInput,
): CreateProductBarcodeInput {
  const value = requireNonEmpty(input.value, "Barkod");

  if (value.length > 128) {
    throw new ProductValidationError(
      "Barkod en fazla 128 karakter olabilir.",
    );
  }

  return {
    tenantId: requireNonEmpty(input.tenantId, "Firma kimliği"),
    productId: requireNonEmpty(input.productId, "Ürün kimliği"),
    value,
    type: input.type,
    primary: input.primary ?? false,
    createdBy: requireNonEmpty(
      input.createdBy,
      "Oluşturan kullanıcı",
    ),
    ...(input.skuId?.trim()
      ? { skuId: input.skuId.trim() }
      : {}),
  };
}
