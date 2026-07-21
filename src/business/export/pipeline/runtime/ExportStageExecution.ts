/**
 * İSTEBUL Business Export Engine — aşama yürütme kaydı.
 */

import type { ExportStage } from '../../models/ExportStatus';
import type { ExportTiming } from './ExportTiming';

export type ExportStageExecutionOutcome =
  | 'basarili'
  | 'not-implemented'
  | 'basarisiz'
  | 'atlandi';

export interface ExportRuntimeIssue {
  /** Kararlı kod */
  code: string;
  /** Mesaj */
  message: string;
  /** İlgili aşama */
  stage?: ExportStage;
  /** Teknik detay */
  detail?: string;
  /** Tekrar denenebilir mi */
  recoverable?: boolean;
}

export interface ExportStageExecution extends ExportTiming {
  /** Aşama kimliği */
  stageId: ExportStage;
  /** Görünen ad */
  stageName: string;
  /** Sonuç */
  outcome: ExportStageExecutionOutcome;
  /** Aşama hataları */
  errors: readonly ExportRuntimeIssue[];
  /** Aşama uyarıları */
  warnings: readonly ExportRuntimeIssue[];
  /** Kısa teknik not */
  detail?: string;
}
