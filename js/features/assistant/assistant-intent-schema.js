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

const FUEL_SET = new Set(AUTO_INTENT_FUEL_VALUES);
const BODY_SET = new Set(AUTO_INTENT_BODY_VALUES);
const USAGE_SET = new Set(AUTO_INTENT_USAGE_VALUES);
const PRIORITY_SET = new Set(AUTO_ASSISTANT_PRIORITY_VALUES);

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

  return {
    categoryId,
    budgetMax,
    usage: normalizeIntentUsage(usageSource),
    fuel: normalizeIntentFuel(raw.fuel),
    body: normalizeIntentBody(raw.body),
    priority: deriveAssistantPriorityFromIntent(raw.priorities, raw.priority),
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
 * @property {string[]} mustHaves
 * @property {string[]} dealBreakers
 * @property {string[]} missingQuestions
 */
