/**
 * İSTEBUL Business Export Engine — çıktı formatı modeli.
 */

import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';

/**
 * Export format tanımı — Knowledge `OutputFormatId` ile hizalı.
 */
export interface ExportFormat {
  /** Format kimliği — Knowledge OUTPUT_REGISTRY ile uyumlu */
  id: OutputFormatId;
  /** Görünen ad */
  name: string;
  /** MIME türü */
  mimeType: string;
  /** Dosya uzantısı — örn. `.pdf` */
  fileExtension: string;
  /** Sıralama */
  order: number;
}
