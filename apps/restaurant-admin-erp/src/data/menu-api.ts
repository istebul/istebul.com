import type { SupabaseClient } from '@supabase/supabase-js';
import { formatCurrencyTry } from '@/lib/format';

export class MenuDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MenuDataError';
  }
}

export interface MenuCategoryRow {
  id: string;
  name: string;
  sortOrder: number;
}

export interface MenuItemRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceLabel: string;
  categoryId: string | null;
  categoryName: string;
  active: boolean;
  updatedAt: string | null;
  createdAt: string | null;
}

export interface MenuPageData {
  categories: MenuCategoryRow[];
  items: MenuItemRow[];
}

interface CategoryDbRow {
  id: string;
  name: string;
  sort_order: number | null;
}

interface MenuItemDbRow {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  category_id: string | null;
  active: boolean | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  menu_categories:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
}

function requireClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) throw new MenuDataError('Supabase bağlantısı yapılandırılmamış.');
  return client;
}

function requireRestaurantId(restaurantId: string): string {
  const value = String(restaurantId || '').trim();
  if (!value) throw new MenuDataError('Restoran kimliği gerekli.');
  return value;
}

function resolveCategoryName(
  row: MenuItemDbRow,
  categoriesById: Map<string, string>,
): string {
  const nested = Array.isArray(row.menu_categories)
    ? row.menu_categories[0]
    : row.menu_categories;
  if (nested?.name) return nested.name;
  if (row.category_id && categoriesById.has(row.category_id)) {
    return categoriesById.get(row.category_id) as string;
  }
  return String(row.category || 'Genel');
}

function isActiveItem(row: MenuItemDbRow): boolean {
  if (typeof row.active === 'boolean') return row.active;
  if (typeof row.is_active === 'boolean') return row.is_active;
  return true;
}

export async function fetchMenuPageData(
  client: SupabaseClient | null,
  restaurantId: string,
): Promise<MenuPageData> {
  const db = requireClient(client);
  const tenantId = requireRestaurantId(restaurantId);

  const [categoriesResult, itemsResult] = await Promise.all([
    db
      .from('menu_categories')
      .select('id, name, sort_order')
      .eq('restaurant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    db
      .from('menu_items')
      .select(
        'id, name, description, price, category, category_id, active, is_active, created_at, updated_at, menu_categories(id, name)',
      )
      .eq('restaurant_id', tenantId)
      .order('name', { ascending: true }),
  ]);

  if (categoriesResult.error) {
    throw new MenuDataError(categoriesResult.error.message || 'Kategoriler yüklenemedi.');
  }
  if (itemsResult.error) {
    throw new MenuDataError(itemsResult.error.message || 'Ürünler yüklenemedi.');
  }

  const categories: MenuCategoryRow[] = ((categoriesResult.data || []) as CategoryDbRow[]).map(
    (row) => ({
      id: row.id,
      name: row.name,
      sortOrder: Number(row.sort_order ?? 0),
    }),
  );

  const categoriesById = new Map(categories.map((item) => [item.id, item.name]));

  const items: MenuItemRow[] = ((itemsResult.data || []) as MenuItemDbRow[]).map((row) => {
    const price = Number(row.price ?? 0);
    const safePrice = Number.isFinite(price) ? price : 0;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: safePrice,
      priceLabel: formatCurrencyTry(safePrice),
      categoryId: row.category_id,
      categoryName: resolveCategoryName(row, categoriesById),
      active: isActiveItem(row),
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  });

  return { categories, items };
}
