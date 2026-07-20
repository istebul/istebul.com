/**
 * İSTEBUL Business Decision Engine — runtime recommendation tanımı (PR-103C).
 *
 * Foundation `DecisionRecommendation` / `RecommendationTemplateDefinition`
 * sözleşmelerini değiştirmez.
 */

import type { DecisionPriorityLevel } from '../../models/DecisionPriority';
import type { RecommendationCategory } from './RecommendationCategory';

/**
 * Recommendation önem derecesi — Policy Engine severity ile uyumlu.
 */
export type RecommendationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * Runtime recommendation şablon / tanım kaydı.
 */
export interface RecommendationDefinition {
  /** Kararlı kimlik */
  id: string;
  /** Öneri kodu */
  code: string;
  /** Başlık şablonu */
  title: string;
  /** Açıklama şablonu */
  description: string;
  /** Kategori */
  category: RecommendationCategory;
  /** Varsayılan önem */
  defaultSeverity: RecommendationSeverity;
  /** Varsayılan öncelik */
  defaultPriority: DecisionPriorityLevel;
  /** Kaynak politika kimliği — eşleme için */
  sourcePolicyId?: string;
  /** Sıra */
  order: number;
  /** Aktif mi */
  enabled: boolean;
}

export const RECOMMENDATION_SEVERITY_RANK: Readonly<
  Record<RecommendationSeverity, number>
> = Object.freeze({
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4
});
