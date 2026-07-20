/**
 * İSTEBUL Business Decision Engine — DecisionExecutionContext (PR-103F).
 */

import type { AnalysisResult } from '../../../analysis/models/AnalysisResult';
import type { DecisionContext } from '../../models/DecisionContext';
import type { DecisionRequest } from '../../models/DecisionRequest';
import type { DecisionPipelineBag } from '../../pipeline/runtime/DecisionPipelineContext';

/**
 * Uçtan uca Decision yürütme bağlamı.
 */
export interface DecisionExecutionContext {
  /** Karar isteği */
  request: DecisionRequest;
  /** Hazır DecisionContext */
  decisionContext?: DecisionContext;
  /** AnalysisResult — decisionContext yoksa zorunlu */
  analysisResult?: AnalysisResult;
  /** Başlangıç pipeline bag */
  initialBag?: DecisionPipelineBag;
  /** Dil */
  locale?: 'tr' | 'en';
  /** Politika alt kümesi */
  policyIds?: readonly string[];
  /** Skipped politika/öneri için informational kayıt */
  includeSkippedInfo?: boolean;
}

export type CreateDecisionExecutionContextInput = DecisionExecutionContext;

/**
 * DecisionExecutionContext fabrikası.
 */
export function createDecisionExecutionContext(
  input: CreateDecisionExecutionContextInput
): DecisionExecutionContext {
  return { ...input };
}
