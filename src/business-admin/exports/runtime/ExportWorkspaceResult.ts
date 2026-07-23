/**
 * İSTEBUL Business Admin — ExportWorkspaceResult (PR-202D).
 */

import type { ExportWorkspaceWidgetProjection } from './ExportWorkspaceWidget';
import type {
  ExportWorkspaceSummary,
  ExportWorkspaceSummaryItem
} from './ExportWorkspaceSummary';

/**
 * Export Workspace doğrulama bulgusu.
 */
export interface ExportWorkspaceValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Export Workspace telemetrisi.
 */
export interface ExportWorkspaceTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Görünür export sayısı */
  visibleExportCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Export Workspace Runtime çıktısı.
 */
export interface ExportWorkspaceResult {
  /** Widget projeksiyonları */
  widgets: readonly ExportWorkspaceWidgetProjection[];
  /** Yürütme özeti */
  summary: ExportWorkspaceSummary;
  /** Düz özet öğeleri */
  summaryItems: readonly ExportWorkspaceSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly ExportWorkspaceValidationIssue[];
  /** Telemetri */
  telemetry: ExportWorkspaceTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_EXPORT_WORKSPACE_RESULT_KEY =
  'exportWorkspaceResult' as const;
