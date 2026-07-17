/**
 * İSTEBUL Business Report Engine — inceleme portu.
 */

import type { ReportContext } from '../models/ReportContext';
import type { ReportModel } from '../models/ReportModel';
import type { ReportReview } from '../models/ReportReview';

export interface IReportReviewer {
  review(
    context: ReportContext,
    draft: ReportModel
  ): Promise<ReportReview>;
}
