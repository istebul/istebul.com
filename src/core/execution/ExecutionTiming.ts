/**
 * İSTEBUL Core — shared execution timing & telemetry fragments (PR-901A).
 *
 * Type-only field shapes. Timer implementations stay in domain packages.
 */

import type { StageOutcome } from './ExecutionStage';

/**
 * Wall-clock timing for a single operation or aggregate result telemetry.
 */
export interface ExecutionTiming {
  durationMs: number;
  startedAt: string;
  endedAt: string;
}

/**
 * Execution window with total duration (E2E telemetry root fields).
 */
export interface ExecutionWindow {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  startedAt: string;
  endedAt: string;
}

/**
 * Per-stage duration and outcome maps.
 *
 * @typeParam TStage - Domain pipeline stage id union
 * @typeParam TOutcome - Stage outcome union
 */
export interface StageTelemetryMaps<
  TStage extends string = string,
  TOutcome extends string = StageOutcome
> {
  /** Aşama süreleri */
  stageDurationsMs: Readonly<Partial<Record<TStage, number>>>;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<Partial<Record<TStage, TOutcome>>>;
}

/**
 * Stage success / skip / summary counters used by Auth & Tenant E2E
 * (and Identity Access telemetry).
 */
export interface StageCountTelemetry {
  /** Succeeded stage count */
  succeededStageCount: number;
  /** Skipped stage count */
  skippedStageCount: number;
  /** Summary count (typically summary item count) */
  summaryCount: number;
}

/**
 * Result-inner telemetry: timing + summary item count.
 */
export type ResultTelemetryBase = ExecutionTiming & {
  summaryItemCount: number;
};

/**
 * Core E2E telemetry window + stage maps (Family A/B shared fragment).
 */
export type ExecutionTelemetryCore<
  TStage extends string = string,
  TOutcome extends string = StageOutcome
> = ExecutionWindow & StageTelemetryMaps<TStage, TOutcome>;
