/**
 * End-to-End Dashboard Runtime — dışa aktarımlar (PR-105F).
 */

export type {
  DashboardExecutionContext,
  CreateDashboardExecutionContextInput
} from './DashboardExecutionContext';
export { createDashboardExecutionContext } from './DashboardExecutionContext';

export type {
  DashboardExecutionResult,
  DashboardExecutionTelemetry,
  DashboardPipelineExecutionSummary
} from './DashboardExecutionResult';

export {
  DashboardRuntimeFacade,
  createDashboardRuntimeFacade
} from './DashboardRuntimeFacade';

export {
  DashboardPipelineRunner,
  createDashboardPipelineRunner,
  type DashboardPipelineRunnerDependencies
} from './DashboardPipelineRunner';

export {
  resolveDashboardContext,
  ensureRequestIds,
  createSkippedStageExecution,
  createStageExecution,
  replaceStageExecution,
  mutateDashboardModel,
  syncDashboardModelFromBag,
  buildDashboardExecutionTelemetry,
  nowMs
} from './helpers';
