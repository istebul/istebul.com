import { BasePaymentProvider } from '@/lib/payments/BasePaymentProvider';

export class PayTRProvider extends BasePaymentProvider {
  readonly code = 'paytr' as const;
  readonly displayName = 'PayTR';
}
