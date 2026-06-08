/**
 * Purchase Decision Intelligence — weighted decision score (Sprint-24).
 */

import { clampScore, safeNumber, readAttribute, CURRENT_YEAR } from '../engine/score-utils.js';
import { runQualityEngine } from '../engine/quality-engine.js';
import { runRiskEngine } from '../engine/risk-engine.js';
import {
  DECISION_LEVEL_LABELS,
  CONFIDENCE_LEVEL_LABELS,
  RISK_LEVEL_LABELS,
  PRIMARY_ACTION_LABELS,
  resolveDecisionLevel,
  resolveConfidenceLevel,
  resolveRiskLevel,
  resolvePrimaryAction
} from './decision-summary.js';

/** @type {Readonly<Record<string, number>>} */
export const DECISION_WEIGHTS = Object.freeze({
  recommendation: 0.3,
  quality: 0.18,
  trust: 0.18,
  negotiation: 0.14,
  ownershipCost: 0.1,
  missingInfo: 0.05,
  riskPenalty: 0.05
});

/** @type {Readonly<Record<string, string[]>>} */
export const CATEGORY_CRITICAL_FIELDS = Object.freeze({
  vehicle: ['Kilometre', 'Model yılı', 'Bakım geçmişi', 'Tramer'],
  housing: ['Tapu durumu', 'İskan', 'Aidat', 'Deprem dayanımı'],
  vacation: ['İptal koşulları', 'Tarih', 'Kapasite', 'Konum doğrulaması'],
  konut: ['Tapu durumu', 'İskan', 'Aidat', 'Deprem dayanımı'],
  tatil: ['İptal koşulları', 'Tarih', 'Kapasite', 'Konum doğrulaması']
});

/**
 * @param {Record<string, unknown>} input
 * @returns {Record<string, unknown>}
 */
