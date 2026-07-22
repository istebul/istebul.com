/**
 * İSTEBUL Core — shared execution summary contracts (PR-901A).
 *
 * Type-only. Domain summaries extend these with domain counters/flags.
 */

/**
 * Shared summary list item used across integration facades.
 */
export interface ExecutionSummaryItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * Minimal success flag — foundation/domain summaries may extend.
 */
export interface ExecutionSuccessSummary {
  success: boolean;
}

/**
 * Shared pipeline stage-count summary (admin / identity E2E family).
 * Does not include business-engine fields such as stagesNotImplemented.
 */
export interface PipelineExecutionSummaryBase {
  stagesExecuted: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
  success: boolean;
}
