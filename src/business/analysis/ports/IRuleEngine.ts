/**
 * İSTEBUL Business Analysis Engine — kural motor portu.
 */

import type { BusinessDataset } from '../../dataset/models/BusinessDataset';
import type { AnalysisContext } from '../models/AnalysisContext';
import type { AnalysisFinding } from '../models/AnalysisFinding';
import type { KPIResult } from '../models/KPIResult';

export interface IRuleEngine {
  /**
   * Kayıtlı kuralları dataset ve KPI sonuçlarına göre değerlendirir.
   * Gerçek kural yürütme bu PR’da yoktur.
   */
  evaluate(
    context: AnalysisContext,
    dataset: BusinessDataset,
    kpiResults: readonly KPIResult[],
    ruleIds: readonly string[]
  ): Promise<readonly AnalysisFinding[]>;
}
