/**
 * İSTEBUL Business Report Engine — Recommendation Information (PR-104B).
 */

import type { DecisionPriorityLevel } from '../../../decision/models/DecisionPriority';

/**
 * Tek bir öneri eşlemesi — metin üretmez; DecisionRecommendation alanlarını taşır.
 */
export interface ReportMappedRecommendation {
  id: string;
  code: string;
  title: string;
  description: string;
  priorityLevel: DecisionPriorityLevel;
  relatedRiskIds: readonly string[];
  relatedOpportunityIds: readonly string[];
}

/**
 * Öneri bilgisi bölümü.
 */
export interface ReportRecommendationInformation {
  /** Öneri sayısı */
  recommendationCount: number;
  /** Öncelik dağılımı */
  priorityCounts: Readonly<Partial<Record<DecisionPriorityLevel, number>>>;
  /** Eşlenen öneriler */
  items: readonly ReportMappedRecommendation[];
  /** Öneri var mı */
  present: boolean;
}
