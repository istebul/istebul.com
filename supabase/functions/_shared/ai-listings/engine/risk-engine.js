import { clampScore, safeNumber, readAttribute, CURRENT_YEAR } from './score-utils.js';

/**
 * @param {number} riskScore
 */
export function getRiskLevel(riskScore) {
  const score = clampScore(riskScore);
  if (score <= 30) return { level: 'low', label: 'Düşük' };
  if (score <= 60) return { level: 'medium', label: 'Orta' };
  return { level: 'high', label: 'Yüksek' };
}

/**
 * @param {Record<string, unknown>} listing
 * @param {{ missing_fields?: string[] }} [quality]
 */
export function runRiskEngine(listing, quality = {}) {
  const factors = [];
  let risk = 0;

  const images = Array.isArray(listing.images) ? listing.images : [];
  if (images.length === 0) {
    risk += 22;
    factors.push('Eksik fotoğraf');
  }

  if (String(listing.description ?? '').trim().length < 20) {
    risk += 18;
    factors.push('Eksik açıklama');
  }

  if (!String(listing.location ?? '').trim()) {
    risk += 16;
    factors.push('Eksik konum');
  }

  const year = safeNumber(readAttribute(listing.attributes, ['year', 'yil', 'model_year']));
  const km = safeNumber(readAttribute(listing.attributes, ['mileage', 'km', 'kilometre']));
  const marketAvgGuess =
    listing.category === 'vehicle' && year > 0
      ? 1_200_000 * Math.pow(0.88, Math.max(0, CURRENT_YEAR - year))
      : Number(listing.price);

  const price = Number(listing.price);
  if (price > 0 && marketAvgGuess > 0) {
    const ratio = price / marketAvgGuess;
    if (ratio > 1.45 || ratio < 0.35) {
      risk += 20;
      factors.push('Şüpheli fiyat');
    } else if (ratio > 1.25 || ratio < 0.5) {
      risk += 10;
      factors.push('Fiyat sapması');
    }
  }

  if (listing.category === 'vehicle') {
    if (year > 2018 && km >= 0 && km > 300000) {
      risk += 12;
      factors.push('Şüpheli veri');
    }
    if (year && (year < 1985 || year > CURRENT_YEAR + 1)) {
      risk += 10;
      factors.push('Şüpheli veri');
    }
  }

  if ((quality.missing_fields ?? []).length >= 4) {
    risk += 8;
    if (!factors.includes('Şüpheli veri')) factors.push('Eksik veri seti');
  }

  const risk_score = clampScore(risk);
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
