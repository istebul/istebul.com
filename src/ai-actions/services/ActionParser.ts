import type {
  ActionId,
  ActionPayload,
  ActionRequest,
  ConciergeTurnLike,
} from '../types.ts';

const ACTION_HINTS: Array<{ id: ActionId; patterns: RegExp[] }> = [
  {
    id: 'create_reservation',
    patterns: [
      /rezervasyon (oluştur|olustur|yap)/i,
      /\[action:\s*create_reservation\]/i,
    ],
  },
  {
    id: 'update_reservation',
    patterns: [
      /rezervasyon (güncelle|guncelle|değiştir|degistir)/i,
      /\[action:\s*update_reservation\]/i,
    ],
  },
  {
    id: 'assign_table',
    patterns: [/masa ata/i, /\[action:\s*assign_table\]/i],
  },
  {
    id: 'change_table',
    patterns: [/masa (değiştir|degistir)/i, /\[action:\s*change_table\]/i],
  },
  {
    id: 'create_preorder',
    patterns: [
      /ön\s*sipariş oluştur|on\s*siparis olustur/i,
      /\[action:\s*create_preorder\]/i,
    ],
  },
  {
    id: 'update_preorder',
    patterns: [
      /ön\s*sipariş güncelle|on\s*siparis guncelle/i,
      /\[action:\s*update_preorder\]/i,
    ],
  },
  {
    id: 'apply_guarantee',
    patterns: [/garanti|depozito uygula/i, /\[action:\s*apply_guarantee\]/i],
  },
  {
    id: 'create_reservation_summary',
    patterns: [
      /rezervasyon özeti|rezervasyon ozeti/i,
      /\[action:\s*create_reservation_summary\]/i,
    ],
  },
  {
    id: 'apply_campaign',
    patterns: [/kampanya uygula/i, /\[action:\s*apply_campaign\]/i],
  },
  {
    id: 'prepare_payment',
    patterns: [/ödeme hazırla|odeme hazirla/i, /\[action:\s*prepare_payment\]/i],
  },
];

const INTENT_TO_ACTION: Record<string, ActionId> = {
  create_reservation: 'create_reservation',
  create_preorder: 'create_preorder',
  show_reservation_summary: 'create_reservation_summary',
  suggest_campaign: 'apply_campaign',
};

/**
 * Parses AI / Concierge output into an ActionRequest.
 * Flow: Intent → Action (then Executor runs it).
 */
export class ActionParser {
  parseFromText(
    text: string,
    basePayload: ActionPayload,
    extras: { conversationId?: string; intentId?: string } = {},
  ): ActionRequest | null {
    const raw = text || '';
    for (const hint of ACTION_HINTS) {
      if (hint.patterns.some((re) => re.test(raw))) {
        return {
          actionId: hint.id,
          payload: { ...basePayload },
          conversationId: extras.conversationId,
          intentId: extras.intentId,
          sourceText: raw,
          tags: ['p8d', 'parsed-text'],
        };
      }
    }
    return null;
  }

  /**
   * Map a Concierge turn into an executable action when intent implies one.
   * Returns null when the turn is conversational only (no side-effect).
   */
  parseFromConciergeTurn(
    turn: ConciergeTurnLike,
    overrides: Partial<ActionPayload> = {},
  ): ActionRequest | null {
    const intentId = turn.intent?.id;
    let actionId = intentId ? INTENT_TO_ACTION[intentId] : undefined;

    // Explicit table assign when memory has table + draft reservation intent
    if (
      !actionId &&
      turn.memory.tableId &&
      /masa|ata|tercih/i.test(turn.intent?.raw || '')
    ) {
      actionId = 'assign_table';
    }

    // Only honor explicit [action:…] markers in assistant text (avoid NL false positives)
    const assistant = turn.assistantMessage?.content || '';
    const explicit = assistant.match(/\[action:\s*([a-z_]+)\]/i);
    if (explicit?.[1]) {
      const markerId = explicit[1] as ActionId;
      return {
        actionId: markerId,
        payload: this.payloadFromMemory(turn, overrides),
        conversationId: turn.conversationId,
        intentId,
        sourceText: assistant,
        tags: ['p8d', 'assistant-marker', markerId],
        enableRollback: true,
      };
    }

    if (!actionId) return null;

    // create_reservation only when draft ready or explicit
    if (
      actionId === 'create_reservation' &&
      !turn.memory.reservationDraftReady &&
      !overrides.date
    ) {
      // still allow if memory has enough slots
      if (!turn.memory.date || !turn.memory.time || !turn.memory.partySize) {
        return null;
      }
    }

    return {
      actionId,
      payload: this.payloadFromMemory(turn, overrides),
      conversationId: turn.conversationId,
      intentId,
      sourceText: turn.intent?.raw,
      tags: ['p8d', 'concierge-turn', intentId || 'unknown'],
      enableRollback: true,
    };
  }

  payloadFromMemory(
    turn: ConciergeTurnLike,
    overrides: Partial<ActionPayload> = {},
  ): ActionPayload {
    const m = turn.memory;
    return {
      restaurantId: overrides.restaurantId || m.restaurantId,
      restaurantSlug: overrides.restaurantSlug || m.restaurantSlug,
      reservationId: overrides.reservationId,
      date: overrides.date || m.date,
      time: overrides.time || m.time,
      partySize: overrides.partySize || m.partySize,
      salon: overrides.salon || m.salonPreference,
      tableId: overrides.tableId || m.tableId,
      tableName: overrides.tableName || m.tableName,
      preorder: overrides.preorder || m.preorder,
      campaign: overrides.campaign || m.campaign,
      extras: overrides.extras,
    };
  }
}

export const defaultActionParser = new ActionParser();
