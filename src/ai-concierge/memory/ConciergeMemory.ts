import type { ConciergeIntent, ConciergeMemoryState } from '../types.ts';

export function createEmptyConciergeMemory(
  restaurantSlug: string,
  restaurantId: string,
  extras: Partial<ConciergeMemoryState> = {},
): ConciergeMemoryState {
  return {
    restaurantSlug,
    restaurantId,
    restaurantName: extras.restaurantName,
    date: extras.date,
    time: extras.time,
    partySize: extras.partySize,
    salonPreference: extras.salonPreference,
    tablePreference: extras.tablePreference,
    tableId: extras.tableId,
    tableName: extras.tableName,
    preorder: extras.preorder ? [...extras.preorder] : undefined,
    campaign: extras.campaign,
    reservationDraftReady: extras.reservationDraftReady,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Session-scoped Concierge memory.
 * Remembers restaurantSlug, date, time, party size, salon/table prefs, preorder, campaign.
 */
export class ConciergeMemory {
  private state: ConciergeMemoryState;

  constructor(
    restaurantSlug: string,
    restaurantId: string,
    extras: Partial<ConciergeMemoryState> = {},
  ) {
    this.state = createEmptyConciergeMemory(restaurantSlug, restaurantId, extras);
  }

  getState(): ConciergeMemoryState {
    return { ...this.state, preorder: this.state.preorder ? [...this.state.preorder] : undefined };
  }

  patch(partial: Partial<ConciergeMemoryState>): ConciergeMemoryState {
    this.state = {
      ...this.state,
      ...partial,
      restaurantSlug: this.state.restaurantSlug,
      restaurantId: this.state.restaurantId,
      preorder: partial.preorder
        ? [...partial.preorder]
        : this.state.preorder
          ? [...this.state.preorder]
          : undefined,
      updatedAt: new Date().toISOString(),
    };
    return this.getState();
  }

  /**
   * Merge parsed intent slots into memory (non-destructive for empty slots).
   */
  applyIntent(intent: ConciergeIntent): ConciergeMemoryState {
    const patch: Partial<ConciergeMemoryState> = {};
    if (intent.slots.partySize) patch.partySize = intent.slots.partySize;
    if (intent.slots.date) patch.date = intent.slots.date;
    if (intent.slots.time) patch.time = intent.slots.time;
    if (intent.slots.salon) patch.salonPreference = intent.slots.salon;
    if (intent.slots.tablePreference) {
      patch.tablePreference = intent.slots.tablePreference;
    }

    if (intent.id === 'create_reservation') {
      patch.reservationDraftReady = true;
    }
    return this.patch(patch);
  }

  setTable(table: { id: string; name: string; salon?: string }): ConciergeMemoryState {
    return this.patch({
      tableId: table.id,
      tableName: table.name,
      salonPreference: table.salon || this.state.salonPreference,
    });
  }

  setCampaign(name: string): ConciergeMemoryState {
    return this.patch({ campaign: name });
  }

  setPreorder(items: Array<{ name: string; quantity: number }>): ConciergeMemoryState {
    return this.patch({ preorder: items });
  }

  toPromptBlock(): string {
    const s = this.state;
    const lines = [
      '## Concierge Conversation Memory',
      `- restaurantSlug: ${s.restaurantSlug}`,
      `- restaurantId: ${s.restaurantId}`,
      s.restaurantName ? `- restaurantName: ${s.restaurantName}` : null,
      s.date ? `- date: ${s.date}` : '- date: (unset)',
      s.time ? `- time: ${s.time}` : '- time: (unset)',
      s.partySize != null ? `- partySize: ${s.partySize}` : '- partySize: (unset)',
      s.salonPreference ? `- salonPreference: ${s.salonPreference}` : null,
      s.tablePreference ? `- tablePreference: ${s.tablePreference}` : null,
      s.tableName ? `- table: ${s.tableName} (${s.tableId || '?'})` : null,
      s.campaign ? `- campaign: ${s.campaign}` : null,
      s.preorder?.length
        ? `- preorder: ${s.preorder.map((p) => `${p.quantity}x ${p.name}`).join(', ')}`
        : null,
      s.reservationDraftReady ? '- reservationDraftReady: true' : null,
    ].filter(Boolean);
    return lines.join('\n');
  }

  toSummaryLines(): string[] {
    const s = this.state;
    const lines: string[] = [];
    if (s.date) lines.push(`Tarih: ${s.date}`);
    if (s.time) lines.push(`Saat: ${s.time}`);
    if (s.partySize != null) lines.push(`Kişi: ${s.partySize}`);
    if (s.salonPreference) lines.push(`Salon: ${s.salonPreference}`);
    if (s.tableName) lines.push(`Masa: ${s.tableName}`);
    else if (s.tablePreference) lines.push(`Masa tercihi: ${s.tablePreference}`);
    if (s.campaign) lines.push(`Kampanya: ${s.campaign}`);
    if (s.preorder?.length) {
      lines.push(
        `Ön sipariş: ${s.preorder.map((p) => `${p.quantity}x ${p.name}`).join(', ')}`,
      );
    }
    return lines;
  }
}
