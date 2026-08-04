import type {
  CreateProductBarcodeInput,
  CreateProductInput,
  CreateProductSkuInput,
  Product,
  ProductBarcode,
  ProductListFilter,
  ProductSku,
  UpdateProductInput,
} from "../types/Product";
import {
  ProductBarcodeConflictError,
  ProductCodeConflictError,
  ProductNotFoundError,
  ProductSkuConflictError,
  ProductValidationError,
} from "../types/ProductErrors";
import type { ProductStatus } from "../types/ProductStatus";
import {
  validateCreateProductBarcodeInput,
  validateCreateProductInput,
  validateCreateProductSkuInput,
  validateUpdateProductInput,
} from "../utils/productValidation";
import type { ProductRepository } from "./ProductRepository";

export interface ProductServiceDependencies {
  repository: ProductRepository;
  createId?: () => string;
  now?: () => string;
}

const STATUS_TRANSITIONS: Record<
  ProductStatus,
  readonly ProductStatus[]
> = {
  draft: ["active", "archived"],
  active: ["inactive", "discontinued", "archived"],
  inactive: ["active", "discontinued", "archived"],
  discontinued: ["archived"],
  archived: [],
};

export class ProductService {
  private readonly repository: ProductRepository;
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(dependencies: ProductServiceDependencies) {
    this.repository = dependencies.repository;
    this.createId =
      dependencies.createId ?? (() => crypto.randomUUID());
    this.now =
      dependencies.now ?? (() => new Date().toISOString());
  }

  async create(input: CreateProductInput): Promise<Product> {
    const normalized = validateCreateProductInput(input);

    const existing = await this.repository.findByCode(
      normalized.tenantId,
      normalized.code,
    );

    if (existing) {
      throw new ProductCodeConflictError(normalized.code);
    }

    const timestamp = this.now();

    return this.repository.saveProduct({
      id: this.createId(),
      tenantId: normalized.tenantId,
      code: normalized.code,
      name: normalized.name,
      status: "draft",
      baseUnit: normalized.baseUnit,
      tracking: normalized.tracking ?? {
        lotTrackingRequired: false,
        serialTrackingRequired: false,
        expiryDateTrackingRequired: false,
        productionDateTrackingRequired: false,
      },
      hazardousMaterial: normalized.hazardousMaterial ?? false,
      temperatureControlled:
        normalized.temperatureControlled ?? false,
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(normalized.description !== undefined
        ? { description: normalized.description }
        : {}),
      ...(normalized.category !== undefined
        ? { category: normalized.category }
        : {}),
      ...(normalized.brand !== undefined
        ? { brand: normalized.brand }
        : {}),
      ...(normalized.weightKilograms !== undefined
        ? { weightKilograms: normalized.weightKilograms }
        : {}),
      ...(normalized.volumeCubicMeters !== undefined
        ? { volumeCubicMeters: normalized.volumeCubicMeters }
        : {}),
      ...(normalized.dimensions !== undefined
        ? { dimensions: normalized.dimensions }
        : {}),
      ...(normalized.stockRules !== undefined
        ? { stockRules: normalized.stockRules }
        : {}),
    });
  }

  async get(
    tenantId: string,
    productId: string,
  ): Promise<Product> {
    const product = await this.repository.findById(
      tenantId.trim(),
      productId.trim(),
    );

    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    return product;
  }

  async list(filter: ProductListFilter): Promise<Product[]> {
    if (!filter.tenantId.trim()) {
      throw new ProductValidationError(
        "Firma kimliği boş bırakılamaz.",
      );
    }

    return this.repository.list({
      ...filter,
      tenantId: filter.tenantId.trim(),
    });
  }

  async update(
    tenantId: string,
    productId: string,
    input: UpdateProductInput,
  ): Promise<Product> {
    const product = await this.get(tenantId, productId);
    const normalized = validateUpdateProductInput(input);

    const updated: Product = {
      ...product,
      ...normalized,
      updatedAt: this.now(),
    };

    delete (
      updated as Product & {
        updatedBy?: string;
      }
    ).updatedBy;

    return this.repository.saveProduct(updated);
  }

  async changeStatus(
    tenantId: string,
    productId: string,
    nextStatus: ProductStatus,
  ): Promise<Product> {
    const product = await this.get(tenantId, productId);

    if (product.status === nextStatus) {
      return product;
    }

    if (!STATUS_TRANSITIONS[product.status].includes(nextStatus)) {
      throw new ProductValidationError(
        `${product.status} durumundan ${nextStatus} durumuna geçilemez.`,
      );
    }

    return this.repository.saveProduct({
      ...product,
      status: nextStatus,
      updatedAt: this.now(),
    });
  }

  async createSku(
    input: CreateProductSkuInput,
  ): Promise<ProductSku> {
    const normalized = validateCreateProductSkuInput(input);

    await this.get(normalized.tenantId, normalized.productId);

    const existing = await this.repository.findSkuByCode(
      normalized.tenantId,
      normalized.skuCode,
    );

    if (existing) {
      throw new ProductSkuConflictError(normalized.skuCode);
    }

    const timestamp = this.now();

    return this.repository.saveSku({
      id: this.createId(),
      tenantId: normalized.tenantId,
      productId: normalized.productId,
      skuCode: normalized.skuCode,
      name: normalized.name,
      unit: normalized.unit,
      conversionFactor: normalized.conversionFactor ?? 1,
      active: true,
      createdBy: normalized.createdBy,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  async createBarcode(
    input: CreateProductBarcodeInput,
  ): Promise<ProductBarcode> {
    const normalized =
      validateCreateProductBarcodeInput(input);

    await this.get(normalized.tenantId, normalized.productId);

    const existing = await this.repository.findBarcode(
      normalized.tenantId,
      normalized.value,
    );

    if (existing) {
      throw new ProductBarcodeConflictError(normalized.value);
    }

    return this.repository.saveBarcode({
      id: this.createId(),
      tenantId: normalized.tenantId,
      productId: normalized.productId,
      value: normalized.value,
      type: normalized.type,
      primary: normalized.primary ?? false,
      active: true,
      createdBy: normalized.createdBy,
      createdAt: this.now(),
      ...(normalized.skuId
        ? { skuId: normalized.skuId }
        : {}),
    });
  }
}
