/**
 * Read-only knowledge data shapes.
 * Mapped from existing Garson Supabase tables — P8-B does not create new tables.
 */

import type { BusinessHours } from '../entities/business-hours.ts';
import type { Campaign } from '../entities/campaign.ts';
import type { Customer } from '../entities/customer.ts';
import type { DiningRoom } from '../entities/dining-room.ts';
import type { Holiday } from '../entities/holiday.ts';
import type { LoyaltyRule } from '../entities/loyalty-rule.ts';
import type { MenuCategory } from '../entities/menu-category.ts';
import type { MenuItem } from '../entities/menu-item.ts';
import type { PaymentPolicy } from '../entities/payment-policy.ts';
import type { Reservation } from '../entities/reservation.ts';
import type { Restaurant } from '../entities/restaurant.ts';
import type { Staff } from '../entities/staff.ts';
import type { Table } from '../entities/table.ts';

/** Inventory facts derived from existing inventory_* / menu stock fields. */
export interface InventoryItemFact {
  id: string;
  restaurantId: string;
  name: string;
  category?: string;
  unit?: string;
  quantityOnHand?: number;
  minStock?: number;
  stockStatus?: 'in_stock' | 'low' | 'out' | 'unknown';
  menuItemId?: string;
  updatedAt?: string;
}

export interface OccupancySnapshot {
  restaurantId: string;
  asOf: string;
  date: string;
  openReservations: number;
  seatedParties: number;
  waitlistCount: number;
  occupiedTables: number;
  availableTables: number;
  estimatedLoadPercent?: number;
  note?: string;
}

export interface RestaurantKnowledgeBundle {
  restaurant: Restaurant | null;
  diningRooms: DiningRoom[];
  tables: Table[];
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  reservations: Reservation[];
  customers: Customer[];
  campaigns: Campaign[];
  staff: Staff[];
  businessHours: BusinessHours[];
  holidays: Holiday[];
  paymentPolicies: PaymentPolicy[];
  loyaltyRules: LoyaltyRule[];
  inventory: InventoryItemFact[];
  occupancy: OccupancySnapshot | null;
}

export interface KnowledgeSource {
  /** Load raw facts for a restaurant from existing stores (no new tables). */
  loadRestaurantBundle(restaurantId: string, options?: { date?: string }): Promise<RestaurantKnowledgeBundle>;
}
