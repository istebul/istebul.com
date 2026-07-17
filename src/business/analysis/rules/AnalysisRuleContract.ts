/**
 * İSTEBUL Business Analysis Engine — kural sözleşmeleri.
 *
 * Henüz hiçbir analiz kuralı yazılmaz.
 */

import type { AnalysisFindingSeverity } from '../models/AnalysisFinding';

/**
 * Kural yaşam döngüsü.
 */
export type AnalysisRuleStatus = 'taslak' | 'aktif' | 'pasif';

/**
 * Kural tanımı — yalnızca metadata; yürütme mantığı yoktur.
 */
export interface AnalysisRuleDefinition {
  id: string;
  name: string;
  description: string;
  status: AnalysisRuleStatus;
  /** İlgili rapor DNA kimliği */
  reportId?: string;
  /** Tetiklenince önerilen bulgu önem derecesi */
  defaultSeverity: AnalysisFindingSeverity;
  version: string;
}

/**
 * Kural değerlendirme girdisi sözleşmesi (gelecek motor).
 */
export interface AnalysisRuleEvaluationInput {
  ruleId: string;
  datasetId: string;
  kpiIds: readonly string[];
}
