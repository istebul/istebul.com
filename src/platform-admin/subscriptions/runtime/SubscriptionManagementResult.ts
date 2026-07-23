/**
 * İSTEBUL Platform Admin — SubscriptionManagementResult (PR-201D).
 */

import type { SubscriptionProjection } from './Subscription';
import type {
  SubscriptionSummary,
  SubscriptionSummaryItem
} from './SubscriptionSummary';

/**
 * Subscription Management doğrulama bulgusu.
 */
export interface SubscriptionManagementValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Subscription Management telemetrisi.
 */
export interface SubscriptionManagementTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Abonelik sayısı */
  subscriptionCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Subscription Management Runtime çıktısı.
 */
export interface SubscriptionManagementResult {
  /** Abonelik projeksiyonları */
  subscriptions: readonly SubscriptionProjection[];
  /** Yürütme özeti */
  summary: SubscriptionSummary;
  /** Düz özet öğeleri */
  summaryItems: readonly SubscriptionSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly SubscriptionManagementValidationIssue[];
  /** Telemetri */
  telemetry: SubscriptionManagementTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_SUBSCRIPTION_MANAGEMENT_RESULT_KEY =
  'subscriptionManagementResult' as const;
