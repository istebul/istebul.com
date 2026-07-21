/**
 * İSTEBUL Business Export Engine — formatlardan bağımsız ExportModel (PR-106B).
 *
 * PR-106A pipeline skeleton `ExportModel` ile karıştırılmamalıdır.
 * Bu model DocumentModel / DashboardModel yapısal projeksiyonudur;
 * renderer / format / dosya üretmez.
 */

import type { ExportContent } from './ExportContent';
import type { ExportDashboardReferences } from './ExportDashboardReferences';
import type { ExportDocumentReferences } from './ExportDocumentReferences';
import type { ExportKpiReferences } from './ExportKpiReferences';
import type { ExportMetadata } from './ExportMetadata';
import type { ExportReportReferences } from './ExportReportReferences';
import type { ExportSectionReferences } from './ExportSectionReferences';
import type { ExportWidgetReferences } from './ExportWidgetReferences';

/**
 * Formatlardan bağımsız export veri modeli.
 */
export interface ExportModel {
  /** Üst veri */
  metadata: ExportMetadata;
  /** İçerik özeti */
  content: ExportContent;
  /** Document referansları */
  documentReferences: ExportDocumentReferences;
  /** Dashboard referansları */
  dashboardReferences: ExportDashboardReferences;
  /** Report referansları */
  reportReferences: ExportReportReferences;
  /** Bölüm referansları */
  sectionReferences: ExportSectionReferences;
  /** Widget referansları */
  widgetReferences: ExportWidgetReferences;
  /** KPI referansları */
  kpiReferences: ExportKpiReferences;
}
