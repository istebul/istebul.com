/**
 * Data Acquisition — event payload builders (Sprint-9).
 *
 * Event types are stored in existing listing_events payload; no schema change.
 */

/** @type {ReadonlyArray<string>} */
export const ACQUISITION_EVENT_TYPES = Object.freeze([
  'acquisition_previewed',
  'acquisition_validated',
  'acquisition_imported',
  'acquisition_failed'
]);

/**
 * @param {string} eventType
 * @returns {boolean}
 */
export function isAcquisitionEventType(eventType) {
  return ACQUISITION_EVENT_TYPES.includes(String(eventType ?? ''));
}

/**
 * @param {Record<string, unknown>} acquisitionResult
 * @param {Record<string, unknown>} [extra]
 */
export function buildAcquisitionPreviewedPayload(acquisitionResult, extra = {}) {
  return {
    source_type: acquisitionResult.source_type,
    total_rows: acquisitionResult.total_rows,
    valid_rows: acquisitionResult.valid_rows,
    invalid_rows: acquisitionResult.invalid_rows,
    duplicate_candidates: acquisitionResult.duplicate_candidates,
    summary: acquisitionResult.summary,
    ...extra
  };
}

/**
 * @param {Record<string, unknown>} acquisitionResult
 * @param {Record<string, unknown>} [extra]
 */
export function buildAcquisitionValidatedPayload(acquisitionResult, extra = {}) {
  return {
    source_type: acquisitionResult.source_type,
    valid_rows: acquisitionResult.valid_rows,
    invalid_rows: acquisitionResult.invalid_rows,
    duplicate_candidates: acquisitionResult.duplicate_candidates,
    savable_rows: acquisitionResult.summary?.savable_rows ?? acquisitionResult.valid_rows,
    ...extra
  };
}

/**
 * @param {Record<string, unknown>} acquisitionResult
 * @param {{ created_count?: number, analyzed_count?: number }} [extra]
 */
export function buildAcquisitionImportedPayload(acquisitionResult, extra = {}) {
  return {
    source_type: acquisitionResult.source_type,
    imported_rows: extra.created_count ?? acquisitionResult.valid_rows,
    analyzed_count: extra.analyzed_count ?? 0,
    duplicate_candidates: acquisitionResult.duplicate_candidates,
    ...extra
  };
}

/**
 * @param {string} message
 * @param {Record<string, unknown>} [extra]
 */
export function buildAcquisitionFailedPayload(message, extra = {}) {
  return {
    message: String(message ?? 'Veri alma başarısız'),
    ...extra
  };
}

/**
 * @param {'acquisition_previewed'|'acquisition_validated'|'acquisition_imported'|'acquisition_failed'} eventType
 * @param {Record<string, unknown>} acquisitionResult
 * @param {Record<string, unknown>} [extra]
 */
export function buildAcquisitionEventPayload(eventType, acquisitionResult, extra = {}) {
  switch (eventType) {
    case 'acquisition_previewed':
      return buildAcquisitionPreviewedPayload(acquisitionResult, extra);
    case 'acquisition_validated':
      return buildAcquisitionValidatedPayload(acquisitionResult, extra);
    case 'acquisition_imported':
      return buildAcquisitionImportedPayload(acquisitionResult, extra);
    case 'acquisition_failed':
      return buildAcquisitionFailedPayload(String(acquisitionResult.message ?? ''), extra);
    default:
      return { ...acquisitionResult, ...extra };
  }
}
