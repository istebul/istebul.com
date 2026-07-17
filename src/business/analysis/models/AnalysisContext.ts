/**
 * İSTEBUL Business Analysis Engine — analiz bağlamı.
 */

import type { BusinessDataset } from '../../dataset/models/BusinessDataset';
import type { AnalysisStage, AnalysisStatus } from './AnalysisStage';

/**
 * Tek bir analiz çalıştırmasının bağlamı.
 */
export interface AnalysisContext {
  /** Analiz iş kimliği */
  analysisId: string;
  /** Girdi dataset */
  dataset: BusinessDataset;
  /** İstek dili */
  locale: 'tr' | 'en';
  /** Knowledge Report DNA kimliği (opsiyonel) */
  reportId?: string;
  /** Güncel pipeline aşaması */
  currentStage: AnalysisStage;
  /** Güncel durum */
  status: AnalysisStatus;
  /** İsteğe bağlı KPI alt kümesi — boşsa rapor DNA / registry köprüsü karar verir */
  kpiIds?: readonly string[];
  /** İsteğe bağlı kural alt kümesi */
  ruleIds?: readonly string[];
  /** Bağlam meta */
  metadata?: Readonly<Record<string, string>>;
}
