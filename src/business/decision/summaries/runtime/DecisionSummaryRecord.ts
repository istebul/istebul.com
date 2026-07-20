/**
 * İSTEBUL Business Decision Engine — Decision Summary kayıt modeli (PR-103E).
 */

import type { DecisionSummary } from '../../models/DecisionSummary';
import type { DecisionSummarySection } from './DecisionSummarySection';

/**
 * Decision Summary metadata.
 */
export interface DecisionSummaryMetadata {
  decisionId?: string;
  analysisRequestId?: string;
  datasetId?: string;
  locale: 'tr' | 'en';
  generatedAt: string;
  sourceStages: readonly string[];
}

/**
 * Zengin Decision Summary kaydı.
 */
export interface DecisionSummaryRecord {
  /** Foundation DecisionSummary */
  decisionSummary: DecisionSummary;
  /** Bölümler */
  sections: readonly DecisionSummarySection[];
  /** Metadata */
  metadata: DecisionSummaryMetadata;
}
