/**
 * İSTEBUL Business Analysis Engine — KPI runtime context (PR-102B).
 */

import type { BusinessDataset } from '../../../dataset/models/BusinessDataset';
import type { AnalysisContext } from '../../models/AnalysisContext';

/**
 * KPI hesaplama girdi bağlamı.
 */
export interface KpiContext {
  /** İncelenecek dataset — validation geçmiş olmalı */
  dataset: BusinessDataset;
  /** Opsiyonel foundation AnalysisContext */
  analysisContext?: AnalysisContext;
  /** Dil */
  locale: 'tr' | 'en';
  /** Sınırlı KPI listesi — boş/undefined ise tüm kayıtlı KPI’lar */
  kpiIds?: readonly string[];
  /** Ara bag */
  bag?: Record<string, unknown>;
}

/**
 * KpiContext üretir — locale varsayılanı `tr`.
 */
export function createKpiContext(
  partial: Omit<KpiContext, 'locale'> & { locale?: 'tr' | 'en' }
): KpiContext {
  const { locale, ...rest } = partial;
  return {
    ...rest,
    locale: locale ?? 'tr'
  };
}
