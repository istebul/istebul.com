/**
 * İSTEBUL Business Report Engine — runtime pipeline result.
 */

import type { ReportModel } from '../../models/ReportModel';
import type { ReportStage } from '../../models/ReportStage';
import type {
  ReportStageExecution,
  ReportStageExecutionOutcome
} from './ReportStageExecution';
import type { ReportPipelineContext } from './ReportPipelineContext';

export interface ReportPipelineSummary {
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

export interface ReportPipelineTelemetry {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Aşama süreleri */
  stageDurationsMs: Readonly<Partial<Record<ReportStage, number>>>;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<
    Partial<Record<ReportStage, ReportStageExecutionOutcome>>
  >;
  /** Pipeline özeti */
  summary: ReportPipelineSummary;
}

export interface ReportPipelineResult {
  /** Foundation ReportModel */
  reportModel: ReportModel;
  /** Son pipeline bağlamı */
  context: Readonly<ReportPipelineContext>;
  /** Aşama kayıtları */
  stageExecutions: readonly ReportStageExecution[];
  /** Toplam süre (ms) */
  totalDurationMs: number;
  /** Telemetri */
  telemetry: ReportPipelineTelemetry;
}
