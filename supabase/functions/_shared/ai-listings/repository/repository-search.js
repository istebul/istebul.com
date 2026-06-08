/**
 * AI Listings Repository — search engine with Turkish normalization (Sprint-11).
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeSearchText(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^\p{L}\p{N}\s._-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {Record<string, unknown>} record
 * @param {string} normalizedQuery
 * @returns {boolean}
 */
export function recordMatchesSearch(record, normalizedQuery) {
  if (!normalizedQuery) return true;

  const fields = [
    record.title,
    record.brand,
    record.model,
    record.fingerprint,
    record.id
  ];

  return fields.some((field) => normalizeSearchText(field).includes(normalizedQuery));
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string} query
 * @returns {Array<Record<string, unknown>>}
 */
export function searchRepositoryRecords(records, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [...records];
  return records.filter((record) => recordMatchesSearch(record, normalizedQuery));
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string} query
 * @param {{ field?: string, limit?: number }} [options]
 * @returns {Array<Record<string, unknown>>}
 */
export function searchRepositoryRecordsByField(records, query, options = {}) {
  const field = String(options.field ?? '').trim();
  const limit = options.limit ?? records.length;
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return records.slice(0, limit);

  if (!field) return searchRepositoryRecords(records, query).slice(0, limit);

  return records
    .filter((record) => normalizeSearchText(record[field]).includes(normalizedQuery))
    .slice(0, limit);
}
