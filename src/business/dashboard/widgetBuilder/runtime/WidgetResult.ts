/**
 * İSTEBUL Business Dashboard Engine — Widget Builder runtime sonucu (PR-105C).
 */

import type { DashboardWidget } from '../../models/DashboardWidget';
import type { WidgetRecord } from './WidgetRecord';

/**
 * Widget uyarısı.
 */
export interface WidgetWarning {
  code: string;
  message: string;
  widgetId?: string;
}

/**
 * Widget telemetrisi.
 */
export interface WidgetTelemetry {
  /** Execution duration (ms) */
  durationMs: number;
  startedAt: string;
  endedAt: string;
  /** Widget count */
  widgetCount: number;
  /** Registry mapping count */
  registryMappingCount: number;
  warningCount: number;
}

/**
 * Widget metadata.
 */
export interface WidgetMetadata {
  dashboardModelId: string;
  locale: 'tr' | 'en';
  generatedAt: string;
  widgetIds: readonly string[];
  mappedSourceParts: readonly string[];
}

/**
 * Widget Builder Runtime çıktısı.
 */
export interface WidgetResult {
  /** Zengin widget kayıtları */
  records: readonly WidgetRecord[];
  /** Foundation DashboardWidget listesi */
  widgets: readonly DashboardWidget[];
  /** Metadata */
  metadata: WidgetMetadata;
  /** Uyarılar */
  warnings: readonly WidgetWarning[];
  /** Telemetri */
  telemetry: WidgetTelemetry;
}

/** Pipeline bag anahtarı — Dashboard Engine */
export const PIPELINE_BAG_DASHBOARD_WIDGET_RUNTIME_RESULT_KEY =
  'dashboardWidgetRuntimeResult' as const;
