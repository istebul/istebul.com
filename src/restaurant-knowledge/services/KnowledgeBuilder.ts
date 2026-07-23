import { createRestaurant } from '../entities/restaurant.ts';
import type { DiningRoom } from '../entities/dining-room.ts';
import type { Table } from '../entities/table.ts';
import type { MenuCategory } from '../entities/menu-category.ts';
import type { MenuItem } from '../entities/menu-item.ts';
import type { RestaurantKnowledgeBundle } from '../types/source.ts';
import type {
  DiningRoomNode,
  MenuCategoryNode,
  RestaurantSnapshot,
} from '../types/snapshot.ts';
import { KNOWLEDGE_SNAPSHOT_VERSION } from '../types/snapshot.ts';
import { KnowledgeSnapshot } from './KnowledgeSnapshot.ts';

export interface KnowledgeBuilderOptions {
  asOfDate?: string;
  sourceLabel?: string;
}

/**
 * Builds a nested Restaurant Snapshot from a flat knowledge bundle.
 */
export class KnowledgeBuilder {
  build(
    bundle: RestaurantKnowledgeBundle,
    options: KnowledgeBuilderOptions = {},
  ): KnowledgeSnapshot {
    const restaurant =
      bundle.restaurant ||
      createRestaurant({ id: 'unknown', name: 'Restaurant' });
    const restaurantId = restaurant.id;
    const asOfDate =
      options.asOfDate ||
      bundle.occupancy?.date ||
      new Date().toISOString().slice(0, 10);

    const diningRooms = this.buildDiningRooms(bundle.diningRooms, bundle.tables);
    const menu = this.buildMenu(bundle.menuCategories, bundle.menuItems);

    const snapshot: RestaurantSnapshot = {
      restaurantId,
      generatedAt: new Date().toISOString(),
      asOfDate,
      restaurant,
      diningRooms,
      tables: [...bundle.tables],
      menu,
      campaigns: [...bundle.campaigns],
      businessHours: [...bundle.businessHours],
      holidays: [...bundle.holidays],
      paymentPolicies: [...bundle.paymentPolicies],
      loyaltyRules: [...bundle.loyaltyRules],
      customers: [...bundle.customers],
      staff: [...bundle.staff],
      reservations: [...bundle.reservations],
      inventory: [...bundle.inventory],
      occupancy: bundle.occupancy,
      meta: {
        source: options.sourceLabel || 'knowledge-builder',
        version: KNOWLEDGE_SNAPSHOT_VERSION,
      },
    };

    return new KnowledgeSnapshot(snapshot);
  }

  private buildDiningRooms(
    rooms: DiningRoom[],
    tables: Table[],
  ): DiningRoomNode[] {
    if (!rooms.length) {
      const bySalon = new Map<string, Table[]>();
      for (const table of tables) {
        const key = table.salon || 'default';
        const list = bySalon.get(key) || [];
        list.push(table);
        bySalon.set(key, list);
      }
      return [...bySalon.entries()].map(([salon, salonTables]) => ({
        room: {
          id: `salon:${salon}`,
          restaurantId: salonTables[0]?.restaurantId || 'unknown',
          name: salon,
          salonKey: salon,
          active: true,
        },
        tables: salonTables,
      }));
    }

    return rooms.map((room) => ({
      room,
      tables: tables.filter(
        (t) =>
          t.diningRoomId === room.id ||
          (room.salonKey && t.salon === room.salonKey),
      ),
    }));
  }

  private buildMenu(
    categories: MenuCategory[],
    items: MenuItem[],
  ): { categories: MenuCategoryNode[]; items: MenuItem[] } {
    const nodes: MenuCategoryNode[] = categories
      .slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((category) => ({
        category,
        items: items.filter((i) => i.categoryId === category.id),
      }));

    const categorized = new Set(nodes.flatMap((n) => n.items.map((i) => i.id)));
    const orphans = items.filter((i) => !categorized.has(i.id));
    if (orphans.length) {
      nodes.push({
        category: {
          id: 'uncategorized',
          restaurantId: orphans[0]?.restaurantId || 'unknown',
          name: 'Diğer',
          sortOrder: 999,
          active: true,
        },
        items: orphans,
      });
    }

    return { categories: nodes, items: [...items] };
  }
}
