import type { RestaurantSnapshot } from '../types/snapshot.ts';
import { KNOWLEDGE_SNAPSHOT_VERSION } from '../types/snapshot.ts';

/**
 * Immutable snapshot wrapper — AI modules read this object graph.
 */
export class KnowledgeSnapshot {
  readonly data: RestaurantSnapshot;

  constructor(data: RestaurantSnapshot) {
    this.data = Object.freeze({
      ...data,
      diningRooms: data.diningRooms.map((n) => ({
        room: n.room,
        tables: [...n.tables],
      })),
      tables: [...data.tables],
      menu: {
        categories: data.menu.categories.map((c) => ({
          category: c.category,
          items: [...c.items],
        })),
        items: [...data.menu.items],
      },
      campaigns: [...data.campaigns],
      businessHours: [...data.businessHours],
      holidays: [...data.holidays],
      paymentPolicies: [...data.paymentPolicies],
      loyaltyRules: [...data.loyaltyRules],
      customers: [...data.customers],
      staff: [...data.staff],
      reservations: [...data.reservations],
      inventory: [...data.inventory],
      meta: {
        version: KNOWLEDGE_SNAPSHOT_VERSION,
        ...data.meta,
      },
    }) as RestaurantSnapshot;
  }

  get restaurantId(): string {
    return this.data.restaurantId;
  }

  get generatedAt(): string {
    return this.data.generatedAt;
  }

  toJSON(): RestaurantSnapshot {
    return this.data;
  }
}
