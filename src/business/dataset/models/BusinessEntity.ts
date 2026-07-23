/**
 * İSTEBUL Business — entity (varlık tablosu) tip sözleşmesi.
 */

import type { BusinessEntityTypeId } from '../entities/BusinessEntityType';
import type { BusinessColumn } from './BusinessColumn';
import type { BusinessRow } from './BusinessRow';

/**
 * Entity içindeki veri düzeni.
 *
 * | Teknik | Türkçe |
 * |--------|--------|
 * | tablo | Tablo (sütun + satır) |
 * | belge | Tekil belge / özet kayıt |
 */
export type BusinessEntityLayout = 'tablo' | 'belge';

/**
 * BusinessDataset içindeki tek bir varlık kümesi.
 */
export interface BusinessEntity {
  /** Kimlik — dataset içinde benzersiz */
  id: string;
  /** Entity tipi — resmi sözlükten */
  entityType: BusinessEntityTypeId;
  /** Ad — görünen Türkçe ad */
  name: string;
  /** Açıklama */
  description?: string;
  /** Düzen */
  layout: BusinessEntityLayout;
  /** Sütun şeması */
  columns: readonly BusinessColumn[];
  /** Veri satırları */
  rows: readonly BusinessRow[];
  /** Kaynak entity referansı */
  sourceEntityRef?: string;
  /** Etiketler */
  tags?: readonly string[];
}
