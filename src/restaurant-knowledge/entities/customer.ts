/** Maps from existing `customers` (+ AI CustomerContext enrichment later). */
export interface Customer {
  id: string;
  restaurantId: string;
  name?: string;
  phone?: string;
  email?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderAt?: string;
  loyaltyTier?: string;
  loyaltyPoints?: number;
  allergies?: string[];
  dietary?: string[];
  favorites?: string[];
  notes?: string;
  metadata?: Record<string, unknown>;
}

export function createCustomer(
  partial: Partial<Customer> & Pick<Customer, 'id' | 'restaurantId'>,
): Customer {
  return {
    allergies: [],
    dietary: [],
    favorites: [],
    ...partial,
  };
}
