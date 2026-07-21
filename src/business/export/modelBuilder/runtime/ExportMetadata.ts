/**
 * İSTEBUL Business Export Engine — sunumdan bağımsız Export Metadata (PR-106B).
 *
 * Foundation `models/ExportMetadata` ile karıştırılmamalıdır; bu tip yalnızca
 * Export Model Builder veri modelinin bir parçasıdır.
 */

import type { OutputFormatId } from '../../../knowledge/outputs/OutputDefinition';

/**
 * Export Model üst bilgisi — format/renderer üretmez.
 */
export interface ExportMetadata {
  /** Export model / iş kimliği */
  id: string;
  /** Kaynak istek kimliği */
  requestId: string;
  /** Başlık */
  title: string;
  /** Dil */
  locale: 'tr' | 'en';
  /** Hedef format kimlikleri */
  formatIds: readonly OutputFormatId[];
  /** Kaynak DocumentModel kimliği */
  documentModelId: string;
  /** Kaynak DashboardModel kimliği */
  dashboardModelId: string;
  /** Report DNA kimliği */
  reportDnaId: string;
  /** Şablon kimliği */
  templateId: string;
  /** Hedef kimliği */
  targetId: string;
  /** Oluşturulma (ISO 8601) */
  createdAt: string;
  /** Şema / motor sürümü */
  version: string;
  /** Etiketler */
  tags: readonly string[];
}
