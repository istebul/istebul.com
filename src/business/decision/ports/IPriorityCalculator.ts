/**
 * İSTEBUL Business Decision Engine — öncelik hesaplayıcı portu.
 */

import type { DecisionContext } from '../models/DecisionContext';
import type { DecisionOpportunity } from '../models/DecisionOpportunity';
import type { DecisionPriority } from '../models/DecisionPriority';
import type { DecisionRecommendation } from '../models/DecisionRecommendation';
import type { DecisionRisk } from '../models/DecisionRisk';

export interface IPriorityCalculator {
  calculate(
    context: DecisionContext,
    recommendations: readonly DecisionRecommendation[],
    risks: readonly DecisionRisk[],
    opportunities: readonly DecisionOpportunity[]
  ): Promise<readonly DecisionPriority[]>;
}
