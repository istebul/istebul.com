import { BasePaymentGatewayProvider } from './BasePaymentGatewayProvider.ts';

/** Stripe strategy stub — no SDK / no network. */
export class StripeGatewayProvider extends BasePaymentGatewayProvider {
  readonly code = 'stripe' as const;
  readonly displayName = 'Stripe';
}
