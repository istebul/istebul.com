/**
 * İSTEBUL Business Dashboard Engine — Dashboard Model Builder runtime sonucu (PR-105B).
 */

import type { DashboardModel as FoundationDashboardModel } from '../../models/DashboardModel';
import type { DashboardMetadata as FoundationDashboardMetadata } from '../../models/DashboardMetadata';
import type { DashboardModel } from './DashboardModel';
import type { DashboardMetadata } from './DashboardMetadata';

/**
 * Dashboard Model uyarısı.
 */
export interface DashboardModelWarning {
  code: string;
  message: string;
}

/**
 * Dashboard Model telemetrisi.
 */
export interface DashboardModelTelemetry {
  /** Execution duration (ms) */
  durationMs: number;
  startedAt: string;
  endedAt: string;
  /** Projection count (mapped entities / parts) */
  projectionCount: number;
  /** Reference count (section + narrative + recommendation + action) */
  referenceCount: number;
  warningCount: number;
}

/**
 * Dashboard Model Builder Runtime çıktısı.
 */
export interface DashboardModelResult {
  /** Sunumdan bağımsız DashboardModel */
  model: DashboardModel;
  /** Foundation DashboardModel projeksiyonu (boş widget/KPI; bag.dashboardModel için) */
  foundationModel: FoundationDashboardModel;
  /** Builder metadata (structured) */
  metadata: DashboardMetadata;
  /** Foundation metadata projeksiyonu */
  foundationMetadata: FoundationDashboardMetadata;
  /** Uyarılar */
  warnings: readonly DashboardModelWarning[];
  /** Telemetri */
  telemetry: DashboardModelTelemetry;
}

/** Pipeline bag anahtarı — Dashboard Engine */
export const PIPELINE_BAG_DASHBOARD_MODEL_RUNTIME_RESULT_KEY =
  'dashboardModelRuntimeResult' as const;
