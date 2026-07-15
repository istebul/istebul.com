import { createBusinessHours } from '../entities/business-hours.ts';
import { createCampaign } from '../entities/campaign.ts';
import { createCustomer } from '../entities/customer.ts';
import { createDiningRoom } from '../entities/dining-room.ts';
import { createHoliday } from '../entities/holiday.ts';
import { createLoyaltyRule } from '../entities/loyalty-rule.ts';
import { createMenuCategory } from '../entities/menu-category.ts';
import { createMenuItem } from '../entities/menu-item.ts';
import { createPaymentPolicy } from '../entities/payment-policy.ts';
import { createReservation } from '../entities/reservation.ts';
import { createRestaurant } from '../entities/restaurant.ts';
import { createStaff } from '../entities/staff.ts';
import { createTable } from '../entities/table.ts';
import type {
  InventoryItemFact,
  KnowledgeSource,
  OccupancySnapshot,
  RestaurantKnowledgeBundle,
} from '../types/source.ts';

export type InMemoryKnowledgeSeed = Partial<RestaurantKnowledgeBundle> & {
  restaurantId?: string;
};

function emptyBundle(restaurantId: string): RestaurantKnowledgeBundle {
  return {
    restaurant: createRestaurant({ id: restaurantId, name: 'Restaurant' }),
    diningRooms: [],
    tables: [],
    menuCategories: [],
    menuItems: [],
    reservations: [],
    customers: [],
    campaigns: [],
    staff: [],
    businessHours: [],
    holidays: [],
    paymentPolicies: [],
    loyaltyRules: [],
    inventory: [],
    occupancy: null,
  };
}

/**
 * Fixture / test source. Production adapters will read EXISTING_KNOWLEDGE_TABLES.
 */
export class InMemoryKnowledgeSource implements KnowledgeSource {
  private bundles = new Map<string, RestaurantKnowledgeBundle>();

  seed(restaurantId: string, seed: InMemoryKnowledgeSeed = {}): RestaurantKnowledgeBundle {
    const base = emptyBundle(restaurantId);
    const next: RestaurantKnowledgeBundle = {
      ...base,
      ...seed,
      restaurant:
        seed.restaurant ??
        createRestaurant({
          id: restaurantId,
          name: 'Restaurant',
        }),
      diningRooms: seed.diningRooms || base.diningRooms,
      tables: seed.tables || base.tables,
      menuCategories: seed.menuCategories || base.menuCategories,
      menuItems: seed.menuItems || base.menuItems,
      reservations: seed.reservations || base.reservations,
      customers: seed.customers || base.customers,
      campaigns: seed.campaigns || base.campaigns,
      staff: seed.staff || base.staff,
      businessHours: seed.businessHours || base.businessHours,
      holidays: seed.holidays || base.holidays,
      paymentPolicies: seed.paymentPolicies || base.paymentPolicies,
      loyaltyRules: seed.loyaltyRules || base.loyaltyRules,
      inventory: seed.inventory || base.inventory,
      occupancy: seed.occupancy ?? base.occupancy,
    };
    this.bundles.set(restaurantId, next);
    return next;
  }

