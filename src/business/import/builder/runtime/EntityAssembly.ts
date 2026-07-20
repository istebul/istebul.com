/**
 * İSTEBUL Business Import Engine — EntityAssembly (PR-101I).
 */

import type { BusinessEntity } from '../../../dataset/models/BusinessEntity';
import type { RecordAssembly } from './RecordAssembly';

/**
 * Tek entity tablosu derlemesi.
 */
export interface EntityAssembly {
  /** Üretilen entity */
  entity: BusinessEntity;
  /** Satır derlemeleri */
  records: readonly RecordAssembly[];
  /** Benzersiz alan (sütun) sayısı */
  fieldCount: number;
}
