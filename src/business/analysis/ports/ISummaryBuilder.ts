/**
 * İSTEBUL Business Analysis Engine — özet oluşturucu portu.
 */

import type { AnalysisContext } from '../models/AnalysisContext';
import type { AnalysisFinding } from '../models/AnalysisFinding';
import type { AnalysisSummary } from '../models/AnalysisSummary';
import type { KPIResult } from '../models/KPIResult';

export interface ISummaryBuilder {
  /**
   * Bulgu ve KPI sonuçlarından yönetici özeti üretir.
   * LLM kullanılmaz; bu PR’da implementasyon yoktur.
   */
  build(
    context: AnalysisContext,
    kpiResults: readonly KPIResult[],
    findings: readonly AnalysisFinding[]
  ): Promise<AnalysisSummary>;
}
