/**
 * İSTEBUL Business Decision Engine — fırsat değerlendirici portu.
 */

import type { AnalysisResult } from '../../analysis/models/AnalysisResult';
import type { DecisionContext } from '../models/DecisionContext';
import type { DecisionOpportunity } from '../models/DecisionOpportunity';

export interface IOpportunityEvaluator {
  evaluate(
    context: DecisionContext,
    analysisResult: AnalysisResult
  ): Promise<readonly DecisionOpportunity[]>;
}
