/**
 * İSTEBUL Core — stage telemetry map collection (PR-901B).
 */

import type { StageExecutionBase } from '../../execution/index';

/**
 * Outcome counters collected while scanning stage executions.
 */
export interface StageOutcomeCounts {
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
}

/**
 * Collects per-stage duration/outcome maps and outcome counts.
 */
export function collectStageTelemetryMaps<
  TStage extends string,
  TOutcome extends string
>(
  stageExecutions: readonly StageExecutionBase<TStage, TOutcome>[]
): {
  stageDurationsMs: Partial<Record<TStage, number>>;
  stageOutcomes: Partial<Record<TStage, TOutcome>>;
  counts: StageOutcomeCounts;
} {
  const stageDurationsMs: Partial<Record<TStage, number>> = {};
  const stageOutcomes: Partial<Record<TStage, TOutcome>> = {};
  let stagesSucceeded = 0;
  let stagesFailed = 0;
  let stagesSkipped = 0;

  for (const execution of stageExecutions) {
    stageDurationsMs[execution.stageId] = execution.durationMs;
    stageOutcomes[execution.stageId] = execution.outcome;
    if (execution.outcome === 'succeeded') {
      stagesSucceeded += 1;
    } else if (execution.outcome === 'failed') {
      stagesFailed += 1;
    } else if (execution.outcome === 'skipped') {
      stagesSkipped += 1;
    }
  }

  return {
    stageDurationsMs,
    stageOutcomes,
    counts: { stagesSucceeded, stagesFailed, stagesSkipped }
  };
}
