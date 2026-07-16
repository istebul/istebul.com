import { BasePaymentGatewayProvider } from './BasePaymentGatewayProvider.ts';

/** PayTR strategy stub — no SDK / no network. */
export class PayTRGatewayProvider extends BasePaymentGatewayProvider {
  readonly code = 'paytr' as const;
  readonly displayName = 'PayTR';
}
