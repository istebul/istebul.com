/**
 * Model dışa aktarımları.
 */

export type {
  DocumentStage,
  DocumentExecutionStatus
} from './DocumentStage';
export { DOCUMENT_EXECUTION_STATUS_LABELS } from './DocumentStage';
export type { DocumentRequest } from './DocumentRequest';
export type { DocumentMetadata } from './DocumentMetadata';
export type {
  DocumentLayout,
  DocumentPageSize,
  DocumentOrientation
} from './DocumentLayout';
export type { DocumentStyle } from './DocumentStyle';
export type { DocumentTheme } from './DocumentTheme';
export type { DocumentHeader } from './DocumentHeader';
export type { DocumentFooter } from './DocumentFooter';
export type { DocumentSection } from './DocumentSection';
export type {
  DocumentReview,
  DocumentReviewVerdict
} from './DocumentReview';
export type { DocumentModel } from './DocumentModel';
export type { DocumentContext } from './DocumentContext';

export const DOCUMENT_MODEL_COUNT = 10;
