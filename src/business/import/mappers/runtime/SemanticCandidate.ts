/**
 * İSTEBUL Business Import Engine — SemanticCandidate (PR-101G).
 *
 * Kolon → Business Field adayı. Veri dönüşümü yok.
 */

import type { BusinessEntityTypeId } from '../../../dataset/entities/BusinessEntityType';

/**
 * Tek bir semantik eşleme adayı.
 */
export interface SemanticCandidate {
  /** Kaynak kolon anahtarı */
  sourceKey: string;
  /** Hedef business field (`BusinessColumn.id` benzeri) */
  businessField: string;
  /** Hedef entity tipi */
  entityType: BusinessEntityTypeId;
  /** Güven 0.00–1.00 */
  confidence: number;
  /** Gerekçe */
  reason: string;
  /** Üreten kural kimliği */
  ruleId: string;
  /** Sıra (1 = birincil) */
  rank?: number;
}
