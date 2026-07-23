/**
 * İSTEBUL Business Decision Engine — zengin recommendation kaydı (PR-103C).
 */

import type { DecisionPriorityLevel } from '../../models/DecisionPriority';
import type { DecisionRecommendation } from '../../models/DecisionRecommendation';
import type { RecommendationCategory } from './RecommendationCategory';
import type { RecommendationSeverity } from './RecommendationDefinition';

/**
 * Recommendation metadata alanları.
 */
export type RecommendationMetadata = Readonly<
  Record<string, string | number | boolean | null>
>;

/**
 * Standart recommendation kaydı — foundation DecisionRecommendation + runtime alanlar.
 */
export interface RecommendationRecord {
  /** Kimlik */
  id: string;
  /** Başlık */
  title: string;
  /** Açıklama */
  description: string;
  /** Kategori */
  category: RecommendationCategory;
  /** Önem */
  severity: RecommendationSeverity;
  /** Öncelik */
  priority: DecisionPriorityLevel;
  /** Kaynak politika */
  sourcePolicy?: string;
  /** Kaynak bulgu (opsiyonel) */
  sourceFinding?: string;
  /** Metadata */
  metadata: RecommendationMetadata;
  /** Foundation projeksiyonu */
  recommendation: DecisionRecommendation;
  /** Skipped politikadan üretilen bilgi kaydı mı */
  informational?: boolean;
}
