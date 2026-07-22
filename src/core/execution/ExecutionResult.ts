/**
 * İSTEBUL Core — shared execution result envelope (PR-901A).
 *
 * Type-only generic envelope. Domain ExecutionResult types extend this
 * and add their primary aggregate result + nested domain results.
 */

/**
 * Shared E2E execution result envelope.
 *
 * @typeParam TBag - Pipeline bag type
 * @typeParam TStageExecution - Stage execution record type
 * @typeParam TTelemetry - Execution telemetry type
 */
export interface ExecutionResultBase<
  TBag = Record<string, unknown>,
  TStageExecution = unknown,
  TTelemetry = unknown
> {
  /** Aşama kayıtları */
  stageExecutions: readonly TStageExecution[];
  /** Telemetri */
  telemetry: TTelemetry;
  /** Pipeline bag */
  bag: TBag;
}
