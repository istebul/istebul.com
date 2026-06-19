/**
 * AI Recommendation Engine — fit score calculator (Sprint-16 v1).
 */

import { clampScore } from '../engine/score-utils.js';
import { runPriceIntelligence } from '../price/price-intelligence.js';
import { runMarketIntelligence } from '../market-intelligence/market-intelligence.js';
import { normalizeText } from '../search/normalizer.js';

/** @type {Readonly<Record<string, number>>} */
export const FIT_WEIGHTS = Object.freeze({
  budget_fit: 25,
  risk_fit: 15,
  quality_fit: 15,
  executive_fit: 15,
  price_fit: 10,
  market_fit: 8,
  usage_fit: 6,
  priority_fit: 6,
  duplicate_penalty: -10
});

/**
 * @param {number} value
 * @returns {number}
 */
export function clampFitScore(value) {
  return clampScore(value);
}

/**
 * @param {Record<string, unknown>} profile
 * @returns {Record<string, unknown>}
 */
export function applyProfileFallbacks(profile = {}) {
  return {
    category: String(profile.category ?? 'vehicle').trim() || 'vehicle',
    budget: Number.isFinite(Number(profile.budget)) && Number(profile.budget) > 0 ? Number(profile.budget) : null,
    city: String(profile.city ?? '').trim() || null,
    usage_type: String(profile.usage_type ?? 'general').trim() || 'general',
    family_size: Number.isFinite(Number(profile.family_size)) && Number(profile.family_size) > 0
      ? Number(profile.family_size)
      : null,
    annual_km: Number.isFinite(Number(profile.annual_km)) && Number(profile.annual_km) > 0
      ? Number(profile.annual_km)
      : null,
    risk_tolerance: String(profile.risk_tolerance ?? 'medium').trim().toLowerCase() || 'medium',
    priority: String(profile.priority ?? 'total_cost').trim().toLowerCase() || 'total_cost'
  };
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} listing
 * @param {number|null} budget
 * @returns {number}
 */
export function computeBudgetFit(record, listing, budget) {
  const price = Number(record.price ?? listing.price ?? 0);
  if (!Number.isFinite(budget) || budget <= 0 || !Number.isFinite(price) || price <= 0) return 50;

  if (price <= budget) {
    const ratio = price / budget;
    return clampFitScore(100 - ratio * 20);
  }

  const overPct = ((price - budget) / budget) * 100;
  if (overPct <= 10) return 70;
  if (overPct <= 25) return 45;
  if (overPct <= 40) return 25;
  return 10;
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} riskTolerance
 * @returns {number}
 */
