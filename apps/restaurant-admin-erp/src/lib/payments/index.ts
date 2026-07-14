import type { PaymentProviderCode } from '@/lib/payment-status';
import { IyzicoProvider } from '@/lib/payments/IyzicoProvider';
import { MockProvider } from '@/lib/payments/MockProvider';
import { PayTRProvider } from '@/lib/payments/PayTRProvider';
import { StripeProvider } from '@/lib/payments/StripeProvider';
import type { PaymentProvider } from '@/lib/payments/types';

export type {
  MoneyAmount,
  PaymentProvider,
  ProviderAuthorizeRequest,
  ProviderCaptureRequest,
  ProviderRefundRequest,
  ProviderReleaseRequest,
  ProviderResult,
  SettlementPreview,
} from '@/lib/payments/types';
export { prepareSettlementPreview } from '@/lib/payments/settlement';
export { StripeProvider } from '@/lib/payments/StripeProvider';
export { IyzicoProvider } from '@/lib/payments/IyzicoProvider';
export { PayTRProvider } from '@/lib/payments/PayTRProvider';
export { MockProvider } from '@/lib/payments/MockProvider';

const PROVIDER_REGISTRY: Record<PaymentProviderCode, () => PaymentProvider> = {
  stripe: () => new StripeProvider(),
  iyzico: () => new IyzicoProvider(),
  paytr: () => new PayTRProvider(),
  mock: () => new MockProvider(),
};

/** Strategy factory — selects provider implementation without contacting networks. */
export function getPaymentProvider(code: PaymentProviderCode | string): PaymentProvider {
  const normalized = (code || 'mock').toLowerCase() as PaymentProviderCode;
  const factory = PROVIDER_REGISTRY[normalized] || PROVIDER_REGISTRY.mock;
  return factory();
}

export function listPaymentProviders(): PaymentProvider[] {
  return (Object.keys(PROVIDER_REGISTRY) as PaymentProviderCode[]).map((code) =>
    PROVIDER_REGISTRY[code](),
  );
}
