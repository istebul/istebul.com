/**
 * İSTEBUL Business Report Engine — Report Summary kayıt modeli (PR-104E).
 */

import type { ReportSummary } from './ReportSummary';
import type { ReportSummarySection } from './ReportSummarySection';

/**
 * Report Summary metadata.
 */
export interface ReportSummaryMetadata {
  reportModelId: string;
  decisionRequestId?: string;
  datasetId?: string;
  locale: 'tr' | 'en';
  generatedAt: string;
  sourceStages: readonly string[];
}

/**
 * Zengin Report Summary kaydı.
 */
export interface ReportSummaryRecord {
  /** Nesnel özet */
  reportSummary: ReportSummary;
  /** Bölümler */
  sections: readonly ReportSummarySection[];
  /** Metadata */
  metadata: ReportSummaryMetadata;
}
