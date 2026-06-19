/**
 * Data Acquisition Engine v1 — high-volume batch intake (Sprint-9).
 */

import {
  ACQUISITION_MAX_ROWS,
  ACQUISITION_MAX_PAYLOAD_BYTES,
  measureAcquisitionPayloadBytes
} from './acquisition-validator.js';
import { normalizeAcquisitionBatch } from './batch-normalizer.js';
import { validateAcquisitionRow } from './acquisition-validator.js';
import { detectAcquisitionSource } from './source-detector.js';
import { buildAcquisitionSummary } from './acquisition-summary.js';
import { buildListingFingerprint } from '../duplicate/fingerprint-engine.js';
import { runDuplicateEngine } from '../duplicate/duplicate-engine.js';

/**
 * @param {Record<string, unknown>[]} normalizedRows
 * @param {Array<Record<string, unknown>>} [existingCandidates]
 * @returns {number}
 */
export function countDuplicateCandidates(normalizedRows, existingCandidates = []) {
  /** @type {Set<string>} */
  const seenFingerprints = new Set();
  let duplicateCandidates = 0;

  for (const row of normalizedRows) {
    const fingerprint = buildListingFingerprint(row).hash;
    let isDuplicate = false;

    if (seenFingerprints.has(fingerprint)) {
      isDuplicate = true;
    } else {
      seenFingerprints.add(fingerprint);
    }

    if (!isDuplicate && existingCandidates.length > 0) {
      const duplicate = runDuplicateEngine(row, existingCandidates, { limit: 1 });
      if (duplicate.status !== 'new') {
        isDuplicate = true;
      }
    }

    if (isDuplicate) duplicateCandidates += 1;
  }

  return duplicateCandidates;
}

/**
 * @param {{
 *   format?: 'csv'|'json'|null,
 *   content?: string,
 *   rows?: Array<Record<string, unknown>>,
 *   source_type?: string|null,
 *   metadata?: Record<string, unknown>|null,
 *   existing_candidates?: Array<Record<string, unknown>>
 * }} input
 */
