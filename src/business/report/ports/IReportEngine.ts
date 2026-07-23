/**
 * İSTEBUL Business Report Engine — ana motor portu.
 */

import type { ReportContext } from '../models/ReportContext';
import type { ReportModel } from '../models/ReportModel';
import type { ReportRequest } from '../models/ReportRequest';

export interface IReportEngine {
  /**
   * Decision sonucundan ReportModel üretir.
   * Bu PR’da implementasyon yoktur.
   */
  buildReport(
    request: ReportRequest,
    context: ReportContext
  ): Promise<ReportModel>;
}
