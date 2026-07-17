/**
 * İSTEBUL Business Import Engine — ImportTarget (resolve girdisi).
 *
 * Yalnızca metadata; dosya içeriği yoktur.
 */

import type { ImportAdapterTypeId } from '../../types/ImportSource';

/**
 * Reader seçimi için hedef metadata.
 */
export interface ImportTarget {
  /** Kaynak / adapter tipi */
  sourceType?: ImportAdapterTypeId;
  /** MIME türü */
  mimeType?: string;
  /** Dosya uzantısı — `.csv` veya `csv` kabul edilir */
  extension?: string;
  /** Kiracı kimliği (multi-tenant) */
  tenantId?: string;
  /** Etiket — yalnızca telemetri / izlenebilirlik */
  label?: string;
}