export function extractPurchaseSignals(input) {
  const recommendation = /** @type {Record<string, unknown>} */ (input.recommendation ?? {});
  const listing = /** @type {Record<string, unknown>} */ (recommendation.listing ?? recommendation ?? {});
  const category = String(input.category ?? listing.category ?? 'vehicle').toLowerCase();

  const negotiationIntel = /** @type {Record<string, unknown>} */ (
    input.negotiation_intelligence ?? recommendation.negotiation_intelligence ?? {}
  );
  const qualityTrust = /** @type {Record<string, unknown>} */ (
    input.listing_quality ?? recommendation.listing_quality ?? {}
  );
  const ownershipCost = /** @type {Record<string, unknown>} */ (
    input.ownership_cost ?? recommendation.ownership_cost ?? {}
  );
  const priceIntel = /** @type {Record<string, unknown>} */ (
    recommendation.price_intelligence ?? listing.price_intelligence ?? {}
  );

  const qualityResult = runQualityEngine(listing);
  const riskResult = runRiskEngine(listing, qualityResult);

  const recommendationScore = clampScore(
    safeNumber(recommendation.fit_score ?? recommendation.score ?? input.fit_score) || 50
  );

  const qualityScore = clampScore(
    safeNumber(qualityTrust.qualityScore ?? qualityTrust.quality_score ?? recommendation.quality_score ?? listing.latest_analysis?.quality_score) ||
      qualityResult.quality_score ||
      50
  );

  const trustScore = clampScore(
    safeNumber(qualityTrust.trustScore ?? qualityTrust.trust_score ?? recommendation.trust_score) ||
      Math.round((qualityScore + (100 - safeNumber(recommendation.risk_score ?? listing.latest_analysis?.risk_score ?? riskResult.risk_score))) / 2) ||
      50
  );

  const negotiationRisk = clampScore(
    safeNumber(negotiationIntel.negotiation_risk ?? negotiationIntel.risk_score) ||
      (priceIntel.deviation_pct != null ? Math.min(80, Math.abs(safeNumber(priceIntel.deviation_pct)) * 2) : 40)
  );
  const offerAdvantage = clampScore(
    safeNumber(negotiationIntel.offer_range_advantage ?? negotiationIntel.advantage_score) ||
      (safeNumber(priceIntel.deviation_pct) < -5 ? 70 : safeNumber(priceIntel.deviation_pct) > 10 ? 35 : 55)
  );
  const negotiationSignal = clampScore(offerAdvantage * 0.6 + (100 - negotiationRisk) * 0.4);

  const costRiskLevel = String(ownershipCost.cost_risk_level ?? '');
  const ownershipCostSignal = clampScore(
    safeNumber(ownershipCost.ownership_signal ?? ownershipCost.signal_score) ||
      (costRiskLevel === 'low' ? 78 : costRiskLevel === 'high' ? 32 : costRiskLevel === 'medium' ? 55 : 50)
  );

  const missingCritical = detectMissingCriticalFields(listing, category);
  const missingInfoPenalty = clampScore(
    missingCritical.length >= 3 ? 75 : missingCritical.length === 2 ? 50 : missingCritical.length === 1 ? 25 : 0
  );

  const duplicateRisk = clampScore(
    safeNumber(recommendation.duplicate_risk ?? listing.duplicate_risk ?? qualityTrust.duplicate_risk) ||
      (recommendation.duplicate_score != null ? Math.max(0, safeNumber(recommendation.duplicate_score) - 40) : 0)
  );
  const suspiciousPrice = riskResult.risk_factors?.includes('Şüpheli fiyat') ? 70 : riskResult.risk_factors?.includes('Fiyat sapması') ? 35 : 0;
  const staleRisk = detectStaleListingRisk(listing);
  const riskPenalty = clampScore(
    Math.max(duplicateRisk * 0.35, suspiciousPrice * 0.4, staleRisk * 0.25)
  );

  const categoryRisk = detectCategorySpecificRisk(listing, category);

  return {
    recommendationScore,
    qualityScore,
    trustScore,
    negotiationSignal,
    ownershipCostSignal,
    missingInfoPenalty,
    riskPenalty,
    missingCritical,
    negotiationRisk,
    offerAdvantage,
    duplicateRisk,
    suspiciousPrice,
    staleRisk,
    categoryRisk,
    riskScore: safeNumber(recommendation.risk_score ?? listing.latest_analysis?.risk_score ?? riskResult.risk_score) || 50,
    qualityCompleteness: clampScore(100 - missingInfoPenalty),
    hasPriceEvidence: Boolean(priceIntel.deviation_pct != null || safeNumber(listing.price) > 0),
    hasImageEvidence: Array.isArray(listing.images) && listing.images.length > 0,
    hasNegotiationData: Boolean(Object.keys(negotiationIntel).length > 0 || priceIntel.deviation_pct != null),
    hasOwnershipCostData: Boolean(Object.keys(ownershipCost).length > 0 || costRiskLevel),
    priceUncertainty: suspiciousPrice > 0 || !priceIntel.deviation_pct
  };
}

/**
 * @param {Record<string, unknown>} listing
 * @param {string} category
 * @returns {string[]}
 */
export function detectMissingCriticalFields(listing, category) {
  const cat = String(category ?? 'vehicle').toLowerCase();
  const missing = [];

  if (cat === 'vehicle' || cat === 'arac') {
    const km = readAttribute(listing.attributes, ['mileage', 'km', 'kilometre']);
    const year = readAttribute(listing.attributes, ['year', 'yil', 'model_year']);
    if (!km && km !== 0) missing.push('Kilometre');
    if (!year) missing.push('Model yılı');
    if (!String(listing.description ?? '').toLowerCase().includes('bakım')) missing.push('Bakım geçmişi');
    if (!String(listing.description ?? '').toLowerCase().match(/tramer|hasar|ekspertiz/)) missing.push('Tramer');
  } else if (cat === 'housing' || cat === 'real_estate' || cat === 'konut') {
    const desc = String(listing.description ?? '').toLowerCase();
    if (!desc.match(/tapu|kat mülkiyeti/)) missing.push('Tapu durumu');
    if (!desc.match(/iskan|yerleşim/)) missing.push('İskan');
    if (!desc.match(/aidat/)) missing.push('Aidat');
    if (!desc.match(/deprem|dayanım/)) missing.push('Deprem dayanımı');
  } else if (cat === 'vacation' || cat === 'travel' || cat === 'tatil') {
    const desc = String(listing.description ?? '').toLowerCase();
    if (!desc.match(/iptal|iade/)) missing.push('İptal koşulları');
    if (!readAttribute(listing.attributes, ['date', 'tarih', 'check_in'])) missing.push('Tarih');
    if (!readAttribute(listing.attributes, ['capacity', 'kapasite', 'guests'])) missing.push('Kapasite');
    if (!String(listing.location ?? '').trim()) missing.push('Konum doğrulaması');
  }

  return missing;
}

