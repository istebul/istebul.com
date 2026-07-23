/**
 * İSTEBUL Business Decision Engine — DecisionExecutionResult (PR-103F).
 */

import type { DecisionResult } from '../../models/DecisionResult';
import type { DecisionStage } from '../../models/DecisionStage';
import type { ActionPlanResult } from '../../actionPlans/runtime/ActionPlanResult';
import type { PolicyResult } from '../../policies/runtime/PolicyResult';
import type { RecommendationResult } from '../../recommendations/runtime/RecommendationResult';
import type { DecisionSummaryResult } from '../../summaries/runtime/DecisionSummaryResult';
import type { DecisionPipelineContext } from '../../pipeline/runtime/DecisionPipelineContext';
import type {
  DecisionStageExecution,
  DecisionStageExecutionOutcome
} from '../../pipeline/runtime/DecisionStageExecution';

/**
 * Pipeline özet telemetrisi.
 */
export interface DecisionPipelineExecutionSummary {
  stagesExecuted: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
  stagesNotImplemented: number;
  success: boolean;
  warningCount: number;
  errorCount: number;
  policyCount: number;
  recommendationCount: number;
  actionPlanCount: number;
  actionCount: number;
  summarySectionCount: number;
}

/**
 * Uçtan uca yürütme telemetrisi.
 */
export interface DecisionExecutionTelemetry {
  totalDurationMs: number;
  startedAt: string;
  endedAt: string;
  stageDurationsMs: Readonly<Partial<Record<DecisionStage, number>>>;
  stageOutcomes: Readonly<
    Partial<Record<DecisionStage, DecisionStageExecutionOutcome>>
  >;
  summary: DecisionPipelineExecutionSummary;
}

/**
 * Uçtan uca Decision yürütme sonucu.
 */
export interface DecisionExecutionResult {
  /** Foundation DecisionResult */
  decisionResult: DecisionResult;
  /** Son pipeline bağlamı */
  pipelineContext: Readonly<DecisionPipelineContext>;
  /** Aşama kayıtları */
  stageExecutions: readonly DecisionStageExecution[];
  /** Telemetri */
  telemetry: DecisionExecutionTelemetry;
  /** Policy runtime sonucu */
  policyResult?: PolicyResult;
  /** Recommendation runtime sonucu */
  recommendationResult?: RecommendationResult;
  /** Action Plan runtime sonucu */
  actionPlanResult?: ActionPlanResult;
  /** Decision Summary runtime sonucu */
  decisionSummaryResult?: DecisionSummaryResult;
}
