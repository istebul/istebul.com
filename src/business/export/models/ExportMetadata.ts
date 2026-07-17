/**
 * İSTEBUL Business Export Engine — üst veri.
 */

import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';

export interface ExportMetadata {
  /** Export iş kimliği */
  id: string;
  /** Başlık */
  title: string;
  /** Dil */
  locale: 'tr' | 'en';
  /** Oluşturulma (ISO 8601) */
  createdAt: string;
  /** Sürüm */
  version: string;
  /** Format kimlikleri */
  formatIds: readonly OutputFormatId[];
  /** Kaynak DocumentModel kimliği */
  documentModelId?: string;
  /** Kaynak DashboardModel kimliği */
  dashboardModelId?: string;
  /** Report DNA kimliği */
  reportDnaId?: string;
}
