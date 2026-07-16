import type { PaymentProviderCode } from '../types.ts';
import { IyzicoGatewayProvider } from './IyzicoGatewayProvider.ts';
import { MockGatewayProvider } from './MockGatewayProvider.ts';
import { PayTRGatewayProvider } from './PayTRGatewayProvider.ts';
import { StripeGatewayProvider } from './StripeGatewayProvider.ts';
import type { PaymentGatewayProvider } from './types.ts';

const PROVIDER_REGISTRY: Record<PaymentProviderCode, () => PaymentGatewayProvider> = {
  stripe: () => new StripeGatewayProvider(),
  iyzico: () => new IyzicoGatewayProvider(),
  paytr: () => new PayTRGatewayProvider(),
  mock: () => new MockGatewayProvider(),
};

/** Strategy factory — selects provider without contacting networks. */
export function getPaymentGatewayProvider(
  code: PaymentProviderCode | string = 'mock',
): PaymentGatewayProvider {
  const normalized = (code || 'mock').toLowerCase() as PaymentProviderCode;
  const factory = PROVIDER_REGISTRY[normalized] || PROVIDER_REGISTRY.mock;
  return factory();
}

export function listPaymentGatewayProviders(): PaymentGatewayProvider[] {
  return (Object.keys(PROVIDER_REGISTRY) as PaymentProviderCode[]).map((code) =>
    PROVIDER_REGISTRY[code](),
  );
}

export function isPaymentProviderCode(value: string): value is PaymentProviderCode {
  return Object.prototype.hasOwnProperty.call(PROVIDER_REGISTRY, value);
}
