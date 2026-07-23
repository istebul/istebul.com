/**
 * İSTEBUL Core — pipeline execution summary builder (PR-901B).
 */

import type { PipelineExecutionSummaryBase } from '../../execution/index';

/**
 * How {@link buildPipelineExecutionSummary} computes `success`.
 *
 * - `no-failures`: admin / identity-access embedded summary
 * - `no-failures-and-some-succeeded`: auth / tenant standalone summary
 */
export type PipelineSuccessMode =
  | 'no-failures'
  | 'no-failures-and-some-succeeded';

/**
 * Builds a pipeline execution summary from stage outcomes.
 */
export function buildPipelineExecutionSummary(
  stageExecutions: readonly { outcome: string }[],
  successMode: PipelineSuccessMode = 'no-failures-and-some-succeeded'
): PipelineExecutionSummaryBase {
  let stagesSucceeded = 0;
  let stagesFailed = 0;
  let stagesSkipped = 0;

  for (const stage of stageExecutions) {
    if (stage.outcome === 'succeeded') stagesSucceeded += 1;
    if (stage.outcome === 'failed') stagesFailed += 1;
    if (stage.outcome === 'skipped') stagesSkipped += 1;
  }

  const success =
    successMode === 'no-failures'
      ? stagesFailed === 0
      : stagesFailed === 0 && stagesSucceeded > 0;

  return {
    stagesExecuted: stageExecutions.length,
    stagesSucceeded,
    stagesFailed,
    stagesSkipped,
    success
  };
}
