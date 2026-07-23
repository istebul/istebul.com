/**
 * İSTEBUL Business Decision Engine — öneri oluşturucu portu.
 */

import type { AnalysisResult } from '../../analysis/models/AnalysisResult';
import type { DecisionContext } from '../models/DecisionContext';
import type { DecisionOpportunity } from '../models/DecisionOpportunity';
import type { DecisionRecommendation } from '../models/DecisionRecommendation';
import type { DecisionRisk } from '../models/DecisionRisk';

export interface IRecommendationBuilder {
  build(
    context: DecisionContext,
    analysisResult: AnalysisResult,
    risks: readonly DecisionRisk[],
    opportunities: readonly DecisionOpportunity[]
  ): Promise<readonly DecisionRecommendation[]>;
}
