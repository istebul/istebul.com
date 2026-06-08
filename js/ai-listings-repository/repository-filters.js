/**
 * AI Listings Repository — client filter engine (Sprint-11).
 */

/** @type {ReadonlyArray<{ id: string, label: string }>} */
export const REPOSITORY_FILTER_CHIPS = Object.freeze([
  { id: 'vehicle', label: 'Araç' },
  { id: 'housing', label: 'Konut' },
  { id: 'vacation', label: 'Tatil' },
  { id: 'new', label: 'Yeni' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'risky', label: 'Riskli' },
  { id: 'reviewable', label: 'İncelenebilir' },
  { id: 'buyable', label: 'Satın Alınabilir' },
  { id: 'archived', label: 'Arşiv' }
]);

/** @type {ReadonlyArray<{ id: string, label: string }>} */
export const REPOSITORY_CATEGORY_TABS = Object.freeze([
  { id: 'all', label: 'Toplam' },
  { id: 'vehicle', label: 'Araç' },
  { id: 'housing', label: 'Konut' },
  { id: 'vacation', label: 'Tatil' }
]);

/**
 * @param {Record<string, unknown>} record
 * @param {string} filterId
 * @returns {boolean}
 */
export function recordMatchesRepositoryFilter(record, filterId) {
  const id = String(filterId ?? '').trim().toLowerCase();
  if (!id) return true;

  const category = String(record.category ?? '').toLowerCase();
  const duplicateStatus = String(record.duplicate_status ?? 'new');
  const executiveLabel = String(record.executive_label ?? '');
  const status = String(record.status ?? '');
  const riskScore = Number(record.risk_score);

  switch (id) {
    case 'vehicle':
    case 'arac':
    case 'araç':
      return category === 'vehicle';
    case 'housing':
    case 'konut':
      return category === 'housing' || category === 'real_estate';
    case 'vacation':
    case 'tatil':
      return category === 'vacation';
    case 'new':
      return duplicateStatus === 'new';
    case 'duplicate':
      return duplicateStatus === 'exact' || duplicateStatus === 'similar';
    case 'risky':
      return executiveLabel === 'Riskli' || executiveLabel === 'Önerilmez' || (Number.isFinite(riskScore) && riskScore >= 61);
    case 'reviewable':
      return executiveLabel === 'İncelenebilir' || executiveLabel === 'Dikkatli İncelenmeli';
    case 'buyable':
      return executiveLabel === 'Satın Alınabilir';
    case 'archived':
      return status === 'archived';
    case 'manual':
      return String(record.source ?? '') === 'manual';
    case 'ai_builder':
      return String(record.source ?? '') === 'ai_builder';
    case 'csv':
      return String(record.source ?? '') === 'csv';
    case 'json':
      return String(record.source ?? '') === 'json';
    case 'partner':
    case 'partner_api':
      return String(record.source ?? '') === 'partner_api' || String(record.source ?? '') === 'future_partner';
    default:
      return true;
  }
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string} categoryTab
 * @returns {Array<Record<string, unknown>>}
 */
export function filterRepositoryByCategoryTab(records, categoryTab) {
  const tab = String(categoryTab ?? 'all').trim().toLowerCase();
  if (!tab || tab === 'all' || tab === 'toplam') return [...records];
  return records.filter((record) => recordMatchesRepositoryFilter(record, tab));
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string|string[]|null|undefined} activeFilters
 * @returns {Array<Record<string, unknown>>}
 */
export function applyRepositoryFilters(records, activeFilters) {
  const filters = normalizeActiveFilters(activeFilters);
  if (!filters.length) return [...records];

  return records.filter((record) => filters.every((filterId) => recordMatchesRepositoryFilter(record, filterId)));
}

/**
 * @param {string|string[]|null|undefined} activeFilters
 * @returns {string[]}
 */
export function normalizeActiveFilters(activeFilters) {
  if (!activeFilters) return [];
  if (Array.isArray(activeFilters)) {
    return activeFilters.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
  }
  const single = String(activeFilters).trim().toLowerCase();
  return single ? [single] : [];
}

/**
 * @param {string} current
 * @param {string} filterId
 * @returns {string[]}
 */
export function toggleRepositoryFilter(current, filterId) {
  const active = normalizeActiveFilters(current);
  const id = String(filterId ?? '').trim().toLowerCase();
  if (!id) return active;

  const index = active.indexOf(id);
  if (index >= 0) {
    active.splice(index, 1);
    return active;
  }
  return [...active, id];
}
