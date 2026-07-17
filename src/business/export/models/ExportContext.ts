/**
 * Export Engine çalışma bağlamı.
 */

import type { DashboardModel } from '../../dashboard/models/DashboardModel';
import type { DocumentModel } from '../../document/models/DocumentModel';
import type { ExportStage, ExportStatus } from './ExportStatus';

export interface ExportContext {
  exportJobId: string;
  locale: 'tr' | 'en';
  currentStage: ExportStage;
  status: ExportStatus;
  documentModel?: DocumentModel;
  dashboardModel?: DashboardModel;
  metadata?: Readonly<Record<string, string>>;
}
