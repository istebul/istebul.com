/**
 * İSTEBUL Business Dashboard Engine — Dashboard Model parça kimlikleri (PR-105B).
 */

export type DashboardPartId =
  | 'metadata'
  | 'dataset'
  | 'report-summary'
  | 'section-references'
  | 'narrative-references'
  | 'recommendation-references'
  | 'action-plan-references';

export const DASHBOARD_PART_LABELS: Readonly<Record<DashboardPartId, string>> =
  Object.freeze({
    metadata: 'Dashboard Metadata',
    dataset: 'Dataset',
    'report-summary': 'Report Summary',
    'section-references': 'Section References',
    'narrative-references': 'Narrative References',
    'recommendation-references': 'Recommendation References',
    'action-plan-references': 'Action Plan References'
  });

export const DASHBOARD_PART_ORDER: readonly DashboardPartId[] = Object.freeze([
  'metadata',
  'dataset',
  'report-summary',
  'section-references',
  'narrative-references',
  'recommendation-references',
  'action-plan-references'
]);
