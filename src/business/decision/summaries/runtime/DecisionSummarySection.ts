/**
 * İSTEBUL Business Decision Engine — Decision Summary section tipleri (PR-103E).
 */

/**
 * Decision Summary bölüm kimlikleri.
 */
export type DecisionSummarySectionId =
  | 'decision-metadata'
  | 'policy-summary'
  | 'recommendation-summary'
  | 'action-plan-summary'
  | 'severity-distribution'
  | 'priority-distribution'
  | 'execution-summary';

/**
 * Tek bir Decision Summary bölümü.
 */
export interface DecisionSummarySection {
  /** Bölüm kimliği */
  id: DecisionSummarySectionId;
  /** Başlık */
  title: string;
  /** Kısa nesnel özet satırları */
  items: readonly string[];
  /** Yapılandırılmış sayılar / etiketler */
  metrics: Readonly<Record<string, string | number | boolean | null>>;
  /** Sıra */
  order: number;
}

export const DECISION_SUMMARY_SECTION_LABELS: Readonly<
  Record<DecisionSummarySectionId, string>
> = Object.freeze({
  'decision-metadata': 'Decision Metadata',
  'policy-summary': 'Policy Summary',
  'recommendation-summary': 'Recommendation Summary',
  'action-plan-summary': 'Action Plan Summary',
  'severity-distribution': 'Severity Distribution',
  'priority-distribution': 'Priority Distribution',
  'execution-summary': 'Execution Summary'
});

export const DECISION_SUMMARY_SECTION_ORDER: readonly DecisionSummarySectionId[] =
  Object.freeze([
    'decision-metadata',
    'policy-summary',
    'recommendation-summary',
    'action-plan-summary',
    'severity-distribution',
    'priority-distribution',
    'execution-summary'
  ]);
