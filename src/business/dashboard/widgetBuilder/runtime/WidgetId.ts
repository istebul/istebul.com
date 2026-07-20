/**
 * İSTEBUL Business Dashboard Engine — standart widget kimlikleri (PR-105C).
 */

import type { DashboardWidgetKind } from '../../models/DashboardWidget';

/**
 * Standart Widget Builder kimlikleri.
 */
export type WidgetId =
  | 'overview'
  | 'dataset'
  | 'recommendations'
  | 'action-plans'
  | 'narratives'
  | 'sections';

export const WIDGET_LABELS: Readonly<Record<WidgetId, string>> = Object.freeze({
  overview: 'Overview',
  dataset: 'Dataset',
  recommendations: 'Recommendations',
  'action-plans': 'Action Plans',
  narratives: 'Narratives',
  sections: 'Sections'
});

/**
 * Deterministic widget sırası.
 */
export const WIDGET_ORDER: readonly WidgetId[] = Object.freeze([
  'overview',
  'dataset',
  'recommendations',
  'action-plans',
  'narratives',
  'sections'
]);

/**
 * Foundation DashboardWidgetKind eşlemesi — chart/React üretmez.
 */
export const WIDGET_KIND_BY_ID: Readonly<Record<WidgetId, DashboardWidgetKind>> =
  Object.freeze({
    overview: 'text',
    dataset: 'table',
    recommendations: 'list',
    'action-plans': 'list',
    narratives: 'text',
    sections: 'list'
  });

/**
 * Dashboard Model Builder parça kimliği eşlemesi.
 */
export const WIDGET_SOURCE_PART_BY_ID: Readonly<Record<WidgetId, string>> =
  Object.freeze({
    overview: 'report-summary',
    dataset: 'dataset',
    recommendations: 'recommendation-references',
    'action-plans': 'action-plan-references',
    narratives: 'narrative-references',
    sections: 'section-references'
  });
