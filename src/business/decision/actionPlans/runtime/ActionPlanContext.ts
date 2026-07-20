/**
 * İSTEBUL Business Decision Engine — Action Plan Builder context (PR-103D).
 */

import type { DecisionContext } from '../../models/DecisionContext';
import { DECISION_ENGINE_DEFAULT_LOCALE } from '../../constants/DecisionEngineConstants';
import type { RecommendationResult } from '../../recommendations/runtime/RecommendationResult';

/**
 * Action Plan Builder girdi bağlamı.
 */
export interface ActionPlanContext {
  /** Opsiyonel DecisionContext */
  decisionContext?: DecisionContext;
  /** Recommendation Builder runtime sonucu — tercih edilen kaynak */
  recommendationResult?: RecommendationResult;
  /** Dil */
  locale: 'tr' | 'en';
  /** Skipped/informational recommendation için bilgi kaydı üret */
  includeSkippedInfo?: boolean;
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * ActionPlanContext üretir.
 */
export function createActionPlanContext(
  partial: Omit<ActionPlanContext, 'locale'> & { locale?: 'tr' | 'en' }
): ActionPlanContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? DECISION_ENGINE_DEFAULT_LOCALE,
    includeSkippedInfo: partial.includeSkippedInfo ?? true
  };
}
