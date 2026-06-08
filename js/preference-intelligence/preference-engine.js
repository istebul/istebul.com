/**
 * Preference Intelligence — behavior learning (Sprint-32).
 * Does NOT modify recommendation scores — explanation/personalization only.
 */

export const PREFERENCE_SIGNAL_KEYS = Object.freeze([
  'riskSensitivity',
  'costSensitivity',
  'qualitySensitivity',
  'familyPreference',
  'cityUsagePreference',
  'comfortPreference',
  'performancePreference'
]);

export const PREFERENCE_WARNING = 'Tercihleriniz zaman içinde güncellenebilir.';

/**
 * @param {string} key
 * @returns {boolean}
 */
export function isValidPreferenceSignal(key) {
  return PREFERENCE_SIGNAL_KEYS.includes(String(key));
}

/**
 * @param {Record<string, unknown>} signal
 * @returns {Record<string, unknown>}
 */
export function normalizePreferenceSignal(signal = {}) {
  const key = String(signal.signal_key ?? signal.signalKey ?? '');
  return {
    id: String(signal.id ?? `sig_${Date.now()}`),
    user_id: String(signal.user_id ?? signal.userId ?? ''),
    signal_key: isValidPreferenceSignal(key) ? key : 'qualitySensitivity',
    signal_value: clampPreferenceValue(signal.signal_value ?? signal.signalValue),
    source_event: String(signal.source_event ?? signal.sourceEvent ?? ''),
    created_at: String(signal.created_at ?? signal.createdAt ?? new Date().toISOString())
  };
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function clampPreferenceValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * @param {string} eventType
 * @returns {Record<string, number>}
 */
export function deriveSignalsFromEvent(eventType) {
  const type = String(eventType);
  /** @type {Record<string, number>} */
  const deltas = {};

  if (type === 'compare_opened') {
    deltas.qualitySensitivity = 3;
    deltas.costSensitivity = 2;
  } else if (type === 'scenario_opened') {
    deltas.riskSensitivity = 4;
    deltas.costSensitivity = 2;
  } else if (type === 'report_opened') {
    deltas.qualitySensitivity = 4;
    deltas.comfortPreference = 2;
  } else if (type === 'decision_center_opened') {
    deltas.riskSensitivity = 2;
    deltas.qualitySensitivity = 2;
  } else if (type === 'listing_viewed') {
    deltas.cityUsagePreference = 1;
  }

  return deltas;
}

/**
 * @param {Array<Record<string, unknown>>} signals
 * @param {Record<string, unknown>} [existing]
 * @returns {Record<string, unknown>}
 */
export function aggregatePreferenceProfile(signals = [], existing = {}) {
  const grouped = /** @type {Record<string, number[]>} */ ({});

  for (const key of PREFERENCE_SIGNAL_KEYS) {
    grouped[key] = [];
  }

  for (const raw of signals) {
    const signal = normalizePreferenceSignal(raw);
    if (grouped[signal.signal_key]) {
      grouped[signal.signal_key].push(signal.signal_value);
    }
  }

  /** @type {Record<string, number>} */
  const profile = {};
  for (const key of PREFERENCE_SIGNAL_KEYS) {
    const values = grouped[key];
    const existingVal = clampPreferenceValue(existing[key] ?? existing[camelToSnake(key)]);
    if (!values.length) {
      profile[key] = existingVal;
    } else {
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      profile[key] = clampPreferenceValue(Math.round((existingVal + avg) / 2));
    }
  }

  const labels = buildPreferenceLabels(profile);

  return {
    user_id: String(existing.user_id ?? existing.userId ?? ''),
    ...profile,
    signal_count: signals.length,
    labels,
    updated_at: new Date().toISOString()
  };
}

/**
 * @param {string} key
 * @returns {string}
 */
function camelToSnake(key) {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * @param {number} value
 * @param {string} highLabel
 * @param {string} lowLabel
 * @returns {string|null}
 */
function tendencyLabel(value, highLabel, lowLabel) {
  if (value >= 65) return highLabel;
  if (value <= 35) return lowLabel;
  return null;
}

/**
 * @param {Record<string, number>} profile
 * @returns {string[]}
 */
export function buildPreferenceLabels(profile = {}) {
  /** @type {string[]} */
  const labels = [];

  const risk = tendencyLabel(profile.riskSensitivity ?? 50, 'Yüksek Risk Hassasiyeti', 'Düşük Risk Eğilimi');
  if (risk) labels.push(risk);

  const quality = tendencyLabel(profile.qualitySensitivity ?? 50, 'Yüksek Kalite Eğilimi', 'Esnek Kalite Eğilimi');
  if (quality) labels.push(quality);

  const cost = tendencyLabel(profile.costSensitivity ?? 50, 'Maliyet Odaklı Eğilim', 'Maliyet Esnekliği');
  if (cost) labels.push(cost);

  const family = tendencyLabel(profile.familyPreference ?? 50, 'Aile Kullanımı Eğilimi', null);
  if (family) labels.push(family);

  const comfort = tendencyLabel(profile.comfortPreference ?? 50, 'Konfor Önceliği', null);
  if (comfort) labels.push(comfort);

  const performance = tendencyLabel(profile.performancePreference ?? 50, 'Performans Önceliği', null);
  if (performance) labels.push(performance);

  const city = tendencyLabel(profile.cityUsagePreference ?? 50, 'Şehir Kullanımı Eğilimi', null);
  if (city) labels.push(city);

  return labels.slice(0, 6);
}

/**
 * @param {Record<string, unknown>} params
 * @returns {Array<Record<string, unknown>>}
 */
export function createSignalsFromEvent(params = {}) {
  const eventType = String(params.eventType ?? params.event_type ?? '');
  const deltas = deriveSignalsFromEvent(eventType);
  const userId = String(params.userId ?? params.user_id ?? '');

  return Object.entries(deltas).map(([key, delta]) =>
    normalizePreferenceSignal({
      user_id: userId,
      signal_key: key,
      signal_value: 50 + delta,
      source_event: eventType
    })
  );
}

/**
 * @param {Record<string, unknown>} profile
 * @param {Record<string, unknown>} decisionContext
 * @returns {string[]}
 */
export function buildPersonalizedInsights(profile = {}, decisionContext = {}) {
  const labels = buildPreferenceLabels(profile);
  /** @type {string[]} */
  const insights = [...labels];

  if ((profile.costSensitivity ?? 50) >= 60 && decisionContext.totalCostSummary) {
    insights.push('Maliyet odaklı profilinize göre toplam sahip olma maliyetini dikkatle incelemeniz önerilir.');
  }

  if ((profile.riskSensitivity ?? 50) >= 60 && decisionContext.riskLevel === 'high') {
    insights.push('Risk hassasiyetiniz yüksek; ek doğrulama adımlarını gözden geçirmeniz faydalı olabilir.');
  }

  return insights.slice(0, 4);
}
