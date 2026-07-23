import type { WebhookEnvelope, WebhookParseResult } from '../types.ts';

export interface ProviderWebhookHandler {
  readonly provider: WebhookEnvelope['provider'];
  parse(envelope: WebhookEnvelope): WebhookParseResult;
}
