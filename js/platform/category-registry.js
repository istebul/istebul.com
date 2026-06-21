/**
 * Canonical vertical registry — read-only foundation for Faz 0 platform work.
 * Does not replace existing consumers yet; mirrors current routes, keys, and lead wiring.
 */

/** @typedef {'live' | 'beta' | 'draft'} VerticalStatus */

/**
 * @typedef {Object} VerticalLeadConfig
 * @property {string|null} table
 * @property {string|null} intakeFn
 * @property {string|null} routeType
 */

/**
 * @typedef {Object} VerticalScoringConfig
 * @property {string} engine
 * @property {string|null} resultsModule
 */

/**
 * @typedef {Object} VerticalSurfaces
 * @property {boolean} assistant
 * @property {boolean} dedicatedApp
 * @property {boolean} secenekler
 * @property {boolean} compare
 */

/**
 * @typedef {Object} VerticalDefinition
 * @property {string} id
 * @property {string} slug
 * @property {string} assistantKey
 * @property {string} homeKey
 * @property {string} displayName
 * @property {string} href
 * @property {VerticalStatus} status
 * @property {string} settingKey
 * @property {readonly string[]} aliases
 * @property {VerticalLeadConfig} lead
 * @property {VerticalScoringConfig} scoring
 * @property {VerticalSurfaces} surfaces
 * @property {string} i18nKey
 */

const RAW_VERTICALS = [
  {
    id: 'auto',
    slug: 'auto',
    assistantKey: 'arac',
    homeKey: 'araba',
    displayName: 'Araba',
    href: '/auto/',
    status: 'live',
    settingKey: 'home_category_auto_enabled',
    aliases: ['araba', 'arac', 'vehicle'],
    lead: {
      table: 'auto_leads',
      intakeFn: 'auto-intake',
      routeType: null
    },
    scoring: {
      engine: 'decision-consultant',
      resultsModule: 'auto-results-v2'
    },
    surfaces: {
      assistant: true,
      dedicatedApp: true,
      secenekler: true,
      compare: true
    },
    i18nKey: 'nav.catAuto'
  },
  {
    id: 'konut',
    slug: 'konut',
    assistantKey: 'ev',
    homeKey: 'konut',
    displayName: 'Konut',
    href: '/konut/',
    status: 'live',
    settingKey: 'home_category_konut_enabled',
    aliases: ['ev', 'home', 'housing'],
    lead: {
      table: 'housing_leads',
      intakeFn: 'housing-intake',
      routeType: 'housing'
    },
    scoring: {
      engine: 'konut-wizard',
      resultsModule: 'konut-results-v2'
    },
    surfaces: {
      assistant: true,
      dedicatedApp: true,
      secenekler: true,
      compare: true
    },
    i18nKey: 'nav.catKonut'
  },
  {
    id: 'tatil',
    slug: 'tatil',
    assistantKey: 'tatil',
    homeKey: 'tatil',
    displayName: 'Tatil',
    href: '/tatil/',
    status: 'live',
    settingKey: 'home_category_tatil_enabled',
    aliases: ['vacation', 'seyahat'],
    lead: {
      table: 'vacation_leads',
      intakeFn: 'vacation-intake',
      routeType: 'vacation'
    },
    scoring: {
      engine: 'tatil-engine',
      resultsModule: 'tatil-results-v2'
    },
    surfaces: {
      assistant: true,
      dedicatedApp: true,
      secenekler: true,
      compare: true
    },
    i18nKey: 'nav.catTatil'
  },
  {
    id: 'finans',
    slug: 'finans',
    assistantKey: 'finansman',
    homeKey: 'finansman',
    displayName: 'Finansman',
    href: '/finans/',
    status: 'live',
    settingKey: 'home_category_finans_enabled',
    aliases: ['finansman'],
    lead: {
      table: 'finance_leads',
      intakeFn: 'finance-intake',
      routeType: 'finance'
    },
    scoring: {
      engine: 'finans-engine',
      resultsModule: null
    },
    surfaces: {
      assistant: true,
      dedicatedApp: true,
      secenekler: false,
      compare: true
    },
    i18nKey: 'nav.catFinans'
  },
  {
    id: 'sigorta',
    slug: 'sigorta',
    assistantKey: 'sigorta',
    homeKey: 'sigorta',
    displayName: 'Sigorta',
    href: '/sigorta/',
    status: 'live',
    settingKey: 'home_category_sigorta_enabled',
    aliases: ['insurance'],
    lead: {
      table: 'sigorta_leads',
      intakeFn: 'sigorta-intake',
      routeType: 'insurance'
    },
    scoring: {
      engine: 'sigorta-engine',
      resultsModule: 'sigorta-results-v2'
    },
    surfaces: {
      assistant: true,
      dedicatedApp: true,
      secenekler: false,
      compare: true
    },
    i18nKey: 'nav.catSigorta'
  },
  {
    id: 'kasko',
    slug: 'kasko',
    assistantKey: 'kasko',
    homeKey: 'kasko',
    displayName: 'Kasko',
    href: '/kasko/',
    status: 'live',
    settingKey: 'home_category_kasko_enabled',
    aliases: ['casco'],
    lead: {
      table: 'kasko_leads',
      intakeFn: 'kasko-intake',
      routeType: 'kasko'
    },
    scoring: {
      engine: 'kasko-engine',
      resultsModule: 'kasko-results-v2'
    },
    surfaces: {
      assistant: true,
      dedicatedApp: true,
      secenekler: false,
      compare: true
    },
    i18nKey: 'nav.catKasko'
  }
];

