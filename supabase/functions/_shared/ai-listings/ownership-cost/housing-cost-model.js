/**
 * Ownership Cost — housing cost model (Sprint-21 v1).
 */

import { safeNumber } from '../engine/score-utils.js';

/**
 * @param {Record<string, unknown>} input
 * @returns {{
 *   purchase_price: number,
 *   aidat_annual: number,
 *   maintenance_annual: number,
 *   tax_annual: number,
 *   insurance_annual: number,
 *   credit_placeholder: number,
 *   moving_cost: number,
 *   recurring_annual: number,
 *   total_ownership: number,
 *   years: number
 * }}
 */
export function computeHousingOwnershipCosts(input) {
  const price = safeNumber(input.listing_price);
  const years = Math.max(1, Math.min(30, safeNumber(input.ownership_period) || 10));
  const risk = Math.min(100, Math.max(0, safeNumber(input.risk_score) || 50));
  const quality = Math.min(100, Math.max(0, safeNumber(input.quality_score) || 50));
  const city = String(input.city ?? '').toLocaleLowerCase('tr');

  const metro = ['istanbul', 'ankara', 'izmir', 'bursa', 'antalya'].some((c) => city.includes(c));
  const aidatMonthly = Math.round(Math.max(800, price * (metro ? 0.00035 : 0.00022)));
  const aidatAnnual = aidatMonthly * 12;

  const maintenanceAnnual = Math.round(price * (0.006 + (100 - quality) * 0.00004));
  const taxAnnual = Math.round(price * 0.0012);
  const insuranceAnnual = Math.round(price * (0.0015 + risk * 0.00001));

  const creditRatio = 0.62;
  const creditRate = 0.32;
  const creditPlaceholder = Math.round(price * creditRatio * creditRate * Math.min(years, 5) * 0.35);

  const movingCost = metro ? 65000 : 38000;

  const recurringAnnual = aidatAnnual + maintenanceAnnual + taxAnnual + insuranceAnnual;
  const totalRecurring = recurringAnnual * years;
  const totalOwnership = price + totalRecurring + creditPlaceholder + movingCost;

  return {
    purchase_price: price,
    aidat_annual: aidatAnnual,
    maintenance_annual: maintenanceAnnual,
    tax_annual: taxAnnual,
    insurance_annual: insuranceAnnual,
    credit_placeholder: creditPlaceholder,
    moving_cost: movingCost,
    recurring_annual: recurringAnnual,
    total_ownership: totalOwnership,
    years
  };
}
