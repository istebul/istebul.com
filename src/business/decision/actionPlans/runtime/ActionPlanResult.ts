/**
 * İSTEBUL Business Decision Engine — Action Plan Builder runtime sonucu (PR-103D).
 */

import type { DecisionAction } from '../../models/DecisionAction';
import type { DecisionPriorityLevel } from '../../models/DecisionPriority';
import type { ActionPlanRecord } from './ActionPlanRecord';

/**
 * Action Plan uyarısı.
 */
export interface ActionPlanWarning {
  code: string;
  message: string;
  actionPlanId?: string;
}

/**
 * Action Plan özeti.
 */
export interface ActionPlanSummary {
  actionPlanCount: number;
  stepCount: number;
  informationalCount: number;
  warningCount: number;
  priorityCounts: Readonly<Partial<Record<DecisionPriorityLevel, number>>>;
  success: boolean;
}

/**
 * Action Plan telemetrisi.
 */
export interface ActionPlanTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  actionPlanCount: number;
  stepCount: number;
  priorityDistribution: Readonly<
    Partial<Record<DecisionPriorityLevel, number>>
  >;
  warningCount: number;
}

/**
 * Action Plan Builder Runtime çıktısı.
 */
export interface ActionPlanResult {
  /** Zengin Action Plan kayıtları */
  records: readonly ActionPlanRecord[];
  /** Action Plan listesi (non-informational) */
  actionPlans: readonly ActionPlanRecord[];
  /** Foundation DecisionAction listesi (tüm adımlardan düzleştirilmiş) */
  actions: readonly DecisionAction[];
  /** Özet */
  summary: ActionPlanSummary;
  /** Uyarılar */
  warnings: readonly ActionPlanWarning[];
  /** Telemetri */
  telemetry: ActionPlanTelemetry;
}

/** Pipeline bag anahtarı — Decision Engine */
export const PIPELINE_BAG_ACTION_PLAN_RUNTIME_RESULT_KEY =
  'actionPlanRuntimeResult' as const;
