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
import type { InventoryItemFact, OccupancySnapshot } from './source.ts';

/** Nested room → tables under a salon. */
export interface DiningRoomNode {
  room: DiningRoom;
  tables: Table[];
}

/** Nested category → items. */
export interface MenuCategoryNode {
  category: MenuCategory;
  items: MenuItem[];
}

/**
 * Restaurant Snapshot — single object AI modules consume.
 *
 * Restaurant
 *   → Salonlar (dining rooms + tables)
 *   → Menü
 *   → Kampanyalar
 *   → Çalışma Saatleri / Holidays
 *   → Ödeme Politikaları
 *   → CRM / Loyalty
 *   → Bugünkü yoğunluk
 */
export interface RestaurantSnapshot {
  restaurantId: string;
  generatedAt: string;
  /** Target day for occupancy / reservation slice (YYYY-MM-DD). */
  asOfDate: string;
  restaurant: Restaurant;
  diningRooms: DiningRoomNode[];
  /** Flat table list for quick filter (same refs as diningRooms). */
  tables: Table[];
  menu: {
    categories: MenuCategoryNode[];
    items: MenuItem[];
  };
  campaigns: Campaign[];
  businessHours: BusinessHours[];
  holidays: Holiday[];
  paymentPolicies: PaymentPolicy[];
  loyaltyRules: LoyaltyRule[];
  /** Lightweight CRM sample / recent customers (not full DB dump). */
  customers: Customer[];
  staff: Staff[];
  reservations: Reservation[];
  inventory: InventoryItemFact[];
  occupancy: OccupancySnapshot | null;
  meta?: {
    source?: string;
    version?: string;
  };
}

export const KNOWLEDGE_SNAPSHOT_VERSION = 'p8b.1';
