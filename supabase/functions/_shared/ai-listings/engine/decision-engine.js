import { clampScore } from './score-utils.js';
import { getRiskLevel } from './risk-engine.js';

/**
 * @param {number} decisionScore
 * @returns {{ type: string, label: string }}
 */
export function getRecommendationFromScore(decisionScore) {
  const score = clampScore(decisionScore);
  if (score >= 90) return { type: 'buyable', label: 'Satın Alınabilir' };
  if (score >= 70) return { type: 'review', label: 'İncelenebilir' };
  if (score >= 50) return { type: 'careful', label: 'Dikkatli İncelenmeli' };
  if (score >= 30) return { type: 'risky', label: 'Riskli' };
  return { type: 'not_recommended', label: 'Önerilmez' };
}

/**
 * @param {Record<string, unknown>} listing
 * @param {{ quality_score: number, quality_summary?: string, missing_fields?: string[] }} quality
 * @param {{ market_score: number, price_score: number, market_summary?: string, deviation_pct?: number }} market
 * @param {{ risk_score: number, risk_label?: string, risk_factors?: string[] }} risk
 */
export function runDecisionEngine(listing, quality, market, risk) {
  const qualityPart = quality.quality_score * 0.25;
  const marketPart = market.market_score * 0.25;
  const riskPart = (100 - risk.risk_score) * 0.25;
  const pricePart = market.price_score * 0.15;
  const completenessPart = Math.max(0, 100 - (quality.missing_fields?.length ?? 0) * 8) * 0.1;

  const decision_score = clampScore(qualityPart + marketPart + riskPart + pricePart + completenessPart);
  const recommendation = getRecommendationFromScore(decision_score);

  /** @type {string[]} */
  const strengths = [];
  /** @type {string[]} */
  const risks = [...(risk.risk_factors ?? [])];

  if (quality.quality_score >= 75) strengths.push('yüksek veri kalitesi');
  if (market.deviation_pct !== undefined && market.deviation_pct < -3) strengths.push('fiyat avantajı');
  const km = Number(listing.km ?? listing.attributes?.km);
  if (Number.isFinite(km) && km <= 80000) strengths.push('düşük km');
  if (String(listing.description ?? '').length >= 50) strengths.push('detaylı açıklama');

  if (quality.missing_fields?.includes('Fotoğraf')) risks.push('görsel eksik');
  if (quality.missing_fields?.includes('Açıklama')) risks.push('açıklama eksik');
  if (market.deviation_pct !== undefined && market.deviation_pct > 8) risks.push('fiyat yüksek');

  const uniqueStrengths = [...new Set(strengths)].slice(0, 5);
  const uniqueRisks = [...new Set(risks)].slice(0, 5);
  const riskLabel = getRiskLevel(risk.risk_score).label.toLowerCase();

  const sentences = [
    quality.quality_summary ?? 'Veri kalitesi değerlendirildi.',
    market.market_summary ?? 'Piyasa konumu hesaplandı.',
    `Karar: ${recommendation.label} (${decision_score}/100); ${riskLabel} risk profili.`
  ];

  const decision_summary = sentences.join(' ');

  const hasCore =
    String(listing.title ?? '').trim() &&
    Number(listing.price) > 0 &&
    String(listing.location ?? '').trim();
  const confidence = hasCore ? 0.85 : quality.quality_score >= 50 ? 0.65 : 0.45;

  return {
    decision_score,
    decision_summary,
    strengths: uniqueStrengths,
    risks: uniqueRisks,
    recommendation: recommendation.type,
    recommendation_label: recommendation.label,
    confidence
  };
}
