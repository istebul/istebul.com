import { clampScore } from '../scoring/score-utils.js';
import { getRiskLevel } from '../risk/risk-engine.js';

/** @typedef {'buyable'|'review'|'risky'|'not_recommended'|'pending'} DecisionRecommendation */

/**
 * @param {DecisionRecommendation} recommendation
 * @returns {string}
 */
export function getRecommendationLabel(recommendation) {
  const labels = {
    buyable: 'Satın Alınabilir',
    review: 'İncelenebilir',
    risky: 'Riskli',
    not_recommended: 'Önerilmez',
    pending: 'Analiz Bekleniyor'
  };
  return labels[recommendation] ?? 'İncelenebilir';
}

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 * @param {{
 *   quality_score: number,
 *   missing_fields?: string[],
 *   quality_summary?: string
 * }} quality
 * @param {{
 *   market_score: number,
 *   deviation_pct?: number,
 *   market_summary?: string
 * }} market
 * @param {{
 *   risk_score: number,
 *   risk_factors?: string[]
 * }} risk
 * @param {Record<string, unknown>|null|undefined} [existingAnalysis]
 * @returns {{
 *   decision_score: number,
 *   decision_summary: string,
 *   strengths: string[],
 *   risks: string[],
 *   recommendation: DecisionRecommendation,
 *   recommendation_label: string
 * }}
 */
export function runDecisionEngine(listing, quality, market, risk, existingAnalysis = null) {
  const aiFromServer = Number(existingAnalysis?.ai_score);
  const confidenceFromServer = Number(existingAnalysis?.confidence);

  const qualityPart = quality.quality_score * 0.25;
  const marketPart = market.market_score * 0.25;
  const riskPart = (100 - risk.risk_score) * 0.25;
  const pricePart = (market.price_score ?? 50) * 0.15;
  const completenessPart = Math.max(0, 100 - (quality.missing_fields?.length ?? 0) * 8) * 0.1;

  let decision_score = clampScore(qualityPart + marketPart + riskPart + pricePart + completenessPart);

  if (Number.isFinite(aiFromServer)) {
    decision_score = clampScore(decision_score * 0.45 + aiFromServer * 0.55);
  }

  /** @type {string[]} */
  const strengths = [];
  /** @type {string[]} */
  const risks = [...(risk.risk_factors ?? [])];

  if (quality.quality_score >= 75) strengths.push('yüksek veri kalitesi');
  if (market.deviation_pct !== undefined && market.deviation_pct < -3) strengths.push('fiyat avantajı');
  if (listing.km !== null && listing.km <= 80000) strengths.push('düşük km');
  if (listing.description.length >= 50) strengths.push('detaylı açıklama');
  if (Array.isArray(existingAnalysis?.pros) && existingAnalysis.pros.length) {
    for (const item of existingAnalysis.pros.slice(0, 2)) strengths.push(String(item));
  }

  if (quality.missing_fields?.includes('Fotoğraf')) risks.push('görsel eksik');
  if (quality.missing_fields?.includes('Açıklama')) risks.push('açıklama eksik');
  if (market.deviation_pct !== undefined && market.deviation_pct > 8) risks.push('fiyat yüksek');
  if (Array.isArray(existingAnalysis?.cons) && existingAnalysis.cons.length) {
    for (const item of existingAnalysis.cons.slice(0, 2)) risks.push(String(item));
  }

  const uniqueStrengths = [...new Set(strengths)].slice(0, 5);
  const uniqueRisks = [...new Set(risks)].slice(0, 5);

  let recommendation = /** @type {DecisionRecommendation} */ ('review');
  if (!Number.isFinite(aiFromServer) && quality.quality_score < 40) {
    recommendation = 'pending';
  } else if (decision_score >= 80 && risk.risk_score <= 30) {
    recommendation = 'buyable';
  } else if (decision_score < 40 || risk.risk_score > 70) {
    recommendation = 'not_recommended';
  } else if (risk.risk_score > 50 || decision_score < 55) {
    recommendation = 'risky';
  } else {
    recommendation = 'review';
  }

  const riskLabel = getRiskLevel(risk.risk_score).label.toLowerCase();
  let decision_summary = existingAnalysis?.summary
    ? String(existingAnalysis.summary)
    : `Karar: ${getRecommendationLabel(recommendation)}.`;

  if (!existingAnalysis?.summary) {
    const parts = [];
    if (market.market_summary) parts.push(market.market_summary.replace(/\.$/, ''));
    if (uniqueRisks.length) parts.push(`${uniqueRisks[0]} nedeniyle ${riskLabel} risk`);
    else parts.push(`${riskLabel} risk profili`);
    decision_summary = parts.join('; ') + '.';
  }

  if (Number.isFinite(confidenceFromServer) && confidenceFromServer < 0.5) {
    decision_summary += ' Güven skoru düşük.';
  }

  return {
    decision_score,
    decision_summary,
    strengths: uniqueStrengths,
    risks: uniqueRisks,
    recommendation,
    recommendation_label: getRecommendationLabel(recommendation)
  };
}
