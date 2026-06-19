/**
 * AI Listings Auto Collector v1 — client entry (Sprint-13).
 */

import { runCollectorEngine } from './collector-engine.js';

export {
  COLLECTOR_SOURCE_TYPES,
  COLLECTOR_SOURCE_LABELS_TR,
  getCollectorSourceLabelTr,
  resolveCollectorFormat,
  detectCollectorSourceType
} from './source-adapter.js';

export { parseCsvAdapter } from './csv-adapter.js';
export { parseJsonAdapter, parseJsonRowsAdapter } from './json-adapter.js';
export { parseXmlAdapter } from './xml-adapter.js';
export { parsePartnerFeedAdapter } from './partner-feed-adapter.js';

export {
  COLLECTOR_MAX_ROWS,
  COLLECTOR_MAX_CONTENT_BYTES,
  COLLECTOR_SUPPORTED_FIELDS,
  validateCollectorRow,
  validateCollectorBatchLimit,
  validateCollectorContentSize,
  measureCollectorContentBytes
} from './collector-validator.js';

export {
  parseCollectorContent,
  normalizeCollectorBatch,
  extractCollectorRawRows
} from './collector-normalizer.js';

export { buildCollectorSummary, buildCollectorSummaryText } from './collector-summary.js';

export {
  runCollectorEngine,
  detectCollectorDuplicateCandidates,
  buildRepositoryReadyPayloads
} from './collector-engine.js';

/**
 * @param {Parameters<typeof import('./collector-engine.js').runCollectorEngine>[0]} input
 * @param {Array<Record<string, unknown>>} [existingCandidates]
 * @returns {ReturnType<typeof import('./collector-engine.js').runCollectorEngine>}
 */
export function runCollectorPreview(input, existingCandidates = []) {
  return runCollectorEngine({
    ...input,
    existing_candidates: existingCandidates
  });
}
