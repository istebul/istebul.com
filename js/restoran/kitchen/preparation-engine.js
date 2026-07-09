/**
 * GarsonAI preparation time estimator for kitchen orders.
 */

/** @type {Record<string, number>} */
const ITEM_PREP_MINUTES = {
  pizza: 18,
  burger: 12,
  kebap: 15,
  lahmacun: 10,
  pide: 12,
  döner: 12,
  doner: 12,
  steak: 20,
  balik: 16,
  fish: 16,
  corba: 8,
  soup: 8,
  salata: 6,
  salad: 6,
  ayran: 2,
  icecek: 2,
  drink: 2,
  kola: 2,
  cola: 2,
  su: 1,
  water: 1,
  tatli: 8,
  dessert: 8
};

const COMPLEX_MAIN_KEYWORDS = ['pizza', 'burger', 'kebap', 'lahmacun', 'pide', 'döner', 'doner', 'steak'];
const SIMPLE_KEYWORDS = ['ayran', 'içecek', 'icecek', 'kola', 'cola', 'su', 'water'];

/**
 * @typedef {Object} PreparationEstimate
 * @property {number} estimatedMinutes
 * @property {'low'|'medium'|'high'} complexity
 * @property {number} itemCount
 * @property {number} mainItemCount
 */

/**
 * @param {string} name
 * @returns {string}
 */
function normalizeItemName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[çğıöşü]/g, (char) => {
      const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
      return map[char] || char;
    });
}

/**
 * @param {string} name
 * @returns {number}
 */
function estimateItemMinutes(name) {
  const normalized = normalizeItemName(name);
  if (!normalized) return 5;

  for (const [keyword, minutes] of Object.entries(ITEM_PREP_MINUTES)) {
    if (normalized.includes(keyword)) return minutes;
  }

  return 8;
}

/**
 * @param {string} name
 * @returns {string|null}
 */
function resolveMainKeyword(name) {
  const normalized = normalizeItemName(name);
  for (const keyword of COMPLEX_MAIN_KEYWORDS) {
    if (normalized.includes(keyword)) return keyword;
  }
  return null;
}

/**
 * @param {string} name
 * @returns {'main'|'simple'|'other'}
 */
function classifyItem(name) {
  const normalized = normalizeItemName(name);
  if (SIMPLE_KEYWORDS.some((keyword) => normalized.includes(keyword))) return 'simple';
  if (resolveMainKeyword(name)) return 'main';
  return 'other';
}

/**
 * @param {unknown[]} items
 * @returns {PreparationEstimate}
 */
export function estimatePreparation(items) {
  const source = Array.isArray(items) ? items : [];

  let itemCount = 0;
  let mainItemCount = 0;
  let maxItemMinutes = 0;
  let totalWeightedMinutes = 0;

  for (const item of source) {
    const row = /** @type {Record<string, unknown>} */ (
      item && typeof item === 'object' ? item : {}
    );
    const name = String(row.name ?? row.product_name ?? '').trim();
    const qtyRaw = Number.parseInt(String(row.quantity ?? row.qty ?? '1'), 10);
    const quantity = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
    const minutes = estimateItemMinutes(name);
    const kind = classifyItem(name);

    itemCount += quantity;
    totalWeightedMinutes += minutes * quantity;
    maxItemMinutes = Math.max(maxItemMinutes, minutes);

    if (kind === 'main') mainItemCount += quantity;
  }

  const distinctMainTypes = new Set(
    source
      .map((item) => {
        const row = /** @type {Record<string, unknown>} */ (
          item && typeof item === 'object' ? item : {}
        );
        return resolveMainKeyword(String(row.name ?? ''));
      })
      .filter((keyword) => keyword != null)
  ).size;

  let complexity = 'low';
  if (distinctMainTypes >= 2) {
    complexity = 'high';
  } else if (mainItemCount >= 1 || itemCount >= 2) {
    complexity = 'medium';
  }

  const parallelFactor = complexity === 'high' ? 0.75 : complexity === 'medium' ? 0.65 : 0.5;
  const estimatedMinutes = Math.max(
    5,
    Math.round(maxItemMinutes + totalWeightedMinutes * parallelFactor)
  );

  return {
    estimatedMinutes,
    complexity,
    itemCount,
    mainItemCount
  };
}
