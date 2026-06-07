import { clampScore, safeNumber } from '../scoring/score-utils.js';

/**
 * @param {number} riskScore
 * @returns {{ level: string, label: string }}
 */
export function getRiskLevel(riskScore) {
  const score = clampScore(riskScore);
  if (score <= 30) return { level: 'low', label: 'Düşük' };
  if (score <= 60) return { level: 'medium', label: 'Orta' };
  return { level: 'high', label: 'Yüksek' };
}

/**
 * @param {import('../models/canonical-listing.js').CanonicalListing} listing
 * @param {{ missing_fields?: string[] }} [quality]
 * @param {Record<string, unknown>|null|undefined} [existingAnalysis]
 * @returns {{
 *   risk_score: number,
 *   risk_level: string,
 *   risk_label: string,
 *   risk_factors: string[],
 *   risk_summary: string
 * }}
 */
export function runRiskEngine(listing, quality = {}, existingAnalysis = null) {
  const factors = [];
  let risk = 0;

  if (!listing.images || listing.images.length === 0) {
    risk += 22;
    factors.push('Eksik fotoğraf');
  }

  if (!listing.description || listing.description.length < 20) {
    risk += 18;
    factors.push('Eksik açıklama');
  }

  if (!listing.location) {
    risk += 16;
    factors.push('Eksik konum');
  }

  const marketAvgGuess =
    listing.category === 'vehicle' && listing.year
      ? 1_200_000 * Math.pow(0.88, Math.max(0, 2026 - listing.year))
      : listing.price;

  if (listing.price > 0 && marketAvgGuess > 0) {
    const ratio = listing.price / marketAvgGuess;
    if (ratio > 1.45 || ratio < 0.35) {
      risk += 20;
      factors.push('Şüpheli fiyat');
    } else if (ratio > 1.25 || ratio < 0.5) {
      risk += 10;
      factors.push('Fiyat sapması');
    }
  }

  if (listing.category === 'vehicle') {
    const year = listing.year;
    const km = listing.km;
    if (year && year > 2018 && km !== null && km > 300000) {
      risk += 12;
      factors.push('Şüpheli veri');
    }
    if (year && (year < 1985 || year > 2027)) {
      risk += 10;
      factors.push('Şüpheli veri');
    }
  }

  if ((quality.missing_fields ?? []).length >= 4) {
    risk += 8;
    if (!factors.includes('Şüpheli veri')) factors.push('Eksik veri seti');
  }

  const computed = clampScore(risk);
  const existing = Number(existingAnalysis?.risk_score);
  const risk_score = Number.isFinite(existing) ? clampScore(existing) : computed;
  const { level, label } = getRiskLevel(risk_score);

  const risk_summary =
    factors.length === 0
      ? 'Belirgin risk sinyali tespit edilmedi.'
      : `${label} risk — ${factors.slice(0, 3).join(', ')}.`;

  return {
    risk_score,
    risk_level: level,
    risk_label: label,
    risk_factors: factors,
    risk_summary
  };
}
