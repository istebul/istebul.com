/**
 * İSTEBUL Business Report Engine — standart bölüm kimlikleri (PR-104D).
 */

import type { ReportSectionKind } from '../../models/ReportSection';
import type { NarrativeKind } from '../../narrative/runtime/NarrativeKind';

/**
 * Standart Report Section kimlikleri.
 */
export type ReportSectionId =
  | 'executive-summary'
  | 'dataset-overview'
  | 'policy-analysis'
  | 'recommendations'
  | 'action-plan'
  | 'decision-summary'
  | 'appendix';

export const REPORT_SECTION_LABELS: Readonly<Record<ReportSectionId, string>> =
  Object.freeze({
    'executive-summary': 'Executive Summary',
    'dataset-overview': 'Dataset Overview',
    'policy-analysis': 'Policy Analysis',
    recommendations: 'Recommendations',
    'action-plan': 'Action Plan',
    'decision-summary': 'Decision Summary',
    appendix: 'Appendix'
  });

export const REPORT_SECTION_ORDER: readonly ReportSectionId[] = Object.freeze([
  'executive-summary',
  'dataset-overview',
  'policy-analysis',
  'recommendations',
  'action-plan',
  'decision-summary',
  'appendix'
]);

export const REPORT_SECTION_KIND_BY_ID: Readonly<
  Record<ReportSectionId, ReportSectionKind>
> = Object.freeze({
  'executive-summary': 'ozet',
  'dataset-overview': 'kpi',
  'policy-analysis': 'risk',
  recommendations: 'oneriler',
  'action-plan': 'ozel',
  'decision-summary': 'ozet',
  appendix: 'ek'
});

export const REPORT_SECTION_NARRATIVE_KIND: Readonly<
  Partial<Record<ReportSectionId, NarrativeKind>>
> = Object.freeze({
  'executive-summary': 'executive-summary',
  'dataset-overview': 'dataset-overview',
  'policy-analysis': 'policy-overview',
  recommendations: 'recommendation-overview',
  'action-plan': 'action-plan-overview'
});
