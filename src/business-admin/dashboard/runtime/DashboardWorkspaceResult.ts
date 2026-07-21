/**
 * İSTEBUL Business Admin — DashboardWorkspaceResult (PR-202B).
 */

import type { DashboardWorkspaceWidgetProjection } from './DashboardWorkspaceWidget';
import type {
  DashboardWorkspaceSummary,
  DashboardWorkspaceSummaryItem
} from './DashboardWorkspaceSummary';

/**
 * Dashboard Workspace doğrulama bulgusu.
 */
export interface DashboardWorkspaceValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Dashboard Workspace telemetrisi.
 */
export interface DashboardWorkspaceTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Görünür widget sayısı */
  visibleWidgetCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Dashboard Workspace Runtime çıktısı.
 */
export interface DashboardWorkspaceResult {
  /** Widget projeksiyonları */
  widgets: readonly DashboardWorkspaceWidgetProjection[];
  /** Yürütme özeti */
  summary: DashboardWorkspaceSummary;
  /** Düz özet öğeleri */
  summaryItems: readonly DashboardWorkspaceSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly DashboardWorkspaceValidationIssue[];
  /** Telemetri */
  telemetry: DashboardWorkspaceTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_DASHBOARD_WORKSPACE_RESULT_KEY =
  'dashboardWorkspaceResult' as const;
