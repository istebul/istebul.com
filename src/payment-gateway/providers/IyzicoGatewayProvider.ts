import { BasePaymentGatewayProvider } from './BasePaymentGatewayProvider.ts';

/** iyzico strategy stub — no SDK / no network. */
export class IyzicoGatewayProvider extends BasePaymentGatewayProvider {
  readonly code = 'iyzico' as const;
  readonly displayName = 'iyzico';
}
