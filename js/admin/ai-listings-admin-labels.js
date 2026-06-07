/**
 * AI Listings Admin — Turkish UI label helpers (Sprint-28/29).
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
export const SOURCE_TYPE_LABELS = Object.freeze({
  manual: 'Manuel',
  import: 'İçe aktarma',
  collector: 'Toplayıcı',
  builder: 'Oluşturucu',
  api: 'API',
  scrape: 'Kazıma'
});

/** @type {Readonly<Record<string, string>>} */
export const RISK_LEVEL_LABELS = Object.freeze({
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek'
});

/** @type {Readonly<Record<string, string>>} */
export const DUPLICATE_LABELS = Object.freeze({
  duplicate: 'Mükerrer',
  mukerrer: 'Mükerrer',
  same_listing_found: 'Aynı ilan bulundu',
  high_price: 'Yüksek fiyat'
});

/** @type {Readonly<Record<string, string>>} */
export const UI_STATUS_LABELS = Object.freeze({
  loading: 'Yükleniyor…',
  error: 'Hata',
  unavailable: 'Kullanılamıyor',
  missing_data: 'Eksik veri',
  insufficient_data: 'Yetersiz veri'
});

/** @type {Readonly<Record<string, string>>} */
export const LOADING_LABELS = Object.freeze({
  default: 'Yükleniyor…',
  analysis: 'Analiz hazırlanıyor…',
  workspace: 'Karar çalışma alanı hazırlanıyor…',
  drawer: 'Analiz paneli hazırlanıyor…'
});

/** @type {Readonly<Record<string, string>>} */
export const ERROR_FALLBACK_LABELS = Object.freeze({
  negotiation_unavailable: 'Pazarlık analizi şu anda üretilemedi.',
  purchase_unavailable: 'Al kararı analizi şu anda üretilemedi.',
  explain_unavailable: 'Karar açıklaması şu anda üretilemedi.',
  report_unavailable: 'Yönetici raporu şu anda üretilemedi.',
  compare_unavailable: 'Karşılaştırma analizi şu anda üretilemedi.',
  scenario_unavailable: 'Senaryo simülasyonu şu anda üretilemedi.',
  quality_unavailable: 'Kalite ve güven analizi şu anda üretilemedi.',
  insufficient_data: 'Bu analiz için yeterli veri bulunamadı.'
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
/**
 * @param {string} key
 * @returns {string}
 */
export function humanizeSnakeCaseTr(key) {
  const normalized = String(key ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ');
  if (!normalized) return '—';
  return normalized.charAt(0).toLocaleUpperCase('tr-TR') + normalized.slice(1);
}

/**
 * @param {unknown} value
 * @param {Readonly<Record<string, string>>} map
 * @returns {string}
 */
function formatLabel(value, map) {
  const key = String(value ?? '').trim().toLowerCase();
  if (!key) return '—';
  return map[key] ?? humanizeSnakeCaseTr(key);
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
  return METRIC_LABELS[key] ?? humanizeSnakeCaseTr(key);
}

/**
 * @param {unknown} sourceType
 * @returns {string}
 */
export function formatSourceTypeLabel(sourceType) {
  return formatLabel(sourceType, SOURCE_TYPE_LABELS);
}

/**
 * @param {unknown} riskLevel
 * @returns {string}
 */
export function formatRiskLevelLabel(riskLevel) {
  return formatLabel(riskLevel, RISK_LEVEL_LABELS);
}

/**
 * @param {unknown} duplicateKey
 * @returns {string}
 */
export function formatDuplicateLabel(duplicateKey) {
  return formatLabel(duplicateKey, DUPLICATE_LABELS);
}

/**
 * @param {unknown} uiStatus
 * @returns {string}
 */
export function formatUiStatusLabel(uiStatus) {
  return formatLabel(uiStatus, UI_STATUS_LABELS);
}

/**
 * @param {unknown} loadingKey
 * @returns {string}
 */
export function formatLoadingLabel(loadingKey = 'default') {
  const key = String(loadingKey ?? 'default').toLowerCase();
  return LOADING_LABELS[key] ?? LOADING_LABELS.default;
}

/**
 * @param {unknown} errorKey
 * @returns {string}
 */
export function formatErrorFallbackLabel(errorKey) {
  const key = String(errorKey ?? '').trim().toLowerCase();
  return ERROR_FALLBACK_LABELS[key] ?? ERROR_FALLBACK_LABELS.insufficient_data;
}

/**
 * @param {unknown} message
 * @returns {string}
 */
export function translateAdminUiError(message) {
  const lower = String(message ?? '').trim().toLowerCase();
  if (!lower) return formatErrorFallbackLabel('insufficient_data');
  if (lower.includes('negotiation unavailable')) return formatErrorFallbackLabel('negotiation_unavailable');
  if (lower.includes('purchase decision unavailable')) return formatErrorFallbackLabel('purchase_unavailable');
  if (lower.includes('explainability unavailable')) return formatErrorFallbackLabel('explain_unavailable');
  if (lower.includes('executive report unavailable')) return formatErrorFallbackLabel('report_unavailable');
  if (lower.includes('compare unavailable')) return formatErrorFallbackLabel('compare_unavailable');
  if (lower.includes('scenario unavailable')) return formatErrorFallbackLabel('scenario_unavailable');
  if (lower.includes('unavailable')) return formatUiStatusLabel('unavailable');
  if (lower.includes('missing data')) return formatUiStatusLabel('missing_data');
  if (lower.includes('loading')) return formatLoadingLabel('default');
  if (lower.includes('error')) return formatUiStatusLabel('error');
  return String(message ?? formatErrorFallbackLabel('insufficient_data'));
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
