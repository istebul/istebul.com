/**
 * İSTEBUL Business Report Engine — Report Model parça kimlikleri (PR-104B).
 */

export type ReportPartId =
  | 'metadata'
  | 'dataset'
  | 'decision'
  | 'policy'
  | 'recommendation'
  | 'action-plan'
  | 'summary';

export const REPORT_PART_LABELS: Readonly<Record<ReportPartId, string>> =
  Object.freeze({
    metadata: 'Metadata',
    dataset: 'Dataset Information',
    decision: 'Decision Information',
    policy: 'Policy Information',
    recommendation: 'Recommendation Information',
    'action-plan': 'Action Plan Information',
    summary: 'Summary Information'
  });

export const REPORT_PART_ORDER: readonly ReportPartId[] = Object.freeze([
  'metadata',
  'dataset',
  'decision',
  'policy',
  'recommendation',
  'action-plan',
  'summary'
]);
