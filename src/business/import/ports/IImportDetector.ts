/**
 * İSTEBUL Business Import Engine — tespit portu.
 *
 * Şema ve entity önerilerini birleşik tespit aşamasında sunar.
 * Bu PR’da implementasyon yoktur.
 */

import type { BusinessEntityTypeId } from '../../dataset/entities/BusinessEntityType';
import type { ImportContext } from '../types/ImportContext';

/**
 * Tespit çıktısı özeti.
 */
export interface ImportDetectionResult {
  readonly columnKeys: readonly string[];
  readonly rowCountEstimate?: number;
  readonly entitySuggestions: readonly {
    entityType: BusinessEntityTypeId;
    confidence: number;
    label?: string;
  }[];
  readonly confidence?: number;
}

/**
 * Ham okuma sonrası yapı sezgisi.
 */
export interface IImportDetector {
  detect(
    context: ImportContext,
    rawPayload: unknown
  ): Promise<ImportDetectionResult>;
}
