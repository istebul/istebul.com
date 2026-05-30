/**
 * Payment provider registry — Stripe passive; TR providers primary.
 */

export const PAYMENT_PROVIDERS = Object.freeze({
  iyzico: {
    id: 'iyzico',
    label: 'iyzico',
    role: 'primary',
    status: 'pending_activation'
  },
  paytr: {
    id: 'paytr',
    label: 'PayTR',
    role: 'fallback',
    status: 'pending_activation'
  },
  stripe: {
    id: 'stripe',
    status: 'passive',
    scope: 'global_provider_passive',
    label: 'Stripe (global yedek)'
  }
});

export const PAYMENT_NOT_CONFIGURED_MESSAGE =
  'Ödeme altyapısı hazırlandı. Sağlayıcı aktivasyonu tamamlandığında ödeme alınabilecektir.';

export const PAYMENT_PROVIDER_PENDING_MESSAGE =
  'Ödeme sağlayıcı yapılandırması bekleniyor.';

/**
 * @param {string} [providerId]
 */
export function getPaymentProvider(providerId = 'iyzico') {
  return PAYMENT_PROVIDERS[providerId] || null;
}

export function isStripeCheckoutActive() {
  return false;
}
