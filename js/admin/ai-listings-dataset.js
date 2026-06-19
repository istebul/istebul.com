/**
 * Shared admin dataset normalization for Repository + Analytics views (Sprint-14).
 * Both tabs derive KPIs and charts from the same listing pool.
 */

/**
 * @param {unknown} value
 * @param {string} [fallback]
 * @returns {string}
 */
function safeString(value, fallback = '') {
  if (value == null) return fallback;
  return String(value).trim();
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function safeNumber(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown>|null}
 */
export function normalizeAnalysisRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const analysis = /** @type {Record<string, unknown>} */ (raw);
  const ai = safeNumber(analysis.ai_score ?? analysis.decision_score);
  const decision = safeNumber(analysis.decision_score ?? analysis.ai_score);
  const risk = safeNumber(analysis.risk_score);
  const quality = safeNumber(analysis.quality_score);

  return {
    ...analysis,
    ai_score: ai,
    decision_score: decision,
    risk_score: risk,
    quality_score: quality,
    created_at: safeString(analysis.created_at, ''),
    summary: safeString(analysis.summary, ''),
    executive_label: safeString(analysis.executive_label, ''),
    tags: Array.isArray(analysis.tags) ? analysis.tags.filter((tag) => tag != null) : []
  };
}

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown>|null}
 */
export function normalizeListingRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const item = /** @type {Record<string, unknown>} */ (raw);
  const id = safeString(item.id);
  if (!id) return null;

  const analysis = normalizeAnalysisRecord(item.latest_analysis);
  const attributes =
    item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes)
      ? /** @type {Record<string, unknown>} */ (item.attributes)
      : {};

  const status = safeString(item.status, 'draft').toLowerCase();
  const category = safeString(item.category, 'general').toLowerCase();
  const sourceType = safeString(item.source_type ?? item.source, 'manual').toLowerCase();
  const duplicateStatus = safeString(item.duplicate_status ?? item.duplicate_label, 'new').toLowerCase();

  return {
    ...item,
    id,
    title: safeString(item.title, '—') || '—',
    category,
    status,
    source_type: sourceType,
    source: safeString(item.source, sourceType),
    location: safeString(item.location, ''),
    created_at: safeString(item.created_at, ''),
    updated_at: safeString(item.updated_at, item.created_at ?? ''),
    duplicate_status: duplicateStatus,
    duplicate_label: safeString(item.duplicate_label, duplicateStatus),
    is_duplicate: item.is_duplicate === true || duplicateStatus === 'duplicate' || duplicateStatus === 'mukerrer',
    attributes,
    latest_analysis: analysis,
    decision_score: safeNumber(item.decision_score ?? analysis?.decision_score ?? analysis?.ai_score),
    risk_score: safeNumber(item.risk_score ?? analysis?.risk_score),
    quality_score: safeNumber(item.quality_score ?? analysis?.quality_score),
    executive_label: safeString(item.executive_label ?? analysis?.executive_label, ''),
    brand: safeString(item.brand ?? attributes.brand, ''),
    model: safeString(item.model ?? attributes.model, ''),
    year: item.year ?? attributes.year ?? null,
    km: item.km ?? attributes.km ?? null,
    price: item.price ?? null,
    currency: safeString(item.currency, 'TRY') || 'TRY'
  };
}

/**
 * @param {unknown} listings
 * @returns {Array<Record<string, unknown>>}
 */
export function normalizeAdminDataset(listings) {
  if (!Array.isArray(listings)) return [];
  const normalized = [];
  for (const item of listings) {
    const record = normalizeListingRecord(item);
    if (record) normalized.push(record);
  }
  return normalized;
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
