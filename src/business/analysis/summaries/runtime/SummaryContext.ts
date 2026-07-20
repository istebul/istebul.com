/**
 * İSTEBUL Business Analysis Engine — Summary Builder context (PR-102E).
 */

import type { AnalysisContext } from '../../models/AnalysisContext';
import type { AnalysisFinding } from '../../models/AnalysisFinding';
import type { KPIResult as FoundationKPIResult } from '../../models/KPIResult';
import type { FindingResult } from '../../findings/runtime/FindingResult';
import type { KpiResult } from '../../kpis/runtime/KpiResult';
import type { RuleResult } from '../../rules/runtime/RuleResult';

/**
 * Summary Builder girdi bağlamı.
 */
export interface SummaryContext {
  /** Opsiyonel AnalysisContext */
  analysisContext?: AnalysisContext;
  /** Runtime KPI sonucu */
  kpiResult?: KpiResult;
  /** Foundation KPI listesi */
  kpiResults?: readonly FoundationKPIResult[];
  /** Runtime Rule sonucu */
  ruleResult?: RuleResult;
  /** Runtime Finding sonucu */
  findingResult?: FindingResult;
  /** Foundation findings */
  findings?: readonly AnalysisFinding[];
  /** Dil */
  locale: 'tr' | 'en';
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * SummaryContext üretir — locale varsayılanı `tr`.
 */
export function createSummaryContext(
  partial: Omit<SummaryContext, 'locale'> & { locale?: 'tr' | 'en' }
): SummaryContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
