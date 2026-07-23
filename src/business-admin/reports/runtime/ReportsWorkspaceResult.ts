/**
 * İSTEBUL Business Admin — ReportsWorkspaceResult (PR-202C).
 */

import type { ReportsWorkspaceWidgetProjection } from './ReportsWorkspaceWidget';
import type {
  ReportsWorkspaceSummary,
  ReportsWorkspaceSummaryItem
} from './ReportsWorkspaceSummary';

/**
 * Reports Workspace doğrulama bulgusu.
 */
export interface ReportsWorkspaceValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Reports Workspace telemetrisi.
 */
export interface ReportsWorkspaceTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Görünür rapor sayısı */
  visibleReportCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Reports Workspace Runtime çıktısı.
 */
export interface ReportsWorkspaceResult {
  /** Widget projeksiyonları */
  widgets: readonly ReportsWorkspaceWidgetProjection[];
  /** Yürütme özeti */
  summary: ReportsWorkspaceSummary;
  /** Düz özet öğeleri */
  summaryItems: readonly ReportsWorkspaceSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly ReportsWorkspaceValidationIssue[];
  /** Telemetri */
  telemetry: ReportsWorkspaceTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_REPORTS_WORKSPACE_RESULT_KEY =
  'reportsWorkspaceResult' as const;
