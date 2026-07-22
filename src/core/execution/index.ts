/**
 * İSTEBUL Core — Shared Execution Contracts (EPIC-302.5 / PR-901A).
 *
 * Central type-only contracts for E2E execution layers
 * (Identity Access, Auth Integration, Tenant Integration,
 * Business Admin, Platform Admin).
 *
 * Architecture Freeze — no runtime, pipeline, or engine behavior.
 * Domain packages re-export domain type names as aliases/extends
 * for 100% backward-compatible public APIs.
 */

export type {
  ExecutionLocale,
  ExecutionLocaleInput,
  PipelineBag,
  ExecutionContextBase
} from './ExecutionContext';

export type { ExecutionResultBase } from './ExecutionResult';

export type {
  ExecutionSummaryItem,
  ExecutionSuccessSummary,
  PipelineExecutionSummaryBase
} from './ExecutionSummary';

export type { StageOutcome, StageExecutionBase } from './ExecutionStage';

export type {
  ExecutionTiming,
  ExecutionWindow,
  StageTelemetryMaps,
  StageCountTelemetry,
  ResultTelemetryBase,
  ExecutionTelemetryCore
} from './ExecutionTiming';

export type {
  ExecutionBagMetadata,
  ExecutionMetadata
} from './ExecutionMetadata';

export type {
  ExecutionIssueSeverity,
  ValidationIssueBase,
  ExecutionValidationIssue
} from './ExecutionError';
