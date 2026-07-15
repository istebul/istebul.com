/** Campaign facts — often from `restaurants.campaigns` jsonb or marketing payloads. */
export interface Campaign {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  type?: string;
  active?: boolean;
  startsAt?: string;
  endsAt?: string;
  discountPercent?: number;
  discountAmount?: number;
  applicableMenuItemIds?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export function createCampaign(
  partial: Partial<Campaign> & Pick<Campaign, 'id' | 'restaurantId' | 'name'>,
): Campaign {
  return {
    active: true,
    tags: [],
    applicableMenuItemIds: [],
    ...partial,
  };
}
