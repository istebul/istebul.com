import type {
  Product,
  ProductBarcode,
  ProductListFilter,
  ProductSku,
} from "../types/Product";
import type { ProductRepository } from "./ProductRepository";

export class InMemoryProductRepository
  implements ProductRepository
{
  private readonly products = new Map<string, Product>();
  private readonly skus = new Map<string, ProductSku>();
  private readonly barcodes = new Map<string, ProductBarcode>();

  async findById(
    tenantId: string,
    productId: string,
  ): Promise<Product | null> {
    const product = this.products.get(productId);

    if (!product || product.tenantId !== tenantId) {
      return null;
    }

    return structuredClone(product);
  }

  async findByCode(
    tenantId: string,
    code: string,
  ): Promise<Product | null> {
    const normalizedCode = code.trim().toUpperCase();

    for (const product of this.products.values()) {
      if (
        product.tenantId === tenantId &&
        product.code === normalizedCode
      ) {
        return structuredClone(product);
      }
    }

    return null;
  }

  async list(filter: ProductListFilter): Promise<Product[]> {
    const search = filter.search?.trim().toLocaleLowerCase("tr-TR");

    return [...this.products.values()]
      .filter((product) => product.tenantId === filter.tenantId)
      .filter(
        (product) =>
          filter.status === undefined ||
          product.status === filter.status,
      )
      .filter(
        (product) =>
          filter.category === undefined ||
          product.category === filter.category,
      )
      .filter(
        (product) =>
          filter.brand === undefined ||
          product.brand === filter.brand,
      )
      .filter((product) => {
        if (!search) {
          return true;
        }

        return (
          product.code.toLocaleLowerCase("tr-TR").includes(search) ||
          product.name.toLocaleLowerCase("tr-TR").includes(search) ||
          product.brand
            ?.toLocaleLowerCase("tr-TR")
            .includes(search) === true
        );
      })
      .sort((left, right) =>
        left.name.localeCompare(right.name, "tr-TR"),
      )
      .map((product) => structuredClone(product));
  }

  async saveProduct(product: Product): Promise<Product> {
    const stored = structuredClone(product);
    this.products.set(stored.id, stored);

    return structuredClone(stored);
  }

  async findSkuByCode(
    tenantId: string,
    skuCode: string,
  ): Promise<ProductSku | null> {
    const normalizedCode = skuCode.trim().toUpperCase();

    for (const sku of this.skus.values()) {
      if (
        sku.tenantId === tenantId &&
        sku.skuCode === normalizedCode
      ) {
        return structuredClone(sku);
      }
    }

    return null;
  }

  async saveSku(sku: ProductSku): Promise<ProductSku> {
    const stored = structuredClone(sku);
    this.skus.set(stored.id, stored);

    return structuredClone(stored);
  }

  async findBarcode(
    tenantId: string,
    value: string,
  ): Promise<ProductBarcode | null> {
    for (const barcode of this.barcodes.values()) {
      if (
        barcode.tenantId === tenantId &&
        barcode.value === value
      ) {
        return structuredClone(barcode);
      }
    }

    return null;
  }

  async saveBarcode(
    barcode: ProductBarcode,
  ): Promise<ProductBarcode> {
    const stored = structuredClone(barcode);
    this.barcodes.set(stored.id, stored);

    return structuredClone(stored);
  }
}
