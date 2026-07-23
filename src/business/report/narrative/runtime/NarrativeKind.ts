/**
 * İSTEBUL Business Report Engine — Narrative türleri (PR-104C).
 */

/**
 * Narrative tür kimlikleri.
 */
export type NarrativeKind =
  | 'executive-summary'
  | 'policy-overview'
  | 'recommendation-overview'
  | 'action-plan-overview'
  | 'dataset-overview';

export const NARRATIVE_KIND_LABELS: Readonly<Record<NarrativeKind, string>> =
  Object.freeze({
    'executive-summary': 'Executive Summary',
    'policy-overview': 'Policy Overview',
    'recommendation-overview': 'Recommendation Overview',
    'action-plan-overview': 'Action Plan Overview',
    'dataset-overview': 'Dataset Overview'
  });

export const NARRATIVE_KIND_ORDER: readonly NarrativeKind[] = Object.freeze([
  'executive-summary',
  'policy-overview',
  'recommendation-overview',
  'action-plan-overview',
  'dataset-overview'
]);
