/**
 * İSTEBUL Core — shared execution stage contracts (PR-901A).
 *
 * Type-only. Domain pipeline stage ID unions remain domain-owned.
 * Business-engine Turkish outcomes (basarili/basarisiz/…) are intentionally
 * out of scope and must not be unified with {@link StageOutcome}.
 */

/**
 * Canonical stage outcome for identity / admin E2E pipelines.
 */
export type StageOutcome = 'succeeded' | 'failed' | 'skipped';

/**
 * Shared single-stage execution record.
 *
 * @typeParam TStage - Domain pipeline stage id union
 * @typeParam TOutcome - Outcome union (defaults to {@link StageOutcome})
 */
export interface StageExecutionBase<
  TStage extends string = string,
  TOutcome extends string = StageOutcome
> {
  stageId: TStage;
  stageName: string;
  outcome: TOutcome;
  detail: string;
  durationMs: number;
  startedAt: string;
  endedAt: string;
}
