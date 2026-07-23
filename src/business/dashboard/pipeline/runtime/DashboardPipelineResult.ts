/**
 * İSTEBUL Business Dashboard Engine — runtime pipeline result.
 */

import type { DashboardModel } from '../../models/DashboardModel';
import type { DashboardStage } from '../../models/DashboardStage';
import type {
  DashboardStageExecution,
  DashboardStageExecutionOutcome
} from './DashboardStageExecution';
import type { DashboardPipelineContext } from './DashboardPipelineContext';

export interface DashboardPipelineSummary {
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

export interface DashboardPipelineTelemetry {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Aşama süreleri */
  stageDurationsMs: Readonly<Partial<Record<DashboardStage, number>>>;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<
    Partial<Record<DashboardStage, DashboardStageExecutionOutcome>>
  >;
  /** Pipeline özeti */
  summary: DashboardPipelineSummary;
}

export interface DashboardPipelineResult {
  /** Foundation DashboardModel */
  dashboardModel: DashboardModel;
  /** Son pipeline bağlamı */
  context: Readonly<DashboardPipelineContext>;
  /** Aşama kayıtları */
  stageExecutions: readonly DashboardStageExecution[];
  /** Toplam süre (ms) */
  totalDurationMs: number;
  /** Telemetri */
  telemetry: DashboardPipelineTelemetry;
}
