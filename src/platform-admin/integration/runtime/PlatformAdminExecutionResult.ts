/**
 * İSTEBUL Platform Admin — PlatformAdminExecutionResult (PR-201F).
 */

import type { PlatformAdminResult } from '../../runtime/PlatformAdminResult';
import type { TenantManagementResult } from '../../tenant/runtime/TenantManagementResult';
import type { UserManagementResult } from '../../users/runtime/UserManagementResult';
import type { SubscriptionManagementResult } from '../../subscriptions/runtime/SubscriptionManagementResult';
import type { SystemMonitoringResult } from '../../system-monitoring/runtime/SystemMonitoringResult';
import type { PlatformAdminPipelineBag } from './PlatformAdminExecutionContext';
import type {
  PlatformAdminPipelineStage,
  PlatformAdminStageOutcome
} from './stages';

/**
 * Tek aşama yürütme kaydı.
 */
export interface PlatformAdminStageExecution {
  stageId: PlatformAdminPipelineStage;
  stageName: string;
  outcome: PlatformAdminStageOutcome;
  detail: string;
  durationMs: number;
  startedAt: string;
  endedAt: string;
}

/**
 * Pipeline özet telemetrisi.
 */
export interface PlatformAdminPipelineExecutionSummary {
  stagesExecuted: number;
  stagesSucceeded: number;
  stagesFailed: number;
  stagesSkipped: number;
  success: boolean;
}

/**
 * Uçtan uca yürütme telemetrisi.
 */
export interface PlatformAdminExecutionTelemetry {
  /** Toplam süre (ms) */
  totalDurationMs: number;
  startedAt: string;
  endedAt: string;
  /** Aşama süreleri */
  stageDurationsMs: Readonly<Partial<Record<PlatformAdminPipelineStage, number>>>;
  /** Aşama sonuçları */
  stageOutcomes: Readonly<
    Partial<Record<PlatformAdminPipelineStage, PlatformAdminStageOutcome>>
  >;
  summary: PlatformAdminPipelineExecutionSummary;
}

/**
 * Uçtan uca Platform Admin yürütme sonucu.
 */
export interface PlatformAdminExecutionResult {
  /** Foundation PlatformAdminResult — her durumda geçerli */
  platformAdminResult: PlatformAdminResult;
  /** Aşama kayıtları */
  stageExecutions: readonly PlatformAdminStageExecution[];
  /** Telemetri */
  telemetry: PlatformAdminExecutionTelemetry;
  /** Pipeline bag (mevcut anahtarlar) */
  bag: Readonly<PlatformAdminPipelineBag>;
  /** Tenant runtime sonucu */
  tenantResult?: TenantManagementResult;
  /** User runtime sonucu */
  userResult?: UserManagementResult;
  /** Subscription runtime sonucu */
  subscriptionResult?: SubscriptionManagementResult;
  /** System monitoring runtime sonucu */
  systemMonitoringResult?: SystemMonitoringResult;
}
