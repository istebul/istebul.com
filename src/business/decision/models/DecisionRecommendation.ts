/**
 * İSTEBUL Business Decision Engine — öneri modeli.
 */

import type { DecisionPriorityLevel } from './DecisionPriority';

/**
 * Yapılandırılmış karar önerisi.
 */
export interface DecisionRecommendation {
  /** Öneri kimliği */
  id: string;
  /** Öneri kodu — RecommendationRegistry ile eşleşebilir */
  code: string;
  /** Başlık */
  title: string;
  /** Açıklama */
  description: string;
  /** Önerilen öncelik seviyesi */
  priorityLevel: DecisionPriorityLevel;
  /** İlgili risk kimlikleri */
  relatedRiskIds?: readonly string[];
  /** İlgili fırsat kimlikleri */
  relatedOpportunityIds?: readonly string[];
}
