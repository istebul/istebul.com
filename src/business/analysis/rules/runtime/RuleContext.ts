/**
 * İSTEBUL Business Analysis Engine — Rule Engine context (PR-102C).
 */

import type { BusinessDataset } from '../../../dataset/models/BusinessDataset';
import type { AnalysisContext } from '../../models/AnalysisContext';
import type { KPIResult as FoundationKPIResult } from '../../models/KPIResult';
import type { KpiResult } from '../../kpis/runtime/KpiResult';

/**
 * Kural değerlendirme girdi bağlamı.
 */
export interface RuleContext {
  /** Dataset — validation geçmiş olmalı */
  dataset: BusinessDataset;
  /** Foundation KPI sonuçları */
  kpiResults: readonly FoundationKPIResult[];
  /** Opsiyonel zengin KPI runtime sonucu */
  kpiRuntimeResult?: KpiResult;
  /** Opsiyonel AnalysisContext */
  analysisContext?: AnalysisContext;
  /** Dil */
  locale: 'tr' | 'en';
  /** Sınırlı kural listesi */
  ruleIds?: readonly string[];
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * RuleContext üretir — locale varsayılanı `tr`.
 */
export function createRuleContext(
  partial: Omit<RuleContext, 'locale'> & { locale?: 'tr' | 'en' }
): RuleContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
