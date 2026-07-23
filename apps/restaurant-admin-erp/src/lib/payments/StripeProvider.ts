import { BasePaymentProvider } from '@/lib/payments/BasePaymentProvider';

export class StripeProvider extends BasePaymentProvider {
  readonly code = 'stripe' as const;
  readonly displayName = 'Stripe';
}
