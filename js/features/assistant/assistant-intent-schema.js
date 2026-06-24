/**
 * Karar Asistanı intent şeması — MVP (auto / arac only).
 * Validate/normalize only; no scoring or bridge side effects.
 */

export const ASSISTANT_INTENT_MVP_CATEGORY = 'arac';

export const AUTO_INTENT_FUEL_VALUES = Object.freeze([
  'hybrid',
  'electric',
  'gasoline',
  'diesel',
  'any'
]);

export const AUTO_INTENT_BODY_VALUES = Object.freeze([
  'suv',
  'sedan',
  'hatchback'
]);

export const AUTO_INTENT_USAGE_VALUES = Object.freeze([
  'family',
  'city',
  'long',
  'business'
]);

export const AUTO_ASSISTANT_PRIORITY_VALUES = Object.freeze([
  'lowCost',
  'safety',
  'comfort',
  'resale'
]);

export const AUTO_INTENT_HOUSEHOLD_SIZE_VALUES = Object.freeze([
  '1',
  '2',
  '3-4',
  '5+'
]);

const AUTO_CITY_QUERY_PATTERN = /^[\p{L}\s'-]+$/u;

const USAGE_PROFILE_CITY_PHRASE_PATTERN =
  /şehir\s+içi|sehir\s+ici|city\s+driving|kısa\s+mesafe|kisa\s+mesafe/i;

const FUEL_SET = new Set(AUTO_INTENT_FUEL_VALUES);
const BODY_SET = new Set(AUTO_INTENT_BODY_VALUES);
const USAGE_SET = new Set(AUTO_INTENT_USAGE_VALUES);
const PRIORITY_SET = new Set(AUTO_ASSISTANT_PRIORITY_VALUES);
const HOUSEHOLD_SIZE_SET = new Set(AUTO_INTENT_HOUSEHOLD_SIZE_VALUES);

const USAGE_ALIASES = Object.freeze({
  longroad: 'long',
  long_road: 'long',
  uzunyol: 'long',
  prestige: 'business',
  is: 'business',
  business: 'business',
  family: 'family',
  aile: 'family',
  city: 'city',
  sehir: 'city',
  şehir: 'city'
});

const BODY_ALIASES = Object.freeze({
  mpv: 'suv',
  jeep: 'suv',
  crossover: 'suv'
});

const FUEL_ALIASES = Object.freeze({
  hibrit: 'hybrid',
  elektrik: 'electric',
  benzin: 'gasoline',
  dizel: 'diesel',
  herhangi: 'any',
  farketmez: 'any'
});

const LOW_COST_PRIORITY_PATTERN =
  /bak[iı]m|yak[iı]t|masraf|d[uü][şs]ük\s*maliyet|ucuz|ekonomik|tco|maliyet|d[uü][şs]ük\s*t[uü]ketim|az\s*yak/i;

const CITY_TITLE_CASE_OVERRIDES = Object.freeze({
  izmir: 'İzmir',
  istanbul: 'İstanbul',
  ankara: 'Ankara',
  bursa: 'Bursa',
  antalya: 'Antalya',
  konya: 'Konya',
  adana: 'Adana',
  gaziantep: 'Gaziantep',
  mersin: 'Mersin',
  kayseri: 'Kayseri',
  eskişehir: 'Eskişehir',
  eskisehir: 'Eskişehir'
});

/**
 * @param {string} name
 * @returns {string}
 */
function titleCaseIntentCityName(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return trimmed;

  const override = CITY_TITLE_CASE_OVERRIDES[trimmed.toLocaleLowerCase('tr-TR')];
  if (override) return override;

  return trimmed
    .split(/\s+/)
    .map((part) => {
      if (!part) return part;
      const lower = part.toLocaleLowerCase('tr-TR');
      return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1);
    })
    .join(' ');
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeIntentCategoryId(value) {
  const id = String(value ?? '').trim().toLowerCase();
  if (!id) return null;
  if (id === ASSISTANT_INTENT_MVP_CATEGORY || id === 'auto' || id === 'araba') {
    return ASSISTANT_INTENT_MVP_CATEGORY;
  }
  return null;
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export function parseBudgetMax(value) {
  if (value == null || value === '') return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw
    .replace(/\s*TL\b/gi, '')
    .replace(/\s*TRY\b/gi, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(/,/g, '');

  if (!/^\d+$/.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return Math.round(amount);
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeIntentFuel(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (!key) return null;

  const mapped = FUEL_ALIASES[key] || key;
  return FUEL_SET.has(mapped) ? mapped : null;
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeIntentBody(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (!key) return null;

  const mapped = BODY_ALIASES[key] || key;
  return BODY_SET.has(mapped) ? mapped : null;
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeIntentUsage(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (!key) return null;

  const mapped = USAGE_ALIASES[key] || key;
  return USAGE_SET.has(mapped) ? mapped : null;
}

/**
 * Coğrafi şehir/il — kullanım profili "şehir içi" ifadelerini city olarak algılamaz.
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeIntentCity(value) {
  const name = String(value ?? '').trim();
  if (!name || name.length < 2 || name.length > 40) return null;
  if (USAGE_PROFILE_CITY_PHRASE_PATTERN.test(name)) return null;

  const titled = titleCaseIntentCityName(name);
  if (!AUTO_CITY_QUERY_PATTERN.test(titled)) return null;
  return titled;
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function normalizeIntentHouseholdSize(value) {
  const key = String(value ?? '').trim();
  if (!key) return null;
  if (key === '3-4' || key === '5+') return key;
  const lowered = key.toLowerCase();
  if (lowered === '3-4' || lowered === '5+') return lowered === '5+' ? '5+' : '3-4';
  return HOUSEHOLD_SIZE_SET.has(key) ? key : null;
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
export function normalizeIntentStringList(value) {
  if (value == null) return [];

  const items = Array.isArray(value) ? value : [value];
  const seen = new Set();
  /** @type {string[]} */
  const out = [];

  for (const item of items) {
    const text = String(item ?? '').trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }

  return out;
}

/**
 * @param {unknown} priorities
 * @param {unknown} explicitPriority
 * @returns {string|null}
 */
export function deriveAssistantPriorityFromIntent(priorities, explicitPriority) {
  const direct = String(explicitPriority ?? '').trim();
  if (direct && PRIORITY_SET.has(direct)) return direct;

  const items = normalizeIntentStringList(priorities);
  for (const item of items) {
    const key = item.toLowerCase();
    if (PRIORITY_SET.has(key)) return key;
    if (LOW_COST_PRIORITY_PATTERN.test(item)) return 'lowCost';
  }

  return null;
}

/**
 * @param {Record<string, unknown>|null|undefined} raw
 * @returns {import('./assistant-intent-schema.js').NormalizedAssistantIntent|null}
 */
export function normalizeAssistantIntent(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const categoryId = normalizeIntentCategoryId(raw.categoryId);
  if (!categoryId) return null;

  const usageSource = raw.usage ?? raw.usagePurpose;
  const budgetMax = parseBudgetMax(raw.budgetMax ?? raw.budget);

  const citySource = raw.city ?? raw.province ?? raw.location;

  return {
    categoryId,
    budgetMax,
    usage: normalizeIntentUsage(usageSource),
    fuel: normalizeIntentFuel(raw.fuel),
    body: normalizeIntentBody(raw.body),
    priority: deriveAssistantPriorityFromIntent(raw.priorities, raw.priority),
    city: normalizeIntentCity(citySource),
    householdSize: normalizeIntentHouseholdSize(raw.householdSize ?? raw.household_size),
    mustHaves: normalizeIntentStringList(raw.mustHaves),
    dealBreakers: normalizeIntentStringList(raw.dealBreakers),
    missingQuestions: normalizeIntentStringList(raw.missingQuestions)
  };
}

/**
 * @typedef {Object} NormalizedAssistantIntent
 * @property {string} categoryId
 * @property {number|null} budgetMax
 * @property {string|null} usage
 * @property {string|null} fuel
 * @property {string|null} body
 * @property {string|null} priority
 * @property {string|null} city
 * @property {string|null} householdSize
 * @property {string[]} mustHaves
 * @property {string[]} dealBreakers
 * @property {string[]} missingQuestions
 */
