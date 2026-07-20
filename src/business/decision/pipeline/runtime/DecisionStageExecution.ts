/**
 * İSTEBUL Business Decision Engine — aşama yürütme kaydı.
 */

import type { DecisionStage } from '../../models/DecisionStage';
import type { DecisionTiming } from './DecisionTiming';

export type DecisionStageExecutionOutcome =
  | 'basarili'
  | 'not-implemented'
  | 'basarisiz'
  | 'atlandi';

export interface DecisionRuntimeIssue {
  /** Kararlı kod */
  code: string;
  /** Mesaj */
  message: string;
  /** İlgili aşama */
  stage?: DecisionStage;
  /** Teknik detay */
  detail?: string;
  /** Tekrar denenebilir mi */
  recoverable?: boolean;
}

export interface DecisionStageExecution extends DecisionTiming {
  /** Aşama kimliği */
  stageId: DecisionStage;
  /** Görünen ad */
  stageName: string;
  /** Sonuç */
  outcome: DecisionStageExecutionOutcome;
  /** Aşama hataları */
  errors: readonly DecisionRuntimeIssue[];
  /** Aşama uyarıları */
  warnings: readonly DecisionRuntimeIssue[];
  /** Kısa teknik not */
  detail?: string;
}
