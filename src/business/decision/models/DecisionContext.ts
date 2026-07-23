/**
 * İSTEBUL Business Decision Engine — karar bağlamı.
 */

import type { AnalysisResult } from '../../analysis/models/AnalysisResult';
import type { DecisionStage, DecisionStatus } from './DecisionStage';

/**
 * Tek bir karar çalıştırmasının bağlamı.
 */
export interface DecisionContext {
  /** Karar iş kimliği */
  decisionId: string;
  /** Analysis Engine sonucu */
  analysisResult: AnalysisResult;
  /** Dil */
  locale: 'tr' | 'en';
  /** Report DNA kimliği */
  reportId?: string;
  /** Güncel aşama */
  currentStage: DecisionStage;
  /** Güncel durum */
  status: DecisionStatus;
  /** Strateji kimlikleri */
  strategyIds?: readonly string[];
  /** Bağlam meta */
  metadata?: Readonly<Record<string, string>>;
}
