/**
 * İSTEBUL Business Dashboard Engine — standart KPI kimlikleri (PR-105D).
 */

/**
 * Standart KPI Board kimlikleri.
 */
export type KpiId =
  | 'dataset-overview'
  | 'section-count'
  | 'recommendation-count'
  | 'action-plan-count'
  | 'narrative-count'
  | 'report-status';

export const KPI_LABELS: Readonly<Record<KpiId, string>> = Object.freeze({
  'dataset-overview': 'Dataset Overview',
  'section-count': 'Section Count',
  'recommendation-count': 'Recommendation Count',
  'action-plan-count': 'Action Plan Count',
  'narrative-count': 'Narrative Count',
  'report-status': 'Report Status'
});

/**
 * Deterministic KPI sırası.
 */
export const KPI_ORDER: readonly KpiId[] = Object.freeze([
  'dataset-overview',
  'section-count',
  'recommendation-count',
  'action-plan-count',
  'narrative-count',
  'report-status'
]);

/**
 * Birim etiketleri — hesaplama değil; gösterim birimi.
 */
export const KPI_UNIT_BY_ID: Readonly<Record<KpiId, string>> = Object.freeze({
  'dataset-overview': 'id',
  'section-count': 'adet',
  'recommendation-count': 'adet',
  'action-plan-count': 'adet',
  'narrative-count': 'adet',
  'report-status': 'durum'
});

/**
 * Dashboard Model Builder parça kimliği eşlemesi.
 */
export const KPI_SOURCE_PART_BY_ID: Readonly<Record<KpiId, string>> =
  Object.freeze({
    'dataset-overview': 'dataset',
    'section-count': 'section-references',
    'recommendation-count': 'recommendation-references',
    'action-plan-count': 'action-plan-references',
    'narrative-count': 'narrative-references',
    'report-status': 'report-summary'
  });
