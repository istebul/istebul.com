/**
 * İSTEBUL Business Analysis Engine — zengin finding kaydı (PR-102D).
 */

import type { AnalysisFinding } from '../../models/AnalysisFinding';
import type { FindingCategory } from './FindingCategory';
import type { FindingSeverity } from './FindingDefinition';

/**
 * Finding metadata alanları.
 */
export type FindingMetadata = Readonly<
  Record<string, string | number | boolean | null>
>;

/**
 * Standart finding kaydı — foundation AnalysisFinding + runtime alanlar.
 */
export interface FindingRecord {
  /** Kimlik */
  id: string;
  /** Başlık */
  title: string;
  /** Açıklama */
  description: string;
  /** Kategori */
  category: FindingCategory;
  /** Önem */
  severity: FindingSeverity;
  /** Kaynak kural */
  sourceRule?: string;
  /** Kaynak KPI */
  sourceKpi?: string;
  /** Entity referansı */
  entityReference?: string;
  /** Metadata */
  metadata: FindingMetadata;
  /** Foundation projeksiyonu */
  finding: AnalysisFinding;
  /** Skipped kuraldan üretilen bilgi kaydı mı */
  informational?: boolean;
}
