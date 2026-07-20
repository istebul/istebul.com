/**
 * İSTEBUL Business Import Engine — SemanticContext (PR-101G).
 */

import type { BusinessEntityTypeId } from '../../../dataset/entities/BusinessEntityType';
import type { DetectedColumn } from '../../detectors/runtime/DetectedColumn';
import type { SchemaResult } from '../../detectors/runtime/SchemaResult';

/**
 * Semantik eşleme girdisi — Schema Detection kolon adaylarından beslenir.
 * Veri dönüştürme yoktur.
 */
export interface SemanticContext {
  /** Kaynak kolon anahtarları */
  columnKeys: readonly string[];
  /** Schema Detection kolonları (opsiyonel zenginleştirme) */
  detectedColumns?: readonly DetectedColumn[];
  /** Schema Detection sonucu (opsiyonel) */
  schemaResult?: SchemaResult;
  /** Entity ipuçları */
  entityHints?: readonly BusinessEntityTypeId[];
  /** Dil */
  locale: 'tr' | 'en';
  /** Minimum confidence eşiği (aday filtre) */
  minConfidence?: number;
  /** Kolon başına max alternatif (birincil hariç) */
  maxAlternatives?: number;
  /** Kiracı */
  tenantId?: string;
  /** Ek bag */
  bag?: Record<string, unknown>;
}

/**
 * SemanticContext üretir — locale varsayılanı `tr`.
 */
export function createSemanticContext(
  partial: Omit<SemanticContext, 'locale' | 'columnKeys'> & {
    locale?: 'tr' | 'en';
    columnKeys?: readonly string[];
    schemaResult?: SchemaResult;
  }
): SemanticContext {
  const { locale, columnKeys, schemaResult, ...rest } = partial;
  const keys =
    columnKeys ??
    schemaResult?.columnKeys ??
    schemaResult?.columns.map((c) => c.name) ??
    [];
  return {
    ...rest,
    schemaResult,
    columnKeys: keys,
    detectedColumns: rest.detectedColumns ?? schemaResult?.columns,
    locale: locale ?? 'tr'
  };
}
