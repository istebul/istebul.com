/**
 * Customer preference / CRM context for AI prompts and personalization.
 * Ready for GarsonAI modules — no Supabase persistence yet.
 */
export interface CustomerPreference {
  key: string;
  value: string;
}

export interface CustomerContext {
  customerId: string;
  restaurantId?: string;
  displayName?: string;
  phone?: string;
  email?: string;
  language?: string;
  loyaltyTier?: string;
  allergies?: string[];
  dietaryRestrictions?: string[];
  favoriteItems?: string[];
  preferences?: CustomerPreference[];
  visitCount?: number;
  lastVisitAt?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  updatedAt: string;
}

export function createEmptyCustomerContext(
  customerId: string,
  partial: Partial<Omit<CustomerContext, 'customerId' | 'updatedAt'>> = {},
): CustomerContext {
  return {
    customerId,
    restaurantId: partial.restaurantId,
    displayName: partial.displayName,
    phone: partial.phone,
    email: partial.email,
    language: partial.language || 'tr',
    loyaltyTier: partial.loyaltyTier,
    allergies: partial.allergies || [],
    dietaryRestrictions: partial.dietaryRestrictions || [],
    favoriteItems: partial.favoriteItems || [],
    preferences: partial.preferences || [],
    visitCount: partial.visitCount ?? 0,
    lastVisitAt: partial.lastVisitAt,
    notes: partial.notes,
    metadata: partial.metadata || {},
    updatedAt: new Date().toISOString(),
  };
}

export function customerContextToPromptBlock(ctx: CustomerContext): string {
  const lines = [
    `Customer: ${ctx.displayName || ctx.customerId}`,
    ctx.language ? `Language: ${ctx.language}` : null,
    ctx.allergies?.length ? `Allergies: ${ctx.allergies.join(', ')}` : null,
    ctx.dietaryRestrictions?.length
      ? `Dietary: ${ctx.dietaryRestrictions.join(', ')}`
      : null,
    ctx.favoriteItems?.length
      ? `Favorites: ${ctx.favoriteItems.join(', ')}`
      : null,
    ctx.notes ? `Notes: ${ctx.notes}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}
