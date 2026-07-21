/**
 * İSTEBUL Business Export Engine — runtime pipeline result.
 */

import type { ExportResult } from '../../models/ExportResult';
import type { ExportStage } from '../../models/ExportStatus';
import type { ExportPipelineContext } from './ExportPipelineContext';
import type {
  ExportStageExecution,
  ExportStageExecutionOutcome
} from './ExportStageExecution';

export interface ExportPipelineSummary {
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

export interface ExportPipelineTelemetry {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Aşama süreleri */
  stageDurationsMs: Readonly<Partial<Record<ExportStage, number>>>;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<
    Partial<Record<ExportStage, ExportStageExecutionOutcome>>
  >;
  /** Pipeline özeti */
  summary: ExportPipelineSummary;
}

export interface ExportPipelineResult {
  /** Foundation ExportResult */
  exportResult: ExportResult;
  /** Son pipeline bağlamı */
  context: Readonly<ExportPipelineContext>;
  /** Aşama kayıtları */
  stageExecutions: readonly ExportStageExecution[];
  /** Toplam süre (ms) */
  totalDurationMs: number;
  /** Telemetri */
  telemetry: ExportPipelineTelemetry;
}
