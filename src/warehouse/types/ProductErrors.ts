export class ProductValidationError extends Error {
  readonly code = "PRODUCT_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "ProductValidationError";
  }
}

export class ProductNotFoundError extends Error {
  readonly code = "PRODUCT_NOT_FOUND";

  constructor(productId: string) {
    super(`Ürün bulunamadı: ${productId}`);
    this.name = "ProductNotFoundError";
  }
}

export class ProductCodeConflictError extends Error {
  readonly code = "PRODUCT_CODE_CONFLICT";

  constructor(code: string) {
    super(`Bu ürün kodu zaten kullanılıyor: ${code}`);
    this.name = "ProductCodeConflictError";
  }
}

export class ProductSkuConflictError extends Error {
  readonly code = "PRODUCT_SKU_CONFLICT";

  constructor(skuCode: string) {
    super(`Bu SKU kodu zaten kullanılıyor: ${skuCode}`);
    this.name = "ProductSkuConflictError";
  }
}

export class ProductBarcodeConflictError extends Error {
  readonly code = "PRODUCT_BARCODE_CONFLICT";

  constructor(value: string) {
    super(`Bu barkod zaten kullanılıyor: ${value}`);
    this.name = "ProductBarcodeConflictError";
  }
}
