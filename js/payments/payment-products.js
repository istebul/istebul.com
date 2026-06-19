/**
 * Client-side payment product catalog (display only — server validates amounts).
 */

export const PAYMENT_PRODUCTS = Object.freeze({
  pro_monthly: {
    code: 'pro_monthly',
    amount: 199,
    currency: 'TRY',
    label: 'Pro Aylık',
    billingInterval: 'monthly'
  },
  pro_yearly: {
    code: 'pro_yearly',
    amount: 1990,
    currency: 'TRY',
    label: 'Pro Yıllık',
    billingInterval: 'yearly'
  },
  premium_report: {
    code: 'premium_report',
    amount: 99,
    currency: 'TRY',
    label: 'Premium PDF Rapor',
    billingInterval: 'one_time'
  },
  partner_lead_credit_10: {
    code: 'partner_lead_credit_10',
    amount: 1000,
    currency: 'TRY',
    label: '10 lead kontörü',
    leadCredits: 10,
    billingInterval: 'one_time'
  },
  partner_lead_credit_50: {
    code: 'partner_lead_credit_50',
    amount: 4500,
    currency: 'TRY',
    label: '50 lead kontörü',
    leadCredits: 50,
    billingInterval: 'one_time'
  },
  partner_monthly: {
    code: 'partner_monthly',
    amount: 4990,
    currency: 'TRY',
    label: 'Partner Aylık',
    billingInterval: 'monthly'
  }
});

const SUBSCRIPTION_CODES = new Set(['pro_monthly', 'pro_yearly', 'partner_monthly']);
const PARTNER_CODES = new Set([
  'partner_lead_credit_10',
  'partner_lead_credit_50',
  'partner_monthly'
]);

/**
 * @param {string} productCode
 */
export function getPaymentProduct(productCode) {
  return PAYMENT_PRODUCTS[productCode] || null;
}

export function listPaymentProducts() {
  return Object.values(PAYMENT_PRODUCTS);
}

/**
 * @param {string} productCode
 */
export function isSubscriptionProduct(productCode) {
  return SUBSCRIPTION_CODES.has(productCode);
}

/**
 * @param {string} productCode
 */
export function isPartnerProduct(productCode) {
  return PARTNER_CODES.has(productCode);
}

/**
 * @param {string} productCode
 */
export function formatProductPrice(productCode) {
  const product = getPaymentProduct(productCode);
  if (!product) return '';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: product.currency,
    maximumFractionDigits: 0
  }).format(product.amount);
}
