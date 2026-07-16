import type { ConciergeTurnLike, DecisionInput, DecisionKind } from '../types.ts';

const INTENT_TO_KIND: Record<string, DecisionKind> = {
  suggest_table: 'suggest_table',
  create_reservation: 'suggest_reservation',
  suggest_datetime: 'suggest_reservation',
  suggest_menu: 'suggest_menu',
  suggest_campaign: 'suggest_campaign',
  create_preorder: 'suggest_menu',
  show_reservation_summary: 'suggest_reservation',
};

/**
 * Adapter → P8-C Concierge turn shape (duck-typed).
 * Does not import or mutate Concierge package internals.
 */
export class ConciergeAdapter {
  toDecisionInput(
    turn: ConciergeTurnLike,
    kindOverride?: DecisionKind,
  ): DecisionInput {
    const slots = turn.intent.slots || {};
    const kind =
      kindOverride ||
      INTENT_TO_KIND[turn.intent.id] ||
      'suggest_table';
    return {
      restaurantId: turn.memory.restaurantId,
      kind,
      date: turn.memory.date || (slots.date as string | undefined),
      time: turn.memory.time || (slots.time as string | undefined),
      partySize:
        turn.memory.partySize ||
        (typeof slots.partySize === 'number' ? slots.partySize : undefined),
      salon: turn.memory.salonPreference || (slots.salon as string | undefined),
      menuNeedle: slots.menuNeedle as string | undefined,
      campaignNeedle: slots.campaignNeedle as string | undefined,
      conversationId: turn.conversationId,
      extras: {
        intentId: turn.intent.id,
        tableId: turn.memory.tableId,
        campaign: turn.memory.campaign,
      },
      tags: ['p8f', 'concierge-adapter'],
    };
  }
}