export function computeRiskFit(record, riskTolerance) {
  const risk = Number(record.risk_score);
  if (!Number.isFinite(risk)) return 50;

  const tolerance = String(riskTolerance ?? 'medium').toLowerCase();
  if (tolerance === 'low') {
    if (risk <= 25) return 100;
    if (risk <= 40) return 75;
    if (risk <= 55) return 45;
    return 20;
  }
  if (tolerance === 'high') {
    if (risk >= 70) return 55;
    if (risk >= 45) return 75;
    return 90;
  }
  if (risk <= 35) return 95;
  if (risk <= 55) return 75;
  if (risk <= 70) return 50;
  return 30;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {number}
 */
export function computeQualityFit(record) {
  const quality = Number(record.quality_score);
  if (!Number.isFinite(quality)) return 50;
  return clampFitScore(quality);
}

/**
 * @param {Record<string, unknown>} record
 * @returns {number}
 */
export function computeExecutiveFit(record) {
  const decision = Number(record.decision_score);
  if (Number.isFinite(decision)) return clampFitScore(decision);

  const label = String(record.executive_label ?? '').toLowerCase();
  if (label.includes('satın alınabilir')) return 85;
  if (label.includes('incelenebilir')) return 65;
  if (label.includes('dikkatli')) return 45;
  if (label.includes('riskli') || label.includes('önerilmez')) return 20;
  return 50;
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {number}
 */
export function computePriceFit(listing) {
  const priceIntel = runPriceIntelligence(listing);
  const position = String(priceIntel.price_position ?? 'unknown');
  switch (position) {
    case 'underpriced':
      return 95;
    case 'fair':
      return 85;
    case 'slightly_overpriced':
      return 55;
    case 'overpriced':
      return 25;
    default:
      return 50;
  }
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {number}
 */
export function computeMarketFit(listing) {
  const market = runMarketIntelligence(listing);
  return clampFitScore(Number(market.market_context_score ?? 50));
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} profile
 * @returns {number}
 */
export function computeUsageFit(record, listing, profile) {
  const usage = String(profile.usage_type ?? 'general').toLowerCase();
  const title = normalizeText(`${record.title ?? ''} ${listing.description ?? ''}`);
  const bodyType = normalizeText(listing.attributes?.body_type ?? listing.attributes?.segment ?? '');

  if (usage === 'family') {
    if (bodyType.includes('suv') || bodyType.includes('station') || title.includes('suv')) return 90;
    if (title.includes('sedan') || bodyType.includes('sedan')) return 70;
    return 55;
  }
  if (usage === 'commute' || usage === 'city') {
    if (title.includes('hatchback') || bodyType.includes('hatchback')) return 85;
    return 65;
  }
  if (usage === 'performance') {
    if (title.includes('sport') || title.includes('m sport') || title.includes('amg')) return 90;
    return 50;
  }
  return 60;
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} profile
 * @returns {number}
 */
export function computeFamilyFit(record, listing, profile) {
  const familySize = Number(profile.family_size);
  if (!Number.isFinite(familySize) || familySize <= 0) return 60;

  const bodyType = normalizeText(listing.attributes?.body_type ?? listing.attributes?.segment ?? '');
  if (familySize >= 5) {
    if (bodyType.includes('suv') || bodyType.includes('minivan') || bodyType.includes('station')) return 90;
    return 45;
  }
  if (familySize >= 4) {
    if (bodyType.includes('suv') || bodyType.includes('sedan') || bodyType.includes('station')) return 80;
    return 55;
  }
  return 65;
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} profile
 * @returns {number}
 */
export function computeAnnualKmFit(record, listing, profile) {
  const annualKm = Number(profile.annual_km);
  const km = Number(record.km ?? listing.attributes?.km ?? listing.attributes?.mileage);
  if (!Number.isFinite(annualKm) || annualKm <= 0 || !Number.isFinite(km) || km < 0) return 60;

  const projectedAge = 3;
  const projectedKm = km + annualKm * projectedAge;
  if (annualKm <= 12000 && km <= 60000) return 90;
  if (annualKm <= 20000 && projectedKm <= 120000) return 75;
  if (annualKm <= 30000 && projectedKm <= 180000) return 55;
  return 35;
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} profile
 * @param {{ budget_fit: number, risk_fit: number, quality_fit: number, executive_fit: number, price_fit: number, market_fit: number, usage_fit: number }} fits
 * @returns {number}
 */
export function computePriorityFit(record, listing, profile, fits) {
  const priority = String(profile.priority ?? 'total_cost').toLowerCase();
  switch (priority) {
    case 'low_risk':
      return fits.risk_fit;
    case 'comfort':
      return Math.round((fits.quality_fit + fits.usage_fit) / 2);
    case 'performance':
      return computeUsageFit(record, listing, { ...profile, usage_type: 'performance' });
    case 'resale':
      return Math.round((fits.market_fit + fits.quality_fit) / 2);
    case 'family':
      return computeFamilyFit(record, listing, profile);
    case 'economy':
      return Math.round((fits.budget_fit + fits.price_fit) / 2);
    case 'total_cost':
    default:
      return Math.round((fits.budget_fit + fits.price_fit + fits.risk_fit) / 3);
  }
}

/**
 * @param {number} fitScore
 * @returns {string}
 */
export function getRecommendationLabel(fitScore) {
  const score = clampFitScore(fitScore);
  if (score >= 90) return 'Çok uygun';
  if (score >= 75) return 'Uygun';
  if (score >= 60) return 'İncelenebilir';
  if (score >= 40) return 'Dikkatli incelenmeli';
  return 'Önerilmez';
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} listing
 * @param {Record<string, unknown>} profile
 * @param {{ price_fit?: number, market_fit?: number }} [overrides]
 * @returns {{ fit_score: number, breakdown: Record<string, number>, recommendation_label: string, subscores: Record<string, number> }}
 */
export function computeFitScore(record, listing, profile, overrides = {}) {
  const resolved = applyProfileFallbacks(profile);

  const budget_fit = computeBudgetFit(record, listing, resolved.budget);
  const risk_fit = computeRiskFit(record, resolved.risk_tolerance);
  const quality_fit = computeQualityFit(record);
  const executive_fit = computeExecutiveFit(record);
  const price_fit = Number.isFinite(Number(overrides.price_fit)) ? Number(overrides.price_fit) : computePriceFit(listing);
  const market_fit = Number.isFinite(Number(overrides.market_fit)) ? Number(overrides.market_fit) : computeMarketFit(listing);
  const usage_fit = computeUsageFit(record, listing, resolved);
  const family_fit = computeFamilyFit(record, listing, resolved);
  const annual_km_fit = computeAnnualKmFit(record, listing, resolved);

  const partialFits = { budget_fit, risk_fit, quality_fit, executive_fit, price_fit, market_fit, usage_fit };
  const priority_fit = computePriorityFit(record, listing, resolved, partialFits);

  const blendedUsage = Math.round((usage_fit + family_fit + annual_km_fit) / 3);

  /** @type {Record<string, number>} */
  const breakdown = {
    budget_fit: Math.round((budget_fit * FIT_WEIGHTS.budget_fit) / 100),
    risk_fit: Math.round((risk_fit * FIT_WEIGHTS.risk_fit) / 100),
    quality_fit: Math.round((quality_fit * FIT_WEIGHTS.quality_fit) / 100),
    executive_fit: Math.round((executive_fit * FIT_WEIGHTS.executive_fit) / 100),
    price_fit: Math.round((price_fit * FIT_WEIGHTS.price_fit) / 100),
    market_fit: Math.round((market_fit * FIT_WEIGHTS.market_fit) / 100),
    usage_fit: Math.round((blendedUsage * FIT_WEIGHTS.usage_fit) / 100),
    priority_fit: Math.round((priority_fit * FIT_WEIGHTS.priority_fit) / 100),
    duplicate_penalty: 0
  };

  if (record.duplicate_status === 'exact' || record.duplicate_status === 'similar') {
    breakdown.duplicate_penalty = FIT_WEIGHTS.duplicate_penalty;
  }

  const fit_score = clampFitScore(Object.values(breakdown).reduce((sum, value) => sum + value, 0));

  return {
    fit_score,
    breakdown,
    recommendation_label: getRecommendationLabel(fit_score),
    subscores: {
      budget_fit,
      risk_fit,
      quality_fit,
      executive_fit,
      price_fit,
      market_fit,
      usage_fit: blendedUsage,
      family_fit,
      annual_km_fit,
      priority_fit
    }
  };
}
