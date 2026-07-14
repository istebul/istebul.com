/**
 * Restaurant operational context for AI prompts and decisions.
 * Ready for GarsonAI modules — no Supabase persistence yet.
 */
export interface RestaurantHours {
  day: number;
  open: string;
  close: string;
  closed?: boolean;
}

export interface RestaurantContext {
  restaurantId: string;
  name: string;
  cuisine?: string[];
  city?: string;
  timezone?: string;
  locale?: string;
  seatingCapacity?: number;
  hours?: RestaurantHours[];
  policies?: {
    reservationRequired?: boolean;
    depositRequired?: boolean;
    cancellationHours?: number;
    dressCode?: string;
    note?: string;
  };
  features?: string[];
  menuHighlights?: string[];
  metadata?: Record<string, unknown>;
  updatedAt: string;
}

export function createEmptyRestaurantContext(
  restaurantId: string,
  partial: Partial<Omit<RestaurantContext, 'restaurantId' | 'updatedAt'>> = {},
): RestaurantContext {
  return {
    restaurantId,
    name: partial.name || 'Restaurant',
    cuisine: partial.cuisine || [],
    city: partial.city,
    timezone: partial.timezone || 'Europe/Istanbul',
    locale: partial.locale || 'tr-TR',
    seatingCapacity: partial.seatingCapacity,
    hours: partial.hours || [],
    policies: partial.policies || {},
    features: partial.features || [],
    menuHighlights: partial.menuHighlights || [],
    metadata: partial.metadata || {},
    updatedAt: new Date().toISOString(),
  };
}

export function restaurantContextToPromptBlock(ctx: RestaurantContext): string {
  const lines = [
    `Restaurant: ${ctx.name} (id=${ctx.restaurantId})`,
    ctx.city ? `City: ${ctx.city}` : null,
    ctx.cuisine?.length ? `Cuisine: ${ctx.cuisine.join(', ')}` : null,
    ctx.seatingCapacity !== null && ctx.seatingCapacity !== undefined
      ? `Capacity: ${ctx.seatingCapacity}`
      : null,
    ctx.menuHighlights?.length
      ? `Menu highlights: ${ctx.menuHighlights.join(', ')}`
      : null,
    ctx.policies?.note ? `Policy note: ${ctx.policies.note}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}
