/**
 * Data Acquisition — client re-exports (Sprint-9).
 */

export {
  runAcquisitionEngine,
  countDuplicateCandidates,
  ACQUISITION_MAX_ROWS,
  ACQUISITION_MAX_PAYLOAD_BYTES,
  measureAcquisitionPayloadBytes,
  detectAcquisitionSource,
  getSourceLabelTr,
  buildAcquisitionSummary,
  buildAcquisitionSummaryText,
  ACQUISITION_EVENT_TYPES,
  buildAcquisitionEventPayload,
  buildAcquisitionPreviewedPayload,
  buildAcquisitionValidatedPayload,
  buildAcquisitionImportedPayload,
  buildAcquisitionFailedPayload
} from '../../supabase/functions/_shared/ai-listings/acquisition/acquisition-engine.js';

export {
  validateAcquisitionRow,
  parseAcquisitionCsvRows,
  parseAcquisitionJsonRows
} from '../../supabase/functions/_shared/ai-listings/acquisition/acquisition-validator.js';

export { normalizeAcquisitionBatch, normalizeSingleAcquisitionRow } from '../../supabase/functions/_shared/ai-listings/acquisition/batch-normalizer.js';
