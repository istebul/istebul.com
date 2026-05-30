/**
 * Illustrative ROI framing for pricing — not a performance guarantee.
 * Helps users compare Pro cost to plausible TCO decision drift on a vehicle budget.
 */

import { PLANS } from './plans.js';

export const PRICING_ROI_DEFAULTS = Object.freeze({
  purchaseBudget: 800_000,
  costDriftPercent: 2,
  minPercent: 1,
  maxPercent: 6,
  budgetMin: 300_000,
  budgetMax: 3_000_000,
  budgetStep: 50_000
});

function getProYearlyCost(billing = 'monthly') {
  const monthly = PLANS.pro.billing.monthly;
  const annual = PLANS.pro.billing.annual;
  const monthlyAmount = parseDisplayAmount(monthly.priceDisplay) || 299;
  const annualAmount = parseDisplayAmount(annual.priceDisplay) || 2870;

  if (billing === 'annual') {
    return annualAmount;
  }

  return monthlyAmount * 12;
}

/** Parse "₺2.870" / "₺299" style display strings */
export function parseDisplayAmount(display = '') {
  const digits = String(display).replace(/[^\d]/g, '');
  if (!digits) return 0;
  return Number(digits);
}

export function getAnnualSavingsFacts() {
  const monthly = parseDisplayAmount(PLANS.pro.billing.monthly.priceDisplay) || 299;
  const annual = parseDisplayAmount(PLANS.pro.billing.annual.priceDisplay) || 2870;
  const twelveMonthly = monthly * 12;
  const savingsAmount = Math.max(0, twelveMonthly - annual);
  const savingsPercent = twelveMonthly > 0
    ? Math.round((savingsAmount / twelveMonthly) * 100)
    : 0;

  return {
    monthly,
    annual,
    twelveMonthly,
    savingsAmount,
    savingsPercent
  };
}

/**
 * @param {{ purchaseBudget: number, costDriftPercent: number, billing?: 'monthly'|'annual' }} input
 */
export function calculatePricingRoi(input = {}) {
  const purchaseBudget = Number(input.purchaseBudget) || PRICING_ROI_DEFAULTS.purchaseBudget;
  const costDriftPercent = Number(input.costDriftPercent) || PRICING_ROI_DEFAULTS.costDriftPercent;
  const billing = input.billing === 'annual' ? 'annual' : 'monthly';

  const driftCost = Math.round(purchaseBudget * (costDriftPercent / 100));
  const proYearlyCost = getProYearlyCost(billing);
  const proMonthlyCost = Math.round(proYearlyCost / 12);
  const coverageRatio = proYearlyCost > 0 ? driftCost / proYearlyCost : 0;

  return {
    purchaseBudget,
    costDriftPercent,
    billing,
    driftCost,
    proYearlyCost,
    proMonthlyCost,
    coverageRatio
  };
}

export function formatTry(amount) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0
  }).format(amount);
}

export function buildRoiSummaryCopy(result, { t, formatAmount = formatTry } = {}) {
  const { driftCost, proYearlyCost, coverageRatio } = result;

  if (t) {
    const driftStr = formatAmount(driftCost);
    const proStr = formatAmount(proYearlyCost);
    if (driftCost <= proYearlyCost) {
      return t('roiSummaryNear', { driftCost: driftStr, proYearlyCost: proStr });
    }
    const multiple =
      coverageRatio >= 1.1
        ? `≈ ${coverageRatio.toFixed(1).replace('.0', '')}×`
        : t('roiSummaryMultiple');
    return t('roiSummaryExceeds', { driftCost: driftStr, proYearlyCost: proStr, multiple });
  }

  if (driftCost <= proYearlyCost) {
    return `Örnek senaryoda ${formatTry(driftCost)} TCO sapması, yıllık Pro maliyetine (${formatTry(proYearlyCost)}) yakın — tek net karar döngüsünde bile maliyet görünürlüğü anlamlı olabilir.`;
  }

  const multiple = coverageRatio >= 1.1
    ? `yaklaşık ${coverageRatio.toFixed(1).replace('.0', '')}×`
    : 'birden fazla kez';

  return `Örnek senaryoda ${formatTry(driftCost)} TCO sapması, yıllık Pro (${formatTry(proYearlyCost)}) maliyetini ${multiple} karşılar — abonelik değil, yanlış seçim maliyetini küçültme çerçevesi.`;
}
