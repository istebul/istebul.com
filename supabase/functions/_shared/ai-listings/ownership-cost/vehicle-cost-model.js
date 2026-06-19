/**
 * Ownership Cost — vehicle cost model (Sprint-21 v1).
 */

import { safeNumber } from '../engine/score-utils.js';

/**
 * @param {Record<string, unknown>} input
 * @returns {{
 *   purchase_price: number,
 *   fuel_annual: number,
 *   maintenance_annual: number,
 *   insurance_annual: number,
 *   mtv_annual: number,
 *   ekspertiz: number,
 *   depreciation_total: number,
 *   recurring_annual: number,
 *   total_ownership: number,
 *   years: number
 * }}
 */
export function computeVehicleOwnershipCosts(input) {
  const price = safeNumber(input.listing_price);
  const annualKm = Math.max(1000, safeNumber(input.annual_km) || 15000);
  const years = Math.max(1, Math.min(15, safeNumber(input.ownership_period) || 5));
  const risk = Math.min(100, Math.max(0, safeNumber(input.risk_score) || 50));
  const quality = Math.min(100, Math.max(0, safeNumber(input.quality_score) || 50));
  const usage = String(input.usage_type ?? 'family');

  const kmFactor = usage === 'city' ? 7.8 : usage === 'highway' ? 5.6 : usage === 'commercial' ? 9.2 : 6.5;
  const fuelAnnual = Math.round(annualKm * kmFactor);

  const maintenanceAnnual = Math.round(price * (0.012 + (100 - quality) * 0.00012));
  const insuranceAnnual = Math.round(price * (0.018 + risk * 0.00018));
  const mtvAnnual =
    price < 600000 ? 4200 : price < 1200000 ? 7800 : price < 2000000 ? 13500 : price < 3500000 ? 19500 : 26000;
  const ekspertiz = Math.round(4200 + risk * 25);

  const depRate = 0.07 + risk * 0.00045 + (100 - quality) * 0.00008;
  const depreciationTotal = Math.round(price * (1 - Math.pow(1 - Math.min(0.22, depRate), years)));

  const recurringAnnual = fuelAnnual + maintenanceAnnual + insuranceAnnual + mtvAnnual;
  const totalRecurring = recurringAnnual * years;
  const totalOwnership = price + totalRecurring + ekspertiz + depreciationTotal;

  return {
    purchase_price: price,
    fuel_annual: fuelAnnual,
    maintenance_annual: maintenanceAnnual,
    insurance_annual: insuranceAnnual,
    mtv_annual: mtvAnnual,
    ekspertiz,
    depreciation_total: depreciationTotal,
    recurring_annual: recurringAnnual,
    total_ownership: totalOwnership,
    years
  };
}
