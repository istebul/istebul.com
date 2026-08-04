import type { BarcodeType } from "./BarcodeType";
import type { ProductStatus } from "./ProductStatus";
import type { UnitOfMeasure } from "./UnitOfMeasure";

export interface ProductDimensions {
  widthCentimeters?: number;
  depthCentimeters?: number;
  heightCentimeters?: number;
}

export interface ProductTrackingRules {
  lotTrackingRequired: boolean;
  serialTrackingRequired: boolean;
  expiryDateTrackingRequired: boolean;
  productionDateTrackingRequired: boolean;
  minimumShelfLifeDays?: number;
}

export interface ProductStockRules {
  minimumStockQuantity?: number;
  maximumStockQuantity?: number;
  reorderPointQuantity?: number;
  reorderQuantity?: number;
  safetyStockQuantity?: number;
}

export interface Product {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  status: ProductStatus;
  baseUnit: UnitOfMeasure;
  weightKilograms?: number;
  volumeCubicMeters?: number;
  dimensions?: ProductDimensions;
  tracking: ProductTrackingRules;
  stockRules?: ProductStockRules;
  hazardousMaterial: boolean;
  temperatureControlled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSku {
  id: string;
  tenantId: string;
  productId: string;
  skuCode: string;
  name: string;
  unit: UnitOfMeasure;
  conversionFactor: number;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductBarcode {
  id: string;
  tenantId: string;
  productId: string;
  skuId?: string;
  value: string;
  type: BarcodeType;
  primary: boolean;
  active: boolean;
  createdBy: string;
  createdAt: string;
}

export interface CreateProductInput {
  tenantId: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  baseUnit: UnitOfMeasure;
  weightKilograms?: number;
  volumeCubicMeters?: number;
  dimensions?: ProductDimensions;
  tracking?: Partial<ProductTrackingRules>;
  stockRules?: ProductStockRules;
  hazardousMaterial?: boolean;
  temperatureControlled?: boolean;
  createdBy: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  baseUnit?: UnitOfMeasure;
  weightKilograms?: number;
  volumeCubicMeters?: number;
  dimensions?: ProductDimensions;
  tracking?: Partial<ProductTrackingRules>;
  stockRules?: ProductStockRules;
  hazardousMaterial?: boolean;
  temperatureControlled?: boolean;
  updatedBy: string;
}

export interface CreateProductSkuInput {
  tenantId: string;
  productId: string;
  skuCode: string;
  name: string;
  unit: UnitOfMeasure;
  conversionFactor?: number;
  createdBy: string;
}

export interface CreateProductBarcodeInput {
  tenantId: string;
  productId: string;
  skuId?: string;
  value: string;
  type: BarcodeType;
  primary?: boolean;
  createdBy: string;
}

export interface ProductListFilter {
  tenantId: string;
  status?: ProductStatus;
  category?: string;
  brand?: string;
  search?: string;
}
