/**
 * İSTEBUL Business Report Engine — aşama yürütme kaydı.
 */

import type { ReportStage } from '../../models/ReportStage';
import type { ReportTiming } from './ReportTiming';

export type ReportStageExecutionOutcome =
  | 'basarili'
  | 'not-implemented'
  | 'basarisiz'
  | 'atlandi';

export interface ReportRuntimeIssue {
  /** Kararlı kod */
  code: string;
  /** Mesaj */
  message: string;
  /** İlgili aşama */
  stage?: ReportStage;
  /** Teknik detay */
  detail?: string;
  /** Tekrar denenebilir mi */
  recoverable?: boolean;
}

export interface ReportStageExecution extends ReportTiming {
  /** Aşama kimliği */
  stageId: ReportStage;
  /** Görünen ad */
  stageName: string;
  /** Sonuç */
  outcome: ReportStageExecutionOutcome;
  /** Aşama hataları */
  errors: readonly ReportRuntimeIssue[];
  /** Aşama uyarıları */
  warnings: readonly ReportRuntimeIssue[];
  /** Kısa teknik not */
  detail?: string;
}
