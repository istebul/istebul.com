/**
 * Region-specific Pro pricing display (Stripe amounts configured per market separately).
 */
import { formatMoney } from '../../core/format.js';
import { getLocaleDefinition } from '../../platform/locale-registry.js';

/** Display + Stripe currency hints per market */
export const LOCALIZED_PRO_PRICING = Object.freeze({
  tr: {
    currency: 'TRY',
    monthly: { amount: 199, display: 'Erken erişim' },
    annual: { amount: 1990, display: 'Pilot erişim', monthlyEquivalent: 'Aktivasyon sonrası' }
  },
  en: {
    currency: 'USD',
    monthly: { amount: 19, display: '$19' },
    annual: { amount: 190, display: '$190', monthlyEquivalent: '$16 / mo' }
  },
  de: {
    currency: 'EUR',
    monthly: { amount: 18, display: '€18' },
    annual: { amount: 179, display: '€179', monthlyEquivalent: '€15 / Mo.' }
  },
  ar: {
    currency: 'SAR',
    monthly: { amount: 69, display: '69 ر.س' },
    annual: { amount: 690, display: '690 ر.س', monthlyEquivalent: '58 ر.س / شهر' }
  }
});

export function getLocalizedProPricing(localeId) {
  return LOCALIZED_PRO_PRICING[localeId] || LOCALIZED_PRO_PRICING.tr;
}

export function formatLocalizedProPrice(localeId, plan = 'monthly') {
  const pricing = getLocalizedProPricing(localeId);
  const entry = plan === 'annual' ? pricing.annual : pricing.monthly;
  if (entry?.display) return entry.display;
  return formatMoney(entry.amount, localeId, { currency: pricing.currency });
}

export function getStripeCurrencyForLocale(localeId) {
  return getLocalizedProPricing(localeId).currency;
}

export function applyLocalizedPricingToPlans(plans, localeId) {
  const pricing = getLocalizedProPricing(localeId);
  const def = getLocaleDefinition(localeId);
  if (!plans?.pro?.billing) return plans;

  return {
    ...plans,
    pro: {
      ...plans.pro,
      billing: {
        monthly: {
          ...plans.pro.billing.monthly,
          priceDisplay: pricing.monthly.display,
          checkoutLabel: def.id === 'tr'
            ? plans.pro.billing.monthly.checkoutLabel
            : `Pro ${pricing.monthly.display} / mo`
        },
        annual: {
          ...plans.pro.billing.annual,
          priceDisplay: pricing.annual.display,
          monthlyEquivalent: pricing.annual.monthlyEquivalent,
          checkoutLabel: def.id === 'tr'
            ? plans.pro.billing.annual.checkoutLabel
            : `Pro ${pricing.annual.display} / yr`
        }
      }
    }
  };
}
