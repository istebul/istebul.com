/**
 * AI Recommendation Engine — explainability (Sprint-16 v1).
 */

/** @type {Readonly<Record<string, string>>} */
const SUBSCORE_LABELS_TR = Object.freeze({
  budget_fit: 'Bütçeye uygun',
  risk_fit: 'Risk seviyesi uygun',
  quality_fit: 'Kalite skoru yüksek',
  executive_fit: 'Karar skoru olumlu',
  price_fit: 'Fiyat ön değerlendirmesi makul',
  market_fit: 'Piyasa bağlamı uygun',
  usage_fit: 'Kullanım profiline uygun',
  priority_fit: 'Öncelik kriterine uygun'
});

/**
 * @param {Record<string, number>} subscores
 * @param {number} [threshold]
 * @returns {string[]}
 */
export function buildPositiveReasons(subscores, threshold = 70) {
  /** @type {string[]} */
  const reasons = [];
  for (const [key, label] of Object.entries(SUBSCORE_LABELS_TR)) {
    const value = Number(subscores[key]);
    if (Number.isFinite(value) && value >= threshold) {
      reasons.push(label);
    }
  }
  return [...new Set(reasons)];
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown>} listing
 * @param {Record<string, number>} breakdown
 * @returns {string[]}
 */
export function buildRiskWarnings(record, listing, breakdown) {
  /** @type {string[]} */
  const risks = [];

  const risk = Number(record.risk_score);
  if (Number.isFinite(risk) && risk >= 61) risks.push('Risk skoru yüksek');

  if (breakdown.duplicate_penalty < 0) risks.push('Duplicate riski var');

  const images = Array.isArray(listing.images) ? listing.images : [];
  if (!images.length) risks.push('Fotoğraf eksik');

  const quality = Number(record.quality_score);
  if (Number.isFinite(quality) && quality < 50) risks.push('Kalite skoru düşük');

  const priceFit = Number(breakdown.price_fit ?? 0);
  if (priceFit > 0 && priceFit <= 3) risks.push('Fiyat ön değerlendirmesi zayıf');

  return [...new Set(risks)];
}

/**
 * @param {Record<string, unknown>} item
 * @returns {{ reasons: string[], risks: string[], reasons_text: string, risks_text: string }}
 */
export function buildRecommendationExplanation(item) {
  const subscores = /** @type {Record<string, number>} */ (item.subscores ?? {});
  const breakdown = /** @type {Record<string, number>} */ (item.breakdown ?? {});
  const listing = /** @type {Record<string, unknown>} */ (item.listing ?? {});

  const positive = buildPositiveReasons(subscores);
  if (Number(subscores.budget_fit) >= 70) positive.unshift('Bütçeye uygun');
  if (Number(subscores.risk_fit) >= 70) positive.unshift('Risk seviyesi düşük');
  if (Number(subscores.quality_fit) >= 70 && !positive.includes('Kalite skoru yüksek')) {
    positive.push('Kalite skoru yüksek');
  }
  if (Number(subscores.price_fit) >= 70 && !positive.includes('Fiyat ön değerlendirmesi makul')) {
    positive.push('Fiyat ön değerlendirmesi makul');
  }

  const reasons = [...new Set(positive)].slice(0, 6);
  const risks = buildRiskWarnings(item, listing, breakdown).slice(0, 4);

  return {
    reasons,
    risks,
    reasons_text: reasons.map((r) => `✓ ${r}`).join('\n'),
    risks_text: risks.map((r) => `⚠ ${r}`).join('\n')
  };
}
