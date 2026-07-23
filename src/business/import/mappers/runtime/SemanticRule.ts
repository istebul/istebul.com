/**
 * İSTEBUL Business Import Engine — SemanticRule (PR-101G).
 */

import type { BusinessEntityTypeId } from '../../../dataset/entities/BusinessEntityType';
import type { SemanticCandidate } from './SemanticCandidate';
import type { SemanticContext } from './SemanticContext';

/**
 * Semantik eşleme kuralı — yalnızca isim/alias; AI yok.
 */
export interface SemanticRule {
  /** Kural kimliği */
  id: string;
  /** Ad */
  name: string;
  /** Açıklama */
  description: string;
  /**
   * Kolon için aday(lar) üretir.
   * Uygun değilse boş dizi.
   */
  match(
    sourceKey: string,
    normalizedKey: string,
    context: SemanticContext
  ): readonly SemanticCandidate[];
}

/**
 * Business field sözlük girişi.
 */
export interface BusinessFieldDefinition {
  /** Business field id */
  fieldId: string;
  /** Varsayılan entity */
  entityType: BusinessEntityTypeId;
  /** Alias’lar (normalize edilmeden önce; runtime normalize eder) */
  aliases: readonly string[];
  /** Görünen etiket */
  label?: string;
}
