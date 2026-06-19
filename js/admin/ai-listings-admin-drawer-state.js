/**
 * AI Listings Admin — central AI drawer state (Sprint-29).
 * Pure state helpers; rendering is delegated to admin.js.
 */

/** @type {Readonly<string[]>} */
export const DRAWER_TYPES = Object.freeze([
  'quality',
  'negotiation',
  'purchase',
  'explain',
  'report',
  'compare',
  'scenario'
]);

/** @type {Readonly<Record<string, string>>} */
export const DRAWER_TITLES_TR = Object.freeze({
  quality: 'Kalite ve Güven',
  negotiation: 'Pazarlık Analizi',
  purchase: 'Al Kararı Analizi',
  explain: 'Karar Açıklaması',
  report: 'Yönetici Karar Raporu',
  compare: 'Karşılaştırma Analizi',
  scenario: 'Senaryo Simülasyonu'
});

/** @type {Readonly<Record<string, string>>} */
export const MODULE_UNAVAILABLE_TR = Object.freeze({
  quality: 'Kalite ve güven analizi şu anda üretilemedi.',
  negotiation: 'Pazarlık analizi şu anda üretilemedi.',
  purchase: 'Al kararı analizi şu anda üretilemedi.',
  explain: 'Karar açıklaması şu anda üretilemedi.',
  report: 'Yönetici raporu şu anda üretilemedi.',
  compare: 'Karşılaştırma analizi şu anda üretilemedi.',
  scenario: 'Senaryo simülasyonu şu anda üretilemedi.'
});

/** @type {Readonly<Record<string, string>>} */
export const DRAWER_BODY_CLASSES = Object.freeze({
  quality: 'ai-listings-admin--exp-open',
  negotiation: 'ai-listings-admin--pd-open',
  purchase: 'ai-listings-admin--pd-open',
  explain: 'ai-listings-admin--exp-open',
  report: 'ai-listings-admin--edr-open',
  compare: 'ai-listings-admin--cmp-open',
  scenario: 'ai-listings-admin--ss-open'
});

/** @type {Readonly<Record<string, string>>} */
export const DRAWER_HOST_IDS = Object.freeze({
  quality: 'ai-exp-panel-host',
  negotiation: 'ai-pd-panel-host',
  purchase: 'ai-pd-panel-host',
  explain: 'ai-exp-panel-host',
  report: 'ai-edr-panel-host',
  compare: 'ai-cmp-panel-host',
  scenario: 'ai-ss-panel-host'
});

/**
 * @typedef {Object} DrawerContext
 * @property {string} [listingId]
 * @property {string} [recommendationId]
 * @property {string} [compareSelectionKey]
 * @property {string} [scenarioKey]
 * @property {string} [title]
 */

/**
 * @returns {{
 *   activeDrawerType: string|null,
 *   activeDrawerListingId: string|null,
 *   activeDrawerRecommendationId: string|null,
 *   activeDrawerCompareSelectionKey: string|null,
 *   scenarioKey: string
 * }}
 */
export function createInitialDrawerState() {
  return {
    activeDrawerType: null,
    activeDrawerListingId: null,
    activeDrawerRecommendationId: null,
    activeDrawerCompareSelectionKey: null,
    scenarioKey: 'price_minus_5'
  };
}

/**
 * @param {string|null|undefined} type
 * @returns {boolean}
 */
export function isValidDrawerType(type) {
  return Boolean(type && DRAWER_TYPES.includes(String(type)));
}

/**
 * @param {string} type
 * @returns {string}
 */
export function getDrawerTitleTr(type) {
  return DRAWER_TITLES_TR[type] ?? 'AI Analiz Paneli';
}

/**
 * @param {string} type
 * @returns {string}
 */
export function getModuleUnavailableMessageTr(type) {
  return MODULE_UNAVAILABLE_TR[type] ?? 'Bu analiz için yeterli veri yok.';
}

/**
 * @param {string} type
 * @returns {string}
 */
export function getDrawerHostId(type) {
  return DRAWER_HOST_IDS[type] ?? '';
}

/**
 * @param {string} type
 * @returns {string}
 */
export function getDrawerBodyClass(type) {
  return DRAWER_BODY_CLASSES[type] ?? '';
}

/**
 * @param {string[]} compareIds
 * @returns {string}
 */
export function buildCompareSelectionKey(compareIds) {
  return [...compareIds].map(String).sort().join('|');
}

/**
 * @param {ReturnType<typeof createInitialDrawerState>} state
 * @param {string} type
 * @param {DrawerContext} [context]
 * @returns {ReturnType<typeof createInitialDrawerState>}
 */
export function openDrawerState(state, type, context = {}) {
  if (!isValidDrawerType(type)) return { ...state };

  return {
    activeDrawerType: type,
    activeDrawerListingId: String(context.listingId ?? state.activeDrawerListingId ?? ''),
    activeDrawerRecommendationId: String(
      context.recommendationId ?? state.activeDrawerRecommendationId ?? ''
    ),
    activeDrawerCompareSelectionKey:
      context.compareSelectionKey ?? state.activeDrawerCompareSelectionKey ?? null,
    scenarioKey: String(context.scenarioKey ?? state.scenarioKey ?? 'price_minus_5')
  };
}

/**
 * @param {ReturnType<typeof createInitialDrawerState>} state
 * @returns {ReturnType<typeof createInitialDrawerState>}
 */
export function closeDrawerState(state) {
  return {
    ...state,
    activeDrawerType: null
  };
}

/**
 * @returns {ReturnType<typeof createInitialDrawerState>}
 */
export function resetDrawerState() {
  return createInitialDrawerState();
}

/**
 * @param {ReturnType<typeof createInitialDrawerState>} state
 * @returns {boolean}
 */
export function isDrawerOpen(state) {
  return Boolean(state.activeDrawerType);
}

/**
 * @param {string[]} bodyClasses
 * @returns {string[]}
 */
export function getActiveDrawerBodyClasses(bodyClasses = Object.values(DRAWER_BODY_CLASSES)) {
  return [...new Set(bodyClasses)];
}
