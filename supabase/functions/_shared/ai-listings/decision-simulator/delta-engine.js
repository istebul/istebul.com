/**
 * AI Decision Simulator — fit score delta engine (Sprint-18 v1).
 */

/** @type {Readonly<Record<string, string>>} */
export const SUBSCORE_DELTA_LABELS = Object.freeze({
  budget_fit: 'bütçe uyumu',
  risk_fit: 'risk seviyesi',
  quality_fit: 'kalite etkisi',
  executive_fit: 'karar skoru',
  price_fit: 'fiyat değerlendirmesi',
  market_fit: 'piyasa bağlamı',
  usage_fit: 'kullanım uyumu',
  priority_fit: 'öncelik uyumu'
});

/** @type {Readonly<Record<string, { positive: string, negative: string }>>} */
export const DELTA_REASON_TEMPLATES = Object.freeze({
  budget_fit: { positive: 'bütçe uyumu arttı', negative: 'bütçe dışına çıktı' },
  risk_fit: { positive: 'risk seviyesi düştü', negative: 'risk toleransı ile uyuşmuyor' },
  quality_fit: { positive: 'kalite avantajı oluştu', negative: 'kalite avantajı azaldı' },
  executive_fit: { positive: 'karar skoru olumlu etki verdi', negative: 'karar skoru olumsuz etki verdi' },
  price_fit: { positive: 'fiyat değerlendirmesi iyileşti', negative: 'fiyat değerlendirmesi zayıfladı' },
  market_fit: { positive: 'piyasa bağlamı güçlendi', negative: 'piyasa bağlamı zayıfladı' },
  usage_fit: { positive: 'kullanım senaryosuna daha uygun', negative: 'kullanım senaryosu ile uyumsuz' },
  priority_fit: { positive: 'toplam maliyet avantajı oluştu', negative: 'öncelik kriteri ile uyumsuz' }
});

const DELTA_THRESHOLD = 3;

/**
 * @param {number} oldScore
 * @param {number} newScore
 * @returns {number}
 */
export function computeFitDelta(oldScore, newScore) {
  return Math.round(Number(newScore) - Number(oldScore));
}

/**
 * @param {Record<string, number>} oldSubscores
 * @param {Record<string, number>} newSubscores
 * @returns {{ positive_reasons: string[], negative_reasons: string[], changed_factors: string[] }}
 */
export function computeSubscoreDelta(oldSubscores = {}, newSubscores = {}) {
  /** @type {string[]} */
  const positive_reasons = [];
  /** @type {string[]} */
  const negative_reasons = [];
  /** @type {string[]} */
  const changed_factors = [];

  for (const key of Object.keys(DELTA_REASON_TEMPLATES)) {
    const oldVal = Number(oldSubscores[key] ?? 0);
    const newVal = Number(newSubscores[key] ?? 0);
    const diff = newVal - oldVal;
    if (Math.abs(diff) < DELTA_THRESHOLD) continue;

    changed_factors.push(SUBSCORE_DELTA_LABELS[key] ?? key);
    const templates = DELTA_REASON_TEMPLATES[key];
    if (diff > 0) positive_reasons.push(templates.positive);
    else negative_reasons.push(templates.negative);
  }

  if (!positive_reasons.length && !negative_reasons.length) {
    const fitDiff = computeFitDelta(
      Object.values(oldSubscores).reduce((s, v) => s + Number(v), 0) / Math.max(1, Object.keys(oldSubscores).length),
      Object.values(newSubscores).reduce((s, v) => s + Number(v), 0) / Math.max(1, Object.keys(newSubscores).length)
    );
    if (fitDiff > 0) positive_reasons.push('genel profil uyumu arttı');
    else if (fitDiff < 0) negative_reasons.push('genel profil uyumu azaldı');
  }

  return {
    positive_reasons: [...new Set(positive_reasons)].slice(0, 6),
    negative_reasons: [...new Set(negative_reasons)].slice(0, 6),
    changed_factors
  };
}

/**
 * @param {number} delta
 * @returns {'improved'|'worsened'|'unchanged'}
 */
export function classifyDeltaDirection(delta) {
  if (delta >= 5) return 'improved';
  if (delta <= -5) return 'worsened';
  return 'unchanged';
}
