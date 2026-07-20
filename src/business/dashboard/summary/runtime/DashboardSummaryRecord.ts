/**
 * İSTEBUL Business Dashboard Engine — Dashboard Summary kayıt modeli (PR-105E).
 */

import type { DashboardSummary } from './DashboardSummary';
import type { DashboardSummarySection } from './DashboardSummarySection';

/**
 * Dashboard Summary metadata.
 */
export interface DashboardSummaryMetadata {
  dashboardModelId: string;
  reportDnaId?: string;
  datasetId?: string;
  locale: 'tr' | 'en';
  generatedAt: string;
  sourceStages: readonly string[];
}

/**
 * Zengin Dashboard Summary kaydı.
 */
export interface DashboardSummaryRecord {
  /** Nesnel özet */
  dashboardSummary: DashboardSummary;
  /** Bölümler */
  sections: readonly DashboardSummarySection[];
  /** Metadata */
  metadata: DashboardSummaryMetadata;
}
