/**
 * İSTEBUL Business Dashboard Engine — Section References (PR-105B).
 *
 * Widget üretmez; ReportModel.sections kimlik/başlık referanslarını taşır.
 */

import type { ReportSectionKind } from '../../../report/models/ReportSection';

/**
 * Tek bölüm referansı.
 */
export interface DashboardSectionReference {
  id: string;
  sectionCode: string;
  kind: ReportSectionKind;
  title: string;
  order: number;
}

/**
 * Bölüm referansları bölümü.
 */
export interface DashboardSectionReferences {
  /** Referans sayısı */
  referenceCount: number;
  /** Eşlenen bölüm referansları */
  items: readonly DashboardSectionReference[];
  /** Referans var mı */
  present: boolean;
}
