/**
 * Auto wizard profile helpers — state/AI/card labels only (no engine scoring).
 */

export const HOUSEHOLD_SIZE_OPTIONS = Object.freeze([
  { label: '1 kişi', value: '1', note: 'Tek kullanıcı' },
  { label: '2 kişi', value: '2', note: 'Çift veya ikili kullanım' },
  { label: '3-4 kişi', value: '3-4', note: 'Küçük aile · bagaj ihtiyacı' },
  { label: '5+ kişi', value: '5+', note: 'Geniş hane · yüksek kapasite' }
]);

/**
 * @param {string} [usage]
 * @returns {boolean}
 */
export function shouldShowCityRatioField(usage) {
  return usage === 'city' || usage === 'family';
}

/**
 * @param {string} [usage]
 * @param {string} [selected]
 * @returns {string}
 */
export function resolveCityRatioForSync(usage, selected) {
  if (shouldShowCityRatioField(usage)) {
    return selected || '0.6';
  }
  if (usage === 'long' || usage === 'business') {
    return '0.25';
  }
  return '0.6';
}

/**
 * @param {string} [value]
 * @returns {string}
 */
export function formatHouseholdSizeLabel(value) {
  const hit = HOUSEHOLD_SIZE_OPTIONS.find((option) => option.value === value);
  return hit?.label || '';
}

/**
 * @param {string} [value]
 * @returns {string}
 */
export function formatHouseholdHouseholdPhrase(value) {
  if (!value) return '';
  if (value === '1') return 'tek kişilik hane';
  if (value === '2') return '2 kişilik hane';
  if (value === '3-4') return '3-4 kişilik hane';
  if (value === '5+') return '5+ kişilik hane';
  return '';
}

/**
 * Decision card suitability signal copy (display-only; score unchanged).
 * @param {object} [state]
 * @param {string} [baseSuitability]
 * @returns {string}
 */
export function buildAutoSuitabilitySignalText(state = {}, baseSuitability = '') {
  const phrase = formatHouseholdHouseholdPhrase(state.household_size);
  const base = String(baseSuitability || '').trim();
  if (!phrase) {
    return base || '—';
  }

  const usage = state.usage;
  let profileNote = 'kullanım profiline';
  if (usage === 'family') profileNote = 'aile kullanımına';
  else if (usage === 'city') profileNote = 'şehir kullanımına';

  const capitalized = phrase.charAt(0).toUpperCase() + phrase.slice(1);
  return `${capitalized} için ${profileNote} uyumlu.`;
}

/**
 * Narrative hints for AI insight (no new scores).
 * @param {object} [state]
 * @returns {string}
 */
export function buildAutoHouseholdInsightClause(state = {}) {
  const phrase = formatHouseholdHouseholdPhrase(state.household_size);
  if (!phrase) return '';

  const size = state.household_size;
  const usage = state.usage;
  const themes = [];

  if (usage === 'family') themes.push('aile kullanımı');
  if (size === '3-4' || size === '5+') themes.push('bagaj ihtiyacı');
  if (size === '5+') themes.push('yolcu kapasitesi');
  if (!themes.length) themes.push('kullanım profili');

  const capitalized = phrase.charAt(0).toUpperCase() + phrase.slice(1);
  return `${capitalized} için ${themes.join(' ve ')} değerlendirildi`;
}