export function runAcquisitionEngine(input) {
  const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {};
  const existingCandidates = Array.isArray(input.existing_candidates) ? input.existing_candidates : [];

  /** @type {Array<{ row: number, messages: string[] }>} */
  const errors = [];
  /** @type {Record<string, unknown>[]} */
  let normalized_rows = [];
  let total_rows = 0;
  let valid_rows = 0;
  let invalid_rows = 0;
  let source_type = detectAcquisitionSource({
    format: input.format,
    explicit_source: input.source_type,
    metadata,
    rows: input.rows
  });

  if (Array.isArray(input.rows) && input.rows.length > 0) {
    if (input.rows.length > ACQUISITION_MAX_ROWS) {
      return {
        ok: false,
        source_type,
        total_rows: input.rows.length,
        valid_rows: 0,
        invalid_rows: input.rows.length,
        duplicate_candidates: 0,
        normalized_rows: [],
        errors: [{ row: 0, messages: [`Maksimum ${ACQUISITION_MAX_ROWS} satır sınırı aşıldı`] }],
        summary: buildAcquisitionSummary({
          source_type,
          total_rows: input.rows.length,
          valid_rows: 0,
          invalid_rows: input.rows.length,
          duplicate_candidates: 0,
          savable_rows: 0
        })
      };
    }

    total_rows = input.rows.length;
    input.rows.forEach((raw, index) => {
      const result = validateAcquisitionRow(raw, source_type);
      if (result.ok) {
        valid_rows += 1;
        normalized_rows.push(result.value);
      } else {
        invalid_rows += 1;
        errors.push({ row: index + 1, messages: result.errors });
      }
    });
  } else {
    const content = String(input.content ?? '');
    if (!content.trim()) {
      return {
        ok: false,
        source_type,
        total_rows: 0,
        valid_rows: 0,
        invalid_rows: 0,
        duplicate_candidates: 0,
        normalized_rows: [],
        errors: [{ row: 0, messages: ['İçerik boş olamaz'] }],
        summary: buildAcquisitionSummary({
          source_type,
          total_rows: 0,
          valid_rows: 0,
          invalid_rows: 0,
          duplicate_candidates: 0,
          savable_rows: 0
        })
      };
    }

    if (measureAcquisitionPayloadBytes(content) > ACQUISITION_MAX_PAYLOAD_BYTES) {
      return {
        ok: false,
        source_type,
        total_rows: 0,
        valid_rows: 0,
        invalid_rows: 0,
        duplicate_candidates: 0,
        normalized_rows: [],
        errors: [
          {
            row: 0,
            messages: [`İçerik boyutu ${ACQUISITION_MAX_PAYLOAD_BYTES} bayt sınırını aşıyor`]
          }
        ],
        summary: buildAcquisitionSummary({
          source_type,
          total_rows: 0,
          valid_rows: 0,
          invalid_rows: 0,
          duplicate_candidates: 0,
          savable_rows: 0
        })
      };
    }

    const format = input.format === 'json' ? 'json' : 'csv';
    source_type = detectAcquisitionSource({ format, explicit_source: input.source_type, metadata });

    try {
      const batch = normalizeAcquisitionBatch(format, content, source_type);
      total_rows = batch.raw_rows.length;

      if (total_rows > ACQUISITION_MAX_ROWS) {
        return {
          ok: false,
          source_type,
          total_rows,
          valid_rows: 0,
          invalid_rows: total_rows,
          duplicate_candidates: 0,
          normalized_rows: [],
          errors: [{ row: 0, messages: [`Maksimum ${ACQUISITION_MAX_ROWS} satır sınırı aşıldı`] }],
          summary: buildAcquisitionSummary({
            source_type,
            total_rows,
            valid_rows: 0,
            invalid_rows: total_rows,
            duplicate_candidates: 0,
            savable_rows: 0
          })
        };
      }

      normalized_rows = batch.normalized_rows;
      valid_rows = batch.valid_rows;
      invalid_rows = batch.invalid_rows;
      errors.push(...batch.errors);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Veri alma başarısız';
      return {
        ok: false,
        source_type,
        total_rows: 0,
        valid_rows: 0,
        invalid_rows: 0,
        duplicate_candidates: 0,
        normalized_rows: [],
        errors: [{ row: 0, messages: [message] }],
        summary: buildAcquisitionSummary({
          source_type,
          total_rows: 0,
          valid_rows: 0,
          invalid_rows: 0,
          duplicate_candidates: 0,
          savable_rows: 0
        })
      };
    }
  }

  const duplicate_candidates = countDuplicateCandidates(normalized_rows, existingCandidates);
  const savable_rows = Math.max(0, valid_rows);
  const summary = buildAcquisitionSummary({
    source_type,
    total_rows,
    valid_rows,
    invalid_rows,
    duplicate_candidates,
    savable_rows
  });

  return {
    ok: valid_rows > 0 || total_rows === 0,
    source_type,
    total_rows,
    valid_rows,
    invalid_rows,
    duplicate_candidates,
    normalized_rows,
    errors,
    summary
  };
}

export {
  ACQUISITION_MAX_ROWS,
  ACQUISITION_MAX_PAYLOAD_BYTES,
  measureAcquisitionPayloadBytes
} from './acquisition-validator.js';

export { detectAcquisitionSource, getSourceLabelTr } from './source-detector.js';
export { buildAcquisitionSummary, buildAcquisitionSummaryText } from './acquisition-summary.js';
export {
  ACQUISITION_EVENT_TYPES,
  buildAcquisitionEventPayload,
  buildAcquisitionPreviewedPayload,
  buildAcquisitionValidatedPayload,
  buildAcquisitionImportedPayload,
  buildAcquisitionFailedPayload
} from './acquisition-events.js';
