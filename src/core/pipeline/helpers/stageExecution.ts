/**
 * İSTEBUL Core — shared stage execution factories (PR-901B).
 *
 * Domain helpers pass localized stage names; public domain export names stay.
 */

import type {
  StageExecutionBase,
  StageOutcome
} from '../../execution/index';
import { endStageTimer, startStageTimer } from '../timing/index';

/**
 * Timing payload accepted by {@link createStageExecution}.
 */
export interface StageExecutionTimingInput {
  durationMs: number;
  startedAt: string;
  endedAt: string;
}

/**
 * Creates a skipped stage execution record.
 */
export function createSkippedStageExecution<TStage extends string>(
  stageId: TStage,
  stageName: string,
  detail: string
): StageExecutionBase<TStage> {
  const timer = startStageTimer();
  const timing = endStageTimer(timer);
  return {
    stageId,
    stageName,
    outcome: 'skipped',
    detail,
    durationMs: timing.durationMs,
    startedAt: timer.startedAt,
    endedAt: timing.endedAt
  };
}

/**
 * Creates a stage execution record.
 */
export function createStageExecution<
  TStage extends string,
  TOutcome extends string = StageOutcome
>(
  stageId: TStage,
  stageName: string,
  outcome: TOutcome,
  detail: string,
  timing?: StageExecutionTimingInput
): StageExecutionBase<TStage, TOutcome> {
  const resolved =
    timing ??
    (() => {
      const timer = startStageTimer();
      const end = endStageTimer(timer);
      return {
        durationMs: end.durationMs,
        startedAt: timer.startedAt,
        endedAt: end.endedAt
      };
    })();

  return {
    stageId,
    stageName,
    outcome,
    detail,
    durationMs: resolved.durationMs,
    startedAt: resolved.startedAt,
    endedAt: resolved.endedAt
  };
}
