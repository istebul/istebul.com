/**
 * İSTEBUL Business Dashboard Engine — sunumdan bağımsız DashboardModel (PR-105B).
 *
 * Foundation `models/DashboardModel` (widget/layout odaklı) ile karıştırılmamalıdır.
 * Bu model yalnızca ReportResult yapısal projeksiyonudur; widget/KPI üretmez.
 */

import type { DashboardActionPlanReferences } from './DashboardActionPlanReferences';
import type { DashboardDataset } from './DashboardDataset';
import type { DashboardMetadata } from './DashboardMetadata';
import type { DashboardNarrativeReferences } from './DashboardNarrativeReferences';
import type { DashboardRecommendationReferences } from './DashboardRecommendationReferences';
import type { DashboardReportSummaryInformation } from './DashboardReportSummaryInformation';
import type { DashboardSectionReferences } from './DashboardSectionReferences';

/**
 * Sunumdan bağımsız dashboard veri modeli.
 */
export interface DashboardModel {
  /** Üst veri */
  metadata: DashboardMetadata;
  /** Dataset bilgisi */
  dataset: DashboardDataset;
  /** Rapor özeti projeksiyonu */
  reportSummary: DashboardReportSummaryInformation;
  /** Bölüm referansları */
  sectionReferences: DashboardSectionReferences;
  /** Narrative referansları */
  narrativeReferences: DashboardNarrativeReferences;
  /** Öneri referansları */
  recommendationReferences: DashboardRecommendationReferences;
  /** Aksiyon planı referansları */
  actionPlanReferences: DashboardActionPlanReferences;
}
