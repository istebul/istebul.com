/**
 * İSTEBUL Business Decision Engine — Policy Engine context (PR-103B).
 */

import type { AnalysisResult } from '../../../analysis/models/AnalysisResult';
import type { DecisionContext } from '../../models/DecisionContext';
import { DECISION_ENGINE_DEFAULT_LOCALE } from '../../constants/DecisionEngineConstants';

/**
 * Politika değerlendirme girdi bağlamı.
 */
export interface PolicyContext {
  /** Analysis Engine sonucu */
  analysisResult: AnalysisResult;
  /** Opsiyonel DecisionContext */
  decisionContext?: DecisionContext;
  /** Dil */
  locale: 'tr' | 'en';
  /** Sınırlı politika listesi */
  policyIds?: readonly string[];
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * PolicyContext üretir — locale varsayılanı Decision Engine default.
 */
export function createPolicyContext(
  partial: Omit<PolicyContext, 'locale'> & { locale?: 'tr' | 'en' }
): PolicyContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? DECISION_ENGINE_DEFAULT_LOCALE
  };
}
