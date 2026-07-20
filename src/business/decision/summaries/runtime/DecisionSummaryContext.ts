/**
 * İSTEBUL Business Decision Engine — Decision Summary context (PR-103E).
 */

import type { DecisionContext } from '../../models/DecisionContext';
import type { DecisionRequest } from '../../models/DecisionRequest';
import { DECISION_ENGINE_DEFAULT_LOCALE } from '../../constants/DecisionEngineConstants';
import type { ActionPlanResult } from '../../actionPlans/runtime/ActionPlanResult';
import type { PolicyResult } from '../../policies/runtime/PolicyResult';
import type { RecommendationResult } from '../../recommendations/runtime/RecommendationResult';

/**
 * Decision Summary Runtime girdi bağlamı.
 */
export interface DecisionSummaryContext {
  /** Opsiyonel DecisionContext */
  decisionContext?: DecisionContext;
  /** Opsiyonel DecisionRequest */
  request?: DecisionRequest;
  /** Policy Engine sonucu */
  policyResult?: PolicyResult;
  /** Recommendation Builder sonucu */
  recommendationResult?: RecommendationResult;
  /** Action Plan Builder sonucu */
  actionPlanResult?: ActionPlanResult;
  /** Dil */
  locale: 'tr' | 'en';
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * DecisionSummaryContext üretir.
 */
export function createDecisionSummaryContext(
  partial: Omit<DecisionSummaryContext, 'locale'> & { locale?: 'tr' | 'en' }
): DecisionSummaryContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? DECISION_ENGINE_DEFAULT_LOCALE
  };
}
