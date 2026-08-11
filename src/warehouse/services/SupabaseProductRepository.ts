import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Product,
  ProductBarcode,
  ProductListFilter,
  ProductSku,
} from "../types/Product";
import type { ProductRepository } from "./ProductRepository";

const PRODUCT_TABLE = "warehouse_products";
const SKU_TABLE = "warehouse_product_skus";
const BARCODE_TABLE = "warehouse_product_barcodes";

const PRODUCT_SELECT = [
  "id",
  "account_id",
  "code",
  "name",
  "description",
  "category",
  "brand",
  "status",
  "base_unit",
  "weight_kilograms",
  "volume_cubic_meters",
  "width_centimeters",
  "depth_centimeters",
  "height_centimeters",
  "lot_tracking_required",
  "serial_tracking_required",
  "expiry_date_tracking_required",
  "production_date_tracking_required",
  "minimum_shelf_life_days",
  "minimum_stock_quantity",
  "maximum_stock_quantity",
  "reorder_point_quantity",
  "reorder_quantity",
  "safety_stock_quantity",
  "hazardous_material",
  "temperature_controlled",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const SKU_SELECT = [
  "id",
  "account_id",
  "product_id",
  "sku_code",
  "name",
  "unit",
  "conversion_factor",
  "active",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

const BARCODE_SELECT = [
  "id",
  "account_id",
  "product_id",
  "sku_id",
  "value",
  "type",
  "is_primary",
  "active",
  "created_by",
  "created_at",
].join(",");

interface ProductRow {
  id: string;
  account_id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  status: Product["status"];
  base_unit: Product["baseUnit"];
  weight_kilograms: number | string | null;
  volume_cubic_meters: number | string | null;
  width_centimeters: number | string | null;
  depth_centimeters: number | string | null;
  height_centimeters: number | string | null;
  lot_tracking_required: boolean;
  serial_tracking_required: boolean;
  expiry_date_tracking_required: boolean;
  production_date_tracking_required: boolean;
  minimum_shelf_life_days: number | null;
  minimum_stock_quantity: number | string | null;
  maximum_stock_quantity: number | string | null;
  reorder_point_quantity: number | string | null;
  reorder_quantity: number | string | null;
  safety_stock_quantity: number | string | null;
  hazardous_material: boolean;
  temperature_controlled: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface SkuRow {
  id: string;
  account_id: string;
  product_id: string;
  sku_code: string;
  name: string;
  unit: ProductSku["unit"];
  conversion_factor: number | string;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface BarcodeRow {
  id: string;
  account_id: string;
  product_id: string;
  sku_id: string | null;
  value: string;
  type: ProductBarcode["type"];
  is_primary: boolean;
  active: boolean;
  created_by: string;
  created_at: string;
}

interface SupabaseErrorLike {
  message: string;
}

function mapProductRow(row: ProductRow): Product {
  const dimensions = {
    ...(row.width_centimeters !== null
      ? { widthCentimeters: Number(row.width_centimeters) }
      : {}),
    ...(row.depth_centimeters !== null
      ? { depthCentimeters: Number(row.depth_centimeters) }
      : {}),
    ...(row.height_centimeters !== null
      ? { heightCentimeters: Number(row.height_centimeters) }
      : {}),
  };

  const stockRules = {
    ...(row.minimum_stock_quantity !== null
      ? { minimumStockQuantity: Number(row.minimum_stock_quantity) }
      : {}),
    ...(row.maximum_stock_quantity !== null
      ? { maximumStockQuantity: Number(row.maximum_stock_quantity) }
      : {}),
    ...(row.reorder_point_quantity !== null
      ? { reorderPointQuantity: Number(row.reorder_point_quantity) }
      : {}),
    ...(row.reorder_quantity !== null
      ? { reorderQuantity: Number(row.reorder_quantity) }
      : {}),
    ...(row.safety_stock_quantity !== null
      ? { safetyStockQuantity: Number(row.safety_stock_quantity) }
      : {}),
  };

  return {
    id: row.id,
    tenantId: row.account_id,
    code: row.code,
    name: row.name,
    status: row.status,
    baseUnit: row.base_unit,
    tracking: {
      lotTrackingRequired: row.lot_tracking_required,
      serialTrackingRequired: row.serial_tracking_required,
      expiryDateTrackingRequired: row.expiry_date_tracking_required,
      productionDateTrackingRequired:
        row.production_date_tracking_required,
      ...(row.minimum_shelf_life_days !== null
        ? { minimumShelfLifeDays: row.minimum_shelf_life_days }
        : {}),
    },
    hazardousMaterial: row.hazardous_material,
    temperatureControlled: row.temperature_controlled,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.description !== null ? { description: row.description } : {}),
    ...(row.category !== null ? { category: row.category } : {}),
    ...(row.brand !== null ? { brand: row.brand } : {}),
    ...(row.weight_kilograms !== null
      ? { weightKilograms: Number(row.weight_kilograms) }
      : {}),
    ...(row.volume_cubic_meters !== null
      ? { volumeCubicMeters: Number(row.volume_cubic_meters) }
      : {}),
    ...(Object.keys(dimensions).length > 0 ? { dimensions } : {}),
    ...(Object.keys(stockRules).length > 0 ? { stockRules } : {}),
  };
}

function toProductRow(product: Product) {
  return {
    id: product.id,
    account_id: product.tenantId,
    code: product.code,
    name: product.name,
    description: product.description ?? null,
    category: product.category ?? null,
    brand: product.brand ?? null,
    status: product.status,
    base_unit: product.baseUnit,
    weight_kilograms: product.weightKilograms ?? null,
    volume_cubic_meters: product.volumeCubicMeters ?? null,
    width_centimeters: product.dimensions?.widthCentimeters ?? null,
    depth_centimeters: product.dimensions?.depthCentimeters ?? null,
    height_centimeters: product.dimensions?.heightCentimeters ?? null,
    lot_tracking_required: product.tracking.lotTrackingRequired,
    serial_tracking_required: product.tracking.serialTrackingRequired,
    expiry_date_tracking_required:
      product.tracking.expiryDateTrackingRequired,
    production_date_tracking_required:
      product.tracking.productionDateTrackingRequired,
    minimum_shelf_life_days:
      product.tracking.minimumShelfLifeDays ?? null,
    minimum_stock_quantity:
      product.stockRules?.minimumStockQuantity ?? null,
    maximum_stock_quantity:
      product.stockRules?.maximumStockQuantity ?? null,
    reorder_point_quantity:
      product.stockRules?.reorderPointQuantity ?? null,
    reorder_quantity:
      product.stockRules?.reorderQuantity ?? null,
    safety_stock_quantity:
      product.stockRules?.safetyStockQuantity ?? null,
    hazardous_material: product.hazardousMaterial,
    temperature_controlled: product.temperatureControlled,
    created_by: product.createdBy,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

function mapSkuRow(row: SkuRow): ProductSku {
  return {
    id: row.id,
    tenantId: row.account_id,
    productId: row.product_id,
    skuCode: row.sku_code,
    name: row.name,
    unit: row.unit,
    conversionFactor: Number(row.conversion_factor),
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSkuRow(sku: ProductSku) {
  return {
    id: sku.id,
    account_id: sku.tenantId,
    product_id: sku.productId,
    sku_code: sku.skuCode,
    name: sku.name,
    unit: sku.unit,
    conversion_factor: sku.conversionFactor,
    active: sku.active,
    created_by: sku.createdBy,
    created_at: sku.createdAt,
    updated_at: sku.updatedAt,
  };
}

function mapBarcodeRow(row: BarcodeRow): ProductBarcode {
  return {
    id: row.id,
    tenantId: row.account_id,
    productId: row.product_id,
    value: row.value,
    type: row.type,
    primary: row.is_primary,
    active: row.active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    ...(row.sku_id !== null ? { skuId: row.sku_id } : {}),
  };
}

function toBarcodeRow(barcode: ProductBarcode) {
  return {
    id: barcode.id,
    account_id: barcode.tenantId,
    product_id: barcode.productId,
    sku_id: barcode.skuId ?? null,
    value: barcode.value,
    type: barcode.type,
    is_primary: barcode.primary,
    active: barcode.active,
    created_by: barcode.createdBy,
    created_at: barcode.createdAt,
  };
}

export class SupabaseProductRepository
  implements ProductRepository
{
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async findById(
    tenantId: string,
    productId: string,
  ): Promise<Product | null> {
    const { data, error } = await this.client
      .from(PRODUCT_TABLE)
      .select(PRODUCT_SELECT)
      .eq("account_id", tenantId)
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      this.throwError("Ürün okunamadı", error);
    }

    return data
      ? mapProductRow(data as unknown as ProductRow)
      : null;
  }

  async findByCode(
    tenantId: string,
    code: string,
  ): Promise<Product | null> {
    const { data, error } = await this.client
      .from(PRODUCT_TABLE)
      .select(PRODUCT_SELECT)
      .eq("account_id", tenantId)
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();

    if (error) {
      this.throwError("Ürün kodu okunamadı", error);
    }

    return data
      ? mapProductRow(data as unknown as ProductRow)
      : null;
  }

  async list(filter: ProductListFilter): Promise<Product[]> {
    let query = this.client
      .from(PRODUCT_TABLE)
      .select(PRODUCT_SELECT)
      .eq("account_id", filter.tenantId);

    if (filter.status !== undefined) {
      query = query.eq("status", filter.status);
    }

    if (filter.category !== undefined) {
      query = query.eq("category", filter.category);
    }

    if (filter.brand !== undefined) {
      query = query.eq("brand", filter.brand);
    }

    if (filter.search?.trim()) {
      const search =
        filter.search.trim().replace(/[%(),]/g, "");

      query = query.or(
        `code.ilike.%${search}%,name.ilike.%${search}%,brand.ilike.%${search}%`,
      );
    }

    const { data, error } = await query.order(
      "name",
      { ascending: true },
    );

    if (error) {
      this.throwError("Ürünler listelenemedi", error);
    }

    return (data ?? []).map((row) =>
      mapProductRow(row as unknown as ProductRow),
    );
  }

  async saveProduct(product: Product): Promise<Product> {
    const existing = await this.findById(
      product.tenantId,
      product.id,
    );

    const query = existing
      ? this.client
          .from(PRODUCT_TABLE)
          .update(toProductRow(product))
          .eq("account_id", product.tenantId)
          .eq("id", product.id)
      : this.client
          .from(PRODUCT_TABLE)
          .insert(toProductRow(product));

    const { data, error } = await query
      .select(PRODUCT_SELECT)
      .single();

    if (error || !data) {
      this.throwError("Ürün saklanamadı", error);
    }

    return mapProductRow(
      data as unknown as ProductRow,
    );
  }

  async findSkuByCode(
    tenantId: string,
    skuCode: string,
  ): Promise<ProductSku | null> {
    const { data, error } = await this.client
      .from(SKU_TABLE)
      .select(SKU_SELECT)
      .eq("account_id", tenantId)
      .eq("sku_code", skuCode.trim().toUpperCase())
      .maybeSingle();

    if (error) {
      this.throwError("SKU okunamadı", error);
    }

    return data
      ? mapSkuRow(data as unknown as SkuRow)
      : null;
  }

  async saveSku(sku: ProductSku): Promise<ProductSku> {
    const { data: existing, error: lookupError } =
      await this.client
        .from(SKU_TABLE)
        .select("id")
        .eq("account_id", sku.tenantId)
        .eq("id", sku.id)
        .maybeSingle();

    if (lookupError) {
      this.throwError("SKU varlık kontrolü yapılamadı", lookupError);
    }

    const query = existing
      ? this.client
          .from(SKU_TABLE)
          .update(toSkuRow(sku))
          .eq("account_id", sku.tenantId)
          .eq("id", sku.id)
      : this.client
          .from(SKU_TABLE)
          .insert(toSkuRow(sku));

    const { data, error } = await query
      .select(SKU_SELECT)
      .single();

    if (error || !data) {
      this.throwError("SKU saklanamadı", error);
    }

    return mapSkuRow(
      data as unknown as SkuRow,
    );
  }

  async findBarcode(
    tenantId: string,
    value: string,
  ): Promise<ProductBarcode | null> {
    const { data, error } = await this.client
      .from(BARCODE_TABLE)
      .select(BARCODE_SELECT)
      .eq("account_id", tenantId)
      .eq("value", value)
      .maybeSingle();

    if (error) {
      this.throwError("Barkod okunamadı", error);
    }

    return data
      ? mapBarcodeRow(data as unknown as BarcodeRow)
      : null;
  }

  async saveBarcode(
    barcode: ProductBarcode,
  ): Promise<ProductBarcode> {
    const { data: existing, error: lookupError } =
      await this.client
        .from(BARCODE_TABLE)
        .select("id")
        .eq("account_id", barcode.tenantId)
        .eq("id", barcode.id)
        .maybeSingle();

    if (lookupError) {
      this.throwError(
        "Barkod varlık kontrolü yapılamadı",
        lookupError,
      );
    }

    const query = existing
      ? this.client
          .from(BARCODE_TABLE)
          .update(toBarcodeRow(barcode))
          .eq("account_id", barcode.tenantId)
          .eq("id", barcode.id)
      : this.client
          .from(BARCODE_TABLE)
          .insert(toBarcodeRow(barcode));

    const { data, error } = await query
      .select(BARCODE_SELECT)
      .single();

    if (error || !data) {
      this.throwError("Barkod saklanamadı", error);
    }

    return mapBarcodeRow(
      data as unknown as BarcodeRow,
    );
  }

  private throwError(
    message: string,
    error: SupabaseErrorLike | null,
  ): never {
    throw new Error(
      `${message}: ${
        error?.message ?? "Bilinmeyen veritabanı hatası."
      }`,
    );
  }
}
