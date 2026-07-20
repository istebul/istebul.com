/**
 * İSTEBUL Business Dashboard Engine — Recommendation References (PR-105B).
 */

import type { DecisionPriorityLevel } from '../../../decision/models/DecisionPriority';

/**
 * Tek öneri referansı — ReportRecommendation alanlarını taşır.
 */
export interface DashboardRecommendationReference {
  id: string;
  code: string;
  title: string;
  description: string;
  priorityLevel: DecisionPriorityLevel;
  sourceRecommendationId: string | null;
}

/**
 * Öneri referansları bölümü.
 */
export interface DashboardRecommendationReferences {
  /** Referans sayısı */
  referenceCount: number;
  /** Öncelik dağılımı */
  priorityCounts: Readonly<Partial<Record<DecisionPriorityLevel, number>>>;
  /** Eşlenen öneriler */
  items: readonly DashboardRecommendationReference[];
  /** Referans var mı */
  present: boolean;
}
