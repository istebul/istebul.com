import type {
  Product,
  ProductBarcode,
  ProductListFilter,
  ProductSku,
} from "../types/Product";

export interface ProductRepository {
  findById(
    tenantId: string,
    productId: string,
  ): Promise<Product | null>;

  findByCode(
    tenantId: string,
    code: string,
  ): Promise<Product | null>;

  list(filter: ProductListFilter): Promise<Product[]>;

  saveProduct(product: Product): Promise<Product>;

  findSkuByCode(
    tenantId: string,
    skuCode: string,
  ): Promise<ProductSku | null>;

  saveSku(sku: ProductSku): Promise<ProductSku>;

  findBarcode(
    tenantId: string,
    value: string,
  ): Promise<ProductBarcode | null>;

  saveBarcode(
    barcode: ProductBarcode,
  ): Promise<ProductBarcode>;
}
