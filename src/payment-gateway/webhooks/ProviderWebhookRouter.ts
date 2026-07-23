import type { PaymentProviderCode, WebhookEnvelope, WebhookParseResult } from '../types.ts';
import { IyzicoWebhookHandler } from './IyzicoWebhookHandler.ts';
import { PayTRWebhookHandler } from './PayTRWebhookHandler.ts';
import { StripeWebhookHandler } from './StripeWebhookHandler.ts';
import type { ProviderWebhookHandler } from './types.ts';

/**
 * Routes provider webhook envelopes to handlers.
 * Foundation only — does not call provider APIs or verify live signatures against remote keys.
 */
export class ProviderWebhookRouter {
  private readonly handlers = new Map<PaymentProviderCode, ProviderWebhookHandler>();

  constructor(handlers: ProviderWebhookHandler[] = [
    new StripeWebhookHandler(),
    new IyzicoWebhookHandler(),
    new PayTRWebhookHandler(),
  ]) {
    for (const handler of handlers) {
      this.handlers.set(handler.provider, handler);
    }
  }

  route(envelope: WebhookEnvelope): WebhookParseResult {
    const handler = this.handlers.get(envelope.provider);
    if (!handler) {
      return {
        ok: false,
        provider: envelope.provider,
        eventType: envelope.eventType,
        eventId: envelope.eventId,
        message: `No webhook handler for provider: ${envelope.provider}`,
        remoteCallAttempted: false,
        raw: envelope.payload,
      };
    }
    return handler.parse(envelope);
  }

  listProviders(): PaymentProviderCode[] {
    return [...this.handlers.keys()];
  }
}
