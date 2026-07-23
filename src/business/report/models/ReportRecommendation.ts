/**
 * İSTEBUL Business Report Engine — rapor önerisi.
 */

import type { DecisionPriorityLevel } from '../../decision/models/DecisionPriority';

/**
 * Raporda sunulan öneri.
 */
export interface ReportRecommendation {
  id: string;
  code: string;
  title: string;
  description: string;
  priorityLevel: DecisionPriorityLevel;
  /** Kaynak karar öneri kimliği */
  sourceRecommendationId?: string;
}
