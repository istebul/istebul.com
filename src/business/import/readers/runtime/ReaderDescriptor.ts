/**
 * İSTEBUL Business Import Engine — Reader Descriptor (PR-101B).
 *
 * Metadata tabanlı reader tanımı. Dosya okuma yoktur.
 */

import type { ImportAdapterTypeId } from '../../types/ImportSource';

/**
 * Reader’ın desteklediği kaynak metadata’sı.
 */
export interface ReaderDescriptor {
  /** Kararlı reader kimliği */
  id: string;
  /** Görünen ad (Türkçe veya marka) */
  name: string;
  /** Açıklama */
  description?: string;
  /** Desteklenen adapter / kaynak tipleri */
  sourceTypes: readonly ImportAdapterTypeId[];
  /** Desteklenen MIME türleri — örn. text/csv */
  mimeTypes?: readonly string[];
  /** Desteklenen uzantılar — örn. `.csv`, `.xlsx` (nokta ile) */
  extensions?: readonly string[];
  /**
   * Öncelik — yüksek sayı önce seçilir.
   * Varsayılan: 0
   */
  priority?: number;
  /**
   * Multi-tenant kapsamı.
   * Yoksa global (tüm kiracılar); varsa yalnızca o kiracı.
   */
  tenantId?: string;
  /** Sürüm */
  version: string;
}
