/**
 * İSTEBUL Business Import Engine — RecordAssembly (PR-101I).
 */

import type { BusinessEntityTypeId } from '../../../dataset/entities/BusinessEntityType';
import type { BusinessRow } from '../../../dataset/models/BusinessRow';
import type { FieldAssembly } from './FieldAssembly';

/**
 * Tek kayıt (satır) derlemesi — bir entity içinde.
 */
export interface RecordAssembly {
  /** Kaynak kayıt sırası */
  recordIndex: number;
  /** Hedef entity tipi */
  entityType: BusinessEntityTypeId;
  /** Üretilen satır */
  row: BusinessRow;
  /** Alan derlemeleri */
  fields: readonly FieldAssembly[];
}
