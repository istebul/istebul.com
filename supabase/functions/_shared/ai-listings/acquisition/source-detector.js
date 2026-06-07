/**
 * Data Acquisition — source type detection (Sprint-9).
 */

/** @type {ReadonlyArray<string>} */
export const ACQUISITION_SOURCE_TYPES = Object.freeze([
  'manual',
  'ai_builder',
  'csv',
  'json',
  'partner_api',
  'future_sahibinden',
  'future_arabam',
  'future_emlak'
]);

/** @type {Readonly<Record<string, string>>} */
export const SOURCE_LABELS_TR = Object.freeze({
  manual: 'Manuel',
  ai_builder: 'AI Builder',
  csv: 'CSV',
  json: 'JSON',
  partner_api: 'Partner API',
  future_sahibinden: 'Sahibinden (gelecek)',
  future_arabam: 'Arabam (gelecek)',
  future_emlak: 'Emlak (gelecek)'
});

/**
 * @param {string} sourceType
 * @returns {string}
 */
export function getSourceLabelTr(sourceType) {
  return SOURCE_LABELS_TR[sourceType] ?? String(sourceType ?? 'Manuel');
}

/**
 * @param {unknown} url
 * @returns {string|null}
 */
function detectFutureSourceFromUrl(url) {
  const value = String(url ?? '').toLocaleLowerCase('tr-TR');
  if (value.includes('sahibinden.com')) return 'future_sahibinden';
  if (value.includes('arabam.com')) return 'future_arabam';
  if (value.includes('emlak') || value.includes('hepsiemlak') || value.includes('zingat')) {
    return 'future_emlak';
  }
  return null;
}

/**
 * @param {{
 *   format?: string|null,
 *   explicit_source?: string|null,
 *   metadata?: Record<string, unknown>|null,
 *   rows?: Array<Record<string, unknown>>
 * }} input
 * @returns {string}
 */
export function detectAcquisitionSource(input) {
  const explicit = String(input.explicit_source ?? '').trim();
  if (explicit && ACQUISITION_SOURCE_TYPES.includes(explicit)) {
    return explicit;
  }

  const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {};
  const metadataSource = String(metadata.source_type ?? metadata.source ?? '').trim();
  if (metadataSource && ACQUISITION_SOURCE_TYPES.includes(metadataSource)) {
    return metadataSource;
  }

  if (metadata.partner === true || metadataSource === 'partner_api') {
    return 'partner_api';
  }

  const format = String(input.format ?? '').trim().toLowerCase();
  if (format === 'csv') return 'csv';
  if (format === 'json') return 'json';

  const rows = Array.isArray(input.rows) ? input.rows : [];
  for (const row of rows.slice(0, 5)) {
    const rowSource = String(row.source_type ?? '').trim();
    if (rowSource && ACQUISITION_SOURCE_TYPES.includes(rowSource)) {
      return rowSource;
    }
    const future = detectFutureSourceFromUrl(row.source_url);
    if (future) return future;
  }

  return 'manual';
}
