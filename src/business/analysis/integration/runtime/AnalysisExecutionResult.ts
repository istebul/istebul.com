/**
 * İSTEBUL Business Analysis Engine — AnalysisExecutionResult (PR-102F).
 */

import type { AnalysisResult } from '../../models/AnalysisResult';
import type { AnalysisStage } from '../../models/AnalysisStage';
import type { FindingResult } from '../../findings/runtime/FindingResult';
import type { KpiResult } from '../../kpis/runtime/KpiResult';
import type { RuleResult } from '../../rules/runtime/RuleResult';
import type { SummaryResult } from '../../summaries/runtime/SummaryResult';
import type { AnalysisPipelineContext } from '../../pipeline/runtime/AnalysisPipelineContext';
import type {
  AnalysisStageExecution,
  AnalysisStageExecutionOutcome
} from '../../pipeline/runtime/AnalysisStageExecution';

/**
 * Pipeline özet telemetrisi.
 */
export interface AnalysisPipelineExecutionSummary {
  stagesExecuted: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
  stagesNotImplemented: number;
  success: boolean;
  warningCount: number;
  errorCount: number;
  kpiCount: number;
  ruleCount: number;
  findingCount: number;
  summarySectionCount: number;
}

/**
 * Uçtan uca yürütme telemetrisi.
 */
export interface AnalysisExecutionTelemetry {
  totalDurationMs: number;
  startedAt: string;
  endedAt: string;
  stageDurationsMs: Readonly<Partial<Record<AnalysisStage, number>>>;
  stageOutcomes: Readonly<
    Partial<Record<AnalysisStage, AnalysisStageExecutionOutcome>>
  >;
  summary: AnalysisPipelineExecutionSummary;
}

/**
 * Uçtan uca analiz yürütme sonucu.
 */
export interface AnalysisExecutionResult {
  /** Foundation AnalysisResult */
  analysisResult: AnalysisResult;
  /** Son pipeline bağlamı */
  pipelineContext: Readonly<AnalysisPipelineContext>;
  /** Aşama kayıtları */
  stageExecutions: readonly AnalysisStageExecution[];
  /** Telemetri */
  telemetry: AnalysisExecutionTelemetry;
  /** KPI runtime sonucu */
  kpiResult?: KpiResult;
  /** Rule runtime sonucu */
  ruleResult?: RuleResult;
  /** Finding runtime sonucu */
  findingResult?: FindingResult;
  /** Summary runtime sonucu */
  summaryResult?: SummaryResult;
}
