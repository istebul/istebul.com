import type { KnowledgeSource } from '../types/source.ts';
import type { RestaurantSnapshot } from '../types/snapshot.ts';
import { InMemoryKnowledgeSource } from '../sources/in-memory-source.ts';
import { KnowledgeBuilder } from './KnowledgeBuilder.ts';
import { KnowledgeSnapshot } from './KnowledgeSnapshot.ts';
import * as restaurantQuery from '../queries/restaurant.ts';
import * as tablesQuery from '../queries/tables.ts';
import * as menuQuery from '../queries/menu.ts';
import * as reservationQuery from '../queries/reservation.ts';
import * as crmQuery from '../queries/crm.ts';
import * as inventoryQuery from '../queries/inventory.ts';
import * as paymentsQuery from '../queries/payments.ts';

export interface KnowledgeServiceOptions {
  source?: KnowledgeSource;
  builder?: KnowledgeBuilder;
  /** Soft cache TTL in ms (default 30s). */
  cacheTtlMs?: number;
}

interface CacheEntry {
  expiresAt: number;
  snapshot: KnowledgeSnapshot;
}

/**
 * Facade over KnowledgeSource + KnowledgeBuilder.
 * Caches snapshots briefly; never calls an LLM.
 */
export class KnowledgeService {
  readonly source: KnowledgeSource;
  readonly builder: KnowledgeBuilder;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(options: KnowledgeServiceOptions = {}) {
    this.source = options.source || new InMemoryKnowledgeSource();
    this.builder = options.builder || new KnowledgeBuilder();
    this.cacheTtlMs = options.cacheTtlMs ?? 30_000;
  }

  async getSnapshot(
    restaurantId: string,
    options: { date?: string; forceRefresh?: boolean } = {},
  ): Promise<KnowledgeSnapshot> {
    const cacheKey = `${restaurantId}|${options.date || ''}`;
    if (!options.forceRefresh) {
      const hit = this.cache.get(cacheKey);
      if (hit && hit.expiresAt > Date.now()) {
        return hit.snapshot;
      }
    }

    const bundle = await this.source.loadRestaurantBundle(restaurantId, {
      date: options.date,
    });
    const snapshot = this.builder.build(bundle, {
      asOfDate: options.date,
      sourceLabel: this.source.constructor.name,
    });
    this.cache.set(cacheKey, {
      expiresAt: Date.now() + this.cacheTtlMs,
      snapshot,
    });
    return snapshot;
  }

  async getSnapshotData(
    restaurantId: string,
    options: { date?: string; forceRefresh?: boolean } = {},
  ): Promise<RestaurantSnapshot> {
    const snap = await this.getSnapshot(restaurantId, options);
    return snap.toJSON();
  }

  clearCache(restaurantId?: string): void {
    if (!restaurantId) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${restaurantId}|`)) this.cache.delete(key);
    }
  }

  /** Query helpers bound to a snapshot. */
  queries = {
    restaurant: restaurantQuery,
    tables: tablesQuery,
    menu: menuQuery,
    reservation: reservationQuery,
    crm: crmQuery,
    inventory: inventoryQuery,
    payments: paymentsQuery,
  };
}
