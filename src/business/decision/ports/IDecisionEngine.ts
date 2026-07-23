/**
 * İSTEBUL Business Decision Engine — ana motor portu.
 */

import type { DecisionContext } from '../models/DecisionContext';
import type { DecisionRequest } from '../models/DecisionRequest';
import type { DecisionResult } from '../models/DecisionResult';

export interface IDecisionEngine {
  /**
   * Analysis sonucundan karar destek çıktısı üretir.
   * Bu PR’da implementasyon yoktur.
   */
  decide(
    request: DecisionRequest,
    context: DecisionContext
  ): Promise<DecisionResult>;
}
