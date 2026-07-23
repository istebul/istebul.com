/**
 * İSTEBUL Business Analysis Engine — summary kayıt modeli (PR-102E).
 */

import type { AnalysisSummary } from '../../models/AnalysisSummary';
import type { SummarySection } from './SummarySection';

/**
 * Summary metadata.
 */
export interface SummaryMetadata {
  analysisId?: string;
  datasetId?: string;
  locale: 'tr' | 'en';
  generatedAt: string;
  sourceStages: readonly string[];
}

/**
 * Zengin summary kaydı.
 */
export interface SummaryRecord {
  /** Foundation AnalysisSummary */
  analysisSummary: AnalysisSummary;
  /** Bölümler */
  sections: readonly SummarySection[];
  /** Metadata */
  metadata: SummaryMetadata;
}
