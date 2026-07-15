/** Weekly hours — from `restaurants.working_hours` jsonb (no new table). */
export interface BusinessHours {
  id: string;
  restaurantId: string;
  /** 0 = Sunday … 6 = Saturday (JS Date.getDay). */
  day: number;
  open: string;
  close: string;
  closed?: boolean;
  note?: string;
}

export function createBusinessHours(
  partial: Partial<BusinessHours> &
    Pick<BusinessHours, 'id' | 'restaurantId' | 'day' | 'open' | 'close'>,
): BusinessHours {
  return {
    closed: false,
    ...partial,
  };
}
