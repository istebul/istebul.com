/**
 * İSTEBUL Business Import Engine — semantik eşleme portu.
 *
 * Sütun / alan adlarını resmi entity şemasına bağlar.
 * Bu PR’da implementasyon yoktur.
 */

import type { BusinessEntityTypeId } from '../../dataset/entities/BusinessEntityType';
import type { ImportContext } from '../types/ImportContext';
import type { ImportDetectionResult } from './IImportDetector';

/**
 * Tek bir sütun eşlemesi.
 */
export interface SemanticColumnMapping {
  /** Kaynak sütun anahtarı */
  sourceKey: string;
  /** Hedef entity tipi */
  entityType: BusinessEntityTypeId;
  /** Hedef sütun kimliği (`BusinessColumn.id`) */
  targetColumnId: string;
  /** Güven skoru 0–1 */
  confidence?: number;
}

/**
 * Semantik eşleme çıktısı.
 */
export interface SemanticMappingResult {
  readonly mappings: readonly SemanticColumnMapping[];
  readonly unmappedSourceKeys: readonly string[];
}

export interface ISemanticMapper {
  map(
    context: ImportContext,
    detection: ImportDetectionResult
  ): Promise<SemanticMappingResult>;
}
