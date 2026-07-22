/**
 * İSTEBUL Business Admin — BusinessSettingsWorkspaceResult (PR-202E).
 */

import type { BusinessSettingsWorkspaceWidgetProjection } from './BusinessSettingsWorkspaceWidget';
import type {
  BusinessSettingsWorkspaceSummary,
  BusinessSettingsWorkspaceSummaryItem
} from './BusinessSettingsWorkspaceSummary';

/**
 * Business Settings Workspace doğrulama bulgusu.
 */
export interface BusinessSettingsWorkspaceValidationIssue {
  code: string;
  message: string;
  severity: 'warning' | 'error';
}

/**
 * Business Settings Workspace telemetrisi.
 */
export interface BusinessSettingsWorkspaceTelemetry {
  /** Toplam süre (ms) */
  durationMs: number;
  /** Başlangıç ISO */
  startedAt: string;
  /** Bitiş ISO */
  endedAt: string;
  /** Görünür ayar section sayısı */
  visibleSettingsSectionCount: number;
  /** Özet öğe sayısı */
  summaryItemCount: number;
}

/**
 * Business Settings Workspace Runtime çıktısı.
 */
export interface BusinessSettingsWorkspaceResult {
  /** Widget / section projeksiyonları */
  widgets: readonly BusinessSettingsWorkspaceWidgetProjection[];
  /** Yürütme özeti */
  summary: BusinessSettingsWorkspaceSummary;
  /** Düz özet öğeleri */
  summaryItems: readonly BusinessSettingsWorkspaceSummaryItem[];
  /** Doğrulama bulguları */
  validationIssues: readonly BusinessSettingsWorkspaceValidationIssue[];
  /** Telemetri */
  telemetry: BusinessSettingsWorkspaceTelemetry;
}

/** Pipeline bag anahtarı */
export const PIPELINE_BAG_BUSINESS_SETTINGS_WORKSPACE_RESULT_KEY =
  'businessSettingsWorkspaceResult' as const;
