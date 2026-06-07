/**
 * AI Listings Admin — Turkish UI label helpers (Sprint-28).
 * Internal values are preserved; only display labels are translated.
 */

/** @type {Readonly<Record<string, string>>} */
export const CATEGORY_LABELS = Object.freeze({
  vehicle: 'Araç',
  real_estate: 'Konut',
  housing: 'Konut',
  konut: 'Konut',
  travel: 'Tatil',
  vacation: 'Tatil',
  tatil: 'Tatil',
  finance: 'Finansman',
  finansman: 'Finansman',
  insurance: 'Sigorta',
  sigorta: 'Sigorta',
  general: 'Genel'
});

/** @type {Readonly<Record<string, string>>} */
export const USAGE_TYPE_LABELS = Object.freeze({
  family: 'Aile kullanımı',
  city: 'Şehir içi',
  commute: 'İşe gidiş',
  long_road: 'Uzun yol',
  business: 'İş kullanımı',
  mixed: 'Karma kullanım',
  performance: 'Performans odaklı',
  general: 'Genel kullanım'
});

/** @type {Readonly<Record<string, string>>} */
export const RISK_TOLERANCE_LABELS = Object.freeze({
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek'
});

/** @type {Readonly<Record<string, string>>} */
export const PRIORITY_LABELS = Object.freeze({
  total_cost: 'Toplam maliyet',
  low_risk: 'Düşük risk',
  comfort: 'Konfor',
  performance: 'Performans',
  resale: 'İkinci el değeri',
  family: 'Aile uygunluğu',
  economy: 'Ekonomi'
});

/** @type {Readonly<Record<string, string>>} */
export const STATUS_LABELS = Object.freeze({
  draft: 'Taslak',
  pending_review: 'İncelemede',
  review: 'İncelemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  archived: 'Arşivlendi'
});

/** @type {Readonly<Record<string, string>>} */
export const METRIC_LABELS = Object.freeze({
  fit_score: 'Uyum skoru',
  decision_score: 'Karar skoru',
  decisionScore: 'Karar skoru',
  risk_score: 'Risk skoru',
  quality_score: 'Kalite skoru',
  explanation_score: 'Açıklama skoru',
  report_score: 'Rapor skoru',
  compare_score: 'Karşılaştırma skoru',
  confidence_score: 'Güven skoru',
  trust_score: 'Güven skoru',
  ai_score: 'AI skoru'
});

/**
 * @param {unknown} value
 * @param {Readonly<Record<string, string>>} map
 * @returns {string}
 */
function formatLabel(value, map) {
  const key = String(value ?? '').trim().toLowerCase();
  if (!key) return '—';
  return map[key] ?? key.replace(/_/g, ' ');
}

/**
 * @param {unknown} category
 * @returns {string}
 */
export function formatCategoryLabel(category) {
  return formatLabel(category, CATEGORY_LABELS);
}

/**
 * @param {unknown} usageType
 * @returns {string}
 */
export function formatUsageTypeLabel(usageType) {
  return formatLabel(usageType, USAGE_TYPE_LABELS);
}

/**
 * @param {unknown} riskTolerance
 * @returns {string}
 */
export function formatRiskToleranceLabel(riskTolerance) {
  return formatLabel(riskTolerance, RISK_TOLERANCE_LABELS);
}

/**
 * @param {unknown} priority
 * @returns {string}
 */
export function formatPriorityLabel(priority) {
  return formatLabel(priority, PRIORITY_LABELS);
}

/**
 * @param {unknown} status
 * @returns {string}
 */
export function formatStatusLabel(status) {
  return formatLabel(status, STATUS_LABELS);
}

/**
 * @param {unknown} metricKey
 * @returns {string}
 */
export function formatAdminMetricLabel(metricKey) {
  const key = String(metricKey ?? '').trim();
  return METRIC_LABELS[key] ?? key.replace(/_/g, ' ');
}

/**
 * @param {unknown} value
 * @param {Readonly<Record<string, string>>} map
 * @returns {{ value: string, label: string }}
 */
export function toSelectOption(value, map) {
  const v = String(value ?? '');
  return { value: v, label: formatLabel(v, map) };
}

/**
 * @param {ReadonlyArray<string>} values
 * @param {Readonly<Record<string, string>>} map
 * @returns {Array<{ value: string, label: string }>}
 */
export function toSelectOptions(values, map) {
  return values.map((v) => toSelectOption(v, map));
}
