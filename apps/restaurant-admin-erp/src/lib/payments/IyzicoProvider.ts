import { BasePaymentProvider } from '@/lib/payments/BasePaymentProvider';

export class IyzicoProvider extends BasePaymentProvider {
  readonly code = 'iyzico' as const;
  readonly displayName = 'iyzico';
}
