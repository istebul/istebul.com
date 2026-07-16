import type { AuthorizationStatus, WebhookEnvelope, WebhookParseResult } from '../types.ts';
import type { ProviderWebhookHandler } from './types.ts';

const STATUS_MAP: Record<string, AuthorizationStatus> = {
  AUTHORIZED: 'authorized',
  SUCCESS: 'captured',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

export class IyzicoWebhookHandler implements ProviderWebhookHandler {
  readonly provider = 'iyzico' as const;

  parse(envelope: WebhookEnvelope): WebhookParseResult {
    const status = String(envelope.payload.status || envelope.eventType || 'unknown');
    const eventType = String(envelope.eventType || status);
    return {
      ok: true,
      provider: this.provider,
      eventType,
      eventId: envelope.eventId || String(envelope.payload.paymentId || `iyzico_${Date.now()}`),
      mappedStatus: STATUS_MAP[status.toUpperCase()] || STATUS_MAP[eventType.toUpperCase()],
      providerTransactionId:
        String(envelope.payload.paymentId || envelope.payload.paymentTransactionId || '') || null,
      message: `iyzico webhook parsed (architecture only): ${eventType}`,
      remoteCallAttempted: false,
      raw: envelope.payload,
    };
  }
}
