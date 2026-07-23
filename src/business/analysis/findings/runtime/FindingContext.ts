/**
 * İSTEBUL Business Analysis Engine — Finding Builder context (PR-102D).
 */

import type { AnalysisContext } from '../../models/AnalysisContext';
import type { AnalysisFinding } from '../../models/AnalysisFinding';
import type { KPIResult as FoundationKPIResult } from '../../models/KPIResult';
import type { RuleResult } from '../../rules/runtime/RuleResult';

/**
 * Finding Builder girdi bağlamı.
 */
export interface FindingContext {
  /** Opsiyonel AnalysisContext */
  analysisContext?: AnalysisContext;
  /** Foundation KPI sonuçları */
  kpiResults?: readonly FoundationKPIResult[];
  /** Rule Engine runtime sonucu — tercih edilen kaynak */
  ruleResult?: RuleResult;
  /** Rule Engine’in önceden ürettiği foundation findings */
  ruleFindings?: readonly AnalysisFinding[];
  /** Dil */
  locale: 'tr' | 'en';
  /** Skipped kurallar için bilgi kaydı üret */
  includeSkippedInfo?: boolean;
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * FindingContext üretir — locale varsayılanı `tr`.
 */
export function createFindingContext(
  partial: Omit<FindingContext, 'locale'> & { locale?: 'tr' | 'en' }
): FindingContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr',
    includeSkippedInfo: partial.includeSkippedInfo ?? true
  };
}
