/**
 * İSTEBUL Business Analysis Engine — aşama yürütme kaydı.
 */

import type { AnalysisStage } from '../../models/AnalysisStage';
import type { AnalysisTiming } from './AnalysisTiming';

export type AnalysisStageExecutionOutcome =
  | 'basarili'
  | 'not-implemented'
  | 'basarisiz'
  | 'atlandi';

export interface AnalysisRuntimeIssue {
  /** Kararlı kod */
  code: string;
  /** Mesaj */
  message: string;
  /** İlgili aşama */
  stage?: AnalysisStage;
  /** Teknik detay */
  detail?: string;
  /** Tekrar denenebilir mi */
  recoverable?: boolean;
}

export interface AnalysisStageExecution extends AnalysisTiming {
  /** Aşama kimliği */
  stageId: AnalysisStage;
  /** Görünen ad */
  stageName: string;
  /** Sonuç */
  outcome: AnalysisStageExecutionOutcome;
  /** Aşama hataları */
  errors: readonly AnalysisRuntimeIssue[];
  /** Aşama uyarıları */
  warnings: readonly AnalysisRuntimeIssue[];
  /** Kısa teknik not */
  detail?: string;
}
