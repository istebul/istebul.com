/**
 * İSTEBUL Business Analysis Engine — bulgu oluşturucu portu.
 */

import type { AnalysisContext } from '../models/AnalysisContext';
import type { AnalysisFinding } from '../models/AnalysisFinding';
import type { KPIResult } from '../models/KPIResult';

export interface IFindingBuilder {
  /**
   * Kural / KPI çıktılarından bulgu listesi derler.
   */
  build(
    context: AnalysisContext,
    kpiResults: readonly KPIResult[],
    ruleFindings: readonly AnalysisFinding[]
  ): Promise<readonly AnalysisFinding[]>;
}
