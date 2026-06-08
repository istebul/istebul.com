/**
 * Shared admin dataset normalization for Repository + Analytics views (Sprint-14).
 * Both tabs derive KPIs and charts from the same listing pool.
 */

/**
 * @param {unknown} listings
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeAdminDataset(listings) {
  if (!Array.isArray(listings)) return [];
  return listings.filter((item) => item && typeof item === 'object');
}

/**
 * @param {unknown} listings
 * @returns {boolean}
 */
export function isAdminDatasetEmpty(listings) {
  return normalizeAdminDataset(listings).length === 0;
}

/**
 * @param {unknown} listings
 * @param {unknown} value
 * @returns {string|number}
 */
export function formatAdminCountValue(listings, value) {
  if (isAdminDatasetEmpty(listings)) return '—';
  const num = Number(value);
  return Number.isFinite(num) ? num : String(value ?? '—');
}

/**
 * @param {unknown} listings
 * @param {unknown} value
 * @returns {string|number}
 */
export function formatAdminAverageValue(listings, value) {
  if (isAdminDatasetEmpty(listings)) return '—';
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  return Number.isFinite(num) ? num : '—';
}

/**
 * @param {unknown} listings
 * @param {unknown} duplicateCount
 * @returns {string}
 */
export function formatDuplicateRateValue(listings, duplicateCount) {
  const dataset = normalizeAdminDataset(listings);
  if (!dataset.length) return '—';
  const dup = Number(duplicateCount);
  if (!Number.isFinite(dup)) return '—';
  return `${Math.round((dup / dataset.length) * 100)}%`;
}

/**
 * @param {unknown} listings
 * @returns {{ dataset: Array<Record<string, unknown>>, total: number }}
 */
export function deriveSharedAdminCounts(listings) {
  const dataset = normalizeAdminDataset(listings);
  return { dataset, total: dataset.length };
}
