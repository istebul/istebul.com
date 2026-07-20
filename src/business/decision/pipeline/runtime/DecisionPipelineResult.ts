/**
 * İSTEBUL Business Decision Engine — runtime pipeline result.
 */

import type { DecisionResult } from '../../models/DecisionResult';
import type { DecisionStage } from '../../models/DecisionStage';
import type {
  DecisionStageExecution,
  DecisionStageExecutionOutcome
} from './DecisionStageExecution';
import type { DecisionPipelineContext } from './DecisionPipelineContext';

export interface DecisionPipelineSummary {
  /** Toplam yürütülen aşama */
  stagesExecuted: number;
  /** Başarılı aşama */
  stagesSucceeded: number;
  /** Not implemented aşama */
  stagesNotImplemented: number;
  /** Başarısız aşama */
  stagesFailed: number;
  /** Atlanan aşama */
  stagesSkipped: number;
  /** Genel başarı */
  success: boolean;
  /** Toplam uyarı */
  warningCount: number;
  /** Toplam hata */
  errorCount: number;
}

export interface DecisionPipelineTelemetry {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Aşama süreleri */
  stageDurationsMs: Readonly<Partial<Record<DecisionStage, number>>>;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<
    Partial<Record<DecisionStage, DecisionStageExecutionOutcome>>
  >;
  /** Pipeline özeti */
  summary: DecisionPipelineSummary;
}

export interface DecisionPipelineResult {
  /** Foundation DecisionResult */
  decisionResult: DecisionResult;
  /** Son pipeline bağlamı */
  context: Readonly<DecisionPipelineContext>;
  /** Aşama kayıtları */
  stageExecutions: readonly DecisionStageExecution[];
  /** Toplam süre (ms) */
  totalDurationMs: number;
  /** Telemetri */
  telemetry: DecisionPipelineTelemetry;
}
