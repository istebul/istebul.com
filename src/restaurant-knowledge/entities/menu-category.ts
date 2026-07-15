/** Maps from existing `menu_categories`. */
export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

export function createMenuCategory(
  partial: Partial<MenuCategory> & Pick<MenuCategory, 'id' | 'restaurantId' | 'name'>,
): MenuCategory {
  return {
    active: true,
    sortOrder: 0,
    ...partial,
  };
}
