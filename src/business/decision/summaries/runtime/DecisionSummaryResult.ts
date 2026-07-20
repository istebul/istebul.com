/**
 * İSTEBUL Business Decision Engine — Decision Summary runtime sonucu (PR-103E).
 */

import type { DecisionSummary } from '../../models/DecisionSummary';
import type { DecisionSummaryRecord } from './DecisionSummaryRecord';
import type { DecisionSummarySection } from './DecisionSummarySection';

/**
 * Decision Summary uyarısı.
 */
export interface DecisionSummaryWarning {
  code: string;
  message: string;
}

/**
 * Decision Summary telemetrisi.
 */
export interface DecisionSummaryTelemetry {
  durationMs: number;
  startedAt: string;
  endedAt: string;
  sectionCount: number;
  policyTotals: number;
  recommendationTotals: number;
  actionTotals: number;
  warningCount: number;
}

/**
 * Decision Summary Runtime çıktısı.
 */
export interface DecisionSummaryResult {
  /** Zengin kayıt */
  record: DecisionSummaryRecord;
  /** Foundation DecisionSummary */
  decisionSummary: DecisionSummary;
  /** Bölümler */
  sections: readonly DecisionSummarySection[];
  /** Metadata */
  metadata: DecisionSummaryRecord['metadata'];
  /** Uyarılar */
  warnings: readonly DecisionSummaryWarning[];
  /** Telemetri */
  telemetry: DecisionSummaryTelemetry;
}

/** Pipeline bag anahtarı — Decision Engine */
export const PIPELINE_BAG_DECISION_SUMMARY_RUNTIME_RESULT_KEY =
  'decisionSummaryRuntimeResult' as const;