function deepFreeze(value) {
  if (value == null || typeof value !== 'object') return value;
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }
  return value;
}

/** @type {readonly VerticalDefinition[]} */
export const VERTICAL_REGISTRY = Object.freeze(RAW_VERTICALS.map((entry) => deepFreeze({ ...entry })));

const BY_ID = new Map(VERTICAL_REGISTRY.map((entry) => [entry.id, entry]));
const BY_SLUG = new Map(VERTICAL_REGISTRY.map((entry) => [entry.slug, entry]));
const BY_ASSISTANT_KEY = new Map(VERTICAL_REGISTRY.map((entry) => [entry.assistantKey, entry]));
const BY_HOME_KEY = new Map(VERTICAL_REGISTRY.map((entry) => [entry.homeKey, entry]));

const ALIAS_TO_ID = new Map();
for (const entry of VERTICAL_REGISTRY) {
  ALIAS_TO_ID.set(entry.id, entry.id);
  ALIAS_TO_ID.set(entry.slug, entry.id);
  ALIAS_TO_ID.set(entry.assistantKey, entry.id);
  ALIAS_TO_ID.set(entry.homeKey, entry.id);
  for (const alias of entry.aliases) {
    ALIAS_TO_ID.set(alias, entry.id);
  }
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/**
 * @param {string} id
 * @returns {VerticalDefinition|null}
 */
export function getVerticalById(id) {
  const key = normalizeToken(id);
  if (!key) return null;
  return BY_ID.get(key) || null;
}

/**
 * @param {string} slug
 * @returns {VerticalDefinition|null}
 */
export function getVerticalBySlug(slug) {
  const key = normalizeToken(slug);
  if (!key) return null;
  return BY_SLUG.get(key) || null;
}

/**
 * @param {string} key
 * @returns {VerticalDefinition|null}
 */
export function getVerticalByAssistantKey(key) {
  const normalized = normalizeToken(key);
  if (!normalized) return null;
  return BY_ASSISTANT_KEY.get(normalized) || null;
}

/**
 * @param {string} key
 * @returns {VerticalDefinition|null}
 */
export function getVerticalByHomeKey(key) {
  const normalized = normalizeToken(key);
  if (!normalized) return null;
  return BY_HOME_KEY.get(normalized) || null;
}

/**
 * Maps legacy/home/assistant tokens to canonical vertical id.
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeVerticalId(value) {
  const token = normalizeToken(value);
  if (!token) return null;
  return ALIAS_TO_ID.get(token) || null;
}

/**
 * @returns {readonly VerticalDefinition[]}
 */
export function listVerticals() {
  return Object.freeze(VERTICAL_REGISTRY.slice());
}
