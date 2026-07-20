/**
 * İSTEBUL Business Import Engine — FieldAssembly (PR-101I).
 */

import type { BusinessCellValue } from '../../../dataset/models/BusinessRow';
import type { BusinessColumn } from '../../../dataset/models/BusinessColumn';
import type { NormalizedField } from '../../normalizers/runtime/NormalizedField';

/**
 * Tek alanın sütun + hücre derlemesi.
 */
export interface FieldAssembly {
  /** Kaynak normalize alan */
  sourceField: NormalizedField;
  /** Üretilen sütun tanımı */
  column: BusinessColumn;
  /** Hücre değeri */
  cellValue: BusinessCellValue;
  /** Alan uyarı kodları */
  warningCodes: readonly string[];
}
