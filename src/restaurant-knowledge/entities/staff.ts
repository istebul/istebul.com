/** Staff — from `restaurant_users` (+ waiter assignment fields on tables). */
export type StaffRole =
  | 'owner'
  | 'manager'
  | 'waiter'
  | 'kitchen'
  | 'host'
  | 'cashier'
  | string;

export interface Staff {
  id: string;
  restaurantId: string;
  userId?: string;
  displayName?: string;
  role: StaffRole;
  active?: boolean;
  phone?: string;
  assignedSalon?: string;
  metadata?: Record<string, unknown>;
}

export function createStaff(
  partial: Partial<Staff> & Pick<Staff, 'id' | 'restaurantId' | 'role'>,
): Staff {
  return {
    active: true,
    ...partial,
  };
}
