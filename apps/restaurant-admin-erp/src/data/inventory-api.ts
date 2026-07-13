import type { SupabaseClient } from '@supabase/supabase-js';
import { formatCurrencyTry } from '@/lib/format';

export class InventoryDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InventoryDataError';
  }
}

export interface InventoryCategoryRow {
  id: string;
  name: string;
  sortOrder: number;
}

export interface InventoryItemRow {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  currentStock: number;
  minStock: number;
  isCritical: boolean;
  unit: string;
  lastPurchasePrice: number;
  lastPurchasePriceLabel: string;
  averageCost: number;
  averageCostLabel: string;
  updatedAt: string | null;
  createdAt: string | null;
}

export interface InventorySummary {
  totalItems: number;
  criticalItems: number;
  lowStockItems: number;
  categoryCount: number;
}

export interface InventoryPageData {
  categories: InventoryCategoryRow[];
  items: InventoryItemRow[];
  summary: InventorySummary;
}

interface CategoryDbRow {
  id: string;
  name: string;
  sort_order: number | null;
}

interface InventoryItemDbRow {
  id: string;
  name: string;
  category_id: string | null;
  current_stock: number | null;
  min_stock: number | null;
  unit: string | null;
  last_purchase_price: number | null;
  average_cost: number | null;
  created_at: string | null;
  updated_at: string | null;
  inventory_categories:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
}

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new InventoryDataError('Supabase bağlantısı yapılandırılmamış.');
  return client;
}

function requireRestaurantId(restaurantId: string): string {
  const value = String(restaurantId || '').trim();
  if (!value) throw new InventoryDataError('Restoran kimliği gerekli.');
  return value;
}

function toNumber(value: number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function resolveCategoryName(
  row: InventoryItemDbRow,
  categoriesById: Map<string, string>,
): string {
  const nested = Array.isArray(row.inventory_categories)
    ? row.inventory_categories[0]
    : row.inventory_categories;
  if (nested?.name) return nested.name;
  if (row.category_id && categoriesById.has(row.category_id)) {
    return categoriesById.get(row.category_id) as string;
  }
  return 'Genel';
}

function mapItem(
  row: InventoryItemDbRow,
  categoriesById: Map<string, string>,
): InventoryItemRow {
  const currentStock = toNumber(row.current_stock);
  const minStock = toNumber(row.min_stock);
  const lastPurchasePrice = toNumber(row.last_purchase_price);
  const averageCost = toNumber(row.average_cost);

  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    categoryName: resolveCategoryName(row, categoriesById),
    currentStock,
    minStock,
    isCritical: currentStock <= minStock,
    unit: String(row.unit || 'adet'),
    lastPurchasePrice,
    lastPurchasePriceLabel: formatCurrencyTry(lastPurchasePrice),
    averageCost,
    averageCostLabel: formatCurrencyTry(averageCost),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export async function fetchInventoryPageData(
  client: SupabaseClient | null,
  restaurantId: string,
): Promise<InventoryPageData> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);

  const [categoriesResult, itemsResult] = await Promise.all([
    db
      .from('inventory_categories')
      .select('id, name, sort_order')
      .eq('restaurant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    db
      .from('inventory_items')
      .select(
        'id, name, category_id, current_stock, min_stock, unit, last_purchase_price, average_cost, created_at, updated_at, inventory_categories(id, name)',
      )
      .eq('restaurant_id', tenantId)
      .order('name', { ascending: true }),
  ]);

  if (categoriesResult.error) {
    throw new InventoryDataError(
      categoriesResult.error.message || 'Stok kategorileri yüklenemedi.',
    );
  }
  if (itemsResult.error) {
    throw new InventoryDataError(itemsResult.error.message || 'Stok kalemleri yüklenemedi.');
  }

  const categories: InventoryCategoryRow[] = (
    (categoriesResult.data || []) as CategoryDbRow[]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: Number(row.sort_order ?? 0),
  }));

  const categoriesById = new Map(categories.map((item) => [item.id, item.name]));
  const items = ((itemsResult.data || []) as InventoryItemDbRow[]).map((row) =>
    mapItem(row, categoriesById),
  );

  const criticalItems = items.filter((item) => item.isCritical).length;
  const lowStockItems = items.filter(
    (item) => item.currentStock > 0 && item.currentStock <= item.minStock,
  ).length;

  return {
    categories,
    items,
    summary: {
      totalItems: items.length,
      criticalItems,
      lowStockItems,
      categoryCount: categories.length,
    },
  };
}
