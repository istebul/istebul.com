/**
 * AI Listings Auto Collector — orchestrator (Sprint-13).
 *
 * Source → Adapter → Normalize → Validate → Duplicate Candidate → Preview → Repository Payload
 */

import { buildListingFingerprint } from '../duplicate/fingerprint-engine.js';
import { runDuplicateEngine } from '../duplicate/duplicate-engine.js';
import { detectCollectorSourceType } from './source-adapter.js';
import {
  validateCollectorBatchLimit,
  validateCollectorContentSize,
  COLLECTOR_MAX_ROWS
} from './collector-validator.js';
import { extractCollectorRawRows, normalizeCollectorBatch } from './collector-normalizer.js';
import { buildCollectorSummary } from './collector-summary.js';

/**
 * @param {Record<string, unknown>[]} normalizedRows
 * @param {Array<Record<string, unknown>>} [existingCandidates]
 * @returns {{ duplicate_candidates: number, duplicate_flags: boolean[] }}
 */
export function detectCollectorDuplicateCandidates(normalizedRows, existingCandidates = []) {
  /** @type {Set<string>} */
  const seenFingerprints = new Set();
  /** @type {boolean[]} */
  const duplicate_flags = [];
  let duplicate_candidates = 0;

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
      if (duplicate.status !== 'new') isDuplicate = true;
    }

    duplicate_flags.push(isDuplicate);
    if (isDuplicate) duplicate_candidates += 1;
  }

  return { duplicate_candidates, duplicate_flags };
}

/**
 * @param {Record<string, unknown>[]} normalizedRows
 * @param {boolean[]} duplicateFlags
 * @returns {Record<string, unknown>[]}
 */
export function buildRepositoryReadyPayloads(normalizedRows, duplicateFlags = []) {
  /** @type {Record<string, unknown>[]} */
  const payloads = [];

  normalizedRows.forEach((row, index) => {
    if (duplicateFlags[index]) return;
    payloads.push({
      category: row.category,
      title: row.title,
      description: row.description ?? null,
      location: row.location ?? '',
      price: row.price ?? null,
      currency: row.currency ?? 'TRY',
      images: Array.isArray(row.images) ? row.images : [],
      attributes: row.attributes ?? {},
      source_type: row.source_type ?? 'manual',
      source_url: row.source_url ?? null,
      status: 'draft'
    });
  });

  return payloads;
}

/**
 * @param {{
 *   format?: string,
 *   source_type?: string,
 *   content?: string,
 *   rows?: Array<Record<string, unknown>>,
 *   metadata?: Record<string, unknown>|null,
 *   existing_candidates?: Array<Record<string, unknown>>
 * }} input
 * @returns {Record<string, unknown>}
 */
export function runCollectorEngine(input) {
  const source_type = detectCollectorSourceType(input);
  const existingCandidates = Array.isArray(input.existing_candidates) ? input.existing_candidates : [];

  if (input.content !== undefined && input.content !== null) {
    const sizeCheck = validateCollectorContentSize(input.content);
    if (!sizeCheck.ok) {
      return buildCollectorFailure(source_type, sizeCheck.message);
    }
  }

  let raw_rows = [];
  try {
    const extracted = extractCollectorRawRows({
      format: input.format,
      source_type,
      content: input.content,
      rows: input.rows
    });
    raw_rows = extracted.raw_rows;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Collector ayrıştırma hatası';
    return buildCollectorFailure(source_type, message);
  }

  const batchCheck = validateCollectorBatchLimit(raw_rows.length);
  if (!batchCheck.ok) {
    return {
      ok: false,
      source_type,
      total_rows: raw_rows.length,
      valid_rows: 0,
      invalid_rows: raw_rows.length,
      duplicate_candidates: 0,
      repository_ready_rows: 0,
      normalized_rows: [],
      repository_ready_payloads: [],
      duplicate_flags: [],
      errors: [{ row: 0, messages: [batchCheck.message] }],
      acquisition_preview: null,
      summary: buildCollectorSummary({
        source_type,
        total_rows: raw_rows.length,
        valid_rows: 0,
        invalid_rows: raw_rows.length,
        duplicate_candidates: 0,
        repository_ready_rows: 0
      })
    };
  }

  const { normalized_rows, errors, valid_rows, invalid_rows } = normalizeCollectorBatch(
    raw_rows,
    source_type
  );

  const { duplicate_candidates, duplicate_flags } = detectCollectorDuplicateCandidates(
    normalized_rows,
    existingCandidates
  );

  const repository_ready_payloads = buildRepositoryReadyPayloads(normalized_rows, duplicate_flags);
  const repository_ready_rows = repository_ready_payloads.length;

  const summary = buildCollectorSummary({
    source_type,
    total_rows: raw_rows.length,
    valid_rows,
    invalid_rows,
    duplicate_candidates,
    repository_ready_rows
  });

  return {
    ok: errors.length === 0 || valid_rows > 0,
    source_type,
    total_rows: raw_rows.length,
    valid_rows,
    invalid_rows,
    duplicate_candidates,
    repository_ready_rows,
    normalized_rows,
    repository_ready_payloads,
    duplicate_flags,
    errors,
    acquisition_preview: {
      source_type,
      total_rows: raw_rows.length,
      valid_rows,
      invalid_rows,
      duplicate_candidates,
      repository_ready_rows,
      preview_limit: Math.min(valid_rows, 10)
    },
    summary
  };
}

/**
 * @param {string} sourceType
 * @param {string} message
 * @returns {Record<string, unknown>}
 */
function buildCollectorFailure(sourceType, message) {
  return {
    ok: false,
    source_type: sourceType,
    total_rows: 0,
    valid_rows: 0,
    invalid_rows: 0,
    duplicate_candidates: 0,
    repository_ready_rows: 0,
    normalized_rows: [],
    repository_ready_payloads: [],
    duplicate_flags: [],
    errors: [{ row: 0, messages: [message] }],
    acquisition_preview: null,
    summary: buildCollectorSummary({
      source_type: sourceType,
      total_rows: 0,
      valid_rows: 0,
      invalid_rows: 0,
      duplicate_candidates: 0,
      repository_ready_rows: 0
    })
  };
}

export { COLLECTOR_MAX_ROWS };
