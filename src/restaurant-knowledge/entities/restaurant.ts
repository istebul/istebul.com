/** Core tenant entity — maps from existing `restaurants` table. */
export interface Restaurant {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  plan?: string;
  phone?: string;
  address?: string;
  description?: string;
  city?: string;
  cuisine?: string[];
  coverImageUrl?: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  locale?: string;
  features?: string[];
  socialLinks?: Record<string, string>;
  metadata?: Record<string, unknown>;
  updatedAt?: string;
}

export function createRestaurant(
  partial: Partial<Restaurant> & Pick<Restaurant, 'id' | 'name'>,
): Restaurant {
  return {
    timezone: 'Europe/Istanbul',
    locale: 'tr-TR',
    cuisine: [],
    features: [],
    ...partial,
  };
}
