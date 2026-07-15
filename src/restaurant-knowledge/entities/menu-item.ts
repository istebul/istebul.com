/** Maps from existing `menu_items` (+ legacy `products` fallback at adapter layer). */
export type StockStatus = 'in_stock' | 'low' | 'out' | 'unknown';

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  active?: boolean;
  stockStatus?: StockStatus;
  dietaryTags?: string[];
  allergens?: string[];
  prepMinutes?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export function createMenuItem(
  partial: Partial<MenuItem> & Pick<MenuItem, 'id' | 'restaurantId' | 'name'>,
): MenuItem {
  return {
    active: true,
    currency: 'TRY',
    stockStatus: 'unknown',
    dietaryTags: [],
    allergens: [],
    tags: [],
    ...partial,
  };
}
