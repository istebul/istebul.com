/**
 * İSTEBUL Business Export Engine — Export Summary kayıt modeli (PR-106E).
 */

import type { ExportSummary } from './ExportSummary';
import type { ExportSummarySection } from './ExportSummarySection';

/**
 * Export Summary metadata.
 */
export interface ExportSummaryMetadata {
  requestId: string;
  exportModelId: string;
  renderDocumentId: string;
  reportDnaId?: string;
  locale: 'tr' | 'en';
  generatedAt: string;
  sourceStages: readonly string[];
}

/**
 * Zengin Export Summary kaydı.
 */
export interface ExportSummaryRecord {
  /** Nesnel özet */
  exportSummary: ExportSummary;
  /** Bölümler */
  sections: readonly ExportSummarySection[];
  /** Metadata */
  metadata: ExportSummaryMetadata;
}
