/** Loyalty rule — often settings/campaign jsonb until a dedicated table exists. */
export interface LoyaltyRule {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  active?: boolean;
  pointsPerCurrency?: number;
  redeemThreshold?: number;
  tiers?: Array<{ name: string; minPoints: number; benefits?: string[] }>;
  metadata?: Record<string, unknown>;
}

export function createLoyaltyRule(
  partial: Partial<LoyaltyRule> & Pick<LoyaltyRule, 'id' | 'restaurantId' | 'name'>,
): LoyaltyRule {
  return {
    active: true,
    tiers: [],
    ...partial,
  };
}