/**
 * @param {Record<string, unknown>} listing
 * @returns {number}
 */
export function detectStaleListingRisk(listing) {
  const updatedAt = listing.updated_at ?? listing.created_at;
  if (!updatedAt) return 30;
  const ageDays = (Date.now() - new Date(String(updatedAt)).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > 90) return 70;
  if (ageDays > 45) return 45;
  if (ageDays > 21) return 20;
  return 0;
}

/**
 * @param {Record<string, unknown>} listing
 * @param {string} category
 * @returns {number}
 */
export function detectCategorySpecificRisk(listing, category) {
  const cat = String(category ?? 'vehicle').toLowerCase();
  if (cat === 'vehicle' || cat === 'arac') {
    const year = safeNumber(readAttribute(listing.attributes, ['year', 'yil', 'model_year']));
    const km = safeNumber(readAttribute(listing.attributes, ['mileage', 'km', 'kilometre']));
    if (year > 2018 && km > 300000) return 60;
    if (year && (year < 1985 || year > CURRENT_YEAR + 1)) return 50;
  }
  return 0;
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {number}
 */
export function computeDecisionScore(signals) {
  const w = DECISION_WEIGHTS;
  const score =
    safeNumber(signals.recommendationScore) * w.recommendation +
    safeNumber(signals.qualityScore) * w.quality +
    safeNumber(signals.trustScore) * w.trust +
    safeNumber(signals.negotiationSignal) * w.negotiation +
    safeNumber(signals.ownershipCostSignal) * w.ownershipCost +
    (100 - safeNumber(signals.missingInfoPenalty)) * w.missingInfo +
    (100 - safeNumber(signals.riskPenalty)) * w.riskPenalty;

  return clampScore(score);
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {number}
 */
export function computeConfidenceScore(signals) {
  let confidence = 15;
  confidence += safeNumber(signals.qualityCompleteness) * 0.2;
  confidence += safeNumber(signals.trustScore) * 0.18;
  confidence += signals.hasPriceEvidence ? 15 : 0;
  confidence += signals.hasImageEvidence ? 12 : 0;
  confidence += signals.hasOwnershipCostData ? 10 : 0;
  confidence += signals.hasNegotiationData ? 10 : 0;
  confidence += safeNumber(signals.missingCritical?.length ?? 0) === 0 ? 10 : 0;

  return clampScore(Math.round(confidence));
}

/**
 * @param {number} decisionScore
 * @param {number} riskScore
 * @returns {Record<string, unknown>}
 */
export function buildDecisionStrength(decisionScore, riskScore) {
  const decisionLevel = resolveDecisionLevel(decisionScore);
  const riskLevel = resolveRiskLevel(riskScore);
  const primaryAction = resolvePrimaryAction(decisionLevel);

  return {
    decisionScore: clampScore(decisionScore),
    decisionLevel,
    decisionLabel: DECISION_LEVEL_LABELS[decisionLevel] ?? 'Değerlendirilebilir',
    riskLevel,
    riskLabel: RISK_LEVEL_LABELS[riskLevel] ?? 'Orta risk',
    primaryAction,
    primaryActionLabel: PRIMARY_ACTION_LABELS[primaryAction] ?? 'Bekle'
  };
}

/**
 * @param {number} confidenceScore
 * @returns {{ confidenceScore: number, confidenceLevel: string, confidenceLabel: string }}
 */
export function buildConfidenceMeta(confidenceScore) {
  const confidenceLevel = resolveConfidenceLevel(confidenceScore);
  return {
    confidenceScore: clampScore(confidenceScore),
    confidenceLevel,
    confidenceLabel: CONFIDENCE_LEVEL_LABELS[confidenceLevel] ?? 'Orta veri güveni'
  };
}
