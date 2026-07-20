/**
 * İSTEBUL Business Import Engine — NormalizationContext (PR-101H).
 */

import type { SemanticColumnMapping } from '../../ports/ISemanticMapper';
import type { SemanticResult } from '../../mappers/runtime/SemanticResult';

/**
 * Ham satır girdisi — tabular (reader / pipeline rawPayload).
 */
export type NormalizationInputRow = Record<string, unknown>;

/**
 * Normalizasyon girdisi — Semantic Mapping çıktısı + ham satırlar.
 * BusinessDataset üretilmez.
 */
export interface NormalizationContext {
  /** Ham satırlar (kaynak kolon anahtarları ile) */
  rows: readonly NormalizationInputRow[];
  /** Semantic mapping sonucu (opsiyonel; mappings yoksa sourceKey kullanılır) */
  semanticResult?: SemanticResult;
  /** Doğrudan mapping listesi (semanticResult.mappings override edilebilir) */
  mappings?: readonly SemanticColumnMapping[];
  /** Boş string → null */
  emptyStringAsNull?: boolean;
  /** String trim */
  trimWhitespace?: boolean;
  /** Tip zorlama */
  coerceTypes?: boolean;
  /** Dil */
  locale: 'tr' | 'en';
  /** Kiracı */
  tenantId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * NormalizationContext üretir.
 */
export function createNormalizationContext(
  partial: Omit<NormalizationContext, 'locale'> & {
    locale?: 'tr' | 'en';
  }
): NormalizationContext {
  const { locale, ...rest } = partial;
  return {
    emptyStringAsNull: true,
    trimWhitespace: true,
    coerceTypes: true,
    locale: locale ?? 'tr',
    ...rest
  };
}

/**
 * SemanticResult + tabular satırlardan bağlam üretir.
 */
export function createNormalizationContextFromSemantic(
  semanticResult: SemanticResult,
  rows: readonly NormalizationInputRow[],
  options?: Omit<NormalizationContext, 'rows' | 'semanticResult' | 'locale'> & {
    locale?: 'tr' | 'en';
  }
): NormalizationContext {
  return createNormalizationContext({
    rows,
    semanticResult,
    mappings: semanticResult.mappings,
    ...options
  });
}
