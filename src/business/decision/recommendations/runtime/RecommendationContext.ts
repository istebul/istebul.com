/**
 * İSTEBUL Business Decision Engine — Recommendation Builder context (PR-103C).
 */

import type { AnalysisResult } from '../../../analysis/models/AnalysisResult';
import type { DecisionContext } from '../../models/DecisionContext';
import type { DecisionOpportunity } from '../../models/DecisionOpportunity';
import type { DecisionRisk } from '../../models/DecisionRisk';
import { DECISION_ENGINE_DEFAULT_LOCALE } from '../../constants/DecisionEngineConstants';
import type { PolicyResult } from '../../policies/runtime/PolicyResult';

/**
 * Recommendation Builder girdi bağlamı.
 */
export interface RecommendationContext {
  /** Opsiyonel DecisionContext */
  decisionContext?: DecisionContext;
  /** AnalysisResult */
  analysisResult?: AnalysisResult;
  /** Policy Engine runtime sonucu — tercih edilen kaynak */
  policyResult?: PolicyResult;
  /** Port uyumu — riskler */
  risks?: readonly DecisionRisk[];
  /** Port uyumu — fırsatlar */
  opportunities?: readonly DecisionOpportunity[];
  /** Dil */
  locale: 'tr' | 'en';
  /** Skipped politikalar için bilgi kaydı üret */
  includeSkippedInfo?: boolean;
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * RecommendationContext üretir.
 */
export function createRecommendationContext(
  partial: Omit<RecommendationContext, 'locale'> & { locale?: 'tr' | 'en' }
): RecommendationContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? DECISION_ENGINE_DEFAULT_LOCALE,
    includeSkippedInfo: partial.includeSkippedInfo ?? true
  };
}
