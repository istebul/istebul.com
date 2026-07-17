/**
 * İSTEBUL Business Analysis Engine — analiz sonucu.
 */

import type { AnalysisFinding } from './AnalysisFinding';
import type { AnalysisScore } from './AnalysisScore';
import type { AnalysisStage, AnalysisStatus } from './AnalysisStage';
import type { AnalysisStatistics } from './AnalysisStatistics';
import type { AnalysisSummary } from './AnalysisSummary';
import type { AnalysisWarning } from './AnalysisWarning';
import type { KPIResult } from './KPIResult';

/**
 * Pipeline tamamlandığında dönen sonuç paketi.
 */
export interface AnalysisResult {
  /** İstek kimliği */
  requestId: string;
  /** Dataset kimliği */
  datasetId: string;
  /** Son durum */
  status: AnalysisStatus;
  /** Son aşama */
  lastStage: AnalysisStage;
  /** KPI sonuçları */
  kpiResults: readonly KPIResult[];
  /** Bulgular */
  findings: readonly AnalysisFinding[];
  /** Özet */
  summary?: AnalysisSummary;
  /** Skorlar */
  scores: readonly AnalysisScore[];
  /** İstatistikler */
  statistics: AnalysisStatistics;
  /** Uyarılar */
  warnings: readonly AnalysisWarning[];
  /** Tamamlanma zamanı (ISO 8601) */
  completedAt?: string;
}