  /** Demo restaurant used by unit tests and local AI wiring. */
  seedDemo(restaurantId = 'demo-lokanta'): RestaurantKnowledgeBundle {
    const rooms = [
      createDiningRoom({
        id: 'room-salon',
        restaurantId,
        name: 'Ana Salon',
        salonKey: 'salon',
        ambiance: ['quiet', 'business'],
        capacity: 40,
      }),
      createDiningRoom({
        id: 'room-terrace',
        restaurantId,
        name: 'Teras',
        salonKey: 'teras',
        outdoor: true,
        ambiance: ['lively'],
        capacity: 20,
      }),
    ];
    const tables = [
      createTable({
        id: 't1',
        restaurantId,
        name: 'M1',
        diningRoomId: 'room-salon',
        salon: 'salon',
        capacity: 2,
        quiet: true,
        windowSeat: true,
        status: 'available',
      }),
      createTable({
        id: 't2',
        restaurantId,
        name: 'M4',
        diningRoomId: 'room-salon',
        salon: 'salon',
        capacity: 4,
        quiet: true,
        status: 'available',
        tags: ['sessiz'],
      }),
      createTable({
        id: 't3',
        restaurantId,
        name: 'T2',
        diningRoomId: 'room-terrace',
        salon: 'teras',
        capacity: 4,
        outdoor: true,
        status: 'available',
      }),
      createTable({
        id: 't4',
        restaurantId,
        name: 'M8',
        diningRoomId: 'room-salon',
        salon: 'salon',
        capacity: 8,
        status: 'occupied',
        vip: true,
      }),
    ];
    const categories = [
      createMenuCategory({ id: 'cat-ana', restaurantId, name: 'Ana Yemek', sortOrder: 1 }),
      createMenuCategory({ id: 'cat-icecek', restaurantId, name: 'İçecek', sortOrder: 2 }),
    ];
    const items = [
      createMenuItem({
        id: 'mi-1',
        restaurantId,
        categoryId: 'cat-ana',
        categoryName: 'Ana Yemek',
        name: 'Izgara Köfte',
        price: 320,
        dietaryTags: [],
        stockStatus: 'in_stock',
      }),
      createMenuItem({
        id: 'mi-2',
        restaurantId,
        categoryId: 'cat-ana',
        categoryName: 'Ana Yemek',
        name: 'Sebzeli Güveç',
        price: 280,
        dietaryTags: ['vejetaryen'],
        stockStatus: 'in_stock',
      }),
      createMenuItem({
        id: 'mi-3',
        restaurantId,
        categoryId: 'cat-icecek',
        categoryName: 'İçecek',
        name: 'Ayran',
        price: 50,
        stockStatus: 'in_stock',
      }),
    ];
    const today = new Date().toISOString().slice(0, 10);
    const occupancy: OccupancySnapshot = {
      restaurantId,
      asOf: new Date().toISOString(),
      date: today,
      openReservations: 3,
      seatedParties: 1,
      waitlistCount: 0,
      occupiedTables: 1,
      availableTables: 3,
      estimatedLoadPercent: 35,
      note: 'Akşam erken saat; orta yoğunluk',
    };
    const inventory: InventoryItemFact[] = [
      {
        id: 'inv-1',
        restaurantId,
        name: 'Köfte',
        quantityOnHand: 40,
        minStock: 10,
        unit: 'kg',
        stockStatus: 'in_stock',
        menuItemId: 'mi-1',
      },
    ];

    return this.seed(restaurantId, {
      restaurant: createRestaurant({
        id: restaurantId,
        name: 'Demo Lokanta',
        city: 'İstanbul',
        cuisine: ['Türk'],
        phone: '+90 212 000 00 00',
        features: ['wifi', 'vale'],
      }),
      diningRooms: rooms,
      tables,
      menuCategories: categories,
      menuItems: items,
      reservations: [
        createReservation({
          id: 'res-1',
          restaurantId,
          date: today,
          time: '20:00',
          guestCount: 4,
          status: 'confirmed',
          customerName: 'Ayşe',
          salon: 'salon',
          tableIds: ['t2'],
        }),
      ],
      customers: [
        createCustomer({
          id: 'c1',
          restaurantId,
          name: 'Ayşe',
          phone: '+905551112233',
          loyaltyTier: 'gold',
          allergies: ['fındık'],
        }),
      ],
      campaigns: [
        createCampaign({
          id: 'camp-1',
          restaurantId,
          name: 'Hafta içi %15',
          description: 'Pazartesi–Perşembe akşam indirimi',
          discountPercent: 15,
          tags: ['indirim'],
        }),
      ],
      staff: [
        createStaff({
          id: 'st-1',
          restaurantId,
          role: 'waiter',
          displayName: 'Mehmet',
          assignedSalon: 'salon',
        }),
      ],
      businessHours: [0, 1, 2, 3, 4, 5, 6].map((day) =>
        createBusinessHours({
          id: `bh-${day}`,
          restaurantId,
          day,
          open: day === 0 ? '12:00' : '11:00',
          close: '23:00',
          closed: false,
        }),
      ),
      holidays: [
        createHoliday({
          id: 'hol-1',
          restaurantId,
          date: '2026-01-01',
          name: 'Yılbaşı',
          closed: true,
        }),
      ],
      paymentPolicies: [
        createPaymentPolicy({
          id: 'pp-1',
          restaurantId,
          name: 'Rezervasyon garantisi',
          requiresDeposit: true,
          depositPercent: 20,
          cancellationHours: 3,
          acceptedMethods: ['card', 'cash'],
        }),
      ],
      loyaltyRules: [
        createLoyaltyRule({
          id: 'lr-1',
          restaurantId,
          name: 'Standart puan',
          pointsPerCurrency: 1,
          redeemThreshold: 500,
          tiers: [
            { name: 'silver', minPoints: 0 },
            { name: 'gold', minPoints: 1000, benefits: ['öncelikli masa'] },
          ],
        }),
      ],
      inventory,
      occupancy,
    });
  }

  async loadRestaurantBundle(
    restaurantId: string,
    options: { date?: string } = {},
  ): Promise<RestaurantKnowledgeBundle> {
    const existing = this.bundles.get(restaurantId);
    if (!existing) {
      return emptyBundle(restaurantId);
    }
    if (!options.date || !existing.occupancy) {
      return existing;
    }
    return {
      ...existing,
      occupancy: { ...existing.occupancy, date: options.date },
      reservations: existing.reservations.filter((r) => r.date === options.date),
    };
  }
}
