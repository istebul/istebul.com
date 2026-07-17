/**
 * İSTEBUL Business Import Engine — istek tipi.
 */

import type { ImportSource } from './ImportSource';

/**
 * İçe aktarma isteği — henüz ham payload okunmaz; yalnızca tanım.
 */
export interface ImportRequest {
  /** İstek kimliği */
  id: string;
  /** Kaynak tanımı */
  source: ImportSource;
  /** Dil */
  locale?: 'tr' | 'en';
  /** Hedef rapor DNA kimliği */
  targetReportId?: string;
  /** Entity ipuçları */
  entityHints?: readonly string[];
  /**
   * Ham girdi tanımlayıcısı — dosya yolu, job id vb.
   * Bu PR’da okunmaz; sonraki PR’larda reader kullanır.
   */
  payloadRef?: string;
}
