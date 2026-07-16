import type { PaymentAuthorization, ProviderEventRecord, SettlementRecord } from '../types.ts';

export class InMemoryAuthorizationStore {
  private readonly authorizations = new Map<string, PaymentAuthorization>();
  private readonly settlements = new Map<string, SettlementRecord>();
  private readonly events: ProviderEventRecord[] = [];

  saveAuthorization(auth: PaymentAuthorization): PaymentAuthorization {
    this.authorizations.set(auth.id, auth);
    return auth;
  }

  getAuthorization(id: string): PaymentAuthorization | null {
    return this.authorizations.get(id) || null;
  }

  findByProviderTx(providerTransactionId: string): PaymentAuthorization | null {
    for (const auth of this.authorizations.values()) {
      if (auth.providerTransactionId === providerTransactionId) return auth;
    }
    return null;
  }

  listAuthorizations(restaurantId?: string): PaymentAuthorization[] {
    const all = [...this.authorizations.values()];
    return restaurantId ? all.filter((a) => a.restaurantId === restaurantId) : all;
  }

  saveSettlement(row: SettlementRecord): SettlementRecord {
    this.settlements.set(row.id, row);
    return row;
  }

  listSettlements(restaurantId?: string): SettlementRecord[] {
    const all = [...this.settlements.values()];
    return restaurantId ? all.filter((s) => s.restaurantId === restaurantId) : all;
  }

  recordEvent(event: ProviderEventRecord): ProviderEventRecord {
    this.events.push(event);
    return event;
  }

  listEvents(restaurantId?: string): ProviderEventRecord[] {
    return restaurantId
      ? this.events.filter((e) => e.restaurantId === restaurantId)
      : [...this.events];
  }
}
