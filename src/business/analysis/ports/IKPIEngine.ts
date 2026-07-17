/**
 * İSTEBUL Business Analysis Engine — KPI motor portu.
 */

import type { BusinessDataset } from '../../dataset/models/BusinessDataset';
import type { AnalysisContext } from '../models/AnalysisContext';
import type { KPIResult } from '../models/KPIResult';

export interface IKPIEngine {
  /**
   * Dataset üzerinde KPI sonuçları üretir.
   * Gerçek hesaplama bu PR’da yoktur.
   */
  calculate(
    context: AnalysisContext,
    dataset: BusinessDataset,
    kpiIds: readonly string[]
  ): Promise<readonly KPIResult[]>;
}
