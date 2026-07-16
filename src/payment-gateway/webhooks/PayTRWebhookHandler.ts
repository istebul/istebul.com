import type { AuthorizationStatus, WebhookEnvelope, WebhookParseResult } from '../types.ts';
import type { ProviderWebhookHandler } from './types.ts';

const STATUS_MAP: Record<string, AuthorizationStatus> = {
  success: 'captured',
  failed: 'cancelled',
  refund: 'refunded',
};

export class PayTRWebhookHandler implements ProviderWebhookHandler {
  readonly provider = 'paytr' as const;

  parse(envelope: WebhookEnvelope): WebhookParseResult {
    const status = String(envelope.payload.status || envelope.eventType || 'unknown').toLowerCase();
    const eventType = String(envelope.eventType || status);
    return {
      ok: true,
      provider: this.provider,
      eventType,
      eventId: envelope.eventId || String(envelope.payload.merchant_oid || `paytr_${Date.now()}`),
      mappedStatus: STATUS_MAP[status],
      providerTransactionId: String(envelope.payload.merchant_oid || '') || null,
      message: `PayTR webhook parsed (architecture only): ${eventType}`,
      remoteCallAttempted: false,
      raw: envelope.payload,
    };
  }
}
