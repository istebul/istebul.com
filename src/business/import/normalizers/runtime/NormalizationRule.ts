/**
 * İSTEBUL Business Import Engine — NormalizationRule (PR-101H).
 */

import type { NormalizedPrimitiveType } from './NormalizedField';
import type { NormalizationContext } from './NormalizationContext';
import type { NormalizationWarning } from './NormalizationResult';

/**
 * Kural uygulama durumu — kurallar zincir halinde çalışır.
 */
export interface FieldNormalizationState {
  sourceKey: string;
  fieldName: string;
  entityType?: string;
  rawValue: unknown;
  value: unknown;
  primitiveType: NormalizedPrimitiveType;
  dateIso?: string;
  warnings: NormalizationWarning[];
  appliedRuleIds: string[];
  typeTransformed: boolean;
}

/**
 * Normalizasyon kuralı.
 */
export interface NormalizationRule {
  id: string;
  name: string;
  description: string;
  /**
   * Alan durumunu günceller. Değişiklik yoksa aynı state döner.
   */
  apply(
    state: FieldNormalizationState,
    context: NormalizationContext
  ): FieldNormalizationState;
}
