import {
  createRestaurantKnowledge,
  type KnowledgeService,
} from '../../restaurant-knowledge/index.ts';
import type { RestaurantSnapshot } from '../../restaurant-knowledge/types/snapshot.ts';

/**
 * Adapter → P8-B Restaurant Knowledge Graph (read-only facts).
 * Does not mutate Knowledge Graph internals.
 */
export class KnowledgeAdapter {
  readonly service: KnowledgeService;

  constructor(service?: KnowledgeService, restaurantId = 'demo-cafe') {
    if (service) {
      this.service = service;
    } else {
      const created = createRestaurantKnowledge({
        seedDemo: true,
        restaurantId,
      });
      this.service = created.service;
    }
  }

  async loadSnapshot(restaurantId: string, asOfDate?: string): Promise<RestaurantSnapshot> {
    return this.service.getSnapshotData(restaurantId, {
      date: asOfDate || new Date().toISOString().slice(0, 10),
    });
  }
}
