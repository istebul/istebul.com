/**
 * AI Listings Auto Collector — source adapter registry (Sprint-13).
 */

/** @type {ReadonlyArray<string>} */
export const COLLECTOR_SOURCE_TYPES = Object.freeze([
  'csv',
  'json',
  'xml',
  'partner_feed',
  'manual',
  'ai_builder'
]);

/** @type {Readonly<Record<string, string>>} */
export const COLLECTOR_SOURCE_LABELS_TR = Object.freeze({
  csv: 'CSV',
  json: 'JSON',
  xml: 'XML',
  partner_feed: 'Partner Feed',
  manual: 'Manual',
  ai_builder: 'AI Builder'
});

/**
 * @param {unknown} sourceType
 * @returns {string}
 */
export function getCollectorSourceLabelTr(sourceType) {
  const key = String(sourceType ?? 'manual').trim().toLowerCase();
  return COLLECTOR_SOURCE_LABELS_TR[key] ?? key;
}

/**
 * @param {unknown} format
 * @param {unknown} [sourceType]
 * @returns {'csv'|'json'|'xml'|'partner_feed'|'manual'|'ai_builder'}
 */
export function resolveCollectorFormat(format, sourceType) {
  const explicitSource = String(sourceType ?? '').trim().toLowerCase();
  if (COLLECTOR_SOURCE_TYPES.includes(explicitSource)) {
    if (explicitSource === 'partner_feed') return 'partner_feed';
    if (explicitSource === 'ai_builder') return 'ai_builder';
    if (explicitSource === 'manual') return 'manual';
    return /** @type {'csv'|'json'|'xml'} */ (explicitSource);
  }

  const fmt = String(format ?? '').trim().toLowerCase();
  if (fmt === 'csv') return 'csv';
  if (fmt === 'json') return 'json';
  if (fmt === 'xml') return 'xml';
  if (fmt === 'partner_feed' || fmt === 'partner') return 'partner_feed';
  if (fmt === 'ai_builder' || fmt === 'builder') return 'ai_builder';
  return 'manual';
}

/**
 * @param {{
 *   format?: string,
 *   source_type?: string,
 *   content?: string,
 *   rows?: Array<Record<string, unknown>>,
 *   metadata?: Record<string, unknown>|null
 * }} input
 * @returns {string}
 */
export function detectCollectorSourceType(input) {
  const explicit = String(input.source_type ?? '').trim();
  if (explicit && COLLECTOR_SOURCE_TYPES.includes(explicit)) return explicit;

  const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {};
  const metaSource = String(metadata.source_type ?? metadata.source ?? '').trim();
  if (metaSource && COLLECTOR_SOURCE_TYPES.includes(metaSource)) return metaSource;
  if (metadata.partner === true) return 'partner_feed';

  return resolveCollectorFormat(input.format, input.source_type);
}
