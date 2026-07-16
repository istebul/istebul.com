import type { AuthorizationStatus, WebhookEnvelope, WebhookParseResult } from '../types.ts';
import type { ProviderWebhookHandler } from './types.ts';

const STATUS_MAP: Record<string, AuthorizationStatus> = {
  'payment_intent.amount_capturable_updated': 'authorized',
  'payment_intent.succeeded': 'captured',
  'charge.refunded': 'refunded',
  'payment_intent.canceled': 'cancelled',
};

export class StripeWebhookHandler implements ProviderWebhookHandler {
  readonly provider = 'stripe' as const;

  parse(envelope: WebhookEnvelope): WebhookParseResult {
    const eventType = String(envelope.eventType || envelope.payload.type || 'unknown');
    const data = (envelope.payload.data || envelope.payload) as Record<string, unknown>;
    const object = (data.object || data) as Record<string, unknown>;
    return {
      ok: true,
      provider: this.provider,
      eventType,
      eventId: envelope.eventId || String(object.id || `stripe_${Date.now()}`),
      mappedStatus: STATUS_MAP[eventType],
      providerTransactionId: String(object.id || object.payment_intent || '') || null,
      message: `Stripe webhook parsed (architecture only): ${eventType}`,
      remoteCallAttempted: false,
      raw: envelope.payload,
    };
  }
}
