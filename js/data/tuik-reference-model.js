/**
 * TÜİK manuel referans snapshot — normalize, sanitize ve dikey filtreleme.
 * Ham TÜİK tabloları yeniden yayınlanmaz; yalnızca sınırlı metadata/sinyal alanları taşınır.
 */

export const TUIK_REFERENCE_SOURCE_ID = 'tuik';

export const TUIK_REFERENCE_VERTICALS = Object.freeze([
  'auto',
  'konut',
  'tatil',
  'finansman',
  'sigorta',
  'kasko'
]);

const ALLOWED_VERTICAL_SET = new Set(TUIK_REFERENCE_VERTICALS);

const FALLBACK_ACCESS_MODE =
  'Manuel referans — resmi web yayınları periyodik gözden geçirilir; otomatik API beslemesi yoktur';

const FALLBACK_DISCLAIMER =
  'Kaynak atıfı TÜİK yayın kurallarına uygun yapılır; ham veri yeniden satılmaz veya ticari olarak paketlenmez.';

/** @type {Readonly<object>} */
const FALLBACK_SNAPSHOT = Object.freeze({
  sourceId: TUIK_REFERENCE_SOURCE_ID,
  sourceName: 'Türkiye İstatistik Kurumu',
  status: 'manual_reference',
  lastReviewed: '',
  accessMode: FALLBACK_ACCESS_MODE,
  officialUrl: '',
  disclaimer: FALLBACK_DISCLAIMER,
  categories: Object.freeze([])
});

function safeString(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function safeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function isHttpUrl(value) {
  const text = safeString(value);
  if (!text) return false;
  try {
    const parsed = new URL(text);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeVerticalId(value) {
  const id = safeString(value).toLowerCase();
  return ALLOWED_VERTICAL_SET.has(id) ? id : null;
}

/**
 * @param {unknown} input
 */
function normalizeCategory(input) {
  if (!input || typeof input !== 'object') return null;

  const id = safeString(input.id);
  const title = safeString(input.title);
  if (!id || !title) return null;

  const relatedVerticals = Array.isArray(input.relatedVerticals)
    ? [...new Set(input.relatedVerticals.map(normalizeVerticalId).filter(Boolean))]
    : [];

  return {
    id,
    title,
    relatedVerticals,
    usage: safeString(input.usage),
    scoreImpact: false,
    aiNarrationAllowed: safeBoolean(input.aiNarrationAllowed, true)
  };
}

/**
 * @param {unknown} input
 * @returns {object}
 */
export function normalizeTuikReferenceSnapshot(input) {
  if (!input || typeof input !== 'object') {
    return { ...FALLBACK_SNAPSHOT, categories: [] };
  }

  const categories = Array.isArray(input.categories)
    ? input.categories.map(normalizeCategory).filter(Boolean)
    : [];

  const officialUrl = isHttpUrl(input.officialUrl) ? safeString(input.officialUrl) : '';

  return {
    sourceId: safeString(input.sourceId, TUIK_REFERENCE_SOURCE_ID) || TUIK_REFERENCE_SOURCE_ID,
    sourceName: safeString(input.sourceName, FALLBACK_SNAPSHOT.sourceName) || FALLBACK_SNAPSHOT.sourceName,
    status: safeString(input.status, FALLBACK_SNAPSHOT.status) || FALLBACK_SNAPSHOT.status,
    lastReviewed: safeString(input.lastReviewed),
    accessMode: safeString(input.accessMode, FALLBACK_ACCESS_MODE) || FALLBACK_ACCESS_MODE,
    officialUrl,
    disclaimer: safeString(input.disclaimer, FALLBACK_DISCLAIMER) || FALLBACK_DISCLAIMER,
    categories
  };
}

/**
 * @param {unknown} snapshot
 * @returns {object[]}
 */
export function getTuikReferenceCategories(snapshot) {
  const normalized = isTuikReferenceSnapshot(snapshot)
    ? snapshot
    : normalizeTuikReferenceSnapshot(snapshot);
  return normalized.categories.map((category) => ({ ...category }));
}

/**
 * @param {unknown} snapshot
 * @param {string} verticalId
 * @returns {object[]}
 */
export function getTuikReferenceCategoriesForVertical(snapshot, verticalId) {
  const vertical = normalizeVerticalId(verticalId);
  if (!vertical) return [];

  return getTuikReferenceCategories(snapshot).filter((category) =>
    category.relatedVerticals.includes(vertical)
  );
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isTuikReferenceSnapshot(value) {
  if (!value || typeof value !== 'object') return false;
  if (safeString(value.sourceId) !== TUIK_REFERENCE_SOURCE_ID) return false;
  if (!Array.isArray(value.categories)) return false;

  return value.categories.every((category) => {
    if (!category || typeof category !== 'object') return false;
    if (!safeString(category.id) || !safeString(category.title)) return false;
    if (!Array.isArray(category.relatedVerticals)) return false;
    if (category.scoreImpact !== false) return false;
    if (typeof category.aiNarrationAllowed !== 'boolean') return false;
    return category.relatedVerticals.every((vertical) => ALLOWED_VERTICAL_SET.has(vertical));
  });
}
