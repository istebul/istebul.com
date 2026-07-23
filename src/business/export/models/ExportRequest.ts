/**
 * İSTEBUL Business Export Engine — istek modeli.
 */

import type { OutputFormatId } from '../../knowledge/outputs/OutputDefinition';

/**
 * Export Engine girdisi — Document ve/veya Dashboard kimlikleri.
 */
export interface ExportRequest {
  /** İstek kimliği */
  id: string;
  /** Hedef formatlar */
  formatIds: readonly OutputFormatId[];
  /** DocumentModel kimliği */
  documentModelId?: string;
  /** DashboardModel kimliği */
  dashboardModelId?: string;
  /** Report DNA kimliği */
  reportDnaId?: string;
  /** Şablon kimliği */
  templateId?: string;
  /** Hedef kimliği */
  targetId?: string;
  /** Dil */
  locale?: 'tr' | 'en';
}
