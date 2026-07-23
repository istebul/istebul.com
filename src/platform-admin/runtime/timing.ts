/**
 * İSTEBUL Platform Admin — runtime süre ölçümü.
 *
 * Implementation lives in shared core pipeline timing (PR-901B).
 * Public export names unchanged.
 */

export type { StageTimer } from '../../core/pipeline/timing/index';
export {
  nowMs,
  startStageTimer,
  endStageTimer
} from '../../core/pipeline/timing/index';
