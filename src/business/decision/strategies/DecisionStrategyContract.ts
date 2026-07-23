/**
 * İSTEBUL Business Decision Engine — strateji sözleşmesi.
 *
 * Gerçek strateji implementasyonu yapılmaz.
 */

import type { AnalysisResult } from '../../analysis/models/AnalysisResult';
import type { DecisionContext } from '../models/DecisionContext';
import type { DecisionRecommendation } from '../models/DecisionRecommendation';

/**
 * Strateji yaşam durumu.
 */
export type DecisionStrategyStatus = 'taslak' | 'aktif' | 'pasif';

/**
 * Kayıt edilecek karar stratejisi tanımı.
 */
export interface DecisionStrategyDefinition {
  id: string;
  name: string;
  description: string;
  status: DecisionStrategyStatus;
  /** İlgili Report DNA kimliği */
  reportId?: string;
  version: string;
}

/**
 * Strateji yürütme sözleşmesi (gelecek motor).
 */
export interface DecisionStrategyHandler {
  readonly strategyId: string;
  supports(context: DecisionContext, analysisResult: AnalysisResult): boolean;
  apply(
    context: DecisionContext,
    analysisResult: AnalysisResult
  ): Promise<readonly DecisionRecommendation[]>;
}
