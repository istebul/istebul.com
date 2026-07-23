/**
 * İSTEBUL Business Analysis Engine — runtime pipeline result.
 */

import type { AnalysisResult } from '../../models/AnalysisResult';
import type { AnalysisStage } from '../../models/AnalysisStage';
import type {
  AnalysisStageExecution,
  AnalysisStageExecutionOutcome
} from './AnalysisStageExecution';
import type { AnalysisPipelineContext } from './AnalysisPipelineContext';

export interface AnalysisPipelineSummary {
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

export interface AnalysisPipelineTelemetry {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Aşama süreleri */
  stageDurationsMs: Readonly<Partial<Record<AnalysisStage, number>>>;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<
    Partial<Record<AnalysisStage, AnalysisStageExecutionOutcome>>
  >;
  /** Pipeline özeti */
  summary: AnalysisPipelineSummary;
}

export interface AnalysisPipelineResult {
  /** Foundation AnalysisResult */
  analysisResult: AnalysisResult;
  /** Son pipeline bağlamı */
  context: Readonly<AnalysisPipelineContext>;
  /** Aşama kayıtları */
  stageExecutions: readonly AnalysisStageExecution[];
  /** Toplam süre (ms) */
  totalDurationMs: number;
  /** Telemetri */
  telemetry: AnalysisPipelineTelemetry;
}
