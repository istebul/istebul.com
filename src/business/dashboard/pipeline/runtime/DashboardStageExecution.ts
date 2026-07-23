/**
 * İSTEBUL Business Dashboard Engine — aşama yürütme kaydı.
 */

import type { DashboardStage } from '../../models/DashboardStage';
import type { DashboardTiming } from './DashboardTiming';

export type DashboardStageExecutionOutcome =
  | 'basarili'
  | 'not-implemented'
  | 'basarisiz'
  | 'atlandi';

export interface DashboardRuntimeIssue {
  /** Kararlı kod */
  code: string;
  /** Mesaj */
  message: string;
  /** İlgili aşama */
  stage?: DashboardStage;
  /** Teknik detay */
  detail?: string;
  /** Tekrar denenebilir mi */
  recoverable?: boolean;
}

export interface DashboardStageExecution extends DashboardTiming {
  /** Aşama kimliği */
  stageId: DashboardStage;
  /** Görünen ad */
  stageName: string;
  /** Sonuç */
  outcome: DashboardStageExecutionOutcome;
  /** Aşama hataları */
  errors: readonly DashboardRuntimeIssue[];
  /** Aşama uyarıları */
  warnings: readonly DashboardRuntimeIssue[];
  /** Kısa teknik not */
  detail?: string;
}
