/**
 * İSTEBUL Business Export Engine — ExportExecutionContext (PR-106F).
 */

import type { DashboardModel } from '../../../dashboard/models/DashboardModel';
import type { DocumentModel } from '../../../document/models/DocumentModel';
import type { ExportContext } from '../../models/ExportContext';
import type { ExportRequest } from '../../models/ExportRequest';
import type { ExportPipelineBag } from '../../pipeline/runtime/ExportPipelineContext';

/**
 * Uçtan uca Export yürütme bağlamı.
 */
export interface ExportExecutionContext {
  /** Export isteği */
  request: ExportRequest;
  /** Hazır ExportContext */
  exportContext?: ExportContext;
  /** DocumentModel — exportContext yoksa önerilir */
  documentModel?: DocumentModel;
  /** DashboardModel (DashboardResult) — exportContext yoksa önerilir */
  dashboardModel?: DashboardModel;
  /** Başlangıç pipeline bag — mevcut Export bag mimarisine merge */
  initialBag?: ExportPipelineBag;
  /** Dil */
  locale?: 'tr' | 'en';
}

export type CreateExportExecutionContextInput = ExportExecutionContext;

/**
 * ExportExecutionContext fabrikası.
 */
export function createExportExecutionContext(
  input: CreateExportExecutionContextInput
): ExportExecutionContext {
  return { ...input };
}
