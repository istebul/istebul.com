/**
 * İSTEBUL Business Report Engine — rapor birleştirici portu.
 */

import type { ExecutiveSummary } from '../models/ExecutiveSummary';
import type { ReportAppendix } from '../models/ReportAppendix';
import type { ReportContext } from '../models/ReportContext';
import type { ReportFinding } from '../models/ReportFinding';
import type { ReportMetadata } from '../models/ReportMetadata';
import type { ReportModel } from '../models/ReportModel';
import type { ReportRecommendation } from '../models/ReportRecommendation';
import type { ReportReference } from '../models/ReportReference';
import type { ReportSection } from '../models/ReportSection';

export interface IReportComposer {
  compose(
    context: ReportContext,
    parts: Readonly<{
      metadata: ReportMetadata;
      executiveSummary: ExecutiveSummary;
      sections: readonly ReportSection[];
      findings: readonly ReportFinding[];
      recommendations: readonly ReportRecommendation[];
      appendices: readonly ReportAppendix[];
      references: readonly ReportReference[];
    }>
  ): Promise<ReportModel>;
}
