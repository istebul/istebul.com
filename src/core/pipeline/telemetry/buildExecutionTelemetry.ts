/**
 * İSTEBUL Core — shared execution telemetry builders (PR-901B).
 *
 * Family A (admin): maps + embedded pipeline summary.
 * Family B (auth/tenant integration): maps + stage count telemetry.
 * Hybrid (identity-access): Family A + stage count telemetry.
 */

import type {
  ExecutionTelemetryCore,
  PipelineExecutionSummaryBase,
  StageCountTelemetry,
  StageExecutionBase
} from '../../execution/index';
import {
  buildPipelineExecutionSummary,
  type PipelineSuccessMode
} from '../summary/pipelineExecutionSummary';
import { collectStageTelemetryMaps } from './stageMaps';

export type { PipelineSuccessMode };

/**
 * Family A — admin-style telemetry with embedded summary.
 */
export function buildAdminStyleExecutionTelemetry<TStage extends string>(
  stageExecutions: readonly StageExecutionBase<TStage>[],
  startedAt: string,
  endedAt: string,
  totalDurationMs: number,
  options?: { successMode?: PipelineSuccessMode }
): ExecutionTelemetryCore<TStage> & {
  summary: PipelineExecutionSummaryBase;
} {
  const { stageDurationsMs, stageOutcomes } =
    collectStageTelemetryMaps(stageExecutions);
  const summary = buildPipelineExecutionSummary(
    stageExecutions,
    options?.successMode ?? 'no-failures'
  );

  return {
    totalDurationMs,
    startedAt,
    endedAt,
    stageDurationsMs: Object.freeze({ ...stageDurationsMs }),
    stageOutcomes: Object.freeze({ ...stageOutcomes }),
    summary
  };
}

/**
 * Family B — auth/tenant integration telemetry with stage counts.
 *
 * Counts succeed/skip only (matches historical integration helpers).
 */
export function buildIntegrationStyleExecutionTelemetry<TStage extends string>(
  stageExecutions: readonly StageExecutionBase<TStage>[],
  startedAt: string,
  endedAt: string,
  totalDurationMs: number,
  summaryCount: number
): ExecutionTelemetryCore<TStage> & StageCountTelemetry {
  const { stageDurationsMs, stageOutcomes, counts } =
    collectStageTelemetryMaps(stageExecutions);

  return {
    totalDurationMs,
    startedAt,
    endedAt,
    stageDurationsMs: Object.freeze(stageDurationsMs),
    stageOutcomes: Object.freeze(stageOutcomes),
    succeededStageCount: counts.stagesSucceeded,
    skippedStageCount: counts.stagesSkipped,
    summaryCount
  };
}

/**
 * Identity Access hybrid — admin maps/summary + stage count telemetry.
 */
export function buildCountedAdminExecutionTelemetry<TStage extends string>(
  stageExecutions: readonly StageExecutionBase<TStage>[],
  startedAt: string,
  endedAt: string,
  totalDurationMs: number,
  summaryCount: number,
  options?: { successMode?: PipelineSuccessMode }
): ExecutionTelemetryCore<TStage> &
  StageCountTelemetry & { summary: PipelineExecutionSummaryBase } {
  const admin = buildAdminStyleExecutionTelemetry(
    stageExecutions,
    startedAt,
    endedAt,
    totalDurationMs,
    options
  );

  return {
    ...admin,
    succeededStageCount: admin.summary.stagesSucceeded,
    skippedStageCount: admin.summary.stagesSkipped,
    summaryCount
  };
}
