import type { RestaurantSnapshot } from '../../restaurant-knowledge/types/snapshot.ts';
import type { DecisionInput, DecisionProviderCode } from '../types.ts';

/**
 * Immutable decision context — facts from Knowledge Graph + request slots.
 */
export class DecisionContext {
  readonly restaurantId: string;
  readonly input: DecisionInput;
  readonly snapshot: RestaurantSnapshot;
  readonly provider: DecisionProviderCode;
  readonly asOfDate: string;
  readonly partySize: number;
  readonly time: string;

  constructor(options: {
    input: DecisionInput;
    snapshot: RestaurantSnapshot;
    provider?: DecisionProviderCode;
  }) {
    this.input = options.input;
    this.snapshot = options.snapshot;
    this.restaurantId = options.input.restaurantId;
    this.provider = options.provider || 'mock';
    this.asOfDate =
      options.input.date ||
      options.snapshot.asOfDate ||
      new Date().toISOString().slice(0, 10);
    this.partySize = Math.max(1, Number(options.input.partySize || 2));
    this.time = options.input.time || '19:00';
  }

  get availableTables() {
    return this.snapshot.tables.filter(
      (t) => t.active !== false && t.status === 'available',
    );
  }

  get openReservations() {
    return this.snapshot.reservations.filter(
      (r) =>
        r.date === this.asOfDate &&
        !['cancelled', 'completed', 'no_show'].includes(String(r.status || '')),
    );
  }

  get activeCampaigns() {
    return this.snapshot.campaigns.filter((c) => c.active !== false);
  }

  get menuItems() {
    return this.snapshot.menu?.items || [];
  }

  get paymentPolicies() {
    return this.snapshot.paymentPolicies.filter((p) => p.active !== false);
  }
}
