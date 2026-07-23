/** Salon / dining area — derived from distinct `restaurant_tables.salon` + room metadata. */
export interface DiningRoom {
  id: string;
  restaurantId: string;
  name: string;
  /** Display label (often same as salon key). */
  salonKey?: string;
  capacity?: number;
  ambiance?: Array<'quiet' | 'lively' | 'romantic' | 'family' | 'business' | string>;
  features?: string[];
  smokingAllowed?: boolean;
  outdoor?: boolean;
  sortOrder?: number;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

export function createDiningRoom(
  partial: Partial<DiningRoom> & Pick<DiningRoom, 'id' | 'restaurantId' | 'name'>,
): DiningRoom {
  return {
    ambiance: [],
    features: [],
    active: true,
    ...partial,
  };
}
