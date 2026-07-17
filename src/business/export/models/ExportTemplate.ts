/**
 * İSTEBUL Business Export Engine — şablon modeli.
 */

import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';

/**
 * Export şablon tanımı — gerçek şablon dosyası yok.
 */
export interface ExportTemplate {
  /** Şablon kimliği */
  id: string;
  /** Ad */
  name: string;
  /** Açıklama */
  description: string;
  /** Hedef format */
  formatId: OutputFormatId;
  /** Knowledge Report DNA kimliği */
  reportDnaId?: string;
  /** Sürüm */
  version: string;
}
