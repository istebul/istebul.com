/**
 * Existing Garson / Supabase table names that P8-B Knowledge Graph reads from.
 * P8-B does NOT create new tables — adapters project these into entities.
 */
export const EXISTING_KNOWLEDGE_TABLES = {
  restaurant: 'restaurants',
  restaurantUsers: 'restaurant_users',
  restaurantSettings: 'restaurant_settings',
  menuCategories: 'menu_categories',
  menuItems: 'menu_items',
  productsLegacy: 'products',
  customers: 'customers',
  reservations: 'reservations',
  restaurantTables: 'restaurant_tables',
  reservationTables: 'reservation_tables',
  waitlist: 'restaurant_waitlist',
  orders: 'orders',
  orderItems: 'order_items',
  preorders: 'preorders',
  inventoryCategories: 'inventory_categories',
  inventoryItems: 'inventory_items',
  paymentPolicies: 'payment_policies',
  paymentProviders: 'payment_providers',
  paymentTransactions: 'payment_transactions',
  aiInsightsCache: 'ai_insights',
} as const;

export type ExistingKnowledgeTable =
  (typeof EXISTING_KNOWLEDGE_TABLES)[keyof typeof EXISTING_KNOWLEDGE_TABLES];

/** Entity → primary existing table mapping (documentation + adapter wiring). */
export const ENTITY_SOURCE_MAP = {
  Restaurant: EXISTING_KNOWLEDGE_TABLES.restaurant,
  DiningRoom: EXISTING_KNOWLEDGE_TABLES.restaurantTables,
  Table: EXISTING_KNOWLEDGE_TABLES.restaurantTables,
  MenuCategory: EXISTING_KNOWLEDGE_TABLES.menuCategories,
  MenuItem: EXISTING_KNOWLEDGE_TABLES.menuItems,
  Reservation: EXISTING_KNOWLEDGE_TABLES.reservations,
  Customer: EXISTING_KNOWLEDGE_TABLES.customers,
  Campaign: EXISTING_KNOWLEDGE_TABLES.restaurant,
  Staff: EXISTING_KNOWLEDGE_TABLES.restaurantUsers,
  BusinessHours: EXISTING_KNOWLEDGE_TABLES.restaurant,
  Holiday: EXISTING_KNOWLEDGE_TABLES.restaurant,
  PaymentPolicy: EXISTING_KNOWLEDGE_TABLES.paymentPolicies,
  LoyaltyRule: EXISTING_KNOWLEDGE_TABLES.restaurantSettings,
} as const;
